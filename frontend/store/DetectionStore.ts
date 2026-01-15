import { create } from 'zustand';

type DetectionMode = 'combined' | 'face' | 'hands';

interface DetectionState {
    activeMode: DetectionMode;
    isConnected: boolean;
    fps: number;
    latency: number;
    setMode: (mode: DetectionMode) => void;
    setConnectionStatus: (status: boolean) => void;
    updateStats: (fps: number, latency: number) => void;
}

export const useDetectionStore = create<DetectionState>((set) => ({
    activeMode: 'combined',
    isConnected: false,
    fps: 0,
    latency: 0,
    setMode: (mode) => set({ activeMode: mode }),
    setConnectionStatus: (status) => set({ isConnected: status }),
    updateStats: (fps, latency) => set({ fps, latency }),
}));
