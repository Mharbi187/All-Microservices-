"""
CPR Backend API Server
=======================
Flask server providing REST API and WebSocket for real-time CPR detection.
The mobile app connects to this server to use Python-based pose detection.

Features:
- WebSocket for real-time video frame processing
- REST endpoints for session management
- Cross-platform support (iOS/Android)

Usage:
    python api_server.py                    # Start server on default port 5000
    python api_server.py --port 8080        # Custom port
    python api_server.py --host 0.0.0.0     # Allow external connections

Author: CPR Vision Team
"""

import os
os.environ['PROTOCOL_BUFFERS_PYTHON_IMPLEMENTATION'] = 'python'
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'

import json
import base64
import time
import threading
import argparse
from io import BytesIO
from datetime import datetime
from flask import Flask, request, jsonify, Response
from flask_cors import CORS
import cv2
import numpy as np

# Import CPR Detection (YOLOv8-powered)
try:
    from run_cpr_detection import CPRDetector, YOLO_AVAILABLE
    DETECTOR_AVAILABLE = YOLO_AVAILABLE
except ImportError as e:
    print(f"Warning: Cannot import CPRDetector: {e}")
    DETECTOR_AVAILABLE = False
    YOLO_AVAILABLE = False


# ============================================
# FLASK APP CONFIGURATION
# ============================================

app = Flask(__name__)
CORS(app)  # Enable CORS for mobile app

# Handle numpy types in JSON serialization
from flask.json.provider import DefaultJSONProvider

class NumpyJSONProvider(DefaultJSONProvider):
    def default(self, obj):
        if isinstance(obj, (np.integer,)):
            return int(obj)
        if isinstance(obj, (np.floating,)):
            return float(obj)
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        if isinstance(obj, np.bool_):
            return bool(obj)
        return super().default(obj)

app.json_provider_class = NumpyJSONProvider
app.json = NumpyJSONProvider(app)
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB for large base64 frames

# Global session storage
sessions = {}
session_lock = threading.Lock()


class CPRSession:
    """Represents a CPR assistance session."""
    
    def __init__(self, session_id: str, victim_type: str = "ADULT"):
        self.session_id = session_id
        self.victim_type = victim_type
        self.created_at = datetime.now()
        self.last_activity = time.time()
        self.detector = CPRDetector()
        self.frame_count = 0
        self.metrics_history = []
    
    def process_frame(self, frame: np.ndarray):
        """Process a video frame and return metrics."""
        self.frame_count += 1
        self.last_activity = time.time()
        
        processed_frame, metrics = self.detector.process_frame(frame)
        
        # Store metrics history (last 100)
        self.metrics_history.append({
            'timestamp': time.time(),
            **metrics
        })
        if len(self.metrics_history) > 100:
            self.metrics_history.pop(0)
        
        return processed_frame, metrics
    
    def get_summary(self):
        """Get session summary."""
        return {
            'session_id': self.session_id,
            'victim_type': self.victim_type,
            'frame_count': self.frame_count,
            'duration_seconds': time.time() - self.created_at.timestamp(),
            'compression_count': self.detector.compression_count,
            'current_bpm': self.detector.current_bpm,
            'avg_depth_cm': float(np.mean(self.detector.depths_px)) if self.detector.depths_px else 0
        }
    
    def reset(self):
        """Reset session counters."""
        self.detector.reset()
        self.metrics_history.clear()
    
    def cleanup(self):
        """Release resources."""
        self.detector.release()


# ============================================
# REST API ENDPOINTS
# ============================================

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({
        'status': 'healthy',
        'server': 'CPR Assistant API',
        'version': '2.0.0-yolo',
        'yolo_available': YOLO_AVAILABLE,
        'detector_available': DETECTOR_AVAILABLE,
        'active_sessions': len(sessions),
        'timestamp': datetime.now().isoformat()
    })


