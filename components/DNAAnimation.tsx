import React, { useEffect, useRef, useState } from 'react';

interface DNAAnimationProps {
    className?: string;
}

const DNAAnimation: React.FC<DNAAnimationProps> = ({ className }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [images, setImages] = useState<HTMLImageElement[]>([]);
    const [loaded, setLoaded] = useState(false);
    const frameCount = 40;

    // Preload images
    useEffect(() => {
        let loadedCount = 0;
        const loadedImages: HTMLImageElement[] = [];

        for (let i = 1; i <= frameCount; i++) {
            const img = new Image();
            const frameNumber = i.toString().padStart(3, '0');
            img.src = `/S/EZGIF/ezgif-frame-${frameNumber}.jpg`;
            img.onload = () => {
                loadedCount++;
                if (loadedCount === frameCount) {
                    setImages(loadedImages);
                    setLoaded(true);
                }
            };
            loadedImages[i - 1] = img;
        }
    }, []);

    useEffect(() => {
        if (!loaded || images.length === 0 || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        let startTime: number;
        const durationPerFrame = 100; // ms per keyframe

        const render = (time: number) => {
            if (!startTime) startTime = time;
            const progress = (time - startTime) / durationPerFrame;

            const currentFrameIndex = Math.floor(progress) % frameCount;
            const nextFrameIndex = (currentFrameIndex + 1) % frameCount;
            const interpolationAlpha = progress % 1;

            const currentImg = images[currentFrameIndex];
            const nextImg = images[nextFrameIndex];

            if (currentImg && nextImg) {
                // Clear and draw
                ctx.clearRect(0, 0, canvas.width, canvas.height);

                // Ensure images are drawn to cover/fit
                const scale = Math.max(canvas.width / currentImg.width, canvas.height / currentImg.height);
                const x = (canvas.width / 2) - (currentImg.width / 2) * scale;
                const y = (canvas.height / 2) - (currentImg.height / 2) * scale;
                const width = currentImg.width * scale;
                const height = currentImg.height * scale;

                // Draw current frame
                ctx.globalAlpha = 1 - interpolationAlpha;
                ctx.drawImage(currentImg, x, y, width, height);

                // Draw next frame for smooth interpolation
                ctx.globalAlpha = interpolationAlpha;
                ctx.drawImage(nextImg, x, y, width, height);
            }

            animationFrameId = requestAnimationFrame(render);
        };

        animationFrameId = requestAnimationFrame(render);

        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, [loaded, images]);

    // Handle resize
    useEffect(() => {
        const handleResize = () => {
            if (canvasRef.current) {
                const parent = canvasRef.current.parentElement;
                if (parent) {
                    canvasRef.current.width = parent.clientWidth;
                    canvasRef.current.height = parent.clientHeight;
                }
            }
        };

        window.addEventListener('resize', handleResize);
        handleResize();

        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <div className={`relative w-full h-full overflow-hidden ${className}`}>
            {!loaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm z-20">
                    <div className="flex flex-col items-center gap-4">
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                        <span className="text-xs font-medium text-blue-400 uppercase tracking-widest animate-pulse">Initializing Helix Data...</span>
                    </div>
                </div>
            )}
            <canvas
                ref={canvasRef}
                className="w-full h-full object-cover"
                style={{ filter: 'contrast(1.1) brightness(1.1)' }}
            />
            {/* Subtle overlay to match dashboard aesthetic */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950 pointer-events-none opacity-60" />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-transparent to-slate-950 pointer-events-none opacity-60" />
        </div>
    );
};

export default DNAAnimation;
