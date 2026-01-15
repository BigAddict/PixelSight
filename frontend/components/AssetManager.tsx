'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useDetectionStore, ARAsset, fetchAssets, uploadAsset, deleteAsset, generateAIAsset } from '../store/DetectionStore';

const ANCHOR_OPTIONS = [
    { id: 'FACE', label: 'Face' },
    { id: 'HAND_WRIST', label: 'Wrist' },
    { id: 'HAND_PALM', label: 'Palm' },
    { id: 'HAND_INDEX_TIP', label: 'Finger Tip' },
];

export default function AssetManager() {
    const {
        availableAssets,
        selectedFaceAsset,
        selectedHandAsset,
        isAssetPanelOpen,
        setAssets,
        selectFaceAsset,
        selectHandAsset,
        toggleAssetPanel
    } = useDetectionStore();

    const [activeAnchor, setActiveAnchor] = useState<string>('FACE');
    const [mode, setMode] = useState<'upload' | 'generate'>('upload');
    const [isUploading, setIsUploading] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [prompt, setPrompt] = useState('');
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Fetch assets on mount
    useEffect(() => {
        fetchAssets().then(setAssets);
    }, [setAssets]);

    const handleFileSelect = async (file: File) => {
        // Accept images and 3D models
        const isImage = file.type.startsWith('image/');
        const isModel = file.name.endsWith('.glb') || file.name.endsWith('.gltf');

        if (!isImage && !isModel) {
            alert('Please select an image (PNG/JPG) or 3D model (GLB/GLTF)');
            return;
        }

        setIsUploading(true);
        const name = file.name.replace(/\.[^/.]+$/, '');
        const assetType = isModel ? '3D_MODEL' : '2D_IMAGE';

        const newAsset = await uploadAsset(file, name, assetType, activeAnchor);

        if (newAsset) {
            setAssets([newAsset, ...availableAssets]);
        }
        setIsUploading(false);
    };

    const handleGenerate = async () => {
        if (!prompt.trim()) return;

        setIsGenerating(true);
        const newAsset = await generateAIAsset(prompt, activeAnchor);

        if (newAsset) {
            setAssets([newAsset, ...availableAssets]);
            setPrompt('');
            handleSelect(newAsset);
        } else {
            alert('Generation failed. Check API configuration.');
        }
        setIsGenerating(false);
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFileSelect(file);
    }, [activeAnchor, availableAssets]);

    const handleDelete = async (asset: ARAsset) => {
        if (await deleteAsset(asset.id)) {
            setAssets(availableAssets.filter(a => a.id !== asset.id));
            if (selectedFaceAsset?.id === asset.id) selectFaceAsset(null);
            if (selectedHandAsset?.id === asset.id) selectHandAsset(null);
        }
    };

    const handleSelect = (asset: ARAsset) => {
        // Simple logic: if anchor is FACE -> selectFaceAsset
        // if anchor starts with HAND -> selectHandAsset
        if (asset.anchor === 'FACE') {
            selectFaceAsset(selectedFaceAsset?.id === asset.id ? null : asset);
        } else {
            selectHandAsset(selectedHandAsset?.id === asset.id ? null : asset);
        }
    };

    // Filter assets by current anchor category
    // "Hand" tab shows all hand anchors? Or strict match?
    // Let's do strict match for now to keep it clean
    const filteredAssets = availableAssets.filter(a => a.anchor === activeAnchor);

    // Determine which asset is selected in this category
    const isSelected = (asset: ARAsset) => {
        if (asset.anchor === 'FACE') return selectedFaceAsset?.id === asset.id;
        return selectedHandAsset?.id === asset.id;
    };

    if (!isAssetPanelOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-zinc-900/95 border border-cyan-500/30 rounded-2xl w-full max-w-lg mx-4 shadow-[0_0_50px_rgba(6,182,212,0.2)] overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10 shrink-0">
                    <h2 className="text-xl font-bold font-mono text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">
                        ASSET_MANAGER
                    </h2>
                    <button
                        onClick={toggleAssetPanel}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors text-zinc-400 hover:text-white"
                    >
                        ✕
                    </button>
                </div>

                {/* Anchor Tabs */}
                <div className="flex gap-2 p-4 border-b border-white/10 shrink-0 overflow-x-auto custom-scrollbar">
                    {ANCHOR_OPTIONS.map((opt) => (
                        <button
                            key={opt.id}
                            onClick={() => setActiveAnchor(opt.id)}
                            className={`px-3 py-1.5 rounded-lg font-mono text-xs whitespace-nowrap transition-all
                                ${activeAnchor === opt.id
                                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                                }`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>

                {/* Mode Switcher */}
                <div className="flex border-b border-white/10 shrink-0">
                    <button
                        onClick={() => setMode('upload')}
                        className={`flex-1 py-3 text-xs font-mono uppercase tracking-widest transition-colors
                            ${mode === 'upload' ? 'bg-white/5 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                        Upload
                    </button>
                    <button
                        onClick={() => setMode('generate')}
                        className={`flex-1 py-3 text-xs font-mono uppercase tracking-widest transition-colors
                            ${mode === 'generate' ? 'bg-purple-500/10 text-purple-300' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                        Generate (AI)
                    </button>
                </div>

                {/* Content Area */}
                <div className="p-4 shrink-0">
                    {mode === 'upload' ? (
                        <div
                            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                            onDragLeave={() => setDragOver(false)}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
                                ${dragOver
                                    ? 'border-cyan-400 bg-cyan-500/10'
                                    : 'border-zinc-700 hover:border-zinc-500 hover:bg-white/5'
                                }
                                ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*,.glb,.gltf"
                                className="hidden"
                                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                            />
                            <div className="text-4xl mb-2">{isUploading ? '⏳' : '📦'}</div>
                            <p className="text-zinc-400 text-sm">
                                {isUploading ? 'Uploading...' : 'Drop Image or 3D Model'}
                            </p>
                            <p className="text-zinc-600 text-xs mt-2">Supports .png, .jpg, .glb</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            <textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="Describe your asset..."
                                className="w-full bg-black/40 border border-purple-500/30 rounded-xl p-3 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-purple-500 h-24 resize-none"
                            />
                            <button
                                onClick={handleGenerate}
                                disabled={isGenerating || !prompt.trim()}
                                className={`w-full py-3 rounded-xl font-bold tracking-wider transition-all
                                    ${isGenerating
                                        ? 'bg-purple-500/20 text-purple-400 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:opacity-90 shadow-[0_0_20px_rgba(168,85,247,0.4)]'
                                    }`}
                            >
                                {isGenerating ? 'GENERATING...' : 'GENERATE (2D)'}
                            </button>
                            <p className="text-xs text-zinc-500 text-center">Generates a 2D billboard asset</p>
                        </div>
                    )}
                </div>

                {/* Asset Gallery */}
                <div className="p-4 border-t border-white/10 overflow-y-auto flex-1 custom-scrollbar">
                    {filteredAssets.length === 0 ? (
                        <p className="text-center text-zinc-500 py-4">No assets for this anchor yet</p>
                    ) : (
                        <div className="grid grid-cols-4 gap-3">
                            {filteredAssets.map((asset) => (
                                <div
                                    key={asset.id}
                                    className={`relative group rounded-lg overflow-hidden aspect-square cursor-pointer border-2 transition-all
                                        ${isSelected(asset)
                                            ? 'border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                                            : 'border-transparent hover:border-white/30'
                                        }`}
                                    onClick={() => handleSelect(asset)}
                                >
                                    {/* Handle 3D model preview if file matches, otherwise img */}
                                    {asset.asset_type === '3D_MODEL' ? (
                                        <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-2xl">
                                            🧊
                                        </div>
                                    ) : (
                                        <img
                                            src={asset.file_url}
                                            alt={asset.name}
                                            className="w-full h-full object-cover"
                                        />
                                    )}

                                    <div className="absolute top-1 left-1 bg-black/50 rounded px-1 text-[10px] text-zinc-300">
                                        {asset.asset_type === '3D_MODEL' ? '3D' : '2D'}
                                    </div>

                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                                        <span className="text-xs text-white truncate flex-1">{asset.name}</span>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDelete(asset); }}
                                            className="text-red-400 hover:text-red-300 text-sm"
                                        >
                                            🗑
                                        </button>
                                    </div>
                                    {isSelected(asset) && (
                                        <div className="absolute top-1 right-1 w-5 h-5 bg-cyan-400 rounded-full flex items-center justify-center text-black text-xs font-bold">
                                            ✓
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
