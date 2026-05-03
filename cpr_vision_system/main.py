"""
CPR Vision System - Main Application
=====================================
Application principale pour l'assistance RCP en temps réel.
Utilise MediaPipe pour la détection de pose et analyse la qualité des compressions.

Usage:
    python main.py                    # Caméra par défaut
    python main.py --video path.mp4   # Fichier vidéo
    python main.py --camera 1         # Caméra spécifique
    python main.py --adult            # Mode adulte (défaut)
    python main.py --child            # Mode enfant
    python main.py --infant           # Mode nourrisson

Contrôles:
    q - Quitter
    r - Réinitialiser les compteurs
    s - Changer scenario (Adulte/Enfant/Nourrisson)
    v - Activer/désactiver la visualisation
    m - Activer/désactiver le son
"""

import cv2
import argparse
import time
import sys
import os

# Ajouter le chemin parent pour les imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from cpr_vision_system import CPRAssistant


def parse_arguments():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        description='CPR Vision System - Real-time CPR Quality Assistant',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )
    
    # Video source
    source_group = parser.add_mutually_exclusive_group()
    source_group.add_argument(
        '--camera', '-c',
        type=int,
        default=0,
        help='Camera device index (default: 0)'
    )
    source_group.add_argument(
        '--video', '-v',
        type=str,
        help='Path to video file'
    )
    
    # Victim category
    category_group = parser.add_mutually_exclusive_group()
    category_group.add_argument(
        '--adult', '-a',
        action='store_true',
        default=True,
        help='Adult CPR mode (default)'
    )
    category_group.add_argument(
        '--child',
        action='store_true',
        help='Child CPR mode (1 year to puberty)'
    )
    category_group.add_argument(
        '--infant',
        action='store_true',
        help='Infant CPR mode (< 1 year)'
    )
    
    # Display options
    parser.add_argument(
        '--no-display',
        action='store_true',
        help='Run without video display (headless mode)'
    )
    parser.add_argument(
        '--no-audio',
        action='store_true',
        help='Disable audio feedback'
    )
    parser.add_argument(
        '--fullscreen', '-f',
        action='store_true',
        help='Start in fullscreen mode'
    )
    parser.add_argument(
        '--resolution',
        type=str,
        default='640x480',
        help='Camera resolution WxH (default: 640x480)'
    )
    
    # Debug options
    parser.add_argument(
        '--verbose',
        action='store_true',
        help='Enable verbose logging'
    )
    parser.add_argument(
        '--gpu',
        action='store_true',
        help='Enable GPU acceleration (if available)'
    )
    
    return parser.parse_args()


def get_victim_category(args):
    """Determine victim category from arguments."""
    if args.child:
        return "CHILD"
    elif args.infant:
        return "INFANT"
    return "ADULT"


