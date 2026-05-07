import argparse
import cv2
import time
import asyncio
from cpr_vision_system.pipeline import CPRPipeline

async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--video", type=str, required=True, help="Path to video file")
    args = parser.parse_args()

    pipeline = CPRPipeline(session_id="offline_test")
    cap = cv2.VideoCapture(args.video)

    if not cap.isOpened():
        print(f"Error: Cannot open video {args.video}")
        return

    print("------------------------------------------")
    print(f"Testing local video: {args.video}")
    print("------------------------------------------")
    
    fps = cap.get(cv2.CAP_PROP_FPS)
    if fps <= 0: fps = 30
    delay_s = 1.0 / fps

    frame_count = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            print("Video ended.")
            break

        frame_count += 1

        # Use the video's internal timestamp, NOT wall-clock time!
        # Otherwise, slow CPU processing makes the CPR look 4x slower.
        ts_ms = cap.get(cv2.CAP_PROP_POS_MSEC)

        # Encode to mimic WebSocket binary payload
        _, encoded_img = cv2.imencode('.jpg', frame)
        raw_bytes = encoded_img.tobytes()
        
        # Process 6 layers
        t0 = time.time()
        result = await pipeline.process(raw_bytes, {"ts": ts_ms})
        dt = (time.time() - t0) * 1000
        
        # Overlay metrics on OpenCV window for debugging
        status = result.get("status", "UNKNOWN")
        ui_commands = result.get("ui_commands", [])
        
        cv2.putText(frame, f"Status: {status} ({dt:.1f}ms)", (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
                    
        cmd_text = ui_commands[0].get("text_en", "") if ui_commands else ""
        if cmd_text:
            cv2.putText(frame, f"Command: {cmd_text}", (20, 80), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
                        
        metrics = result.get("metrics", {})
        cv2.putText(frame, f"BPM: {metrics.get('bpm', 0)}", (20, 120), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 200, 0), 2)
        cv2.putText(frame, f"Depth %: {metrics.get('depth_torso_pct', 0):.1f}%", (20, 155), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 200, 0), 2)
        cv2.putText(frame, f"Victim: {result.get('victim_type', 'N/A')}", (20, 190), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (200, 200, 255), 2)
        cv2.putText(frame, f"Frame: {frame_count}", (20, 225), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (180, 180, 180), 1)

        # Show elbow angle and recoil if available
        if metrics.get("elbow_angle"):
            cv2.putText(frame, f"Elbow: {metrics['elbow_angle']}°", (20, 260), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 200, 0), 2)
        if metrics.get("recoil_quality"):
            cv2.putText(frame, f"Recoil: {metrics['recoil_quality']}%", (20, 295), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 200, 0), 2)
            
        # Draw bounding boxes
        r_box = result.get("debug_rescuer")
        if r_box:
            cv2.rectangle(frame, (int(r_box["x1"]), int(r_box["y1"])), (int(r_box["x2"]), int(r_box["y2"])), (0, 255, 0), 2)
            cv2.putText(frame, "Rescuer", (int(r_box["x1"]), int(r_box["y1"]) - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
            
        v_box = result.get("debug_victim")
        if v_box:
            cv2.rectangle(frame, (int(v_box["x1"]), int(v_box["y1"])), (int(v_box["x2"]), int(v_box["y2"])), (0, 0, 255), 2)
            cv2.putText(frame, "Victim", (int(v_box["x1"]), int(v_box["y1"]) - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)

        cv2.imshow("CPR Pipeline Offline Test", frame)
        
    # Quick print of the classifier classes by initializing layer5 directly
    from cpr_vision_system.pipeline.layer5_classifier import VictimClassifier
    print("Initializing classifier directly...")
    vc = VictimClassifier()
    if vc.model:
        print(f"Classes from best.pt: {vc.model.names}")
    else:
        print("Model not loaded.")
        
    print("Exiting fast.")
    pipeline.cleanup()

if __name__ == "__main__":
    asyncio.run(main())
