'use client';

import React from 'react';
import { useDetectionStore } from '../store/DetectionStore';

export default function InterfaceOverlay() {
    const { activeMode, setMode, isConnected, fps, latency, isAssetPanelOpen, toggleAssetPanel, selectedFaceAsset, selectedHandAsset } = useDetectionStore();

    return (
        <div className="absolute inset-0 z-50 pointer-events-none p-6 flex flex-col justify-between">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-4xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 drop-shadow-[0_0_15px_rgba(6,182,212,0.5)]">
                        PIXEL_SIGHT
                    </h1>
                    <div className="flex items-center gap-2 mt-2">
                        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400 shadow-[0_0_10px_#4ade80]' : 'bg-red-500'}`} />
                        <span className="text-xs font-mono text-cyan-300 tracking-widest">
                            {isConnected ? 'SYSTEM_ONLINE' : 'DISCONNECTED'}
                        </span>
                    </div>
                </div>

                {/* Stats */}
                <div className="flex flex-col gap-1 text-right font-mono text-xs text-cyan-500/80">
                    <span>FPS: {fps}</span>
                    <span>LATENCY: {latency.toFixed(1)}ms</span>
                </div>
            </div>

            {/* Active Assets Indicator */}
            <div className="absolute top-24 right-6 flex flex-col gap-2 items-end pointer-events-auto">
                {/* Asset Manager Toggle */}
                <button
                    onClick={toggleAssetPanel}
                    className={`p-3 rounded-xl backdrop-blur-md border transition-all duration-300 group
                        ${isAssetPanelOpen
                            ? 'bg-cyan-500/20 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.3)]'
                            : 'bg-black/40 border-white/10 hover:border-cyan-400/50 hover:bg-black/60'}`}
                >
                    <span className="text-2xl group-hover:scale-110 transition-transform block">🪄</span>
                </button>

                {(selectedFaceAsset || selectedHandAsset) && (
                    <div className="bg-black/60 backdrop-blur-md rounded-lg p-3 border border-purple-500/30">
                        <div className="text-[10px] text-purple-300 font-bold mb-1 uppercase tracking-wider">Active Assets</div>
                        {selectedFaceAsset && (
                            <div className="flex items-center gap-2 text-xs text-white mb-1">
                                <span>👤</span> {selectedFaceAsset.name}
                            </div>
                        )}
                        {selectedHandAsset && (
                            <div className="flex items-center gap-2 text-xs text-white">
                                <span>✋</span> {selectedHandAsset.name}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Mode Selector */}
            <div className="flex justify-center gap-4 pointer-events-auto">
                {(['combined', 'face', 'hands'] as const).map((mode) => (
                    <button
                        key={mode}
                        onClick={() => setMode(mode)}
                        className={`px-6 py-2 rounded-full font-bold uppercase tracking-widest text-sm transition-all duration-300
                            ${activeMode === mode
                                ? 'bg-cyan-500 text-black shadow-[0_0_20px_rgba(6,182,212,0.6)] scale-110'
                                : 'bg-black/40 text-cyan-500/50 hover:bg-black/60 hover:text-cyan-400 backdrop-blur-sm border border-white/5'
                            }`}
                    >
                        {mode}
                    </button>
                ))}
            </div>
        </div>
    );
}

