import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, Zap, ShieldCheck, MousePointer2, Box } from 'lucide-react';

interface TourStep {
    title: string;
    content: string;
    icon: React.ReactNode;
}

const steps: TourStep[] = [
    {
        title: "Protein Architecture",
        content: "This is the AlphaFold predicted 3D structure. It reveals the complex machinery of life at an atomic scale.",
        icon: <Box className="h-8 w-8 text-blue-400" />
    },
    {
        title: "Confidence Levels",
        content: "Colors represent prediction confidence. Blue regions are highly reliable, while Red/Orange segments are flexible or disordered.",
        icon: <ShieldCheck className="h-8 w-8 text-emerald-400" />
    },
    {
        title: "Navigation Control",
        content: "Rotate with Left Click, Pan with Right Click, and Zoom with the Scroll Wheel to explore every angle.",
        icon: <Zap className="h-8 w-8 text-purple-400" />
    },
    {
        title: "Interaction Learning",
        content: "Click any structural region to instantly learn about its secondary structure and biological significance.",
        icon: <MousePointer2 className="h-8 w-8 text-amber-400" />
    }
];

export default function OnboardingTour() {
    const [currentStep, setCurrentStep] = useState(0);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const hasSeenTour = localStorage.getItem('av_tour_seen');
        if (!hasSeenTour) {
            const timer = setTimeout(() => setIsVisible(true), 2000); // Delay for dramatic effect
            return () => clearTimeout(timer);
        }
    }, []);

    const handleDismiss = () => {
        setIsVisible(false);
        localStorage.setItem('av_tour_seen', 'true');
    };

    const nextStep = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(s => s + 1);
        } else {
            handleDismiss();
        }
    };

    const prevStep = () => {
        if (currentStep > 0) {
            setCurrentStep(s => s - 1);
        }
    };

    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/40 backdrop-blur-md">
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-slate-900 shadow-2xl shadow-blue-500/20"
            >
                <button
                    onClick={handleDismiss}
                    className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
                >
                    <X className="h-5 w-5" />
                </button>

                <div className="p-8">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentStep}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="flex flex-col items-center text-center gap-6"
                        >
                            <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                                {steps[currentStep].icon}
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white mb-2">{steps[currentStep].title}</h3>
                                <p className="text-sm text-slate-400 leading-relaxed">
                                    {steps[currentStep].content}
                                </p>
                            </div>
                        </motion.div>
                    </AnimatePresence>

                    <div className="mt-10 flex items-center justify-between">
                        <div className="flex gap-1.5">
                            {steps.map((_, i) => (
                                <div
                                    key={i}
                                    className={`h-1.5 rounded-full transition-all duration-300 ${i === currentStep ? 'w-6 bg-blue-500' : 'w-1.5 bg-slate-700'}`}
                                />
                            ))}
                        </div>

                        <div className="flex gap-2">
                            {currentStep > 0 && (
                                <button
                                    onClick={prevStep}
                                    className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white transition-colors"
                                >
                                    Back
                                </button>
                            )}
                            <button
                                onClick={nextStep}
                                className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20"
                            >
                                {currentStep === steps.length - 1 ? 'Start Exploring' : 'Next Step'}
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
