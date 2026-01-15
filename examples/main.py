import cv2
import mediapipe as mp
import time
import os
import sys

from mediapipe.tasks import python
from mediapipe.tasks.python import vision

# Global variables to store the latest results
latest_hand_result = None
latest_face_result = None

# Calculate paths relative to the script
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
MODELS_DIR = os.path.join(PROJECT_ROOT, 'models')

# Hand connections for drawing
HAND_CONNECTIONS = [
    (0, 1), (1, 2), (2, 3), (3, 4),
    (0, 5), (5, 6), (6, 7), (7, 8),
    (0, 9), (9, 10), (10, 11), (11, 12),
    (0, 13), (13, 14), (14, 15), (15, 16),
    (0, 17), (17, 18), (18, 19), (19, 20)
]

def print_hand_result(result, output_image: mp.Image, timestamp_ms: int):
    global latest_hand_result
    latest_hand_result = result

def print_face_result(result, output_image: mp.Image, timestamp_ms: int):
    global latest_face_result
    latest_face_result = result

def draw_hand_landmarks_and_gestures(rgb_image, detection_result):
    annotated_image = rgb_image.copy()
    
    if not detection_result or not detection_result.hand_landmarks:
        return annotated_image

    hand_landmarks_list = detection_result.hand_landmarks
    gestures_list = detection_result.gestures

    # Loop through the detected hands to visualize.
    for idx in range(len(hand_landmarks_list)):
        hand_landmarks = hand_landmarks_list[idx]
        
        # Draw the hand landmarks.
        for landmark in hand_landmarks:
            x = int(landmark.x * annotated_image.shape[1])
            y = int(landmark.y * annotated_image.shape[0])
            cv2.circle(annotated_image, (x, y), 5, (0, 255, 0), -1)
            
        # Draw the connections
        for connection in HAND_CONNECTIONS:
            start_idx = connection[0]
            end_idx = connection[1]
            
            start_point = hand_landmarks[start_idx]
            end_point = hand_landmarks[end_idx]
            
            x1 = int(start_point.x * annotated_image.shape[1])
            y1 = int(start_point.y * annotated_image.shape[0])
            x2 = int(end_point.x * annotated_image.shape[1])
            y2 = int(end_point.y * annotated_image.shape[0])
            
            cv2.line(annotated_image, (x1, y1), (x2, y2), (255, 0, 0), 2)
        
        # Draw Gesture Text
        if gestures_list and len(gestures_list) > idx:
            gesture = gestures_list[idx][0]
            confidence = gesture.score * 100
            gesture_text = f"Hand: {gesture.category_name} ({confidence:.0f}%)"
             # Approximate position near wrist (landmark 0)
            wrist = hand_landmarks[0]
            text_x = int(wrist.x * annotated_image.shape[1])
            text_y = int(wrist.y * annotated_image.shape[0]) - 20
            
            cv2.putText(annotated_image, gesture_text, (text_x, text_y), 
                        cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2, cv2.LINE_AA)
            cv2.putText(annotated_image, gesture_text, (text_x, text_y), 
                        cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 0), 1, cv2.LINE_AA) # Text shadow

    return annotated_image

def draw_face_landmarks_and_expressions(rgb_image, detection_result):
    annotated_image = rgb_image.copy()
    
    if not detection_result or not detection_result.face_landmarks:
        return annotated_image

    face_landmarks_list = detection_result.face_landmarks
    face_blendshapes_list = detection_result.face_blendshapes

    # Loop through the detected faces to visualize.
    for idx in range(len(face_landmarks_list)):
        face_landmarks = face_landmarks_list[idx]
        
        # Draw face landmarks as small dots
        for landmark in face_landmarks:
            x = int(landmark.x * annotated_image.shape[1])
            y = int(landmark.y * annotated_image.shape[0])
            cv2.circle(annotated_image, (x, y), 1, (0, 255, 255), -1)
        
        # Analyze Blendshapes for Expressions
        if face_blendshapes_list and len(face_blendshapes_list) > idx:
            blendshapes = face_blendshapes_list[idx]
            # Mapping blendshapes to simple gestures
            # Note: We iterate to find specific categories
            
            expressions = []
            
            # Helper to find score
            def get_score(name):
                for b in blendshapes:
                    if b.category_name == name:
                        return b.score
                return 0.0

            if get_score('mouthSmileLeft') > 0.5 and get_score('mouthSmileRight') > 0.5:
                expressions.append("Smiling")
            
            if get_score('eyeBlinkLeft') > 0.5:
                expressions.append("Left Wink")
                
            if get_score('eyeBlinkRight') > 0.5:
                expressions.append("Right Wink")
            
            if get_score('jawOpen') > 0.3:
                expressions.append("Mouth Open")
            
            if expressions:
                text = f"Face: {', '.join(expressions)}"
                # Draw at the top of the head (approx landmark 10)
                head_top = face_landmarks[10]
                text_x = int(head_top.x * annotated_image.shape[1]) - 50
                text_y = int(head_top.y * annotated_image.shape[0]) - 30
                
                cv2.putText(annotated_image, text, (text_x, text_y), 
                            cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 255), 2, cv2.LINE_AA)
                cv2.putText(annotated_image, text, (text_x, text_y), 
                            cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 0), 1, cv2.LINE_AA)

    return annotated_image

