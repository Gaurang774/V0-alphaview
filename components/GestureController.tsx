import { useEffect, useRef, useState } from 'react';
import { RefreshCw, Hand, X } from 'lucide-react';
import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

interface GestureControllerProps {
    onGesture: (type: 'rotate' | 'zoom' | 'reset' | 'pan' | 'click' | null, data?: any) => void;
}

export default function GestureController({ onGesture }: GestureControllerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [handLandmarker, setHandLandmarker] = useState<HandLandmarker | null>(null);
    const [cameraActive, setCameraActive] = useState(false);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState<'IDLE' | 'DETECTING' | 'NOT_FOUND'>('IDLE');
    const [activeGesture, setActiveGesture] = useState<string | null>(null);

    // Stabilization and Smoothing State
    const lastLandmark = useRef<{ x: number, y: number } | null>(null);
    const smoothedPos = useRef<{ x: number, y: number }>({ x: 0, y: 0 });
    const lastPinchDist = useRef<number | null>(null);
    const requestRef = useRef<number>(0);
    const isTapped = useRef<boolean>(false);
    const lastClickTime = useRef<number>(0);
    const lastResetTime = useRef<number>(0);

    // Hyperparameters
    const ALPHA = 0.4; // Slightly more responsive
    const GAIN = 15;   // Higher gain for more immediate rotation
    const DEADZONE = 0.003; // More sensitive
    const CLICK_THRESHOLD = 0.07;
    const CLICK_RELEASE = 0.10;

    useEffect(() => {
        let isMounted = true;

        const initMediaPipe = async () => {
            try {
                const vision = await FilesetResolver.forVisionTasks(
                    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
                );
                const landmarker = await HandLandmarker.createFromOptions(vision, {
                    baseOptions: {
                        modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
                        delegate: "GPU"
                    },
                    runningMode: "VIDEO",
                    numHands: 2,
                    minHandDetectionConfidence: 0.7,
                    minHandPresenceConfidence: 0.7,
                    minTrackingConfidence: 0.7
                });

                if (isMounted) {
                    setHandLandmarker(landmarker);
                    setLoading(false);
                    console.log("[Gesture] HandLandmarker initialized.");
                } else {
                    landmarker.close();
                }
            } catch (error) {
                console.error("[Gesture] Failed to init MediaPipe:", error);
                if (isMounted) setLoading(false);
            }
        };

        initMediaPipe();

        return () => {
            isMounted = false;
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
            // We'll close landmarker in a separate effect or if we can track it safely
        };
    }, []);

    const processFrame = () => {
        if (!videoRef.current || !handLandmarker || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        if (video.readyState >= 2) { // HAVE_CURRENT_DATA
            const startTimeMs = performance.now();
            const results = handLandmarker.detectForVideo(video, startTimeMs);

            ctx.save();
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            if (results.landmarks && results.landmarks.length > 0) {
                setStatus('DETECTING');

                const landmarks = results.landmarks[0];
                const indexTip = landmarks[8]; // Landmark 8 is index finger tip
                const thumbTip = landmarks[4];
                const middleTip = landmarks[12];
                const ringTip = landmarks[16];
                const pinkyTip = landmarks[20];
                const wrist = landmarks[0];

                // Detect gestures with robust finger extension logic
                const isExtended = (tipIdx: number, dipIdx: number) => {
                    const tip = landmarks[tipIdx];
                    const dip = landmarks[dipIdx];
                    const mcp = landmarks[tipIdx - 3]; // Rough approximation for MCP

                    const dTip = Math.hypot(tip.x - wrist.x, tip.y - wrist.y);
                    const dDip = Math.hypot(dip.x - wrist.x, dip.y - wrist.y);

                    // A finger is extended if the tip is significantly further from the wrist than the last knuckle
                    return dTip > dDip * 1.1;
                };

                const indexOut = isExtended(8, 7);
                const middleOut = isExtended(12, 11);
                const ringOut = isExtended(16, 15);
                const pinkyOut = isExtended(20, 19);

                const isPalm = indexOut && middleOut && ringOut && pinkyOut;
                const tapDist = Math.hypot(indexTip.x - thumbTip.x, indexTip.y - thumbTip.y);

                // Landmark 8 tracking with stabilization
                if (lastLandmark.current) {
                    let dx = indexTip.x - lastLandmark.current.x;
                    let dy = indexTip.y - lastLandmark.current.y;

                    // Deadzone
                    if (Math.abs(dx) < DEADZONE) dx = 0;
                    if (Math.abs(dy) < DEADZONE) dy = 0;

                    // Exponential Smoothing
                    smoothedPos.current.x = ALPHA * dx + (1 - ALPHA) * smoothedPos.current.x;
                    smoothedPos.current.y = ALPHA * dy + (1 - ALPHA) * smoothedPos.current.y;

                    // Click Logic
                    if (tapDist < CLICK_THRESHOLD) {
                        setActiveGesture('CLICK');
                        if (!isTapped.current) {
                            onGesture('click', { x: indexTip.x, y: indexTip.y });
                            isTapped.current = true;
                            lastClickTime.current = Date.now();
                        }
                    } else if (tapDist > CLICK_RELEASE) {
                        isTapped.current = false;
                    }

                    // Unified Decision Tree
                    const now = Date.now();
                    const clickLocked = now - lastClickTime.current < 400;

                    if (isPalm) {
                        if (now - lastResetTime.current > 2000) { // Debounce reset
                            setActiveGesture('RESET VIEW');
                            onGesture('reset');
                            lastResetTime.current = now;
                        }
                    } else if (clickLocked) {
                        // Prevent movement jitter during/after click
                    } else if (results.landmarks.length === 2) {
                        // Pinch Zoom (using index tips of both hands)
                        setActiveGesture('ZOOMING');
                        const h1 = results.landmarks[0][8];
                        const h2 = results.landmarks[1][8];
                        const dist = Math.hypot(h1.x - h2.x, h1.y - h2.y);

                        if (lastPinchDist.current !== null) {
                            const delta = (dist - lastPinchDist.current) * 20; // Increased zoom sensitivity
                            if (Math.abs(delta) > 0.005) {
                                onGesture('zoom', delta);
                            }
                        }
                        lastPinchDist.current = dist;
                    } else if (middleOut && indexOut && !ringOut) {
                        setActiveGesture('PANNING');
                        onGesture('pan', {
                            x: -smoothedPos.current.x * GAIN * 1.5,
                            y: smoothedPos.current.y * GAIN * 1.5
                        });
                    } else if (indexOut && !middleOut) {
                        setActiveGesture('ROTATING');
                        onGesture('rotate', {
                            x: -smoothedPos.current.x * GAIN,
                            y: smoothedPos.current.y * GAIN
                        });
                    }
                } else {
                    lastPinchDist.current = null;
                }

                lastLandmark.current = { x: indexTip.x, y: indexTip.y };

                // Draw Visualization
                ctx.fillStyle = '#3b82f6';
                landmarks.forEach(lm => {
                    ctx.beginPath();
                    ctx.arc(lm.x * canvas.width, lm.y * canvas.height, 2, 0, 2 * Math.PI);
                    ctx.fill();
                });

                // Focus Ring
                ctx.strokeStyle = '#3b82f6';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(indexTip.x * canvas.width, indexTip.y * canvas.height, 10, 0, 2 * Math.PI);
                ctx.stroke();

            } else {
                setStatus('NOT_FOUND');
                setActiveGesture(null);
                lastLandmark.current = null;
                lastPinchDist.current = null;
            }
            ctx.restore();
        }

        requestRef.current = requestAnimationFrame(processFrame);
    };

    const toggleCamera = async () => {
        if (!handLandmarker) return;

        if (cameraActive) {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
            if (videoRef.current && videoRef.current.srcObject) {
                (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
            }
            setCameraActive(false);
            onGesture(null);
            setStatus('IDLE');
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480 }
            });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.onloadedmetadata = () => {
                    videoRef.current?.play();
                    setCameraActive(true);
                    requestRef.current = requestAnimationFrame(processFrame);
                };
            }
        } catch (err) {
            console.error("[Gesture] Camera error:", err);
        }
    };

    return (
        <div className="absolute top-24 right-4 z-50 flex flex-col items-end gap-2 pointer-events-none">
            <div className="relative overflow-hidden rounded-xl border-2 border-slate-700 bg-black shadow-2xl transition-all pointer-events-auto">
                <video
                    ref={videoRef}
                    className={`h-32 w-48 object-cover -scale-x-100 ${!cameraActive ? 'hidden' : 'block'}`}
                    playsInline
                />
                <canvas
                    ref={canvasRef}
                    className={`absolute inset-0 h-32 w-48 -scale-x-100 ${!cameraActive ? 'hidden' : 'block'}`}
                    width={640}
                    height={480}
                />

                {cameraActive && status === 'NOT_FOUND' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-[2px] text-center p-4">
                        <Hand className="h-6 w-6 text-slate-400 mb-1 animate-pulse" />
                        <p className="text-[10px] font-bold uppercase tracking-widest text-white/80">Searching Hand...</p>
                    </div>
                )}

                {!cameraActive && (
                    <div className="flex h-32 w-48 items-center justify-center bg-slate-900 text-slate-500">
                        <Hand className="h-8 w-8 opacity-30" />
                    </div>
                )}
            </div>

            <button
                onClick={toggleCamera}
                disabled={loading}
                className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-bold uppercase tracking-wider transition-all pointer-events-auto shadow-lg group ${cameraActive
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
                    : 'bg-blue-600 text-white hover:bg-blue-500 transform hover:scale-105 active:scale-95'
                    } disabled:opacity-50`}
            >
                {loading ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                ) : cameraActive ? (
                    <><X className="h-4 w-4" /> Stop Protocol</>
                ) : (
                    <><Hand className="h-4 w-4" /> Start Gesture Control</>
                )}
            </button>

            {cameraActive && (
                <div className="rounded-lg bg-slate-950/80 p-3 text-[10px] font-medium text-slate-400 backdrop-blur border border-white/5 shadow-xl">
                    <div className="mb-2 flex items-center justify-between border-b border-white/10 pb-1">
                        <div className="flex items-center gap-2">
                            <div className={`h-1.5 w-1.5 rounded-full ${status === 'DETECTING' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                            <span className="uppercase tracking-[0.2em]">{status === 'DETECTING' ? 'Active' : 'Searching...'}</span>
                        </div>
                        {activeGesture && (
                            <span className="text-[9px] font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                                {activeGesture}
                            </span>
                        )}
                    </div>
                    <div className="space-y-1.5 opacity-80 mt-1">
                        <div className="flex items-center gap-2"><span>☝️</span> Rotate: Index Up</div>
                        <div className="flex items-center gap-2"><span>✌️</span> Pan: Index + Middle Up</div>
                        <div className="flex items-center gap-2"><span>👐</span> Reset: Open Palm</div>
                        <div className="flex items-center gap-2"><span>✌️✌️</span> Zoom: Two Hands</div>
                    </div>
                </div>
            )}
        </div>
    );
}
