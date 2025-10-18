import React, { useState } from 'react';
import { Recording } from '../types';
import { TrashIcon, SparklesIcon, PlayIcon, PauseIcon } from './icons';

const StaticWaveform: React.FC<{ waveform: number[][] }> = ({ waveform }) => {
    const canvasRef = React.useRef<HTMLCanvasElement>(null);

    React.useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !waveform || waveform.length === 0) return;
        
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;

        const context = canvas.getContext('2d');
        if (!context) return;
        
        context.scale(dpr, dpr);

        const width = rect.width;
        const height = rect.height;
        const step = width / waveform.length;
        const halfHeight = height / 2;

        context.clearRect(0, 0, width, height);
        
        const gradient = context.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, "#38bdf8"); // sky-400
        gradient.addColorStop(1, "#0ea5e9"); // sky-500
        context.fillStyle = gradient;

        context.beginPath();
        context.moveTo(0, halfHeight);

        // Draw top half (max values)
        waveform.forEach((val, i) => {
            const [_, max] = val;
            const x = step * i;
            const y = (1 - max) * halfHeight;
            context.lineTo(x, y);
        });
        
        // Draw bottom half (min values) in reverse
        for (let i = waveform.length - 1; i >= 0; i--) {
            const [min, _] = waveform[i];
            const x = step * i;
            const y = (1 - min) * halfHeight;
            context.lineTo(x, y);
        }

        context.closePath();
        context.fill();

    }, [waveform]);

    return (
        <canvas ref={canvasRef} className="w-full h-12 rounded-lg"></canvas>
    );
};

const RecordingItem: React.FC<{
    rec: Recording;
    onDelete: (id: string) => void;
    onGetFeedback: (recording: Recording) => void;
}> = ({ rec, onDelete, onGetFeedback }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const audioRef = React.useRef<HTMLAudioElement>(null);

    const togglePlay = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play();
            }
        }
    };

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
        const secs = Math.round(seconds % 60).toString().padStart(2, '0');
        return `${mins}:${secs}`;
    }

    return (
        <div className="bg-gray-800/30 rounded-lg p-4 flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <div>
                    <div className="font-semibold text-white truncate">{rec.name}</div>
                    <div className="text-xs text-slate-400">{new Date(rec.date).toLocaleDateString()} &middot; {formatDuration(rec.duration)}</div>
                </div>
                <div className="flex items-center space-x-2">
                    <button onClick={() => onGetFeedback(rec)} className="p-2 rounded-full hover:bg-sky-500/20 text-sky-400 transition-colors" title="Get AI Feedback"><SparklesIcon className="h-5 w-5" /></button>
                    <button onClick={() => onDelete(rec.id)} className="p-2 rounded-full hover:bg-red-500/20 text-red-400 transition-colors" title="Delete"><TrashIcon className="h-5 w-5" /></button>
                </div>
            </div>
            
            <div className="flex items-center gap-4">
                <audio 
                    ref={audioRef}
                    src={rec.audioURL} 
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onEnded={() => setIsPlaying(false)}
                    className="hidden" 
                />
                <button onClick={togglePlay} className="p-2 rounded-full bg-sky-500 text-white">
                    {isPlaying ? <PauseIcon className="h-5 w-5"/> : <PlayIcon className="h-5 w-5"/>}
                </button>
                <div className="flex-grow">
                     <StaticWaveform waveform={rec.waveform} />
                </div>
            </div>
        </div>
    );
};

export const RecordingList: React.FC<{
  recordings: Recording[];
  onDelete: (id: string) => void;
  onGetFeedback: (recording: Recording) => void;
}> = ({ recordings, onDelete, onGetFeedback }) => {
  if (recordings.length === 0) {
    return (
      <div className="flex-grow flex items-center justify-center text-center text-slate-500 p-8 min-h-[150px]">
        <div>
            <p className="text-lg">No Memos</p>
            <p className="text-sm">Press the red button to start your first recording.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full space-y-3 p-4">
      {recordings.map((rec) => (
        <RecordingItem 
            key={rec.id} 
            rec={rec} 
            onDelete={onDelete} 
            onGetFeedback={onGetFeedback} 
        />
      ))}
    </div>
  );
};