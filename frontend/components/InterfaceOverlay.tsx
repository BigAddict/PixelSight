'use client';

import React from 'react';
import { useDetectionStore } from '../store/DetectionStore';

export default function InterfaceOverlay() {
    const { activeMode, setMode, isConnected, fps } = useDetectionStore();

    return (
        <div className="absolute inset-0 pointer-events-none z-50 flex flex-col justify-between p-6 overflow-hidden">
            {/* Header / Status */}
            <div className="flex justify-between items-start">
                <div className="bg-black/40 backdrop-blur-md border border-cyan-500/30 p-4 rounded-lg shadow-[0_0_15px_rgba(6,182,212,0.2)]">
                    <h1 className="text-2xl font-bold font-mono text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 tracking-wider">
                        NEURAL_CONNECT
                    </h1>
                    <div className="flex items-center gap-2 mt-2">
                        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' : 'bg-red-500 animate-pulse'}`} />
                        <span className="text-xs font-mono text-cyan-300">
                            {isConnected ? 'SYSTEM_ONLINE' : 'SEARCHING_SIGNAL...'}
                        </span>
                    </div>
                </div>

                <div className="bg-black/40 backdrop-blur-md border border-purple-500/30 p-2 rounded-lg text-right font-mono text-xs text-purple-300">
                    <div>FPS: <span className="text-white font-bold text-base">{fps}</span></div>
                    <div className="mt-1">LATENCY: <span className="text-white">12ms</span></div>
                </div>
            </div>

            {/* Crosshairs & Decorations */}
            <div className="absolute center top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vh] border border-white/5 border-dashed rounded-3xl pointer-events-none opacity-50" />
            <div className="absolute top-1/2 left-4 w-1 h-32 bg-gradient-to-b from-transparent via-cyan-500/50 to-transparent" />
            <div className="absolute top-1/2 right-4 w-1 h-32 bg-gradient-to-b from-transparent via-purple-500/50 to-transparent" />

            {/* Mode Selector */}
            <div className="pointer-events-auto self-center mb-8">
                <div className="flex gap-4 p-2 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/10 shadow-2xl">
                    {(['face', 'combined', 'hands'] as const).map((mode) => (
                        <button
                            key={mode}
                            onClick={() => setMode(mode)}
                            className={`
                relative px-6 py-3 rounded-xl min-w-[120px] transition-all duration-300 overflow-hidden group
                ${activeMode === mode
                                    ? 'bg-cyan-500/20 shadow-[0_0_30px_rgba(6,182,212,0.3)] border-cyan-500/50'
                                    : 'hover:bg-white/5 border-transparent'}
                border
              `}
                        >
                            <div className={`absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000`} />
                            <span className={`
                font-mono uppercase text-sm tracking-widest font-bold
                ${activeMode === mode ? 'text-cyan-100' : 'text-zinc-500 group-hover:text-zinc-300'}
              `}>
                                {mode}
                            </span>

                            {/* Active Indicator Line */}
                            {activeMode === mode && (
                                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />
                            )}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
