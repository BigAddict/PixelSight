import { create } from 'zustand';

type DetectionMode = 'combined' | 'face' | 'hands';

export interface ARAsset {
    id: string;
    name: string;
    asset_type: '2D_IMAGE' | '3D_MODEL';
    anchor: 'FACE' | 'HAND_WRIST' | 'HAND_PALM' | 'HAND_INDEX_TIP';
    file_url: string;
    scale: number;
    position_offset: { x: number, y: number, z: number };
    rotation_offset: { x: number, y: number, z: number };
    created_at: string;
}

interface DetectionState {
    activeMode: DetectionMode;
    isConnected: boolean;
    fps: number;
    latency: number;

    // Asset state
    availableAssets: ARAsset[];
    selectedFaceAsset: ARAsset | null;
    selectedHandAsset: ARAsset | null;
    isAssetPanelOpen: boolean;

    // Actions
    setMode: (mode: DetectionMode) => void;
    setConnectionStatus: (status: boolean) => void;
    updateStats: (fps: number, latency: number) => void;
    setAssets: (assets: ARAsset[]) => void;
    selectFaceAsset: (asset: ARAsset | null) => void;
    selectHandAsset: (asset: ARAsset | null) => void;
    toggleAssetPanel: () => void;
}

export const useDetectionStore = create<DetectionState>((set) => ({
    activeMode: 'combined',
    isConnected: false,
    fps: 0,
    latency: 0,
    availableAssets: [],
    selectedFaceAsset: null,
    selectedHandAsset: null,
    isAssetPanelOpen: false,

    setMode: (mode) => set({ activeMode: mode }),
    setConnectionStatus: (status) => set({ isConnected: status }),
    updateStats: (fps, latency) => set({ fps, latency }),
    setAssets: (assets) => set({ availableAssets: assets }),
    selectFaceAsset: (asset) => set({ selectedFaceAsset: asset }),
    selectHandAsset: (asset) => set({ selectedHandAsset: asset }),
    toggleAssetPanel: () => set((state) => ({ isAssetPanelOpen: !state.isAssetPanelOpen })),
}));

// API Helpers
const API_BASE = 'http://localhost:8000';

export async function fetchAssets(): Promise<ARAsset[]> {
    try {
        const response = await fetch(`${API_BASE}/api/assets/`);
        if (!response.ok) throw new Error('Failed to fetch assets');
        const data = await response.json();
        return data.assets || [];
    } catch (error) {
        console.error('Error fetching assets:', error);
        return [];
    }
}

export async function uploadAsset(file: File, name: string, assetType: string, anchor: string): Promise<ARAsset | null> {
    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('name', name);
        formData.append('asset_type', assetType);
        formData.append('anchor', anchor);

        const response = await fetch(`${API_BASE}/api/assets/`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) throw new Error('Failed to upload asset');
        return await response.json();
    } catch (error) {
        console.error('Error uploading asset:', error);
        return null;
    }
}

export async function generateAIAsset(prompt: string, anchor: string): Promise<ARAsset | null> {
    try {
        const response = await fetch(`${API_BASE}/api/assets/generate/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt, anchor }),
        });

        if (!response.ok) throw new Error('Failed to generate asset');
        return await response.json();
    } catch (error) {
        console.error('Error generating asset:', error);
        return null;
    }
}

export async function deleteAsset(assetId: string): Promise<boolean> {
    try {
        const response = await fetch(`${API_BASE}/api/assets/${assetId}/`, {
            method: 'DELETE',
        });
        return response.ok;
    } catch (error) {
        console.error('Error deleting asset:', error);
        return false;
    }
}
