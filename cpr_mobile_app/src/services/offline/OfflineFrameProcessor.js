/**
 * Offline Frame Processor (Edge AI) — Production TFLite
 * ===================================================
 * Runs ML Inference locally using react-native-fast-tflite.
 * Uses local models bundled in assets/ for zero-latency, offline CPR analysis.
 *
 * Model: assets/pose.tflite  — YOLOv8 pose (128x128 input, [1,56,8400] output)
 * Fallback: assets/best.tflite — YOLO detection only (no keypoints)
 */

import { loadTensorflowModel } from 'react-native-fast-tflite';
import { Asset } from 'expo-asset';
import { LocalRulesEngine } from './LocalRulesEngine';
import * as ImageManipulator from 'expo-image-manipulator';
import { Buffer } from 'buffer';
import jpeg from 'jpeg-js';

// ─── YOLO POSE OUTPUT CONSTANTS ──────────────────────────────────────────────
// Output tensor format for YOLOv8-pose exported to TFLite: [1, 56, 8400]
// The 56 channels = 4 (bbox) + 1 (conf) + 17*3 (keypoints: x,y,conf each)
const NUM_PROPOSALS = 8400;
const BBOX_CHANNELS = 5;   // cx, cy, w, h, confidence
const NUM_KEYPOINTS = 17;
const KP_CHANNELS = 3;   // x, y, confidence per keypoint
const TOTAL_CHANNELS = BBOX_CHANNELS + NUM_KEYPOINTS * KP_CHANNELS; // 56

// COCO keypoint indices used for CPR analysis
const KP = {
    LEFT_SHOULDER: 5,
    RIGHT_SHOULDER: 6,
    LEFT_ELBOW: 7,
    RIGHT_ELBOW: 8,
    LEFT_WRIST: 9,
    RIGHT_WRIST: 10,
    LEFT_HIP: 11,
    RIGHT_HIP: 12,
};

const CONF_THRESHOLD = 0.45;
const INPUT_SIZE = 128;

const OFFLINE_FRAME_CONFIG = {
    CAPTURE_INTERVAL_MS: 60, // ~16fps for offline edge processing
};

// ─── GEOMETRY HELPERS ────────────────────────────────────────────────────────
function angleBetweenPoints(A, B, C) {
    // Angle at B between vectors BA and BC
    const BAx = A.x - B.x, BAy = A.y - B.y;
    const BCx = C.x - B.x, BCy = C.y - B.y;
    const dot = BAx * BCx + BAy * BCy;
    const magBA = Math.sqrt(BAx ** 2 + BAy ** 2);
    const magBC = Math.sqrt(BCx ** 2 + BCy ** 2);
    if (magBA === 0 || magBC === 0) return 180;
    return (Math.acos(Math.max(-1, Math.min(1, dot / (magBA * magBC)))) * 180) / Math.PI;
}

/**
 * Decode the raw flat TFLite output tensor into CPR pose data.
 * @param {Float32Array} tensor - flat [1 * 56 * 8400] tensor
 * @returns {{ chestY, elbowAngle, handConf, torsoHeight, numPersons } | null}
 */
