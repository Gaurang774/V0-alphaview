import { Sparkles } from 'lucide-react';

export const V0Badge = () => {
    return (
        <div className="fixed bottom-3 right-3 z-50 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-slate-900/60 border border-white/10 backdrop-blur-md opacity-70 transition-all duration-300 hover:opacity-100 cursor-default select-none group shadow-lg">
            <Sparkles className="h-3 w-3 text-slate-400 transition-colors group-hover:text-blue-400" />
            <span className="text-[10px] font-medium text-slate-400 tracking-wide transition-colors group-hover:text-slate-200">
                UI designed with v0
            </span>
        </div>
    );
};
