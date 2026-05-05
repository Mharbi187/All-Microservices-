/**
 * Pose Frame Processor — Real pipeline orchestrator
 * ===================================================
 * Captures frames from the camera and sends them to the backend
 * for ML inference (MediaPipe + YOLO). Receives pose data and metrics,
 * then runs them through CPRAnalysisService + RulesEngine for feedback.
 *
 * No simulation stubs — this processes real camera data.
 */

import { cprAnalysisService } from './CPRAnalysisService';
import { backendAPI } from './BackendAPIService';
import { rulesEngine } from './RulesEngine';

// ─── CONFIG ───────────────────────────────────────────────────────────────────

const FRAME_CONFIG = {
    // Frame capture interval (ms) — 2 FPS to avoid overwhelming backend
    CAPTURE_INTERVAL_MS: 500,

    // Photo quality for base64 encoding (0-1) — lower = smaller payload
    CAPTURE_QUALITY: 0.3,

    // Max time to wait for backend response before skipping
    BACKEND_TIMEOUT_MS: 3000,
};

// ─── SERVICE ──────────────────────────────────────────────────────────────────

class PoseFrameProcessor {
    constructor() {
        this.cameraRef = null;
        this.isProcessing = false;
        this.isRunning = false;
        this.intervalId = null;

        // Callbacks
        this.onMetricsUpdate = null;
        this.onConnectionStatus = null;
        this.onError = null;

        // Stats
        this.framesSent = 0;
        this.framesProcessed = 0;
        this.avgLatencyMs = 0;
        this.lastProcessTime = 0;
        this.consecutiveErrors = 0;
    }

    /**
     * Configure callbacks for the frame processor.
     */
    setCallbacks({ onMetricsUpdate, onConnectionStatus, onError }) {
        this.onMetricsUpdate = onMetricsUpdate;
        this.onConnectionStatus = onConnectionStatus;
        this.onError = onError;
    }

    /**
     * Set the camera reference for frame capture.
     */
    setCameraRef(ref) {
        this.cameraRef = ref;
    }

    /**
     * Start the real-time frame processing loop.
     * Captures frames from camera → sends to backend → evaluates with RulesEngine.
     */
    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.consecutiveErrors = 0;

        console.log('[FrameProcessor] Starting real pipeline at', FRAME_CONFIG.CAPTURE_INTERVAL_MS, 'ms interval');

        this.intervalId = setInterval(() => {
            this._processNextFrame();
        }, FRAME_CONFIG.CAPTURE_INTERVAL_MS);
    }

    /**
     * Stop the frame processing loop.
     */
    stop() {
        this.isRunning = false;
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.isProcessing = false;
        console.log('[FrameProcessor] Stopped. Sent:', this.framesSent, 'Processed:', this.framesProcessed);
    }

    /**
     * Process the next camera frame.
     * Skips if the previous frame is still being processed (backpressure).
     */
    async _processNextFrame() {
        // Skip if previous frame still processing (backpressure control)
        if (this.isProcessing) return;
        if (!this.cameraRef?.current) return;

        this.isProcessing = true;
        const startTime = Date.now();

        try {
            // ── 1. Capture frame from camera ──
            // Expo CameraView uses takePictureAsync
            let photo = null;
            try {
                photo = await this.cameraRef.current.takePictureAsync({
                    base64: true,
                    quality: FRAME_CONFIG.CAPTURE_QUALITY,
                    skipProcessing: true,
                });
            } catch (captureErr) {
                // Camera might not be ready yet
                console.log('[FrameProcessor] Capture failed:', captureErr.message);
                this.isProcessing = false;
                return;
            }

            if (!photo?.base64) {
                this.isProcessing = false;
                return;
            }

            this.framesSent++;

            // ── 2. Send to backend for ML processing ──
            let backendResponse;
            try {
                backendResponse = await backendAPI.processFrame(photo.base64);
            } catch (netErr) {
                this._handleBackendError({ error: netErr.message });
                this.isProcessing = false;
                return;
            }

            const latency = Date.now() - startTime;

            // ── 3. Update latency stats ──
            this.framesProcessed++;
            this.avgLatencyMs = ((this.framesProcessed - 1) * this.avgLatencyMs + latency) / this.framesProcessed;

            if (backendResponse.success) {
                this.consecutiveErrors = 0;

                // ── 4. Process backend metrics through RulesEngine ──
                const analysis = cprAnalysisService.processBackendMetrics(backendResponse);

                // ── 5. Deliver results ──
                if (this.onMetricsUpdate) {
                    this.onMetricsUpdate({
                        ...analysis,
                        latencyMs: latency,
                        avgLatencyMs: Math.round(this.avgLatencyMs),
                        framesProcessed: this.framesProcessed,
                    });
                }

                if (this.onConnectionStatus) {
                    this.onConnectionStatus({
                        connected: true,
                        latencyMs: latency,
                        avgLatencyMs: Math.round(this.avgLatencyMs),
                    });
                }
            } else {
                // Backend returned an error but connection worked
                this.consecutiveErrors++;
                console.log('[FrameProcessor] Backend error:', backendResponse.error);

                // Still update connection status as "connected but erroring"
                if (this.onConnectionStatus) {
                    this.onConnectionStatus({
                        connected: true, // Connection works, just processing failed
                        latencyMs: latency,
                        error: backendResponse.error,
                    });
                }
            }
        } catch (error) {
            this._handleBackendError({ error: error.message });
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Handle backend errors with graceful degradation.
     */
    _handleBackendError(response) {
        this.consecutiveErrors++;

        if (this.onConnectionStatus) {
            this.onConnectionStatus({
                connected: false,
                error: response.error || 'Connection lost',
                consecutiveErrors: this.consecutiveErrors,
            });
        }

        if (this.onError && this.consecutiveErrors >= 3) {
            this.onError({
                type: 'connection_lost',
                message: 'Backend connection lost. Check server and WiFi.',
                consecutiveErrors: this.consecutiveErrors,
            });
        }
    }

    /**
     * Get processing statistics.
     */
    getStats() {
        return {
            framesSent: this.framesSent,
            framesProcessed: this.framesProcessed,
            avgLatencyMs: Math.round(this.avgLatencyMs),
            consecutiveErrors: this.consecutiveErrors,
            isRunning: this.isRunning,
            isProcessing: this.isProcessing,
        };
    }

    /**
     * Reset all state.
     */
    reset() {
        this.stop();
        this.framesSent = 0;
        this.framesProcessed = 0;
        this.avgLatencyMs = 0;
        this.consecutiveErrors = 0;
        cprAnalysisService.reset();
    }
}

// ─── SINGLETON ────────────────────────────────────────────────────────────────

export const poseFrameProcessor = new PoseFrameProcessor();
export { FRAME_CONFIG };
export default poseFrameProcessor;