def create_info_overlay(frame, metrics, fps, category):
    """
    Create an informative overlay with CPR metrics.
    
    Args:
        frame: Video frame
        metrics: Current CPR metrics dictionary
        fps: Current FPS
        category: Victim category string
    
    Returns:
        Frame with overlay
    """
    h, w = frame.shape[:2]
    overlay = frame.copy()
    
    # Background semi-transparent panel
    cv2.rectangle(overlay, (10, 10), (300, 200), (0, 0, 0), -1)
    cv2.addWeighted(overlay, 0.6, frame, 0.4, 0, frame)
    
    # Title
    cv2.putText(frame, f"CPR Assistant - {category}", (20, 35),
                cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
    
    # BPM
    bpm = metrics.get('bpm', 0)
    bpm_color = (0, 255, 0) if 100 <= bpm <= 120 else (0, 165, 255) if bpm > 0 else (128, 128, 128)
    cv2.putText(frame, f"BPM: {bpm:.0f}", (20, 70),
                cv2.FONT_HERSHEY_SIMPLEX, 0.8, bpm_color, 2)
    
    # Compression count
    compressions = metrics.get('compression_count', 0)
    cv2.putText(frame, f"Compressions: {compressions}", (20, 100),
                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1)
    
    # Depth quality
    depth = metrics.get('avg_depth_cm', 0)
    depth_color = (0, 255, 0) if 5 <= depth <= 6 else (0, 165, 255) if depth > 0 else (128, 128, 128)
    cv2.putText(frame, f"Depth: {depth:.1f} cm", (20, 130),
                cv2.FONT_HERSHEY_SIMPLEX, 0.6, depth_color, 1)
    
    # Recoil quality
    recoil = metrics.get('recoil_quality', 0)
    recoil_color = (0, 255, 0) if recoil >= 90 else (0, 165, 255)
    cv2.putText(frame, f"Recoil: {recoil:.0f}%", (20, 160),
                cv2.FONT_HERSHEY_SIMPLEX, 0.6, recoil_color, 1)
    
    # FPS
    cv2.putText(frame, f"FPS: {fps:.0f}", (20, 190),
                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (128, 128, 128), 1)
    
    # Status indicator
    status = metrics.get('state', 'DETECTING')
    status_colors = {
        'ACTIVE_CPR': (0, 255, 0),
        'DETECTING_RESCUER': (0, 255, 255),
        'COMPRESSIONS': (0, 255, 0),
        'ATTENTION_WARNING': (0, 0, 255),
    }
    status_color = status_colors.get(status, (255, 255, 255))
    cv2.circle(frame, (280, 30), 10, status_color, -1)
    
    return frame


def main():
    """Main application entry point."""
    args = parse_arguments()
    
    # Parse resolution
    try:
        width, height = map(int, args.resolution.split('x'))
    except ValueError:
        print(f"Invalid resolution format: {args.resolution}")
        width, height = 640, 480
    
    # Get victim category
    category = get_victim_category(args)
    
    # Initialize video source
    if args.video:
        cap = cv2.VideoCapture(args.video)
        source_name = args.video
    else:
        cap = cv2.VideoCapture(args.camera)
        source_name = f"Camera {args.camera}"
        # Set camera resolution
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, width)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, height)
    
    if not cap.isOpened():
        print(f"Error: Cannot open video source: {source_name}")
        sys.exit(1)
    
    print(f"\n{'='*50}")
    print("  CPR Vision System - Real-time CPR Assistant")
    print(f"{'='*50}")
    print(f"  Source: {source_name}")
    print(f"  Mode: {category}")
    print(f"  Resolution: {width}x{height}")
    print(f"  GPU: {'Enabled' if args.gpu else 'Disabled'}")
    print(f"  Audio: {'Disabled' if args.no_audio else 'Enabled'}")
    print(f"{'='*50}")
    print("\nControls:")
    print("  q - Quit")
    print("  r - Reset counters")
    print("  s - Switch scenario")
    print("  v - Toggle visualization")
    print("  m - Toggle audio")
    print(f"{'='*50}\n")
    
    # Initialize CPR Assistant
    try:
        assistant = CPRAssistant(
            victim_category=category,
            enable_audio=not args.no_audio,
            verbose=args.verbose
        )
    except Exception as e:
        print(f"Error initializing CPR Assistant: {e}")
        cap.release()
        sys.exit(1)
    
    # Window setup
    window_name = "CPR Vision System"
    if not args.no_display:
        cv2.namedWindow(window_name, cv2.WINDOW_NORMAL)
        if args.fullscreen:
            cv2.setWindowProperty(window_name, cv2.WND_PROP_FULLSCREEN, cv2.WINDOW_FULLSCREEN)
    
    # FPS tracking
    fps = 0
    frame_count = 0
    fps_start_time = time.time()
    
    # Main loop
    show_viz = True
    running = True
    
    try:
        while running:
            ret, frame = cap.read()
            
            if not ret:
                if args.video:
                    print("\nEnd of video file.")
                    break
                print("\nError: Cannot read frame from camera.")
                break
            
            # Process frame
            processed_frame, metrics = assistant.process_frame(frame)
            
            # Add custom overlay
            if show_viz:
                processed_frame = create_info_overlay(processed_frame, metrics, fps, category)
            
            # Display
            if not args.no_display:
                cv2.imshow(window_name, processed_frame)
            
            # FPS calculation
            frame_count += 1
            elapsed = time.time() - fps_start_time
            if elapsed >= 1.0:
                fps = frame_count / elapsed
                frame_count = 0
                fps_start_time = time.time()
            
            # Handle keyboard input
            key = cv2.waitKey(1) & 0xFF
            
            if key == ord('q'):
                print("\nQuitting...")
                running = False
            elif key == ord('r'):
                print("Resetting counters...")
                assistant.reset()
            elif key == ord('s'):
                # Cycle through scenarios
                categories = ["ADULT", "CHILD", "INFANT"]
                current_idx = categories.index(category)
                category = categories[(current_idx + 1) % len(categories)]
                assistant.set_victim_category(category)
                print(f"Switched to: {category} mode")
            elif key == ord('v'):
                show_viz = not show_viz
                print(f"Visualization: {'ON' if show_viz else 'OFF'}")
            elif key == ord('m'):
                assistant.toggle_audio()
                print(f"Audio: {'ON' if assistant.audio_enabled else 'OFF'}")
    
    except KeyboardInterrupt:
        print("\n\nInterrupted by user.")
    
    finally:
        # Print final statistics
        final_metrics = assistant.get_final_metrics()
        print(f"\n{'='*50}")
        print("  Session Summary")
        print(f"{'='*50}")
        print(f"  Total Compressions: {final_metrics.get('total_compressions', 0)}")
        print(f"  Average BPM: {final_metrics.get('avg_bpm', 0):.1f}")
        print(f"  Average Depth: {final_metrics.get('avg_depth', 0):.1f} cm")
        print(f"  Recoil Quality: {final_metrics.get('recoil_quality', 0):.0f}%")
        print(f"  Session Duration: {final_metrics.get('duration', 0):.1f} seconds")
        print(f"{'='*50}\n")
        
        # Cleanup
        assistant.release()
        cap.release()
        cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