def run_hand_tracking():
    global latest_hand_result
    latest_hand_result = None
    
    model_path = os.path.join(MODELS_DIR, "gesture_recognizer.task")
    if not os.path.exists(model_path):
        print(f"Error: {model_path} not found.")
        return

    base_options = python.BaseOptions(model_asset_path=model_path)
    options = vision.GestureRecognizerOptions(
        base_options=base_options,
        running_mode=vision.RunningMode.LIVE_STREAM,
        num_hands=2,
        min_hand_detection_confidence=0.5,
        min_hand_presence_confidence=0.5,
        min_tracking_confidence=0.5,
        result_callback=print_hand_result)
    
    detector = vision.GestureRecognizer.create_from_options(options)
    
    run_camera_loop([detector], "Hand Gesture Recognition", 
                    draw_functions=[("hand", draw_hand_landmarks_and_gestures)])

def run_face_tracking():
    global latest_face_result
    latest_face_result = None

    model_path = os.path.join(MODELS_DIR, "face_landmarker.task")
    if not os.path.exists(model_path):
        print(f"Error: {model_path} not found.")
        return

    base_options = python.BaseOptions(model_asset_path=model_path)
    options = vision.FaceLandmarkerOptions(
        base_options=base_options,
        running_mode=vision.RunningMode.LIVE_STREAM,
        num_faces=1,
        min_face_detection_confidence=0.5,
        min_face_presence_confidence=0.5,
        min_tracking_confidence=0.5,
        output_face_blendshapes=True,
        result_callback=print_face_result)
    
    detector = vision.FaceLandmarker.create_from_options(options)
    run_camera_loop([detector], "Face Expression Recognition", 
                    draw_functions=[("face", draw_face_landmarks_and_expressions)])

def run_combined_tracking():
    global latest_hand_result, latest_face_result
    latest_hand_result = None
    latest_face_result = None
    
    detectors = []
    
    # Init Hand Detector
    hand_model = os.path.join(MODELS_DIR, "gesture_recognizer.task")
    if os.path.exists(hand_model):
        base_options_hand = python.BaseOptions(model_asset_path=hand_model)
        options_hand = vision.GestureRecognizerOptions(
            base_options=base_options_hand,
            running_mode=vision.RunningMode.LIVE_STREAM,
            num_hands=2,
            result_callback=print_hand_result)
        hand_detector = vision.GestureRecognizer.create_from_options(options_hand)
        detectors.append(hand_detector)
    else:
        print(f"Warning: {hand_model} missing. Hand tracking disabled.")

    # Init Face Detector
    face_model = os.path.join(MODELS_DIR, "face_landmarker.task")
    if os.path.exists(face_model):
        base_options_face = python.BaseOptions(model_asset_path=face_model)
        options_face = vision.FaceLandmarkerOptions(
            base_options=base_options_face,
            running_mode=vision.RunningMode.LIVE_STREAM,
            num_faces=1,
            output_face_blendshapes=True,
            result_callback=print_face_result)
        face_detector = vision.FaceLandmarker.create_from_options(options_face)
        detectors.append(face_detector)
    else:
        print(f"Warning: {face_model} missing. Face tracking disabled.")
    
    if not detectors:
        print("Error: No models available.")
        return

    run_camera_loop(detectors, "Combined Tracking", 
                    draw_functions=[
                        ("face", draw_face_landmarks_and_expressions),
                        ("hand", draw_hand_landmarks_and_gestures)
                    ])

def run_camera_loop(detectors, window_name, draw_functions):
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("Error: Could not open webcam.")
        return

    print(f"Starting {window_name}. Press 'q' to exit.")

    prev_time = 0

    while True:
        curr_time = time.time()
        ret, frame = cap.read()
        if not ret:
            break
            
        # Calculate FPS
        fps = 0
        if prev_time != 0:
            fps = 1 / (curr_time - prev_time)
        prev_time = curr_time

        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)
        timestamp_ms = int(time.time() * 1000)
        
        # Trigger all detectors
        for detector in detectors:
            if isinstance(detector, vision.GestureRecognizer):
                detector.recognize_async(mp_image, timestamp_ms)
            else:
                detector.detect_async(mp_image, timestamp_ms)
        
        # Draw results sequentially
        # Pass the frame through each draw function if result exists
        for type_name, draw_func in draw_functions:
            if type_name == "hand" and latest_hand_result:
                frame = draw_func(frame, latest_hand_result)
            elif type_name == "face" and latest_face_result:
                frame = draw_func(frame, latest_face_result)

        # Draw FPS
        cv2.putText(frame, f"FPS: {int(fps)}", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)

        cv2.imshow(window_name, frame)
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    for detector in detectors:
        detector.close()
    cap.release()
    cv2.destroyAllWindows()

def main():
    print("Welcome to Object Detection Demo")
    print("1. Hand Gesture Recognition")
    print("2. Face Expression Recognition")
    print("3. Combined Mode (Hand + Face)")
    
    choice = input("Enter choice (1/2/3): ").strip()
    
    if choice == '1':
        run_hand_tracking()
    elif choice == '2':
        run_face_tracking()
    elif choice == '3':
        run_combined_tracking()
    else:
        print("Invalid choice. Exiting.")

if __name__ == '__main__':
    main()