'use client';

import React, { useRef, useEffect, useState, useMemo, Suspense } from 'react';
import useWebSocket, { ReadyState } from 'react-use-websocket';
import * as THREE from 'three';
import { Canvas, useLoader } from '@react-three/fiber';
import {
    useGLTF,
    OrbitControls,
    Stars,
    Sparkles,
    Float,
    Text
} from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration } from '@react-three/postprocessing';
import { ARAsset, useDetectionStore } from '../store/DetectionStore';

// --- Constants & Types ---
const WEBSOCKET_URL = 'ws://localhost:8000/ws/detection/';

interface Landmark {
    x: number;
    y: number;
    z: number;
}

interface AiData {
    hand_landmarks?: Landmark[][];
    face_landmarks?: Landmark[][];
    gestures?: Array<{ name: string; score: number }>;
    expressions?: string[];
}

const mapLandmarkTo3D = (l: Landmark) => {
    return new THREE.Vector3(
        (l.x - 0.5) * -10,
        (l.y - 0.5) * -8,
        0
    );
};

// --- Asset Renderer Component ---
const ImageAssetRenderer = React.memo(function ImageAssetRenderer({
    url,
    position,
    scale
}: {
    url: string;
    position: THREE.Vector3;
    scale: number;
}) {
    const texture = useLoader(THREE.TextureLoader, url);
    return (
        <sprite position={position} scale={[scale * 3, scale * 3, 1]} renderOrder={20}>
            <spriteMaterial map={texture} transparent alphaTest={0.1} depthWrite={false} />
        </sprite>
    );
});

const ModelAssetRenderer = React.memo(function ModelAssetRenderer({
    url,
    position,
    rotation,
    scale
}: {
    url: string;
    position: THREE.Vector3;
    rotation: THREE.Euler;
    scale: number;
}) {
    const { scene } = useGLTF(url);
    const clone = useMemo(() => scene.clone(), [scene]);

    return (
        <primitive
            object={clone}
            position={position}
            rotation={rotation}
            scale={[scale * 2, scale * 2, scale * 2]}
            renderOrder={20}
        />
    );
});

const AssetRenderer = React.memo(function AssetRenderer({
    asset,
    position,
    rotation = new THREE.Euler(0, 0, 0),
    scale = 1
}: {
    asset: ARAsset;
    position: THREE.Vector3;
    rotation?: THREE.Euler;
    scale?: number;
}) {
    if (asset.asset_type === '2D_IMAGE') {
        return <ImageAssetRenderer url={asset.file_url} position={position} scale={scale} />;
    }

    if (asset.asset_type === '3D_MODEL') {
        return <ModelAssetRenderer url={asset.file_url} position={position} rotation={rotation} scale={scale} />;
    }

    return null;
});

// --- 3D Components ---

const HandVisualizer = React.memo(function HandVisualizer({
    landmarks,
    asset
}: {
    landmarks: Landmark[];
    asset?: ARAsset | null;
}) {
    const connections = useMemo(() => [
        [0, 1], [1, 2], [2, 3], [3, 4],       // Thumb
        [0, 5], [5, 6], [6, 7], [7, 8],       // Index
        [0, 9], [9, 10], [10, 11], [11, 12],  // Middle
        [0, 13], [13, 14], [14, 15], [15, 16],// Ring
        [0, 17], [17, 18], [18, 19], [19, 20] // Pinky
    ], []);

    const mapPos = useMemo(() => mapLandmarkTo3D, []);

    // Determine Anchor Position
    const anchorPos = useMemo(() => {
        if (landmarks.length < 21) return null;

        if (asset?.anchor === 'HAND_WRIST') return mapPos(landmarks[0]);
        if (asset?.anchor === 'HAND_INDEX_TIP') return mapPos(landmarks[8]);

        // Default to Palm Center
        const wrist = mapPos(landmarks[0]);
        const middleBase = mapPos(landmarks[9]);
        return wrist.clone().add(middleBase).multiplyScalar(0.5);
    }, [landmarks, mapPos, asset]);

    return (
        <group renderOrder={10}>
            {/* Joints */}
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

            {/* Asset Overlay */}
            {asset && anchorPos && (
                <Suspense fallback={null}>
                    <AssetRenderer asset={asset} position={anchorPos} />
                </Suspense>
            )}
        </group>
    );
});

const FaceVisualizer = React.memo(function FaceVisualizer({
    landmarks,
    asset
}: {
    landmarks: Landmark[];
    asset?: ARAsset | null;
}) {
    const points = useMemo(() => {
        const float32 = new Float32Array(landmarks.length * 3);
        landmarks.forEach((l, i) => {
            float32[i * 3] = (l.x - 0.5) * -10;
            float32[i * 3 + 1] = (l.y - 0.5) * -8;
            float32[i * 3 + 2] = (l.z * -2) + 2;
        });
        return float32;
    }, [landmarks]);

    // Calculate face center (nose tip)
    const faceCenter = useMemo(() => {
        if (landmarks.length < 5) return null;
        return mapLandmarkTo3D(landmarks[1]);
    }, [landmarks]);

    return (
        <group>
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

            {/* Asset overlay */}
            {asset && faceCenter && (
                <Suspense fallback={null}>
                    <AssetRenderer asset={asset} position={faceCenter} />
                </Suspense>
            )}
        </group>
    );
});

function Scene({ aiData }: { aiData: AiData | null }) {
    const { selectedFaceAsset, selectedHandAsset } = useDetectionStore();

    return (
        <>
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} intensity={1} color="#06b6d4" />
            <pointLight position={[-10, -10, -10]} intensity={0.5} color="#c084fc" />

            <Stars radius={100} depth={50} count={1000} factor={4} saturation={0} fade speed={1} />
            <Sparkles count={20} scale={10} size={4} speed={0.4} opacity={0.5} />

            {/* Hands */}
            {aiData?.hand_landmarks?.map((hand, i) => (
                <HandVisualizer key={`hand-${i}`} landmarks={hand} asset={selectedHandAsset} />
            ))}

            {/* Face */}
            {aiData?.face_landmarks?.map((face, i) => (
                <FaceVisualizer key={`face-${i}`} landmarks={face} asset={selectedFaceAsset} />
            ))}

            {/* Text Overlay in 3D */}
            <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
                {/* Debug Hand Count */}
                <Text position={[0, -2, 0]} fontSize={0.3} color="red" anchorX="center" anchorY="middle">
                    Hands: {aiData?.hand_landmarks?.length || 0}
                </Text>

                {aiData?.gestures?.[0] && (
                    <Text position={[0, 3, 0]} fontSize={0.6} anchorX="center" anchorY="middle">
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
