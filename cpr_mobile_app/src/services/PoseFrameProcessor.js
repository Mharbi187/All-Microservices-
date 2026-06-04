/**
 * Pose Frame Processor — Real pipeline orchestrator
 * ===================================================
 * Captures frames from the camera and sends them to the backend
 * for ML inference (MediaPipe + YOLO). Receives pose data and metrics,
 * then runs them through CPRAnalysisService + RulesEngine for feedback.
 *
 * No simulation stubs — this processes real camera data.
 */

import { backendAPI } from './BackendAPIService';

// ─── CONFIG ───────────────────────────────────────────────────────────────────

const FRAME_CONFIG = {
    CAPTURE_INTERVAL_MS: 60,        // Base interval (~16 FPS)
    ADAPTIVE_MAX_INTERVAL_MS: 500,  // Max slowdown (2 FPS) under thermal pressure
    ADAPTIVE_LATENCY_THRESHOLD_MS: 2000, // Avg latency above this triggers throttle
    CAPTURE_QUALITY: 0.1,
    BACKEND_TIMEOUT_MS: 6000,
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

        // Adaptive frame rate state
        this.currentInterval = FRAME_CONFIG.CAPTURE_INTERVAL_MS;
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
        if (!this.isRunning) return;   // Bail if stopped between ticks

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

            // Bail if stopped while capturing
            if (!this.isRunning) {
                this.isProcessing = false;
                return;
            }

            // ── 2. Send to backend for ML processing ──
            let backendResponse;
            try {
                backendResponse = await backendAPI.processFrame(photo.uri, photo.base64);
            } catch (netErr) {
                this._handleBackendError({ error: netErr.message });
                this.isProcessing = false;
                return;
            }

            const latency = Date.now() - startTime;

            // ── 3. Update latency stats ──
            this.framesProcessed++;
            this.avgLatencyMs = ((this.framesProcessed - 1) * this.avgLatencyMs + latency) / this.framesProcessed;

            // Adaptive frame rate: slow down if backend is struggling
            if (this.avgLatencyMs > FRAME_CONFIG.ADAPTIVE_LATENCY_THRESHOLD_MS) {
                this.currentInterval = Math.min(
                    this.currentInterval * 1.5,
                    FRAME_CONFIG.ADAPTIVE_MAX_INTERVAL_MS
                );
                // Restart interval at new rate
                if (this.intervalId) {
                    clearInterval(this.intervalId);
                    this.intervalId = setInterval(() => this._processNextFrame(), this.currentInterval);
                    console.log(`[FrameProcessor] Throttled to ${Math.round(this.currentInterval)}ms`);
                }
            } else if (this.currentInterval > FRAME_CONFIG.CAPTURE_INTERVAL_MS) {
                // Recovery — restore base interval
                this.currentInterval = FRAME_CONFIG.CAPTURE_INTERVAL_MS;
                if (this.intervalId) {
                    clearInterval(this.intervalId);
                    this.intervalId = setInterval(() => this._processNextFrame(), this.currentInterval);
                }
            }

            if (backendResponse.success) {
                this.consecutiveErrors = 0;

                // ── 4. Deliver backend's exact results ──
                // The backend (Layer 6) now evaluates all rules and returns metrics + ui_commands.
                if (this.onMetricsUpdate) {
                    this.onMetricsUpdate({
                        status: backendResponse.status,
                        metrics: backendResponse.metrics || {},
                        ui_commands: backendResponse.ui_commands || [],
                        low_visibility_warning: backendResponse.low_visibility_warning,
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
    }
}

// ─── SINGLETON ────────────────────────────────────────────────────────────────

export const poseFrameProcessor = new PoseFrameProcessor();
export { FRAME_CONFIG };
export default poseFrameProcessor;
