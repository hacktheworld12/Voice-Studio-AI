import React from 'react';
import { EffectSettings, ReverbPreset } from '../types';
import { CloseIcon, TuneIcon } from './icons';

interface StudioEffectsProps {
    settings: EffectSettings;
    onChange: (category: keyof EffectSettings, setting: string, value: number | string) => void;
    onClose: () => void;
}

const EffectSlider: React.FC<{
    label: string;
    value: number;
    min: number;
    max: number;
    step: number;
    onChange: (value: number) => void;
    unit?: string;
    color: string; // e.g., 'bg-cyan-400'
}> = ({ label, value, min, max, step, onChange, unit = '', color }) => {
    const progress = ((value - min) / (max - min)) * 100;
    
    return (
        <div className="w-full">
            <div className="flex items-baseline justify-between mb-2">
                <label className="block text-sm font-medium text-slate-200">{label}</label>
                <span className="text-sm font-mono text-cyan-300 w-14 text-right">{value.toFixed(0)}{unit}</span>
            </div>
            <div className="relative h-6 flex items-center">
                <div className="pro-slider-track absolute w-full h-[6px] bg-slate-800 rounded-full">
                     <div 
                        className={`h-full rounded-full ${color}`}
                        style={{ width: `${progress}%` }}
                     ></div>
                </div>
                <input 
                    type="range"
                    min={min} max={max} step={step}
                    value={value}
                    onChange={(e) => onChange(+e.target.value)}
                    aria-label={label}
                    className="pro-slider relative"
                    style={{ background: 'transparent' }}
                />
            </div>
        </div>
    );
}

const EffectSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="border-t border-slate-700/60 pt-6">
        <h3 className="text-sm font-semibold text-slate-400 mb-4">{title}</h3>
        <div className="space-y-5">
            {children}
        </div>
    </div>
);

export const StudioEffects: React.FC<StudioEffectsProps> = ({ settings, onChange, onClose }) => {
    return (
        <div className="bg-slate-900 rounded-t-3xl border-t border-slate-700 shadow-2xl">
            <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <TuneIcon className="w-6 h-6 text-cyan-400" />
                        <h2 className="text-xl font-bold text-white">Enhance Audio</h2>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors">
                        <CloseIcon className="w-5 h-5"/>
                    </button>
                </div>
            </div>
            
            <div className="space-y-6 px-6 pb-8 max-h-[60vh] overflow-y-auto">
                <EffectSection title="Dynamics">
                    <EffectSlider 
                        label="Compressor"
                        value={settings.compressor.threshold}
                        min={-80} max={0} step={1}
                        onChange={(v) => onChange('compressor', 'threshold', v)}
                        unit="dB"
                        color="bg-green-400"
                    />
                     <EffectSlider 
                        label="Noise Gate"
                        value={settings.noiseGate.threshold}
                        min={-80} max={0} step={1}
                        onChange={(v) => onChange('noiseGate', 'threshold', v)}
                        unit="dB"
                        color="bg-yellow-400"
                    />
                </EffectSection>

                <EffectSection title="Tone (EQ)">
                    <EffectSlider 
                        label="Bass"
                        value={settings.eq.bass}
                        min={-12} max={12} step={1}
                        onChange={(v) => onChange('eq', 'bass', v)}
                        unit="dB"
                        color="bg-orange-400"
                    />
                    <EffectSlider 
                        label="Mids"
                        value={settings.eq.mids}
                        min={-12} max={12} step={1}
                        onChange={(v) => onChange('eq', 'mids', v)}
                        unit="dB"
                        color="bg-sky-400"
                    />
                    <EffectSlider 
                        label="Treble"
                        value={settings.eq.treble}
                        min={-12} max={12} step={1}
                        onChange={(v) => onChange('eq', 'treble', v)}
                        unit="dB"
                        color="bg-violet-400"
                    />
                </EffectSection>

                 <EffectSection title="Ambience">
                    <div>
                        <label className="block text-sm font-medium text-slate-200 mb-2">Room Sound</label>
                        <div className="pro-select-wrapper">
                            <select
                                value={settings.reverb.preset}
                                onChange={(e) => onChange('reverb', 'preset', e.target.value)}
                                className="pro-select"
                            >
                                <option value="none">None (Dry)</option>
                                <option value="small-room">Small Room</option>
                                <option value="large-hall">Large Hall</option>
                                <option value="mosque">Mosque</option>
                            </select>
                        </div>
                    </div>
                    <EffectSlider 
                        label="Mix"
                        value={settings.reverb.mix * 100}
                        min={0} max={100} step={1}
                        onChange={(v) => onChange('reverb', 'mix', v / 100)}
                        unit="%"
                        color="bg-pink-400"
                    />
                </EffectSection>
            </div>
        </div>
    );
};