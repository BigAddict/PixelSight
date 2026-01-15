import logging
import json
import base64
import asyncio
import cv2
import numpy as np
import os
import mediapipe as mp
from channels.generic.websocket import AsyncWebsocketConsumer
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

logger = logging.getLogger(__name__)

# Calculate paths relative to the project root
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(os.path.dirname(CURRENT_DIR))
MODELS_DIR = os.path.join(PROJECT_ROOT, 'models')

# Processing constants
MAX_IMAGE_WIDTH = 160
MAX_IMAGE_HEIGHT = 120
JPEG_QUALITY = 0.3


class VideoConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        await self.accept()
        logger.info("WebSocket Connected: AI Stream")
        self.mode = 'combined'
        self.processing = False  # Flag to skip frames when busy
        self.frame_count = 0
        self.skip_frames = 2  # Process every Nth frame

        # Initialize Models
        self.hand_detector = None
        self.face_detector = None
        
        # Init Hand Detector
        hand_model = os.path.join(MODELS_DIR, "gesture_recognizer.task")
        if os.path.exists(hand_model):
            base_options_hand = python.BaseOptions(model_asset_path=hand_model)
            options_hand = vision.GestureRecognizerOptions(
                base_options=base_options_hand,
                running_mode=vision.RunningMode.IMAGE,
                num_hands=2)
            self.hand_detector = vision.GestureRecognizer.create_from_options(options_hand)
            logger.info("Hand detector initialized")
        
        # Init Face Detector
        face_model = os.path.join(MODELS_DIR, "face_landmarker.task")
        if os.path.exists(face_model):
            base_options_face = python.BaseOptions(model_asset_path=face_model)
            options_face = vision.FaceLandmarkerOptions(
                base_options=base_options_face,
                running_mode=vision.RunningMode.IMAGE,
                num_faces=1,
                output_face_blendshapes=True)
            self.face_detector = vision.FaceLandmarker.create_from_options(options_face)
            logger.info("Face detector initialized")

    async def disconnect(self, close_code):
        if self.hand_detector:
            self.hand_detector.close()
        if self.face_detector:
            self.face_detector.close()
        logger.info("WebSocket Disconnected")

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
        except json.JSONDecodeError:
            return
        
        # Handle Configuration Updates
        if 'config' in data:
            self.mode = data['config'].get('mode', 'combined')
            logger.info(f"Switched mode to: {self.mode}")
            return

        # Skip if still processing previous frame
        if self.processing:
            return

        # Frame skipping for performance
        self.frame_count += 1
        if self.frame_count % self.skip_frames != 0:
            return

        # Expecting 'image' key with base64 data
        if 'image' not in data:
            return

        self.processing = True
        try:
            # Decode Image
            image_data = base64.b64decode(data['image'].split(',')[1])
            np_arr = np.frombuffer(image_data, np.uint8)
            frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
            
            if frame is None:
                return

            # Resize for faster processing
            frame = cv2.resize(frame, (MAX_IMAGE_WIDTH, MAX_IMAGE_HEIGHT))
            
            # Process in thread pool to avoid blocking
            results = await asyncio.to_thread(self._process_frame, frame)
            
            await self.send(text_data=json.dumps(results))
            
        except Exception as e:
            logger.error(f"Processing error: {e}")
        finally:
            self.processing = False

    def _process_frame(self, frame):
        """Synchronous processing - runs in thread pool"""
        # Convert to RGB
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        
        results = {
            'gestures': [],
            'expressions': [],
            'hand_landmarks': [],
            'face_landmarks': []
        }

        # Process Hand - create fresh mp.Image for hand detector
        if self.hand_detector and self.mode in ['combined', 'hands']:
            try:
                mp_image_hand = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame.copy())
                hand_result = self.hand_detector.recognize(mp_image_hand)
                if hand_result.gestures:
                    for gestures in hand_result.gestures:
                        if gestures:
                            gesture = gestures[0]
                            results['gestures'].append({
                                'name': gesture.category_name,
                                'score': round(gesture.score, 4)
                            })
                
                if hand_result.hand_landmarks:
                    for hand_lms in hand_result.hand_landmarks:
                        landmarks = [{'x': round(lm.x, 4), 'y': round(lm.y, 4), 'z': round(lm.z, 4)} for lm in hand_lms]
                        results['hand_landmarks'].append(landmarks)
            except Exception as e:
                logger.error(f"Hand detection error: {e}")

        # Process Face - create fresh mp.Image for face detector
        if self.face_detector and self.mode in ['combined', 'face']:
            try:
                mp_image_face = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame.copy())
                face_result = self.face_detector.detect(mp_image_face)
                
                # Expressions
                if face_result.face_blendshapes:
                    blendshapes = face_result.face_blendshapes[0]
                    
                    def get_score(name):
                        for b in blendshapes:
                            if b.category_name == name:
                                return b.score
                        return 0.0

                    if get_score('mouthSmileLeft') > 0.5 and get_score('mouthSmileRight') > 0.5:
                        results['expressions'].append("Smiling")
                    if get_score('eyeBlinkLeft') > 0.5:
                        results['expressions'].append("Left Wink")
                    if get_score('eyeBlinkRight') > 0.5:
                        results['expressions'].append("Right Wink")
                    if get_score('jawOpen') > 0.3:
                        results['expressions'].append("Mouth Open")
                
                # Landmarks
                if face_result.face_landmarks:
                    for face_lms in face_result.face_landmarks:
                        landmarks = [{'x': round(lm.x, 4), 'y': round(lm.y, 4), 'z': round(lm.z, 4)} for lm in face_lms]
                        results['face_landmarks'].append(landmarks)
            except Exception as e:
                logger.error(f"Face detection error: {e}")

        return results

