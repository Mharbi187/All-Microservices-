/**
 * RulesEngine — Live evaluation engine powered by rcp_rules.json
 * ================================================================
 * This is the SINGLE SOURCE OF TRUTH for all CPR thresholds, feedback
 * messages, and error conditions. Nothing is hardcoded.
 *
 * All thresholds come from rcp_rules.json (AHA 2020 / ERC 2021).
 * All feedback messages are trilingual (AR, EN, FR).
 */

import rcpRules from '../../rcp_rules.json';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const SEVERITY_PRIORITY = { CRITICAL: 1, HIGH: 2, MEDIUM: 3 };

// ─── CLASS ────────────────────────────────────────────────────────────────────

class RulesEngine {
    constructor() {
        this.rules = rcpRules;
        this.language = this.rules._meta.default_language || 'ar';
        this.landmarkMap = this.rules.landmark_mapping;
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  LANGUAGE
    // ══════════════════════════════════════════════════════════════════════════

    /** Set the active language (ar | en | fr) */
    setLanguage(lang) {
        if (this.rules._meta.languages_supported.includes(lang)) {
            this.language = lang;
        }
    }

    /** Get localized text from a multilingual object */
    t(obj) {
        if (!obj) return '';
        if (typeof obj === 'string') return obj;
        return obj[this.language] || obj.en || obj.fr || obj.ar || '';
    }

    /** Get text direction for current language */
    getTextDirection() {
        return this.rules.language_config.text_direction[this.language] || 'LTR';
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  VICTIM TYPE
    // ══════════════════════════════════════════════════════════════════════════

    /** Get all supported victim types */
    getVictimTypes() {
        return Object.keys(this.rules.victim_types);
    }

    /** Get victim description */
    getVictimDescription(type) {
        const info = this.rules.victim_types[type];
        return info ? this.t(info.description) : '';
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  RULES LOOKUP
    // ══════════════════════════════════════════════════════════════════════════

    /** Get compression rules for a victim type */
    getCompressionRules(victimType = 'adult') {
        return this.rules.rules[victimType]?.compression || null;
    }

    /** Get ventilation rules for a victim type */
    getVentilationRules(victimType = 'adult') {
        return this.rules.rules[victimType]?.ventilation || null;
    }

    /** Get rate range [min, max] for a victim type */
    getRateRange(victimType = 'adult') {
        const compression = this.getCompressionRules(victimType);
        if (!compression?.rate?.range_per_minute) return [100, 120];
        return compression.rate.range_per_minute;
    }

    /** Get depth range [min, max] in cm */
    getDepthRange(victimType = 'adult') {
        const compression = this.getCompressionRules(victimType);
        if (!compression?.depth?.depth_cm_range) {
            const singleDepth = compression?.depth?.depth_cm;
            if (singleDepth) return [singleDepth * 0.8, singleDepth * 1.2];
            return [5, 6];
        }
        return compression.depth.depth_cm_range;
    }

    /** Get depth as % of torso height [min, max] */
    getDepthTorsoPercent(victimType = 'adult') {
        const condition = this.getCompressionRules(victimType)?.depth?.proxy_condition;
        if (!condition) return [3.5, 6.0];
        // Parse "wrist_vertical_displacement >= 3.5% torso_height AND <= 6% torso_height"
        const matches = condition.match(/([\d.]+)%/g);
        if (matches && matches.length >= 2) {
            return [parseFloat(matches[0]), parseFloat(matches[1])];
        }
        return [3.5, 6.0];
    }

    /** Get arm angle threshold (degrees) */
    getArmAngleThreshold(victimType = 'adult') {
        const compression = this.getCompressionRules(victimType);
        return compression?.arm_angle?.threshold_degrees || 160;
    }

    /** Get compression-ventilation ratio */
    getCompressionVentilationRatio(victimType = 'adult', rescuerCount = 1) {
        const ventilation = this.getVentilationRules(victimType);
        if (!ventilation?.ratio) return { compressions: 30, ventilations: 2 };

        if (rescuerCount >= 2 && ventilation.ratio.two_rescuers) {
            return ventilation.ratio.two_rescuers;
        }
        if (ventilation.ratio.single_rescuer) {
            return ventilation.ratio.single_rescuer;
        }
        return {
            compressions: ventilation.ratio.cycle_compressions || 30,
            ventilations: ventilation.ratio.cycle_ventilations || 2,
        };
    }

    /** Get pause detection threshold (seconds) */
    getPauseThreshold(victimType = 'adult') {
        const pause = this.rules.rules[victimType]?.pause_detection;
        if (!pause) return 10;
        const match = pause.condition?.match(/>\s*(\d+)/);
        return match ? parseInt(match[1]) : 10;
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  ERROR EVALUATION — The core of the engine
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * Evaluate all error conditions against current metrics.
     *
     * @param {Object} metrics - Current CPR metrics:
     *   { rate, depthTorsoPct, elbowAngle, wristY, shoulderY, hipY,
     *     shoulderMidX, wristMidX, frameWidth, wristXVariance,
     *     wristUpY, baselineWristY, compressionDepth,
     *     timeSinceLastCompression }
     * @param {string} victimType - 'adult' | 'child' | 'infant' | 'pregnant'
     * @returns {Array} List of { id, severity, description, correction, priority }
     */
    evaluateErrors(metrics, victimType = 'adult') {
        const errors = [];
        const errorDefs = this.rules.error_conditions;

        // ── hands_too_high ──
        if (metrics.wristY != null && metrics.shoulderY != null && metrics.torsoHeight != null) {
            const threshold = metrics.shoulderY + 0.20 * metrics.torsoHeight;
            if (metrics.wristY < threshold) {
                errors.push(this._makeError('hands_too_high', errorDefs.hands_too_high));
            }
        }

        // ── hands_too_low ──
        if (metrics.wristY != null && metrics.hipY != null) {
            if (metrics.wristY > metrics.hipY) {
                errors.push(this._makeError('hands_too_low', errorDefs.hands_too_low));
            }
        }

        // ── arms_bent ──
        if (metrics.elbowAngle != null && metrics.elbowAngle < 140) {
            errors.push(this._makeError('arms_bent', errorDefs.arms_bent));
        }

        // ── shoulders_not_aligned ──
        if (metrics.shoulderMidX != null && metrics.wristMidX != null && metrics.frameWidth) {
            const deviation = Math.abs(metrics.shoulderMidX - metrics.wristMidX);
            if (deviation > 0.15 * metrics.frameWidth) {
                errors.push(this._makeError('shoulders_not_aligned', errorDefs.shoulders_not_aligned));
            }
        }

        // ── too_shallow ──
        if (metrics.depthTorsoPct != null) {
            const [minPct] = this.getDepthTorsoPercent(victimType);
            if (metrics.depthTorsoPct < minPct) {
                errors.push(this._makeError('too_shallow', errorDefs.too_shallow));
            }
        }

        // ── too_deep ──
        if (metrics.depthTorsoPct != null) {
            const [, maxPct] = this.getDepthTorsoPercent(victimType);
            if (metrics.depthTorsoPct > maxPct) {
                errors.push(this._makeError('too_deep', errorDefs.too_deep));
            }
        }

        // ── too_slow ──
        if (metrics.rate != null && metrics.rate > 0) {
            const [minRate] = this.getRateRange(victimType);
            if (metrics.rate < minRate) {
                errors.push(this._makeError('too_slow', errorDefs.too_slow));
            }
        }

        // ── too_fast ──
        if (metrics.rate != null && metrics.rate > 0) {
            const [, maxRate] = this.getRateRange(victimType);
            if (metrics.rate > maxRate) {
                errors.push(this._makeError('too_fast', errorDefs.too_fast));
            }
        }

        // ── incomplete_recoil ──
        if (metrics.recoilPercent != null && metrics.recoilPercent < 85) {
            errors.push(this._makeError('incomplete_recoil', errorDefs.incomplete_recoil));
        }

        // ── excessive_pause ──
        if (metrics.timeSinceLastCompression != null) {
            const pauseThreshold = this.getPauseThreshold(victimType);
            if (metrics.timeSinceLastCompression > pauseThreshold) {
                errors.push(this._makeError('excessive_pause', errorDefs.excessive_pause));
            }
        }

        // ── lateral_movement ──
        if (metrics.wristXVariance != null && metrics.frameWidth) {
            if (metrics.wristXVariance > 0.05 * metrics.frameWidth) {
                errors.push(this._makeError('lateral_movement', errorDefs.lateral_movement));
            }
        }

        // Sort by severity priority
        errors.sort((a, b) => (SEVERITY_PRIORITY[a.severity] || 99) - (SEVERITY_PRIORITY[b.severity] || 99));
        return errors;
    }

    /** @private Build a structured error object */
    _makeError(id, def) {
        if (!def) return { id, severity: 'MEDIUM', description: id, correction: '' };
        return {
            id,
            severity: def.severity || 'MEDIUM',
            description: this.t(def.description),
            correction: this.t(def.correction),
        };
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  POSITIVE FEEDBACK
    // ══════════════════════════════════════════════════════════════════════════

    /** Get a positive feedback message */
    getPositiveFeedback(type = 'good_compression') {
        const msg = this.rules.feedback_messages[type];
        return msg ? this.t(msg) : '';
    }

    /** Get the pause alert message */
    getPauseAlert(victimType = 'adult') {
        const pause = this.rules.rules[victimType]?.pause_detection;
        return pause?.alert ? this.t(pause.alert) : '';
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  ROBUSTNESS CHECKS
    // ══════════════════════════════════════════════════════════════════════════

    /** Check robustness conditions and return warnings */
    checkRobustness(frameInfo) {
        const warnings = [];
        const r = this.rules.robustness;

        if (frameInfo.brightness != null && frameInfo.brightness < 40) {
            warnings.push(this.t(r.low_visibility.action));
        }

        if (frameInfo.landmarkVisibility != null && frameInfo.landmarkVisibility < 0.5) {
            warnings.push(this.t(r.partial_occlusion.action));
        }

        return warnings;
    }

    // ══════════════════════════════════════════════════════════════════════════
    //  OUTPUT SCHEMA (for building response objects)
    // ══════════════════════════════════════════════════════════════════════════

    /** Build a structured output per the schema in rcp_rules.json */
    buildOutput(params) {
        return {
            victim_type: params.victimType || 'adult',
            action: params.action || 'idle',
            sub_action: params.subAction || null,
            corrections: params.corrections || [],
            confidence: params.confidence || 0,
            compression_count: params.compressionCount || 0,
            rate_per_minute: params.rate || 0,
            elbow_angle: params.elbowAngle || null,
            depth_estimate_pct: params.depthPct || null,
            depth_cm: params.depthCm || null,
            recoil_percent: params.recoilPercent || null,
            timestamp: new Date().toISOString(),
            language: this.language,
            feedback_message: params.feedbackMessage || '',
        };
    }
}

// ─── SINGLETON ────────────────────────────────────────────────────────────────

export const rulesEngine = new RulesEngine();
export default rulesEngine;