function decodePoseTensor(tensor) {
    // Find best detection (highest confidence box)
    let bestConf = 0;
    let bestIdx = -1;

    for (let i = 0; i < NUM_PROPOSALS; i++) {
        const conf = tensor[4 * NUM_PROPOSALS + i]; // channel 4 = objectness
        if (conf > bestConf) {
            bestConf = conf;
            bestIdx = i;
        }
    }

    if (bestIdx === -1 || bestConf < CONF_THRESHOLD) {
        return null; // No person detected above threshold
    }

    // Extract keypoints for the best detection
    // Layout: channel  = BBOX_CHANNELS + kpIndex * KP_CHANNELS + {0:x, 1:y, 2:conf}
    function getKP(kpIdx) {
        const base = BBOX_CHANNELS + kpIdx * KP_CHANNELS;
        return {
            x: tensor[(base + 0) * NUM_PROPOSALS + bestIdx],
            y: tensor[(base + 1) * NUM_PROPOSALS + bestIdx],
            conf: tensor[(base + 2) * NUM_PROPOSALS + bestIdx],
        };
    }

    const lShoulder = getKP(KP.LEFT_SHOULDER);
    const rShoulder = getKP(KP.RIGHT_SHOULDER);
    const lElbow = getKP(KP.LEFT_ELBOW);
    const rElbow = getKP(KP.RIGHT_ELBOW);
    const lWrist = getKP(KP.LEFT_WRIST);
    const rWrist = getKP(KP.RIGHT_WRIST);
    const lHip = getKP(KP.LEFT_HIP);
    const rHip = getKP(KP.RIGHT_HIP);

    // Chest Y = midpoint of shoulders (normalized 0–1)
    const chestY = (lShoulder.y + rShoulder.y) / 2;

    // Torso height = distance from shoulders to hips (normalized)
    const shoulderMidY = chestY;
    const hipMidY = (lHip.y + rHip.y) / 2;
    const torsoHeight = Math.abs(hipMidY - shoulderMidY);

    // Elbow angle: use the arm with higher wrist confidence (the active compression arm)
    const lElbowAngle = angleBetweenPoints(lShoulder, lElbow, lWrist);
    const rElbowAngle = angleBetweenPoints(rShoulder, rElbow, rWrist);
    const elbowAngle = lWrist.conf > rWrist.conf ? lElbowAngle : rElbowAngle;

    // Hand confidence: best wrist keypoint confidence
    const handConf = Math.max(lWrist.conf, rWrist.conf);

    return {
        chestY,
        elbowAngle,
        handConf,
        torsoHeight,
        numPersons: 1,
    };
}

// ─── PROCESSOR CLASS ─────────────────────────────────────────────────────────
class OfflineFrameProcessor {
    constructor() {
        this.cameraRef = null;
        this.isProcessing = false;
        this.isRunning = false;
        this.intervalId = null;

        this.onMetricsUpdate = null;
        this.onConnectionStatus = null;
        this.onError = null;

        this.rulesEngine = new LocalRulesEngine();
        this.tfliteModel = null;
        this.isModelLoaded = false;

        this.framesProcessed = 0;
        this.avgLatencyMs = 0;

        this._initModels();
    }

    async _initModels() {
        try {
            console.log('[OfflineProcessor] Loading pose.tflite from assets...');

            // Resolve the asset URI so react-native-fast-tflite can access it
            const [asset] = await Asset.loadAsync(require('../../../assets/pose.tflite'));

            this.tfliteModel = await loadTensorflowModel({
                url: asset.localUri || asset.uri,
            });

            this.isModelLoaded = true;
            this.rulesEngine.configure({ isModelLoaded: true });
            console.log('[OfflineProcessor] ✅ pose.tflite loaded successfully. Offline AI ready.');
        } catch (error) {
            console.error('[OfflineProcessor] ❌ Failed to load pose.tflite:', error);
            this.isModelLoaded = false;
            // Fallback: LocalRulesEngine will emit a NO_MODEL ui_command to the user
        }
    }

    setCallbacks({ onMetricsUpdate, onConnectionStatus, onError }) {
        this.onMetricsUpdate = onMetricsUpdate;
        this.onConnectionStatus = onConnectionStatus;
        this.onError = onError;
    }

    setCameraRef(ref) {
        this.cameraRef = ref;
    }

    configure(options) {
        this.rulesEngine.configure({ ...options, isModelLoaded: this.isModelLoaded });
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        console.log('[OfflineProcessor] Starting Edge AI pipeline...');

        if (this.onConnectionStatus) {
            this.onConnectionStatus({
                connected: true,
                latencyMs: 15,
                avgLatencyMs: 15,
                mode: 'offline',
            });
        }

        this.intervalId = setInterval(() => {
            this._processNextFrame();
        }, OFFLINE_FRAME_CONFIG.CAPTURE_INTERVAL_MS);
    }

