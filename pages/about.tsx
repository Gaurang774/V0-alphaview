import Head from 'next/head';
import Link from 'next/link';
import { ChevronLeft, Info, Cpu, Globe, FlaskConical } from 'lucide-react';
import { motion } from 'framer-motion';

export default function About() {
    return (
        <div className="min-h-screen bg-slate-950 text-slate-50 selection:bg-blue-500/30">
            <Head>
                <title>About | AlphaView</title>
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
                    <div className="flex items-center gap-4 mb-8">
                        <div className="h-12 w-12 overflow-hidden rounded-xl border border-white/10 bg-white/5 p-1 shadow-2xl backdrop-blur-sm">
                            <img src="/logo.png" alt="AV Logo" className="h-full w-full object-cover" />
                        </div>
                        <h1 className="text-4xl font-bold tracking-tight">About AlphaView</h1>
                    </div>

                    <div className="prose prose-invert prose-slate max-w-none">
                        <p className="text-xl leading-relaxed text-slate-300 mb-12">
                            AlphaView is a next-generation education and research platform designed to bridge the gap between
                            complex structural biology and intuitive human interaction.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
                            <section className="bg-slate-900/40 rounded-2xl p-6 border border-white/5 backdrop-blur-sm">
                                <Info className="h-8 w-8 text-blue-400 mb-4" />
                                <h2 className="text-xl font-bold mb-2">Our Mission</h2>
                                <p className="text-slate-400 text-sm leading-relaxed">
                                    We believe that understanding the building blocks of life shouldn't require decades of specialized training.
                                    By combining state-of-the-art AI with immersive visualization, we make protein research accessible to students,
                                    educators, and curious minds worldwide.
                                </p>
                            </section>

                            <section className="bg-slate-900/40 rounded-2xl p-6 border border-white/5 backdrop-blur-sm">
                                <Cpu className="h-8 w-8 text-emerald-400 mb-4" />
                                <h2 className="text-xl font-bold mb-2">Core Technology</h2>
                                <p className="text-slate-400 text-sm leading-relaxed">
                                    Leveraging the power of Google's <strong>AlphaFold 3</strong> for structural prediction and
                                    <strong>Gemini AI</strong> for biological insights, AlphaView provides a real-time,
                                    interactive environment for exploring the molecular world.
                                </p>
                            </section>
                        </div>

                        <h2 className="text-2xl font-bold mb-6">Scientific Foundations</h2>
                        <div className="space-y-6 text-slate-400">
                            <div className="flex gap-4">
                                <FlaskConical className="h-6 w-6 text-purple-400 shrink-0" />
                                <div>
                                    <h3 className="font-bold text-slate-200">AlphaFold Integration</h3>
                                    <p className="text-sm mt-1">Our platform interfaces directly with the AlphaFold Protein Structure Database, serving over 200 million protein structure predictions to clarify the dark matter of the proteome.</p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <Globe className="h-6 w-6 text-blue-400 shrink-0" />
                                <div>
                                    <h3 className="font-bold text-slate-200">Global Registry</h3>
                                    <p className="text-sm mt-1">Full UniProt integration allows users to search any known protein sequence, pulling real-time metadata and experimental cross-references.</p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-20 pt-10 border-t border-slate-900 text-center">
                            <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">Built for the future of Discovery</p>
                        </div>
                    </div>
                </motion.div>
            </main>
        </div>
    );
}
