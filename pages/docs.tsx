import Head from 'next/head';
import Link from 'next/link';
import { ChevronLeft, Book, MousePointer2, Hand, MessageSquare, Terminal } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Documentation() {
    return (
        <div className="min-h-screen bg-slate-950 text-slate-50 selection:bg-blue-500/30">
            <Head>
                <title>Documentation | AlphaView</title>
            </Head>

            {/* Background Decor */}
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute -left-[10%] -top-[10%] h-[50%] w-[50%] rounded-full bg-blue-600/5 blur-[120px]" />
                <div className="absolute -right-[10%] -bottom-[10%] h-[50%] w-[50%] rounded-full bg-indigo-600/5 blur-[120px]" />
            </div>

            <main className="relative z-10 mx-auto max-w-4xl px-6 py-20">
                <Link href="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-12 group">
                    <ChevronLeft className="h-5 w-5 transition-transform group-hover:-translate-x-1" />
                    Back to Laboratory
                </Link>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                >
                    <div className="flex items-center gap-4 mb-12">
                        <Book className="h-10 w-10 text-blue-500" />
                        <h1 className="text-4xl font-bold tracking-tight">Documentation</h1>
                    </div>

                    <div className="space-y-16">
                        {/* Getting Started */}
                        <section>
                            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                                <Terminal className="h-6 w-6 text-slate-500" />
                                1. Getting Started
                            </h2>
                            <div className="bg-slate-900/40 rounded-2xl p-6 border border-white/5">
                                <p className="text-slate-300 mb-4">To begin exploring a protein structure, simply enter a UniProt ID or Protein Name into the search bar on the home page.</p>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3 text-sm text-slate-400">
                                        <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                                        <span><strong>UniProt ID:</strong> P00533 (EGFR), P0DTD1 (SARS-CoV-2 Spike)</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-slate-400">
                                        <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                                        <span><strong>Common Name:</strong> Insulin, Hemoglobin, p53</span>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Mouse Controls */}
                        <section>
                            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                                <MousePointer2 className="h-6 w-6 text-slate-500" />
                                2. Navigation Protocols (Mouse)
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="bg-slate-900/20 p-4 rounded-xl border border-white/5">
                                    <p className="font-bold text-sm mb-1 text-blue-400">ROTATE</p>
                                    <p className="text-xs text-slate-400 leading-relaxed">Left-click and drag to rotate the structure in all directions.</p>
                                </div>
                                <div className="bg-slate-900/20 p-4 rounded-xl border border-white/5">
                                    <p className="font-bold text-sm mb-1 text-emerald-400">PAN</p>
                                    <p className="text-xs text-slate-400 leading-relaxed">Right-click and drag to move the camera across the scene.</p>
                                </div>
                                <div className="bg-slate-900/20 p-4 rounded-xl border border-white/5">
                                    <p className="font-bold text-sm mb-1 text-indigo-400">ZOOM</p>
                                    <p className="text-xs text-slate-400 leading-relaxed">Use the scroll wheel to dive into atomic details or zoom out.</p>
                                </div>
                            </div>
                        </section>

                        {/* Gesture Protocols */}
                        <section>
                            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                                <Hand className="h-6 w-6 text-emerald-500" />
                                3. Hand Gesture Protocol (Experimental)
                            </h2>
                            <div className="bg-slate-900/40 rounded-2xl p-8 border border-emerald-500/10">
                                <p className="text-slate-300 mb-6">Enable your webcam to interact with structures using touchless gestures:</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                    <ul className="space-y-4">
                                        <li className="flex gap-4">
                                            <div className="flex-none w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 font-bold text-xs ring-1 ring-emerald-500/20">1</div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-200">Single Finger Out</p>
                                                <p className="text-xs text-slate-500">Rotate structure relative to finger movement.</p>
                                            </div>
                                        </li>
                                        <li className="flex gap-4">
                                            <div className="flex-none w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 font-bold text-xs ring-1 ring-emerald-500/20">2</div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-200">Two Fingers Out</p>
                                                <p className="text-xs text-slate-500">Pan structure following your hand.</p>
                                            </div>
                                        </li>
                                    </ul>
                                    <ul className="space-y-4">
                                        <li className="flex gap-4">
                                            <div className="flex-none w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 font-bold text-xs ring-1 ring-emerald-500/20">3</div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-200">Pinch (Pinch Grip)</p>
                                                <p className="text-xs text-slate-500">Zoom in/out by adjusting distance between fingers.</p>
                                            </div>
                                        </li>
                                        <li className="flex gap-4">
                                            <div className="flex-none w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 font-bold text-xs ring-1 ring-emerald-500/20">4</div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-200">Open Palm</p>
                                                <p className="text-xs text-slate-500">Reset focus and center the protein in view.</p>
                                            </div>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </section>

                        {/* AlphaBot AI */}
                        <section>
                            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                                <MessageSquare className="h-6 w-6 text-purple-500" />
                                4. Interaction with AlphaBot AI
                            </h2>
                            <div className="bg-slate-900/20 rounded-2xl p-6 border border-white/5 space-y-4">
                                <p className="text-slate-300">AlphaBot is your intelligent sidekick for structural analysis. It supports:</p>
                                <div className="space-y-3">
                                    <div className="flex items-start gap-4">
                                        <div className="h-1.5 w-1.5 rounded-full bg-purple-500 mt-2" />
                                        <div>
                                            <p className="text-sm font-bold text-slate-200">Contextual Queries</p>
                                            <p className="text-xs text-slate-500 leading-relaxed">Click on any atom or residue in the 3D view. AlphaBot will immediately recognize the selection and can explain its specific role or stability.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4">
                                        <div className="h-1.5 w-1.5 rounded-full bg-purple-500 mt-2" />
                                        <div>
                                            <p className="text-sm font-bold text-slate-200">Visual Commands</p>
                                            <p className="text-xs text-slate-500 leading-relaxed">Ask "Show me the helices" or "Highlight confidence scores" to trigger automated visual protocols.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>

                    <div className="mt-20 py-10 border-t border-slate-900 flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-slate-600">
                        <span>V1.0.4 - LATEST PROTOCOL</span>
                        <span>© 2026 ALPHAVIEW</span>
                    </div>
                </motion.div>
            </main>
        </div>
    );
}
