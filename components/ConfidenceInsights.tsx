import { ShieldCheck, Info } from 'lucide-react';

interface ConfidenceInsightsProps {
    stats: {
        avg: number;
        high: number;
        medium: number;
        low: number;
    } | null;
}

export default function ConfidenceInsights({ stats }: ConfidenceInsightsProps) {
    if (!stats) return null;

    const sections = [
        { label: 'Very High', range: '> 90', color: 'bg-blue-600', value: stats.high },
        { label: 'Confident', range: '70-90', color: 'bg-cyan-500', value: stats.medium },
        { label: 'Low / Uncertain', range: '< 70', color: 'bg-amber-400', value: stats.low },
    ];

    return (
        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5 backdrop-blur-xl shadow-2xl animate-in fade-in slide-in-from-right-4 duration-500">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 mb-5 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-400" /> Confidence Insights
            </h3>

            <div className="space-y-6">
                {/* Average Score */}
                <div className="flex items-end justify-between">
                    <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Average pLDDT</p>
                        <p className="text-3xl font-black text-white">{stats.avg.toFixed(1)}</p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${stats.avg > 80 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                        {stats.avg > 80 ? 'Reliable Model' : 'Partially Flexible'}
                    </div>
                </div>

                {/* Distribution Bars */}
                <div className="space-y-3">
                    {sections.map((s, i) => (
                        <div key={i} className="space-y-1.5">
                            <div className="flex items-center justify-between text-[10px] font-bold uppercase">
                                <span className="text-slate-400 flex items-center gap-2">
                                    <div className={`h-2 w-2 rounded-full ${s.color}`} />
                                    {s.label} ({s.range})
                                </span>
                                <span className="text-white">{s.value.toFixed(1)}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                <div
                                    className={`h-full ${s.color} transition-all duration-1000 ease-out`}
                                    style={{ width: `${s.value}%` }}
                                />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Explanation */}
                <div className="pt-4 border-t border-white/5">
                    <div className="flex gap-3 text-[11px] leading-relaxed text-slate-400 italic">
                        <Info className="h-4 w-4 shrink-0 text-blue-400 not-italic" />
                        <p>
                            <strong className="text-blue-400 not-italic">Blue regions</strong> = reliable structure.
                            <br />
                            <strong className="text-amber-400 not-italic">Yellow/red regions</strong> may be flexible or uncertain.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