@app.route('/api/session/create', methods=['POST'])
def create_session():
    """
    Create a new CPR session.
    
    Request body:
    {
        "victim_type": "ADULT" | "CHILD" | "INFANT",
        "rescuer_count": 1 | 2
    }
    """
    try:
        data = request.get_json() or {}
        victim_type = data.get('victim_type', 'ADULT')
        
        # Generate session ID
        session_id = f"cpr_{int(time.time() * 1000)}"
        
        with session_lock:
            # Cleanup old sessions (older than 30 minutes)
            current_time = time.time()
            expired = [sid for sid, s in sessions.items() 
                      if current_time - s.last_activity > 1800]
            for sid in expired:
                sessions[sid].cleanup()
                del sessions[sid]
            
            # Create new session
            sessions[session_id] = CPRSession(session_id, victim_type)
        
        return jsonify({
            'success': True,
            'session_id': session_id,
            'victim_type': victim_type,
            'message': 'Session created successfully'
        })
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/session/<session_id>/process', methods=['POST'])
def process_frame(session_id):
    """
    Process a video frame from the mobile app.
    
    Request body:
    {
        "frame": "base64_encoded_jpeg_image"
    }
    
    Response:
    {
        "success": true,
        "metrics": {
            "bpm": 105,
            "compression_count": 42,
            "depth_cm": 5.5,
            "recoil_quality": 95,
            "guidance": "Bon rythme!"
        }
    }
    """
    try:
        if session_id not in sessions:
            return jsonify({'success': False, 'error': 'Session not found'}), 404
        
        data = request.get_json()
        if not data or 'frame' not in data:
            return jsonify({'success': False, 'error': 'No frame provided'}), 400
        
        # Decode base64 image
        frame_data = base64.b64decode(data['frame'])
        nparr = np.frombuffer(frame_data, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if frame is None:
            return jsonify({'success': False, 'error': 'Invalid frame data'}), 400
        
        # Process frame
        session = sessions[session_id]
        processed_frame, metrics = session.process_frame(frame)
        
        # Generate guidance message
        guidance = generate_guidance(metrics)
        
        # Encode processed frame (optional - for debugging)
        # _, buffer = cv2.imencode('.jpg', processed_frame, [cv2.IMWRITE_JPEG_QUALITY, 70])
        # processed_base64 = base64.b64encode(buffer).decode('utf-8')
        
        return jsonify({
            'success': True,
            'metrics': {
                'bpm': round(metrics.get('bpm', 0), 1),
                'compression_count': metrics.get('compression_count', 0),
                'depth_cm': round(metrics.get('depth_cm', 0), 1),
                'depth_torso_pct': round(metrics.get('depth_torso_pct', 0), 1),
                'recoil_quality': round(metrics.get('recoil_quality', 100), 0),
                'elapsed_time': round(metrics.get('elapsed_time', 0), 1),
                'arm_angle': metrics.get('arm_angle'),
                'hands_together': metrics.get('hands_together', False),
                'victim_type': metrics.get('victim_type', 'adult'),
                'victim_confidence': metrics.get('victim_confidence', 0),
                'time_since_last_compression': metrics.get('time_since_last_compression', 0),
            },
            'guidance': guidance,
        })
    
    except Exception as e:
        import traceback
        print(f"  [ERROR] /process: {e}")
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/session/<session_id>/status', methods=['GET'])
def get_session_status(session_id):
    """Get current session status and metrics."""
    try:
        if session_id not in sessions:
            return jsonify({'success': False, 'error': 'Session not found'}), 404
        
        session = sessions[session_id]
        summary = session.get_summary()
        
        return jsonify({
            'success': True,
            **summary
        })
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/session/<session_id>/reset', methods=['POST'])
def reset_session(session_id):
    """Reset session counters."""
    try:
        if session_id not in sessions:
            return jsonify({'success': False, 'error': 'Session not found'}), 404
        
        sessions[session_id].reset()
        
        return jsonify({
            'success': True,
            'message': 'Session reset successfully'
        })
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/session/<session_id>/end', methods=['POST'])
def end_session(session_id):
    """End and cleanup a session."""
    try:
        if session_id not in sessions:
            return jsonify({'success': False, 'error': 'Session not found'}), 404
        
        session = sessions[session_id]
        summary = session.get_summary()
        session.cleanup()
        
        with session_lock:
            del sessions[session_id]
        
        return jsonify({
            'success': True,
            'message': 'Session ended',
            'summary': summary
        })
    
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/protocols', methods=['GET'])
def get_protocols():
    """Get available CPR protocols."""
    return jsonify({
        'protocols': [
            {
                'id': 'ADULT',
                'name': 'Adulte',
                'name_ar': 'بالغ',
                'bpm_range': [100, 120],
                'depth_cm': [5, 6],
                'ratio': '30:2',
                'icon': '👨'
            },
            {
                'id': 'CHILD',
                'name': 'Enfant',
                'name_ar': 'طفل',
                'bpm_range': [100, 120],
                'depth_cm': [4, 5],
                'ratio': '30:2 ou 15:2',
                'icon': '👦'
            },
            {
                'id': 'INFANT',
                'name': 'Nourrisson',
                'name_ar': 'رضيع',
                'bpm_range': [100, 120],
                'depth_cm': [3, 4],
                'ratio': '30:2 ou 15:2',
                'icon': '👶'
            }
        ]
    })


# ============================================
# HELPER FUNCTIONS
# ============================================

def generate_guidance(metrics: dict) -> dict:
    """Generate guidance message based on metrics."""
    bpm = metrics.get('bpm', 0)
    arm_angle = metrics.get('arm_angle')
    depth_cm = metrics.get('depth_cm', 0)
    pause = metrics.get('time_since_last_compression', 0)

    # Priority 1: Arm angle
    if arm_angle is not None and arm_angle < 150:
        return {
            'type': 'critical',
            'text_fr': 'Gardez les bras tendus!',
            'text_ar': 'أبقِ ذراعيك مستقيمتين!',
            'text_en': 'Keep arms straight!'
        }

    # Priority 2: Excessive pause
    if pause > 10 and bpm > 0:
        return {
            'type': 'critical',
            'text_fr': 'Reprenez les compressions immédiatement!',
            'text_ar': 'استأنف الضغط فوراً!',
            'text_en': 'Resume compressions immediately!'
        }

    # Priority 3: BPM
    if bpm <= 0:
        return {
            'type': 'info',
            'text_fr': 'Positionnez vos mains et commencez les compressions',
            'text_ar': 'ضع يديك وابدأ الضغط',
            'text_en': 'Position your hands and start compressions'
        }
    elif bpm < 100:
        return {
            'type': 'warning',
            'text_fr': 'Plus vite! Augmentez le rythme',
            'text_ar': 'أسرع! زد السرعة',
            'text_en': 'Faster! Increase the rate'
        }
    elif bpm > 120:
        return {
            'type': 'warning',
            'text_fr': 'Ralentissez légèrement',
            'text_ar': 'أبطئ قليلاً',
            'text_en': 'Slow down slightly'
        }

    # Priority 4: Depth
    if depth_cm > 0 and depth_cm < 5:
        return {
            'type': 'warning',
            'text_fr': 'Appuyez plus fort! Profondeur insuffisante',
            'text_ar': 'اضغط أقوى! العمق غير كافٍ',
            'text_en': 'Push harder! Depth insufficient'
        }

    return {
        'type': 'success',
        'text_fr': 'Excellent! Bon rythme',
        'text_ar': 'ممتاز! إيقاع جيد',
        'text_en': 'Excellent! Good rhythm'
    }


# ============================================
# MAIN
# ============================================

def main():
    parser = argparse.ArgumentParser(description='CPR Backend API Server')
    parser.add_argument('--host', default='0.0.0.0', help='Host address')
    parser.add_argument('--port', type=int, default=5000, help='Port number')
    parser.add_argument('--debug', action='store_true', help='Debug mode')
    args = parser.parse_args()
    
    print(f"\n{'='*50}")
    print("  CPR Assistant - Backend API Server")
    print(f"{'='*50}")
    print(f"  Server: http://{args.host}:{args.port}")
    print(f"  Health: http://{args.host}:{args.port}/api/health")
    print(f"  Debug: {args.debug}")
    print(f"{'='*50}")
    print("\nEndpoints:")
    print("  POST /api/session/create    - Create new session")
    print("  POST /api/session/{id}/process - Process frame")
    print("  GET  /api/session/{id}/status  - Get metrics")
    print("  POST /api/session/{id}/end     - End session")
    print(f"{'='*50}\n")
    
    app.run(host=args.host, port=args.port, debug=args.debug, threaded=True)


if __name__ == '__main__':
    main()