    stop() {
        this.isRunning = false;
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.isProcessing = false;
        console.log('[OfflineProcessor] Stopped. Frames processed:', this.framesProcessed);
    }

    async _processNextFrame() {
        if (this.isProcessing || !this.cameraRef?.current || !this.isRunning) return;

        this.isProcessing = true;
        const startTime = Date.now();

        try {
            let poseData = null;

            // ── Real TFLite Inference ──────────────────────────────────────────
            if (this.isModelLoaded && this.tfliteModel) {
                // Capture photo from camera ref
                const photo = await this.cameraRef.current.takePictureAsync({
                    quality: 0.1,
                    base64: false,
                    skipProcessing: true,
                });

                // Resize image to 128x128 and get base64
                const manipResult = await ImageManipulator.manipulateAsync(
                    photo.uri,
                    [{ resize: { width: INPUT_SIZE, height: INPUT_SIZE } }],
                    { format: 'jpeg', base64: true }
                );

                // Decode base64 JPEG into raw RGBA pixels
                const jpegData = Buffer.from(manipResult.base64, 'base64');
                const rawImageData = jpeg.decode(jpegData, { useTArray: true }); // Returns Uint8Array in rawImageData.data

                // Build normalized Float32 input (128x128x3) - RGB only
                const bufferSize = INPUT_SIZE * INPUT_SIZE * 3;
                const inputTensor = new Float32Array(bufferSize);
                
                let tensorIdx = 0;
                // rawImageData.data is RGBA (4 channels)
                for (let i = 0; i < rawImageData.data.length; i += 4) {
                    // Normalize to 0.0 - 1.0 (YOLOv8 usually expects normalized RGB)
                    inputTensor[tensorIdx++] = rawImageData.data[i] / 255.0;     // R
                    inputTensor[tensorIdx++] = rawImageData.data[i + 1] / 255.0; // G
                    inputTensor[tensorIdx++] = rawImageData.data[i + 2] / 255.0; // B
                }

                // Run model inference
                const outputs = await this.tfliteModel.run([inputTensor]);
                const rawTensor = outputs[0]; // Float32Array of shape [1, 56, 8400]

                // Decode bounding boxes + keypoints from YOLO pose output
                poseData = decodePoseTensor(rawTensor);
            }

            // ── Rules Engine Evaluation ────────────────────────────────────────
            const localResults = this.rulesEngine.evaluatePose(poseData);

            const latency = Date.now() - startTime;
            this.framesProcessed++;
            this.avgLatencyMs =
                ((this.framesProcessed - 1) * this.avgLatencyMs + latency) / this.framesProcessed;

            if (this.onMetricsUpdate) {
                this.onMetricsUpdate({
                    status: localResults.status,
                    metrics: localResults.metrics,
                    ui_commands: localResults.ui_commands,
                    low_visibility_warning: localResults.low_visibility_warning,
                    latencyMs: latency,
                    avgLatencyMs: Math.round(this.avgLatencyMs),
                    framesProcessed: this.framesProcessed,
                    mode: 'offline',
                });
            }

        } catch (error) {
            console.error('[OfflineProcessor] Frame processing error:', error);
        } finally {
            this.isProcessing = false;
        }
    }

    getStats() {
        return {
            framesSent: this.framesProcessed,
            framesProcessed: this.framesProcessed,
            avgLatencyMs: Math.round(this.avgLatencyMs),
            consecutiveErrors: 0,
            isRunning: this.isRunning,
            isProcessing: this.isProcessing,
            mode: 'offline',
        };
    }

    reset() {
        this.stop();
        this.framesProcessed = 0;
        this.avgLatencyMs = 0;
        this.rulesEngine.configure({ isModelLoaded: this.isModelLoaded });
    }
}

export const offlineFrameProcessor = new OfflineFrameProcessor();
export default offlineFrameProcessor;
