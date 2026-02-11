import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useState } from 'react';
import { Search, ArrowRight, Zap, Eye, Hand, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import DNAAnimation from '../components/DNAAnimation';
import dynamic from 'next/dynamic';

const DNAViewer = dynamic(() => import('../components/DNAViewer'), { ssr: false });

export default function Home() {
  const router = useRouter();
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);

  const handleExplore = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanInput = input.trim();

    // Basic validation: 
    // 1. UniProt Accessions
    const isAccession = /^[OPQ][0-9][A-Z0-9]{3}[0-9]|[A-NR-Z][0-9]([A-Z][A-Z0-9]{2}[0-9]){1,2}$/i.test(cleanInput);

    // 2. Gene names/Common names (2-15 chars, must contain letters)
    const isName = /^[A-Z][A-Z0-9-.]{1,15}$/i.test(cleanInput) && /[A-Z]/i.test(cleanInput);

    // Check for obviously "wrong" strings
    const isGibberish = /^(.)\1{2,}$/i.test(cleanInput) || cleanInput.length > 20 || /^[0-9]{1,3}$/.test(cleanInput);

    if (cleanInput && (isAccession || isName) && !isGibberish) {
      setError(false);
      router.push(`/explorer?id=${cleanInput.toUpperCase()}`);
    } else {
      setError(true);
      setTimeout(() => setError(false), 3000);
    }
  };

  const features = [
    {
      icon: <Eye className="h-6 w-6 text-blue-400" />,
      title: "3D Visualization",
      description: "Explore atomic-scale structures with real-time hardware-accelerated rendering."
    },
    {
      icon: <Zap className="h-6 w-6 text-purple-400" />,
      title: "AI Analysis",
      description: "Understand protein function and reliability scores via automated structural analysis."
    },
    {
      icon: <Hand className="h-6 w-6 text-emerald-400" />,
      title: "Gesture Control",
      description: "Experience 'Minority Report' style interaction with AI-powered hand tracking."
    },
    {
      icon: <ShieldCheck className="h-6 w-6 text-amber-400" />,
      title: "Confidence Overlay",
      description: "Visualized pLDDT scores directly on the structure for guaranteed reliability insights."
    }
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-50 selection:bg-blue-500/30">
      <Head>
        <title>AlphaView | Protein Structures, Explained.</title>
        <meta name="description" content="Explore and understand protein structures with AI and hand gestures." />
      </Head>

      {/* Background Decor */}
      <div className="absolute inset-0 z-0">
        <div className="absolute -left-[10%] -top-[10%] h-[50%] w-[50%] rounded-full bg-blue-600/10 blur-[120px]" />
        <div className="absolute -right-[10%] -bottom-[10%] h-[50%] w-[50%] rounded-full bg-indigo-600/10 blur-[120px]" />
        <div className="absolute inset-0">
          <DNAAnimation className="opacity-40" />
        </div>
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-[center_top_-1px] [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-20" />
      </div>

      <div className="fixed top-6 left-0 right-0 z-50 px-6">
        <nav className="mx-auto max-w-4xl rounded-2xl border border-white/10 bg-slate-900/40 px-6 py-3 backdrop-blur-xl shadow-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative h-9 w-9 overflow-hidden rounded-lg border border-white/10 bg-white/5 p-0.5 transition-transform hover:scale-110">
              <img src="/logo.png" alt="AV Logo" className="h-full w-full object-cover" />
            </div>
            <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">AlphaView</span>
          </div>
          <div className="flex items-center gap-8 text-xs font-bold uppercase tracking-widest text-slate-400">
            <Link href="/docs" className="hover:text-white transition-colors">Documentation</Link>
            <Link href="/about" className="hover:text-white transition-colors">About</Link>
          </div>
        </nav>
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-6 pb-24 pt-32 lg:px-8">
        {/* Navigation / Logo Area */}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mx-auto max-w-7xl pt-10 pb-20">
          {/* Left: Content */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="flex flex-col items-start text-left"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] leading-6 text-blue-400 mb-8">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500"></span>
              </span>
              Next-Gen structural modeling via AlphaFold 3
            </div>

            <h1 className="bg-gradient-to-b from-white via-white/90 to-white/60 bg-clip-text text-5xl font-extrabold tracking-tight text-transparent sm:text-8xl lg:text-6xl xl:text-8xl">
              Protein Structures, <br />
              <span className="text-blue-500">Explained.</span>
            </h1>

            <p className="mt-6 max-w-2xl text-base sm:text-lg leading-relaxed text-slate-400">
              The ultimate educational platform for exploring the building blocks of life.
              Interactive 3D visualization meets AI-powered structural biology.
            </p>

            <form onSubmit={handleExplore} className="mt-10 flex w-full max-w-xl flex-col gap-4">
              <div className="group relative flex w-full flex-col gap-3 sm:flex-row p-2 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-2xl focus-within:border-blue-500/50 transition-all duration-500">
                <div className="relative flex-1">
                  <div className="pointer-events-none absolute inset-y-0 left-5 flex items-center">
                    <Search className={`h-5 w-5 transition-colors ${error ? 'text-red-500' : 'text-slate-500'}`} />
                  </div>
                  <input
                    type="text"
                    className="block w-full border-none bg-transparent py-3 sm:py-4 pr-4 pl-14 text-white placeholder-slate-500 focus:ring-0 text-sm sm:text-base"
                    placeholder="UniProt ID or Protein Name..."
                    value={input}
                    onChange={(e) => {
                      setInput(e.target.value);
                      if (error) setError(false);
                    }}
                    required
                  />
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="absolute -bottom-8 left-4 text-[9px] font-bold uppercase tracking-widest text-red-500"
                    >
                      Invalid Entry
                    </motion.div>
                  )}
                </div>
                <button
                  type="submit"
                  className={`group flex items-center justify-center gap-2 rounded-xl px-6 sm:px-10 py-3 sm:py-4 text-sm sm:text-base font-bold text-white transition-all active:scale-95 ${error ? 'bg-red-600' : 'bg-blue-600 hover:bg-blue-500 shadow-xl'}`}
                >
                  {error ? 'Wrong Input' : 'Begin Analysis'}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </button>
              </div>
            </form>

            <div className="mt-8 flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">
              <span>Quick starts</span>
              <div className="flex gap-2">
                {['P69905', 'P01308', 'P60709'].map((id) => (
                  <button
                    key={id}
                    onClick={() => setInput(id)}
                    className="rounded-lg border border-white/5 bg-white/5 px-3 py-1 hover:border-blue-500/30 hover:text-blue-400 transition-all font-mono"
                  >
                    {id}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Right: DNA */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="relative h-64 sm:h-80 lg:h-full min-h-[300px] sm:min-h-[400px] lg:min-h-[550px] flex items-center justify-center"
          >
            <div className="absolute inset-0 bg-blue-500/5 blur-[80px] sm:blur-[120px] rounded-full" />
            <DNAViewer />
          </motion.div>
        </div>

        {/* Technical Data Sources Ribbon */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 1 }}
          className="mt-20 flex flex-wrap justify-center items-center gap-12 opacity-30 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-1000"
        >
          <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">Integrated Registries:</span>
          <div className="flex gap-10 items-center">
            <div className="flex items-center gap-2 font-black italic tracking-tighter text-lg">UniProt</div>
            <div className="flex items-center gap-2 font-bold tracking-tight text-lg">AlphaFold <span className="text-sm font-normal text-blue-400">DB</span></div>
            <div className="flex items-center gap-1 font-extrabold text-lg">Proteopedia</div>
          </div>
        </motion.div>

        {/* Features Content */}
        <div className="mt-32">
          <div className="flex flex-col items-center text-center mb-16">
            <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-500 mb-4">Core Architecture</h2>
            <h3 className="text-4xl font-bold text-white">Advanced Laboratory Workflows</h3>
          </div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4"
          >
            {features.map((feature, i) => (
              <div
                key={i}
                className="group relative overflow-hidden rounded-3xl border border-white/5 bg-slate-900/20 p-8 backdrop-blur-xl transition-all hover:border-white/10 hover:bg-slate-900/40"
              >
                <div className="mb-6 inline-flex rounded-2xl bg-white/5 p-4 ring-1 ring-white/10 transition-all group-hover:scale-110 group-hover:ring-blue-500/50">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-slate-100">{feature.title}</h3>
                <p className="mt-4 text-sm leading-relaxed text-slate-400">
                  {feature.description}
                </p>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Featured Proteins Section */}
        <motion.section
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mt-32"
        >
          <div className="flex flex-col items-center text-center mb-16">
            <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-500 mb-4">Discover Life</h2>
            <h3 className="text-4xl font-bold text-white mb-6">Featured Proteins</h3>
            <p className="max-w-2xl text-slate-400 text-lg leading-relaxed">Select a structural landmark to begin your deep-dive analysis immediately.</p>
          </div>

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            {[
              {
                id: 'P69905',
                name: 'Hemoglobin',
                desc: 'The vital oxygen-transport protein found in red blood cells.',
                color: 'from-red-500/20 to-orange-500/20',
                glow: 'group-hover:shadow-red-500/20'
              },
              {
                id: 'P01308',
                name: 'Insulin',
                desc: 'A critical hormone regulating glucose metabolism and energy.',
                color: 'from-blue-500/20 to-indigo-500/20',
                glow: 'group-hover:shadow-blue-500/20'
              },
              {
                id: 'P0DTC2',
                name: 'Spike Protein',
                desc: 'A viral surface protein that enables entry into human cells, key to COVID-19 research.',
                color: 'from-emerald-500/20 to-teal-500/20',
                glow: 'group-hover:shadow-emerald-500/20'
              }
            ].map((protein, i) => (
              <div
                key={i}
                className={`group relative flex flex-col items-start overflow-hidden rounded-3xl border border-white/5 bg-gradient-to-br ${protein.color} p-8 transition-all hover:-translate-y-2 hover:border-white/10 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)] ${protein.glow}`}
              >
                <div className="absolute -right-4 -top-4 h-32 w-32 rounded-full bg-white/5 blur-3xl transition-all group-hover:bg-white/10" />
                <div className="flex justify-between items-start w-full mb-6">
                  <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-mono text-slate-400">
                    {protein.id}
                  </div>
                  <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">{protein.name}</h3>
                <p className="text-sm text-slate-400 leading-relaxed mb-8 flex-1">{protein.desc}</p>
                <button
                  onClick={() => router.push(`/explorer?uniprot=${protein.id}`)}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white transition-all hover:bg-blue-500 active:scale-95 shadow-lg shadow-blue-900/40"
                >
                  Explore Structure <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </button>
              </div>
            ))}
          </div>
        </motion.section>
      </div>

      {/* Footer bar */}
      <footer className="absolute bottom-0 w-full border-t border-slate-900/50 py-8 text-center text-xs text-slate-600">
        <p>© 2026 AlphaView. Built for the future of structural biology education.</p>
      </footer>
    </div>
  );
}
