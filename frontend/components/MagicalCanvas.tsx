'use client';

import React, { useRef, useEffect, useState, useMemo } from 'react';
import useWebSocket, { ReadyState } from 'react-use-websocket';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text, Float, Stars, Sparkles } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useDetectionStore } from '../store/DetectionStore';

const WEBSOCKET_URL = 'ws://localhost:8000/ws/ai-stream/';

// --- Types ---
type Landmark = { x: number; y: number; z: number };
type AiData = {
    gestures: { name: string; score: number }[];
    expressions: string[];
    hand_landmarks: Landmark[][];
    face_landmarks: Landmark[][];
};

// --- 3D Components ---

const HandVisualizer = React.memo(function HandVisualizer({ landmarks }: { landmarks: Landmark[] }) {
    // MediaPipe Hands Connections (Simplified subset for visuals)
    const connections = useMemo(() => [
        [0, 1], [1, 2], [2, 3], [3, 4],       // Thumb
        [0, 5], [5, 6], [6, 7], [7, 8],       // Index
        [0, 9], [9, 10], [10, 11], [11, 12],  // Middle
        [0, 13], [13, 14], [14, 15], [15, 16],// Ring
        [0, 17], [17, 18], [18, 19], [19, 20] // Pinky
    ], []);

    // Helper to map 0-1 coords to 3D space. 
    // FLIP X to match mirror view. INVERT Y because screen coords are top-down.
    // Reduced z-scale to keep hands in front of camera
    const mapPos = useMemo(() => (l: Landmark) =>
        new THREE.Vector3((l.x - 0.5) * -10, (l.y - 0.5) * -8, (l.z * -2) + 2), []);

    return (
        <group renderOrder={10}>
            {/* Joints - Increased size for visibility */}
            {landmarks.map((l, i) => (
                <mesh key={i} position={mapPos(l)} renderOrder={11}>
                    <sphereGeometry args={[0.25, 12, 12]} />
                    <meshStandardMaterial color="#ff3333" emissive="#ff0000" emissiveIntensity={2} toneMapped={false} />
                </mesh>
            ))}
            {/* Bones */}
            {connections.map(([start, end], i) => {
                const startPos = mapPos(landmarks[start]);
                const endPos = mapPos(landmarks[end]);
                const midPos = startPos.clone().add(endPos).multiplyScalar(0.5);
                const length = startPos.distanceTo(endPos);

                // Rotation logic using lookAt
                const refObj = new THREE.Object3D();
                refObj.position.copy(startPos);
                refObj.lookAt(endPos);

                return (
                    <mesh key={`bone-${i}`} position={midPos} quaternion={refObj.quaternion} rotation={[Math.PI / 2, 0, 0]} renderOrder={10}>
                        <cylinderGeometry args={[0.05, 0.05, length, 6]} />
                        <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={0.5} transparent opacity={0.8} />
                    </mesh>
                )
            })}
        </group>
    );
});

const FaceVisualizer = React.memo(function FaceVisualizer({ landmarks }: { landmarks: Landmark[] }) {
    // Render a point cloud for the face
    const points = useMemo(() => {
        const float32 = new Float32Array(landmarks.length * 3);
        landmarks.forEach((l, i) => {
            float32[i * 3] = (l.x - 0.5) * -10;
            float32[i * 3 + 1] = (l.y - 0.5) * -8;
            float32[i * 3 + 2] = (l.z * -2) + 2;
        });
        return float32;
    }, [landmarks]);

    return (
        <points>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    count={points.length / 3}
                    array={points}
                    itemSize={3}
                    args={[points, 3]}
                />
            </bufferGeometry>
            <pointsMaterial size={0.06} color="#c084fc" sizeAttenuation transparent opacity={0.8} />
        </points>
    );
});

