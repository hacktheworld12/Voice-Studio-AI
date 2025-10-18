import React, { useRef, useEffect } from 'react';

interface LiveWaveformProps {
  data: number; // A single normalized value (0-1) representing RMS volume
  isRecording: boolean;
}

export const LiveWaveform: React.FC<LiveWaveformProps> = ({ data, isRecording }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const smoothedDataRef = useRef(0);
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const context = canvas.getContext('2d');
    if (!context) return;
    
    context.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const midY = height / 2;
    const maxAmp = midY * 0.9;

    let animationFrameId: number;
    
    const render = () => {
        timeRef.current += 0.03;
        // Smooth the incoming data for fluid animation
        smoothedDataRef.current += (data - smoothedDataRef.current) * 0.1;
        
        context.clearRect(0, 0, width, height);

        const gradient = context.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, "#38bdf8"); // sky-400
        gradient.addColorStop(1, "#0ea5e9"); // sky-500
        
        // Draw the center line
        context.beginPath();
        context.moveTo(0, midY);
        context.lineTo(width, midY);
        context.strokeStyle = "#38bdf8";
        context.lineWidth = 1;
        context.globalAlpha = 0.2 + smoothedDataRef.current * 0.3; // Pulse with volume
        context.stroke();
        
        // Draw the main waveform
        if (isRecording) {
            context.fillStyle = gradient;
            context.shadowColor = '#0ea5e9';
            context.shadowBlur = 8;
            context.globalAlpha = 1.0;

            const amplitude = smoothedDataRef.current * maxAmp;
            
            context.beginPath();
            context.moveTo(0, midY);
            for (let x = 0; x < width; x++) {
                // Create a composite wave for a more organic feel
                const angle1 = (x / width) * Math.PI * 2 * 2 + timeRef.current; // Main wave
                const angle2 = (x / width) * Math.PI * 2 * 6 + timeRef.current * 0.8; // Higher frequency ripple
                const envelope = Math.sin(Math.PI * (x/width)); // Makes it taper at the ends
                
                const y1 = Math.sin(angle1) * amplitude * 0.7;
                const y2 = Math.sin(angle2) * amplitude * 0.3;

                const y = midY + (y1 + y2) * envelope;
                context.lineTo(x, y);
            }
            context.lineTo(width, midY);
            context.closePath();
            context.fill();

            // Reset shadow for next frame
            context.shadowBlur = 0;
        }
        
        animationFrameId = requestAnimationFrame(render);
    }
    
    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [data, isRecording]);

  return (
    <canvas 
        ref={canvasRef} 
        width="300" 
        height="100" 
        className="w-full h-full max-h-[150px]"
    />
  );
};