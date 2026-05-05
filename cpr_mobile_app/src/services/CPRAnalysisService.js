/**
 * CPR Analysis Service — Rewritten for real pipeline
 * ====================================================
 * All thresholds come from RulesEngine (rcp_rules.json).
 * Accepts real landmark data from backend or on-device pose detection.
 * Implements torso-normalized biomechanical metrics.
 */

import { rulesEngine } from './RulesEngine';

// ─── ANALYSIS STATE ───────────────────────────────────────────────────────────

const STATE = { IDLE: 'IDLE', COMPRESSING: 'COMPRESSING', RELEASING: 'RELEASING' };

class CPRAnalysisService {
    constructor() {
        this.victimType = 'adult';
        this.rescuerCount = 1;
        this.reset();
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  CONFIGURATION
    // ══════════════════════════════════════════════════════════════════════════

    setVictimType(type) {
        this.victimType = type;
        this.reset();
    }

    setRescuerCount(count) {
        this.rescuerCount = count;
    }

    setLanguage(lang) {
        rulesEngine.setLanguage(lang);
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  MAIN ANALYSIS — called for each processed frame
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * Analyze a frame with pose data.
     *
     * @param {Object} poseData — Either from backend or on-device:
     *   {
     *     landmarks: { leftWrist, rightWrist, leftElbow, rightElbow,
     *                  leftShoulder, rightShoulder, leftHip, rightHip, nose },
     *     handsPosition: { x, y },
     *     handsTogether: boolean,
     *     confidence: number,
     *     frameWidth: number,
     *     frameHeight: number,
     *   }
     * @param {number} timestamp — ms
     * @returns {Object} Full analysis result with metrics, errors, guidance
     */
    analyzeFrame(poseData, timestamp = Date.now()) {
        if (!poseData || !poseData.handsPosition) {
            return this._idleResult(timestamp);
        }

        const lm = poseData.landmarks || {};
        const y = poseData.handsPosition.y;

        // ── Compute torso height (shoulder midpoint → hip midpoint) ──
        const torsoHeight = this._computeTorsoHeight(lm);

        // ── Initialize baseline on first frame ──
        if (this.baselineY === null) {
            this.baselineY = y;
        }

        // ── Track position ──
        this.yHistory.push({ y, timestamp });
        if (this.yHistory.length > 60) this.yHistory.shift();

        // ── Track X variance for lateral movement detection ──
        this.xHistory.push(poseData.handsPosition.x);
        if (this.xHistory.length > 20) this.xHistory.shift();

        // ── State machine for compression detection ──
        this._detectCompressionState(y, timestamp, torsoHeight);

        // ── Compute elbow angle ──
        const elbowAngle = this._computeElbowAngle(lm);

        // ── Compute shoulder-wrist alignment ──
        const shoulderMidX = this._midX(lm.leftShoulder, lm.rightShoulder);
        const wristMidX = this._midX(lm.leftWrist, lm.rightWrist);
        const shoulderY = this._midY(lm.leftShoulder, lm.rightShoulder);
        const hipY = this._midY(lm.leftHip, lm.rightHip);

        // ── Compute X variance ──
        const wristXVariance = this._computeVariance(this.xHistory);

        // ── Compute depth as % of torso height ──
        const depthPixels = this.lastDepthPixels;
        const depthTorsoPct = torsoHeight > 0 ? (depthPixels / torsoHeight) * 100 : null;
        const depthCm = this._estimateDepthCm(depthTorsoPct, this.victimType);

        // ── Compute recoil ──
        const recoilPercent = this.recoilQuality;

        // ── Time since last compression ──
        const lastCompTime = this.compressionTimestamps[this.compressionTimestamps.length - 1] || timestamp;
        const timeSinceLastCompression = (timestamp - lastCompTime) / 1000;

        // ── Build metrics for error evaluation ──
        const metricsForRules = {
            rate: this.currentBPM,
            depthTorsoPct,
            elbowAngle,
            wristY: y,
            shoulderY,
            hipY,
            torsoHeight,
            shoulderMidX,
            wristMidX,
            frameWidth: poseData.frameWidth || 640,
            wristXVariance,
            recoilPercent,
            timeSinceLastCompression,
        };

        // ── Evaluate error conditions from rcp_rules.json ──
        const errors = rulesEngine.evaluateErrors(metricsForRules, this.victimType);

        // ── Determine action ──
        const action = this._determineAction(errors, poseData);

        // ── Get ratio info ──
        const ratio = rulesEngine.getCompressionVentilationRatio(this.victimType, this.rescuerCount);
        const cycleTarget = ratio.compressions;

        // ── Guidance message ──
        const feedbackMessage = this._generateFeedback(errors, metricsForRules);

        // ── Build structured output per rcp_rules.json output_schema ──
        return {
            // Raw values
            bpm: this.currentBPM,
            compressionCount: this.totalCompressions,
            cycleCompressions: this.cycleCompressions,
            cycleCount: this.cycleCount,
            recoilQuality: Math.round(recoilPercent),
            depthPct: depthTorsoPct ? Math.round(depthTorsoPct * 10) / 10 : null,
            depthCm: depthCm ? Math.round(depthCm * 10) / 10 : null,
            elbowAngle: elbowAngle ? Math.round(elbowAngle) : null,

            // Status evaluations (from rules, not hardcoded)
            bpmStatus: this._bpmStatus(this.currentBPM),
            depthStatus: this._depthStatus(depthTorsoPct),
            recoilStatus: recoilPercent >= 85 ? 'GOOD' : recoilPercent >= 70 ? 'ACCEPTABLE' : 'POOR',

            // Errors from rcp_rules.json
            errors,
            hasErrors: errors.length > 0,
            criticalErrors: errors.filter(e => e.severity === 'CRITICAL'),

            // Cycle progress
            cycleProgress: this.cycleCompressions / cycleTarget,
            cycleTarget,
            ventilationTarget: ratio.ventilations,

            // Action
            action,
            state: this.currentState,

            // Guidance
            feedbackMessage,
            guidance: errors.length > 0
                ? errors.map(e => ({ type: e.severity, text: e.correction }))
                : [{ type: 'POSITIVE', text: feedbackMessage }],

            // Meta
            victimType: this.victimType,
            language: rulesEngine.language,
            confidence: poseData.confidence || 0,
            timestamp: new Date(timestamp).toISOString(),
        };
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  COMPRESSION STATE MACHINE
    // ══════════════════════════════════════════════════════════════════════════

    _detectCompressionState(y, timestamp, torsoHeight) {
        const movement = y - this.baselineY;
        const minMovement = torsoHeight > 0 ? torsoHeight * 0.02 : 15;

        switch (this.currentState) {
            case STATE.IDLE:
                if (Math.abs(movement) > minMovement) {
                    this.currentState = STATE.COMPRESSING;
                    this.lowestY = y;
                    this.peakY = this.baselineY;
                }
                break;

            case STATE.COMPRESSING:
                // Track the extreme point (direction depends on camera orientation)
                if (Math.abs(y - this.baselineY) > Math.abs(this.lowestY - this.baselineY)) {
                    this.lowestY = y;
                }
                // Detect reversal → releasing
                const compressionDepth = Math.abs(this.lowestY - this.baselineY);
                const returnedAmount = Math.abs(y - this.lowestY);
                if (returnedAmount > compressionDepth * 0.3 && compressionDepth > minMovement) {
                    this.currentState = STATE.RELEASING;
                    this.lastDepthPixels = compressionDepth;
                }
                break;

            case STATE.RELEASING: {
                const totalMovement = Math.abs(this.lowestY - this.baselineY);
                const returnMovement = Math.abs(y - this.lowestY);
                const recoil = totalMovement > 0 ? (returnMovement / totalMovement) * 100 : 100;

                if (recoil >= 80) {
                    // Full compression + recoil cycle complete
                    this._registerCompression(timestamp, true, torsoHeight);
                    this.currentState = STATE.IDLE;
                    this.baselineY = y;
                } else if (Math.abs(y - this.baselineY) > minMovement &&
                    ((y > this.baselineY) !== (this.lowestY > this.baselineY))) {
                    // New compression without full recoil
                    this._registerCompression(timestamp, false, torsoHeight);
                    this.currentState = STATE.COMPRESSING;
                    this.lowestY = y;
                }
                break;
            }
        }
    }

    _registerCompression(timestamp, fullRecoil, torsoHeight) {
        // Anti-bounce: min 300ms between compressions
        const last = this.compressionTimestamps[this.compressionTimestamps.length - 1];
        if (last && timestamp - last < 300) return;

        this.compressionTimestamps.push(timestamp);
        this.totalCompressions++;
        this.cycleCompressions++;

        // Update running average recoil quality
        const recoilValue = fullRecoil ? 100 : 50;
        const n = this.totalCompressions;
        this.recoilQuality = ((n - 1) * this.recoilQuality + recoilValue) / n;

        // Calculate BPM from recent timestamps
        this._calculateBPM();

        // Check cycle completion
        const ratio = rulesEngine.getCompressionVentilationRatio(this.victimType, this.rescuerCount);
        if (this.cycleCompressions >= ratio.compressions) {
            this.cycleCount++;
            this.cycleCompressions = 0;
        }

        // Keep only last 15 seconds of timestamps
        const cutoff = timestamp - 15000;
        this.compressionTimestamps = this.compressionTimestamps.filter(t => t > cutoff);
    }

    _calculateBPM() {
        const ts = this.compressionTimestamps;
        if (ts.length < 3) { this.currentBPM = 0; return; }

        const recent = ts.slice(-12);
        if (recent.length < 2) { this.currentBPM = 0; return; }

        const totalTime = recent[recent.length - 1] - recent[0];
        const intervals = recent.length - 1;
        if (totalTime <= 0) { this.currentBPM = 0; return; }

        this.currentBPM = Math.round((intervals / totalTime) * 60000);
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  BIOMECHANICAL CALCULATIONS
    // ══════════════════════════════════════════════════════════════════════════

    _computeTorsoHeight(lm) {
        const sY = this._midY(lm.leftShoulder, lm.rightShoulder);
        const hY = this._midY(lm.leftHip, lm.rightHip);
        if (sY == null || hY == null) return 0;
        return Math.abs(hY - sY);
    }

    _computeElbowAngle(lm) {
        // Calculate angle at elbow: shoulder → elbow → wrist
        const angles = [];
        if (lm.leftShoulder && lm.leftElbow && lm.leftWrist) {
            angles.push(this._angleBetween(lm.leftShoulder, lm.leftElbow, lm.leftWrist));
        }
        if (lm.rightShoulder && lm.rightElbow && lm.rightWrist) {
            angles.push(this._angleBetween(lm.rightShoulder, lm.rightElbow, lm.rightWrist));
        }
        if (angles.length === 0) return null;
        return angles.reduce((a, b) => a + b, 0) / angles.length;
    }

    _angleBetween(a, b, c) {
        // Angle at point b formed by points a-b-c
        if (!a || !b || !c) return 180;
        const ba = { x: a.x - b.x, y: a.y - b.y };
        const bc = { x: c.x - b.x, y: c.y - b.y };
        const dot = ba.x * bc.x + ba.y * bc.y;
        const magBA = Math.sqrt(ba.x * ba.x + ba.y * ba.y);
        const magBC = Math.sqrt(bc.x * bc.x + bc.y * bc.y);
        if (magBA === 0 || magBC === 0) return 180;
        const cosAngle = Math.max(-1, Math.min(1, dot / (magBA * magBC)));
        return (Math.acos(cosAngle) * 180) / Math.PI;
    }

    _estimateDepthCm(depthTorsoPct, victimType) {
        if (depthTorsoPct == null) return null;
        // Average adult torso height ≈ 45cm, child ≈ 30cm, infant ≈ 18cm
        const torsoHeightCm = { adult: 45, child: 30, infant: 18, pregnant: 45 };
        const tcm = torsoHeightCm[victimType] || 45;
        return (depthTorsoPct / 100) * tcm;
    }

    _midX(a, b) {
        if (!a || !b) return null;
        return (a.x + b.x) / 2;
    }

    _midY(a, b) {
        if (!a || !b) return null;
        return (a.y + b.y) / 2;
    }

    _computeVariance(arr) {
        if (arr.length < 2) return 0;
        const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
        return arr.reduce((sum, v) => sum + (v - mean) ** 2, 0) / arr.length;
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  FEEDBACK GENERATION (from rcp_rules.json)
    // ══════════════════════════════════════════════════════════════════════════

    _bpmStatus(bpm) {
        if (bpm <= 0) return 'WAITING';
        const [min, max] = rulesEngine.getRateRange(this.victimType);
        if (bpm < min) return 'TOO_SLOW';
        if (bpm > max) return 'TOO_FAST';
        return 'GOOD';
    }

    _depthStatus(depthPct) {
        if (depthPct == null) return 'WAITING';
        const [min, max] = rulesEngine.getDepthTorsoPercent(this.victimType);
        if (depthPct < min) return 'TOO_SHALLOW';
        if (depthPct > max) return 'TOO_DEEP';
        return 'GOOD';
    }

    _generateFeedback(errors, metrics) {
        if (errors.length > 0) {
            // Return highest-severity correction
            return errors[0].correction;
        }
        if (metrics.rate >= rulesEngine.getRateRange(this.victimType)[0] &&
            metrics.rate <= rulesEngine.getRateRange(this.victimType)[1]) {
            return rulesEngine.getPositiveFeedback('good_compression');
        }
        return '';
    }

    _determineAction(errors, poseData) {
        if (!poseData.handsTogether) return 'idle';
        if (errors.some(e => e.severity === 'CRITICAL')) return 'incorrect';
        if (this.currentState === STATE.COMPRESSING) return 'compression';
        if (this.currentState === STATE.RELEASING) return 'compression';
        return 'compression';
    }

    _idleResult(timestamp) {
        return {
            bpm: 0, compressionCount: 0, cycleCompressions: 0, cycleCount: 0,
            recoilQuality: 0, depthPct: null, depthCm: null, elbowAngle: null,
            bpmStatus: 'WAITING', depthStatus: 'WAITING', recoilStatus: 'WAITING',
            errors: [], hasErrors: false, criticalErrors: [],
            cycleProgress: 0, cycleTarget: 30, ventilationTarget: 2,
            action: 'idle', state: STATE.IDLE,
            feedbackMessage: '', guidance: [],
            victimType: this.victimType, language: rulesEngine.language,
            confidence: 0, timestamp: new Date(timestamp).toISOString(),
        };
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  BACKEND RESPONSE PROCESSING
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * Process metrics received from the Python backend.
     * The backend provides bpm, depth, recoil, compression_count.
     * We run them through our RulesEngine for error evaluation + feedback.
     */
    processBackendMetrics(backendResponse, timestamp = Date.now()) {
        if (!backendResponse?.success) return this._idleResult(timestamp);

        const m = backendResponse.metrics || {};
        const bpm = m.bpm || 0;
        const depthCm = m.depth_cm || 0;
        const recoilQuality = m.recoil_quality || 0;
        const compressionCount = m.compression_count || 0;
        const elapsedTime = m.elapsed_time || 0;
        const armAngle = m.arm_angle || null;
        const handsTogether = m.hands_together || false;
        const backendVictimType = m.victim_type || null;
        const victimConfidence = m.victim_confidence || 0;
        const depthTorsoPctBackend = m.depth_torso_pct || 0;
        const timeSinceLastCompression = m.time_since_last_compression || 0;

        // Update internal state from backend
        this.currentBPM = bpm;
        this.totalCompressions = compressionCount;
        this.recoilQuality = recoilQuality;

        // Auto-update victim type from classifier if confident enough
        if (backendVictimType && victimConfidence >= 0.7) {
            this.victimType = backendVictimType;
        }

        // Use backend's torso-normalized depth if available, else estimate
        const depthTorsoPct = depthTorsoPctBackend > 0 ? depthTorsoPctBackend : (() => {
            const torsoHeightCm = { adult: 45, child: 30, infant: 18, pregnant: 45 };
            const tcm = torsoHeightCm[this.victimType] || 45;
            return (depthCm / tcm) * 100;
        })();

        // Build metrics for rule evaluation (now with real data from YOLOv8)
        const metricsForRules = {
            rate: bpm,
            depthTorsoPct,
            recoilPercent: recoilQuality,
            timeSinceLastCompression,
            elbowAngle: armAngle,
            // Landmark-level checks need raw keypoints (not in summary)
            wristY: null,
            shoulderY: null,
            hipY: null,
            torsoHeight: null,
            shoulderMidX: null,
            wristMidX: null,
            frameWidth: null,
            wristXVariance: null,
        };

        const errors = rulesEngine.evaluateErrors(metricsForRules, this.victimType);
        const ratio = rulesEngine.getCompressionVentilationRatio(this.victimType, this.rescuerCount);
        const cycleTarget = ratio.compressions;
        const cycleCompressions = compressionCount % cycleTarget;
        const feedbackMessage = this._generateFeedback(errors, metricsForRules);

        return {
            bpm,
            compressionCount,
            cycleCompressions,
            cycleCount: Math.floor(compressionCount / cycleTarget),
            recoilQuality: Math.round(recoilQuality),
            depthPct: Math.round(depthTorsoPct * 10) / 10,
            depthCm: Math.round(depthCm * 10) / 10,
            elbowAngle: armAngle,
            bpmStatus: this._bpmStatus(bpm),
            depthStatus: this._depthStatus(depthTorsoPct),
            recoilStatus: recoilQuality >= 85 ? 'GOOD' : recoilQuality >= 70 ? 'ACCEPTABLE' : 'POOR',
            errors,
            hasErrors: errors.length > 0,
            criticalErrors: errors.filter(e => e.severity === 'CRITICAL'),
            cycleProgress: cycleCompressions / cycleTarget,
            cycleTarget,
            ventilationTarget: ratio.ventilations,
            action: compressionCount > 0 ? 'compression' : 'idle',
            state: this.currentState,
            feedbackMessage,
            guidance: errors.length > 0
                ? errors.map(e => ({ type: e.severity, text: e.correction }))
                : [{ type: 'POSITIVE', text: feedbackMessage }],
            backendGuidance: backendResponse.guidance || null,
            victimType: this.victimType,
            language: rulesEngine.language,
            confidence: 1.0,
            elapsedTime,
            timestamp: new Date(timestamp).toISOString(),
        };
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  RESET
    // ══════════════════════════════════════════════════════════════════════════

    reset() {
        this.yHistory = [];
        this.xHistory = [];
        this.compressionTimestamps = [];
        this.currentState = STATE.IDLE;
        this.totalCompressions = 0;
        this.cycleCompressions = 0;
        this.cycleCount = 0;
        this.currentBPM = 0;
        this.recoilQuality = 0;
        this.lastDepthPixels = 0;
        this.baselineY = null;
        this.lowestY = null;
        this.peakY = null;
    }
}

// ─── SINGLETON ────────────────────────────────────────────────────────────────

export const cprAnalysisService = new CPRAnalysisService();
export default CPRAnalysisService;