function Scene({ aiData }: { aiData: AiData | null }) {
    return (
        <>
            <ambientLight intensity={0.2} />
            <pointLight position={[10, 10, 10]} intensity={1} color="#06b6d4" />
            <pointLight position={[-10, -10, -10]} intensity={0.5} color="#c084fc" />

            <Stars radius={100} depth={50} count={1000} factor={4} saturation={0} fade speed={1} />
            <Sparkles count={20} scale={10} size={4} speed={0.4} opacity={0.5} />

            {/* Hands */}
            {aiData?.hand_landmarks?.map((hand, i) => (
                <HandVisualizer key={`hand-${i}`} landmarks={hand} />
            ))}

            {/* Face */}
            {aiData?.face_landmarks?.map((face, i) => (
                <FaceVisualizer key={`face-${i}`} landmarks={face} />
            ))}

            {/* Text Overlay in 3D */}
            <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
                {/* Debug Hand Count */}
                <Text position={[0, -2, 0]} fontSize={0.3} color="red" anchorX="center" anchorY="middle">
                    Hands: {aiData?.hand_landmarks?.length || 0}
                </Text>

                {aiData?.gestures?.[0] && (
                    <Text position={[0, 3, 0]} fontSize={0.6} font="/fonts/Inter-Bold.woff" anchorX="center" anchorY="middle">
                        {aiData.gestures[0].name.toUpperCase()}
                        <meshStandardMaterial color="#00ffff" emissive="#00ffff" emissiveIntensity={2} />
                    </Text>
                )}

                {aiData?.expressions?.length ? (
                    <Text position={[0, -3.5, 0]} fontSize={0.4} anchorX="center" anchorY="middle">
                        {aiData.expressions.join(' • ').toUpperCase()}
                        <meshStandardMaterial color="#e879f9" emissive="#e879f9" emissiveIntensity={1} />
                    </Text>
                ) : null}
            </Float>

            <EffectComposer>
                <Bloom luminanceThreshold={0.5} luminanceSmoothing={0.9} height={300} intensity={1.5} />
                <ChromaticAberration offset={new THREE.Vector2(0.002, 0.002)} />
            </EffectComposer>
        </>
    );
}

export default function MagicalCanvas() {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [aiData, setAiData] = useState<AiData | null>(null);
    const lastTimeRef = useRef(0);

    // Store
    const { activeMode, setConnectionStatus, updateStats } = useDetectionStore();

    const { sendMessage, readyState } = useWebSocket(WEBSOCKET_URL, {
        shouldReconnect: () => true,
        onOpen: () => console.log('WS Connected'),
        onClose: () => console.log('WS Disconnected'),
        onMessage: (event) => {
            try {
                const data = JSON.parse(event.data);
                setAiData(data);

                // Debug Hand Data
                if (data.hand_landmarks && data.hand_landmarks.length > 0) {
                    console.log("Frontend detected hands:", data.hand_landmarks.length, data.hand_landmarks[0][0]);
                }


                // FPS Calc
                const now = Date.now();
                if (lastTimeRef.current > 0) {
                    const delta = now - lastTimeRef.current;
                    const fps = Math.round(1000 / delta);
                    updateStats(fps, 0);
                }
                lastTimeRef.current = now;

            } catch (e) {
                console.error("Parse error", e);
            }
        }
    });

    // Sync Connection Status
    useEffect(() => {
        setConnectionStatus(readyState === ReadyState.OPEN);
    }, [readyState, setConnectionStatus]);

    // Send Configuration when Mode Changes
    useEffect(() => {
        if (readyState === ReadyState.OPEN) {
            sendMessage(JSON.stringify({ config: { mode: activeMode } }));
        }
    }, [activeMode, readyState, sendMessage]);

    // Capture Loop
    useEffect(() => {
        let stream: MediaStream | null = null;

        async function setupCamera() {
            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    video: { width: 240, height: 180, frameRate: 20 }
                });

                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    await videoRef.current.play();
                }
            } catch (e) {
                console.error("Camera access denied", e);
            }
        }
        setupCamera();

        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            if (videoRef.current && canvasRef.current && readyState === ReadyState.OPEN) {
                const context = canvasRef.current.getContext('2d');
                if (context) {
                    context.drawImage(videoRef.current, 0, 0, 240, 180);
                    // Reduced quality for better performance
                    const base64 = canvasRef.current.toDataURL('image/jpeg', 0.4);
                    sendMessage(JSON.stringify({ image: base64 }));
                }
            }
        }, 100); // ~10 FPS for better performance
        return () => clearInterval(interval);
    }, [sendMessage, readyState]);

    return (
        <div className="w-full h-screen bg-black relative overflow-hidden">
            {/* Source video (visible as background now) */}
            <video
                ref={videoRef}
                className="absolute top-1/2 left-1/2 min-w-full min-h-full object-cover -translate-x-1/2 -translate-y-1/2 opacity-20 pointer-events-none scale-x-[-1]"
                playsInline
                muted
            />
            <canvas ref={canvasRef} width="240" height="180" className="hidden" />

            {/* The 3D World */}
            <Canvas camera={{ position: [0, 0, 8], fov: 60 }} gl={{ antialias: false }}>
                <color attach="background" args={['#050510']} />
                <Scene aiData={aiData} />
                <OrbitControls enableZoom={false} enablePan={false} maxPolarAngle={Math.PI / 1.5} minPolarAngle={Math.PI / 3} />
            </Canvas>
        </div>
    );
}
