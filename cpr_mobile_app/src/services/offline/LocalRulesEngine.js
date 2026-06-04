/**
 * Local Rules Engine (Production)
 * ==================================
 * Real CPR Analysis Engine for Edge AI (Offline/TFLite) mode.
 *
 * This module:
 *  - Accepts decoded bounding boxes and pose key-points from TFLite output tensors
 *  - Computes CPR metrics: BPM, depth proxy, recoil, hand position, visibility
 *  - Emits ui_command objects in the EXACT SAME FORMAT as the Python backend
 *  - Supports adult, child, infant, pregnant victim types
 *  - Supports single vs dual rescuer modes
 *
 * Schema parity with Python backend (server.py / pipeline/__init__.py):
 *   ui_command = { id: string, severity: 'CRITICAL'|'HIGH'|'MEDIUM'|'POSITIVE', text_fr, text_en, text_ar, value }
 */

// ─── CALIBRATED THRESHOLDS ─────────────────────────────────────────────────
// These are tuned for adult CPR per AHA/ERC guidelines.
// Child/infant overrides reduce target depth and BPM slightly.

const THRESHOLDS = {
    adult: {
        bpm_min: 100, bpm_max: 120,
        depth_min: 5.0,   // cm proxy (normalized to torso height)
        depth_max: 6.0,
        recoil_min: 0.8,  // fraction (0-1) of compression height regained
        elbow_angle_min: 160, // degrees — locked arms
        visibility_conf: 0.45,
        ventilation_ratio: 30, // 30:2 compressions per breath (single)
        ventilation_ratio_dual: 15, // 15:2 for dual rescuer
    },
    child: {
        bpm_min: 100, bpm_max: 120,
        depth_min: 4.0,
        depth_max: 5.0,
        recoil_min: 0.8,
        elbow_angle_min: 150,
        visibility_conf: 0.45,
        ventilation_ratio: 30,
        ventilation_ratio_dual: 15,
    },
    infant: {
        bpm_min: 100, bpm_max: 120,
        depth_min: 3.5,
        depth_max: 4.0,
        recoil_min: 0.7,
        elbow_angle_min: 0, // Infant uses 2-finger technique, no elbow constraint
        visibility_conf: 0.45,
        ventilation_ratio: 30,
        ventilation_ratio_dual: 15,
    },
    pregnant: {
        bpm_min: 100, bpm_max: 120,
        depth_min: 5.0,
        depth_max: 6.0,
        recoil_min: 0.8,
        elbow_angle_min: 160,
        visibility_conf: 0.45,
        ventilation_ratio: 30,
        ventilation_ratio_dual: 15,
        tilt_required: true, // 15–30° left lateral tilt per guidelines
    }
};

// ─── SLIDING WINDOW FOR BPM ─────────────────────────────────────────────────
const BPM_WINDOW_SIZE = 8; // Last N compression timestamps to smooth BPM

export class LocalRulesEngine {
    constructor() {
        this.language = 'fr';

        // Victim type + rescuer context
        this.victimType = 'adult';
        this.rescuerCount = 1;

        // Compression rhythm tracking (sliding window)
        this.compressionTimestamps = [];
        this.compressionCount = 0;
        this.lastChestY = null;           // Last chest Y position for depth proxy
        this.peakChestY = null;
        this.troughChestY = null;
        this.cyclePhase = 'idle';         // 'idle' | 'compressing' | 'releasing'

        // Stale data guard
        this.lastUpdateTime = Date.now();
        this.isModelLoaded = false;
    }

    /**
     * Configure the engine for a specific victim and rescuer scenario.
     * Call this when the user selects victim type or rescuer count.
     */
    configure({ victimType = 'adult', rescuerCount = 1, language = 'fr', isModelLoaded = false } = {}) {
        this.victimType = victimType;
        this.rescuerCount = rescuerCount;
        this.language = language;
        this.isModelLoaded = isModelLoaded;
        this.compressionTimestamps = [];
        this.compressionCount = 0;
    }

    /**
     * Main entrypoint. Accepts decoded pose data from TFLite.
     * @param {object|null} poseData - { chestY, elbowAngle, handConf, torsoHeight, numPersons }
     * @returns {{ metrics: object, ui_commands: array }}
     */
    evaluatePose(poseData = null) {
        const now = Date.now();
        const thresholds = THRESHOLDS[this.victimType] || THRESHOLDS.adult;
        const ui_commands = [];
        const metrics = {};

        // ── 0. No-model / No-visibility guard ──────────────────────────────────
        if (!this.isModelLoaded) {
            return this._noModelResult();
        }

        if (!poseData) {
            // No pose detected
            return this._noPersonResult();
        }

        const { chestY, elbowAngle, handConf, torsoHeight, numPersons } = poseData;

        // ── 1. Low visibility check ─────────────────────────────────────────────
        if (handConf < thresholds.visibility_conf) {
            ui_commands.push(this._cmd('low_visibility', 'HIGH',
                'Mains non visibles — repositionnez la caméra',
                'Hands not visible — reposition camera',
                'اليدان غير مرئيتان — أعد ضبط الكاميرا',
                handConf
            ));
            metrics.low_visibility_warning = true;
        }

        // ── 2. No Victim Detected ───────────────────────────────────────────────
        if (numPersons < 1) {
            return this._noPersonResult();
        }

        // ── 3. Elbow Angle (locked arms) ────────────────────────────────────────
        if (thresholds.elbow_angle_min > 0 && elbowAngle < thresholds.elbow_angle_min) {
            ui_commands.push(this._cmd('arms_bent', 'HIGH',
                `Tendez vos bras (${Math.round(elbowAngle)}°)`,
                `Straighten your arms (${Math.round(elbowAngle)}°)`,
                `مد ذراعيك (${Math.round(elbowAngle)}°)`,
                elbowAngle
            ));
        }

        // ── 4. Compression Depth proxy ──────────────────────────────────────────
        // Normalized chest displacement relative to torso height
        let depthProxy = 0;
        if (torsoHeight > 0 && this.lastChestY !== null) {
            depthProxy = Math.abs(chestY - this.lastChestY) / torsoHeight;
        }

        // Track min/max for recoil
        if (this.peakChestY === null || chestY < this.peakChestY) this.peakChestY = chestY;
        if (this.troughChestY === null || chestY > this.troughChestY) this.troughChestY = chestY;

        const depthNorm = torsoHeight > 0 ? Math.abs(this.troughChestY - this.peakChestY) / torsoHeight : 0;
        metrics.depth_proxy_norm = +depthNorm.toFixed(3);

        if (depthNorm < thresholds.depth_min / 100.0 && this.compressionCount > 3) {
            ui_commands.push(this._cmd('too_shallow', 'HIGH',
                'Appuyez plus fort', 'Push harder', 'اضغط بقوة أكبر', depthNorm
            ));
        } else if (depthNorm > thresholds.depth_max / 100.0) {
            ui_commands.push(this._cmd('too_deep', 'MEDIUM',
                'Trop fort — allégez la pression', 'Not too hard — ease pressure', 'لا تضغط بشدة', depthNorm
            ));
        }

        // ── 5. Recoil check ─────────────────────────────────────────────────────
        const range = Math.abs(this.troughChestY - this.peakChestY);
        const recoilFraction = range > 0 ? Math.min(1.0, Math.abs(chestY - this.troughChestY) / range) : 0;
        metrics.recoil_quality = +recoilFraction.toFixed(2);

        if (recoilFraction < thresholds.recoil_min && this.compressionCount > 3) {
            ui_commands.push(this._cmd('incomplete_recoil', 'MEDIUM',
                'Relâchez complètement entre chaque compression',
                'Allow full chest recoil between compressions',
                'اترك الصدر يعود بين كل ضغطة',
                recoilFraction
            ));
        }

        // ── 6. BPM computation (sliding window) ─────────────────────────────────
        // A compression event is detected when chest crosses below its moving average
        if (this.lastChestY !== null && chestY > this.lastChestY + 0.01) {
            // Going down → compression detected
            const ts = Date.now();
            this.compressionTimestamps.push(ts);
            this.compressionCount++;

            if (this.compressionTimestamps.length > BPM_WINDOW_SIZE) {
                this.compressionTimestamps.shift();
            }
        }
        this.lastChestY = chestY;

        let bpm = 0;
        if (this.compressionTimestamps.length >= 2) {
            const oldest = this.compressionTimestamps[0];
            const newest = this.compressionTimestamps[this.compressionTimestamps.length - 1];
            const durationSec = (newest - oldest) / 1000;
            bpm = durationSec > 0
                ? Math.round(((this.compressionTimestamps.length - 1) / durationSec) * 60)
                : 0;
        }
        metrics.bpm = bpm;
        metrics.compression_count = this.compressionCount;

        if (bpm > 0 && bpm < thresholds.bpm_min) {
            ui_commands.push(this._cmd('too_slow', 'HIGH',
                `Trop lent — cible ${thresholds.bpm_min}-${thresholds.bpm_max} cpm`,
                `Too slow — aim ${thresholds.bpm_min}-${thresholds.bpm_max} cpm`,
                `بطيء جداً — الهدف ${thresholds.bpm_min}-${thresholds.bpm_max}`,
                bpm
            ));
        } else if (bpm > thresholds.bpm_max) {
            ui_commands.push(this._cmd('too_fast', 'MEDIUM',
                `Trop rapide — ralentissez`,
                `Too fast — slow down`,
                `سريع جداً — تمهل`,
                bpm
            ));
        }

        // ── 7. Dual Rescuer Logic ───────────────────────────────────────────────
        const ventRatio = this.rescuerCount >= 2
            ? thresholds.ventilation_ratio_dual
            : thresholds.ventilation_ratio;

        metrics.ventilation_ratio = ventRatio;
        metrics.rescuer_count = this.rescuerCount;

        // Handoff reminder at compression ratio milestones
        if (this.rescuerCount >= 2 && this.compressionCount > 0 && this.compressionCount % 200 === 0) {
            ui_commands.push(this._cmd('rescuer_switch', 'MEDIUM',
                'Changement de secouriste recommandé',
                'Rescuer switch recommended',
                'يُنصح بتبديل المسعف',
                this.compressionCount
            ));
        }

        // ── 8. Pregnant tilt reminder ───────────────────────────────────────────
        if (thresholds.tilt_required) {
            ui_commands.push(this._cmd('pregnancy_tilt', 'MEDIUM',
                'Inclinez légèrement la victime vers la gauche',
                'Tilt victim slightly to their left side',
                'أمل الضحية قليلاً نحو يسارها',
                null
            ));
        }

        // ── 9. Infant 2-finger technique reminder ───────────────────────────────
        if (this.victimType === 'infant') {
            ui_commands.push(this._cmd('infant_technique', 'POSITIVE',
                'Technique 2 doigts — appuyer sur le sternum',
                '2-finger technique — press center of chest',
                'تقنية إصبعين — اضغط على القص',
                null
            ));
        }

        // ── 10. Positive feedback if all looks good ──────────────────────────────
        const hasErrors = ui_commands.some(c => ['CRITICAL', 'HIGH'].includes(c.severity));
        if (!hasErrors && bpm >= thresholds.bpm_min && bpm <= thresholds.bpm_max) {
            ui_commands.push(this._cmd('compressions_good', 'POSITIVE',
                'Compressions parfaites — continuez!',
                'Excellent compressions — keep going!',
                'ضغطات ممتازة — استمر!',
                bpm
            ));
        }

        metrics.elbow_angle = elbowAngle;
        metrics.victim_type = this.victimType;
        metrics.mode = 'offline';

        return {
            status: 'ACTIVE',
            metrics,
            ui_commands,
            low_visibility_warning: !!metrics.low_visibility_warning,
        };
    }

    // ─── HELPERS ─────────────────────────────────────────────────────────────

    _cmd(id, severity, text_fr, text_en, text_ar, value) {
        return { id, severity, text_fr, text_en, text_ar, value };
    }

    _noModelResult() {
        return {
            status: 'NO_MODEL',
            metrics: {},
            ui_commands: [this._cmd(
                'no_model', 'CRITICAL',
                'Modèle IA non chargé — patientez',
                'AI model not loaded — please wait',
                'نموذج الذكاء الاصطناعي لم يُحمَّل — يرجى الانتظار',
                null
            )],
            low_visibility_warning: false,
        };
    }

    _noPersonResult() {
        return {
            status: 'NO_PERSON',
            metrics: {},
            ui_commands: [this._cmd(
                'no_person_detected', 'CRITICAL',
                'Aucune personne détectée — positionnez la caméra',
                'No person detected — reposition camera',
                'لا يوجد شخص — أعد ضبط الكاميرا',
                null
            )],
            low_visibility_warning: true,
        };
    }
}
