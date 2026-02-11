import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { ChevronLeft, Settings, Share2, Info, AlertCircle, Loader2, RefreshCw, ShieldCheck, Hand, ExternalLink, Zap, X } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import ProteinAnalysisPanel from '@/components/ProteinAnalysisPanel';
import GestureController from '@/components/GestureController';
import ProteinViewer from '@/components/ProteinViewer';
import ConfidenceInsights from '@/components/ConfidenceInsights';
import OnboardingTour from '@/components/OnboardingTour';
import type { ProteinViewerRef } from '@/components/ProteinViewer';

interface SelectionInfo {
    label: string;
    description?: string;
    confidence?: number;
    type?: 'helix' | 'sheet' | 'loop' | 'unknown';
    residueName?: string;
    residueIndex?: number;
    chainId?: string;
    fullLabel?: string;
}

export default function Explorer() {
    const router = useRouter();
    const { id } = router.query;

    const [mounted, setMounted] = useState(false);
    const [metaLoading, setMetaLoading] = useState(false);
    const [pdbLoading, setPdbLoading] = useState(false);
    const [loadingStep, setLoadingStep] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [pdbData, setPdbData] = useState<string | null>(null);
    const [resolvedId, setResolvedId] = useState<string | null>(null);
    const [metadata, setMetadata] = useState<{ name?: string, organism?: string, length?: number, function?: string } | null>(null);
    const [viewMode, setViewMode] = useState<'default' | 'breakdown' | 'confidence'>('default');
    const [showLowConf, setShowLowConf] = useState(true);
    const [selectedPart, setSelectedPart] = useState<SelectionInfo | null>(null);
    const [confidenceStats, setConfidenceStats] = useState<{ avg: number; high: number; medium: number; low: number } | null>(null);
    const [isLargeProtein, setIsLargeProtein] = useState(false);
    const [isDetailedMode, setIsDetailedMode] = useState(false);
    const [showLoadingHint, setShowLoadingHint] = useState(false);
    const [input, setInput] = useState<string>('');
    const [isAdvanced, setIsAdvanced] = useState(false);

    // Ref to control the 3D viewer
    const viewerRef = useRef<ProteinViewerRef>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    // New useEffect to handle router query changes and set input
    useEffect(() => {
        const queryId = router.query.id as string;
        const uniprot = router.query.uniprot as string;
        const targetId = uniprot || queryId;
        if (targetId) {
            setInput(targetId);
        }
    }, [router.query.id, router.query.uniprot]);

    useEffect(() => {
        if (!input) return; // Depend on the new 'input' state

        const resolveAndFetch = async () => {
            setMetaLoading(true);
            setPdbLoading(true);
            setError(null);
            setPdbData(null);
            setResolvedId(null);
            setMetadata(null);
            setShowLoadingHint(false);

            let currentInput = input;
            if (!currentInput) {
                setMetaLoading(false);
                setPdbLoading(false);
                return;
            }

            const loadingTimer = setTimeout(() => setShowLoadingHint(true), 3000);

            try {
                let uniprotId = currentInput.toUpperCase().trim();

                // Check Cache first
                const cacheKey = `av_cache_${uniprotId}`;
                const cached = localStorage.getItem(cacheKey);
                if (cached) {
                    try {
                        const { pdb, meta, timestamp } = JSON.parse(cached);
                        if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
                            console.log(`[Explorer] Loading ${uniprotId} from cache`);
                            setMetadata(meta);
                            setPdbData(pdb);
                            setResolvedId(uniprotId);
                            setMetaLoading(false);
                            setPdbLoading(false);
                            clearTimeout(loadingTimer);
                            return;
                        }
                    } catch (e) {
                        localStorage.removeItem(cacheKey);
                    }
                }

                setMetaLoading(true);
                setPdbLoading(true);
                setLoadingStep('Resolving UniProt identity...');
                const isUniprotId = /^[OPQ][0-9][A-Z0-9]{3}[0-9]|[A-NR-Z][0-9]([A-Z][A-Z0-9]{2}[0-9]){1,2}$/i.test(uniprotId);

                if (!isUniprotId) {
                    setLoadingStep('Searching UniProt...');
                    const searchUrl = `https://rest.uniprot.org/uniprotkb/search?query=${encodeURIComponent(uniprotId)}&format=json&limit=1`;
                    const searchResponse = await fetch(searchUrl);
                    if (!searchResponse.ok) throw new Error('UniProt service busy');

                    const searchData = await searchResponse.json();
                    if (searchData.results && searchData.results.length > 0) {
                        uniprotId = searchData.results[0].primaryAccession;
                    } else {
                        throw new Error(`Protein "${currentInput}" not found`);
                    }
                }

                setResolvedId(uniprotId);

                // Fetch UniProt Metadata
                setLoadingStep('Retrieving metadata...');
                const metaUrl = `https://rest.uniprot.org/uniprotkb/${uniprotId}?format=json`;
                const metaResponse = await fetch(metaUrl);
                let fetchedMeta = null;
                if (metaResponse.ok) {
                    const metaData = await metaResponse.json();
                    fetchedMeta = {
                        name: metaData.proteinDescription?.recommendedName?.fullName?.value || 'Unknown Protein',
                        organism: metaData.organism?.scientificName || 'Unknown Organism',
                        length: metaData.sequence?.length,
                        function: metaData.comments?.find((c: any) => c.commentType === 'FUNCTION')?.texts?.[0]?.value
                    };
                    setMetadata(fetchedMeta);
                    if (fetchedMeta.length && fetchedMeta.length > 1000) setIsLargeProtein(true);
                }

                // RELEASE META LOADING - This allows sidebar to start analysis
                setMetaLoading(false);

                // Fetch structure
                setLoadingStep('Fetching 3D structure...');
                let pdbUrl = `https://alphafold.ebi.ac.uk/files/AF-${uniprotId}-F1-model_v4.pdb`;

                // Try API first to be safe
                try {
                    const afApiUrl = `https://alphafold.ebi.ac.uk/api/prediction/${uniprotId}`;
                    const afApiResponse = await fetch(afApiUrl);
                    if (afApiResponse.ok) {
                        const afApiData = await afApiResponse.json();
                        if (afApiData?.[0]?.pdbUrl) pdbUrl = afApiData[0].pdbUrl;
                    }
                } catch (e) { }

                const response = await fetch(pdbUrl);
                if (!response.ok) {
                    if (response.status === 404) {
                        throw new Error('NO_STRUCTURE');
                    } else {
                        throw new Error(`AlphaFold error (${response.status})`);
                    }
                }

                const text = await response.text();
                if (text.length < 500) throw new Error('CORRUPT_DATA');

                setPdbData(text);

                // Cache it
                localStorage.setItem(cacheKey, JSON.stringify({
                    pdb: text,
                    meta: fetchedMeta,
                    timestamp: Date.now()
                }));

            } catch (err: any) {
                console.error('[Explorer] Fetch error:', err);
                if (err.message === 'NO_STRUCTURE') {
                    setError('No AlphaFold structure available for this protein yet.');
                } else {
                    setError(err.message || 'An unknown error occurred');
                }
            } finally {
                setMetaLoading(false);
                setPdbLoading(false);
                clearTimeout(loadingTimer);
            }
        };

        resolveAndFetch();
    }, [input]); // Depend on the new 'input' state

    const handleGesture = (type: 'rotate' | 'zoom' | 'reset' | 'pan' | 'click' | null, data?: any) => {
        if (!viewerRef.current) return;
        if (type === 'rotate' && data) viewerRef.current.rotate(data.x, data.y);
        if (type === 'pan' && data) viewerRef.current.pan(data.x, data.y);
        if (type === 'zoom' && data) viewerRef.current.zoom(data.distance);
        if (type === 'reset') viewerRef.current.reset();
        if (type === 'click' && data) viewerRef.current.pick(data.x, data.y);
    };

    const handleBotAction = (action: string) => {
        if (!viewerRef.current) return;
        console.log(`[AlphaBot] Action Triggered: ${action}`);

        switch (action) {
            case 'SHOW_HELICES':
                viewerRef.current.highlightRegion('helices');
                break;
            case 'SHOW_SHEETS':
                viewerRef.current.highlightRegion('sheets');
                break;
            case 'SHOW_CONFIDENCE':
                viewerRef.current.setRepresentation('confidence');
                break;
            case 'RESET':
                viewerRef.current.reset();
                break;
            default:
                viewerRef.current.reset();
        }
    };

    const handleCopyLink = () => {
        const url = `${window.location.origin}/explorer?uniprot=${resolvedId || input}`;
        navigator.clipboard.writeText(url);
        // Temporary toast simulation
        const btn = document.getElementById('copy-link-btn');
        if (btn) {
            const originalText = btn.innerHTML;
            btn.innerHTML = 'Copied!';
            setTimeout(() => btn.innerHTML = originalText, 2000);
        }
    };

    return (
        <div className="flex h-screen w-full flex-col overflow-hidden bg-slate-950 text-slate-50">
            <Head>
                <title>AlphaView - {input || 'Loading...'}</title>
            </Head>

            <header className="flex h-16 items-center justify-between border-b border-slate-800 bg-slate-950/80 px-6 backdrop-blur z-30">
                <div className="flex items-center gap-4">
                    <Link href="/" className="flex items-center gap-2 rounded-md p-2 text-slate-400 transition-colors hover:bg-slate-900 hover:text-white">
                        <ChevronLeft className="h-5 w-5" />
                        <span className="font-medium">Back</span>
                    </Link>
                    <div className="h-6 w-px bg-slate-800" />
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 overflow-hidden rounded-lg border border-white/5 bg-white/5">
                            <img src="/logo.png" alt="Logo" className="h-full w-full object-cover" />
                        </div>
                        <h1 className="text-lg font-bold tracking-tight text-white capitalize">
                            {resolvedId || id || 'Loading...'}
                        </h1>
                    </div>
                    {metadata && (
                        <div className="flex items-center gap-3 ml-4 bg-slate-900/50 px-3 py-1 rounded-full border border-white/5">
                            <span className="text-xs font-semibold text-blue-400 truncate max-w-[150px]">{metadata.name}</span>
                            <span className="h-3 w-px bg-slate-700" />
                            <span className="text-[10px] font-medium text-slate-500 italic">{metadata.organism}</span>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center bg-slate-900 rounded-full p-1 border border-white/5">
                        <button
                            onClick={() => setIsAdvanced(false)}
                            className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase transition-all ${!isAdvanced ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            Beginner
                        </button>
                        <button
                            onClick={() => setIsAdvanced(true)}
                            className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase transition-all ${isAdvanced ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            Advanced
                        </button>
                    </div>

                    <button
                        id="copy-link-btn"
                        onClick={handleCopyLink}
                        className="flex items-center gap-2 rounded-md border border-slate-800 bg-slate-900/50 px-3 py-2 text-xs font-semibold text-slate-400 transition-all hover:bg-slate-800 hover:text-white"
                    >
                        <Share2 className="h-4 w-4" />
                        Copy Link
                    </button>
                    <a
                        href={`https://uniprot.org/uniprot/${resolvedId || id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 rounded-md border border-slate-800 bg-slate-900/50 px-3 py-2 text-xs font-semibold text-slate-400 transition-all hover:bg-slate-800 hover:text-white"
                    >
                        <ExternalLink className="h-3.5 w-3.5 text-blue-400" />
                        UniProt
                    </a>
                    {isAdvanced && <button className="rounded-md p-2 text-slate-400 hover:bg-slate-900 hover:text-white"><Settings className="h-5 w-5" /></button>}
                </div>
            </header>

            <main className="flex flex-1 overflow-hidden">
                <div className="relative flex-1 bg-[#020617] ring-1 ring-inset ring-white/10 shadow-inner">
                    {isAdvanced && <GestureController onGesture={handleGesture} />}

                    {pdbLoading && (
                        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-slate-950/40 text-blue-400 backdrop-blur-[2px]">
                            <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
                            <div className="text-center bg-slate-950/60 p-4 rounded-2xl border border-white/5 backdrop-blur-xl">
                                <p className="font-bold tracking-widest uppercase text-[10px] text-blue-500 mb-1">Structural Sequence</p>
                                <p className="font-medium text-white">{loadingStep || 'Synthesizing structure...'}</p>
                                {showLoadingHint && (
                                    <p className="mt-2 text-[10px] text-slate-500 animate-pulse">Large proteins may take longer.</p>
                                )}
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-900">
                            <div className="flex max-w-md flex-col items-center gap-4 rounded-lg bg-red-950/50 p-8 text-center text-red-400 border border-red-900/50 backdrop-blur">
                                <AlertCircle className="h-12 w-12" />
                                <div>
                                    <p className="text-xl font-bold">Model Unavailable</p>
                                    <p className="text-sm opacity-80 mt-1">{error}</p>
                                </div>
                                <div className="flex flex-col gap-2 w-full mt-2">
                                    <a
                                        href={`https://uniprot.org/uniprot/${resolvedId || input}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="rounded-lg bg-blue-600/20 px-6 py-2.5 text-xs font-bold text-blue-400 hover:bg-blue-600/30 transition-all border border-blue-500/20"
                                    >
                                        View UniProt Evidence
                                    </a>
                                    <Link href="/" className="rounded-lg bg-white/5 px-6 py-2.5 text-xs font-bold text-slate-400 hover:bg-white/10 transition-all border border-white/10">
                                        Try a Featured Protein
                                    </Link>
                                </div>
                            </div>
                        </div>
                    )}

                    {isLargeProtein && !pdbLoading && (
                        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30 animate-in slide-in-from-top duration-500">
                            <div className="flex items-center gap-3 rounded-full border border-amber-500/20 bg-amber-950/80 px-4 py-2 text-xs font-bold text-amber-400 backdrop-blur-xl shadow-2xl">
                                <AlertCircle className="h-4 w-4" />
                                COMPLEX STRUCTURE DETECTED ({metadata?.length} RESIDUES). OPTIMIZING PERFORMANCE...
                            </div>
                        </div>
                    )}

                    {!pdbLoading && !error && pdbData && mounted && (
                        <ProteinViewer
                            key={resolvedId}
                            ref={viewerRef}
                            pdbData={pdbData}
                            onSelect={(info) => setSelectedPart(info)}
                            onConfidenceStats={(stats) => setConfidenceStats(stats)}
                        />
                    )}

                    {!pdbLoading && !error && !pdbData && !id && (
                        <div className="flex h-full w-full items-center justify-center text-slate-500">
                            <p>Ready for sequencing...</p>
                        </div>
                    )}

                    {/* Module 1: Floating Selection Info Card */}
                    {selectedPart && (
                        <div className="absolute top-60 right-6 z-40 w-64 animate-in fade-in slide-in-from-right-4 duration-300 pointer-events-none">
                            <div className="rounded-2xl border border-blue-500/30 bg-slate-950/80 p-4 shadow-2xl backdrop-blur-xl pointer-events-auto">
                                <div className="flex items-center justify-between mb-3">
                                    <div className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${selectedPart.type === 'helix' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/20' : selectedPart.type === 'sheet' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/20' : 'bg-slate-500/20 text-slate-400 border border-slate-500/20'}`}>
                                        {selectedPart.type === 'unknown' ? 'Region' : selectedPart.type}
                                    </div>
                                    <button
                                        onClick={() => setSelectedPart(null)}
                                        className="text-slate-500 hover:text-white transition-colors"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </div>
                                <h4 className="text-sm font-bold text-white mb-1">{selectedPart.label}</h4>
                                <p className="text-[10px] text-slate-400 leading-relaxed mb-3">
                                    {selectedPart.description || "Experimental structural segment identified."}
                                </p>

                                {selectedPart.confidence !== undefined && (
                                    <div className="space-y-1">
                                        <div className="flex items-center justify-between text-[8px] font-bold uppercase text-slate-500">
                                            <span>Local Confidence</span>
                                            <span className={selectedPart.confidence > 70 ? 'text-blue-400' : 'text-amber-400'}>
                                                {Math.round(selectedPart.confidence)}%
                                            </span>
                                        </div>
                                        <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full transition-all duration-500 ${selectedPart.confidence > 70 ? 'bg-blue-500' : 'bg-amber-500'}`}
                                                style={{ width: `${selectedPart.confidence}%` }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Top Left: Visual Protocols (Advanced) */}
                    <div className="absolute top-20 left-6 z-20 flex flex-col gap-4">
                        {isAdvanced && (
                            <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 backdrop-blur-xl shadow-2xl">
                                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-4 flex items-center gap-2">
                                    <Settings className="h-3 w-3" /> Visual Protocols
                                </h3>
                                <div className="flex flex-col gap-2">
                                    <button
                                        onClick={() => {
                                            setViewMode('default');
                                            viewerRef.current?.setRepresentation('default');
                                        }}
                                        className={`flex items-center justify-between gap-4 rounded-lg px-3 py-2 text-xs font-medium transition-all ${viewMode === 'default' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-white/5'}`}
                                    >
                                        Standard View
                                        <div className="h-1.5 w-1.5 rounded-full bg-current opacity-50" />
                                    </button>
                                    <button
                                        onClick={() => {
                                            setViewMode('breakdown');
                                            viewerRef.current?.setRepresentation('breakdown');
                                        }}
                                        className={`flex items-center justify-between gap-4 rounded-lg px-3 py-2 text-xs font-medium transition-all ${viewMode === 'breakdown' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-white/5'}`}
                                    >
                                        Structure Breakdown
                                        <div className="h-1.5 w-1.5 rounded-full bg-current opacity-50" />
                                    </button>
                                    <button
                                        onClick={() => {
                                            const next = !isDetailedMode;
                                            setIsDetailedMode(next);
                                            viewerRef.current?.setRepresentation(next ? 'detailed' : 'cartoon');
                                        }}
                                        className={`flex items-center justify-between gap-4 rounded-lg px-3 py-2 text-xs font-medium transition-all ${isDetailedMode ? 'bg-purple-600 text-white shadow-[0_0_15px_rgba(147,51,234,0.3)]' : 'text-slate-400 hover:bg-white/5'}`}
                                    >
                                        Detailed (Atomic)
                                        <Zap className="h-3.5 w-3.5" />
                                    </button>
                                    <div className="h-px bg-white/5 my-1" />
                                    <button
                                        onClick={() => {
                                            const newVal = !showLowConf;
                                            setShowLowConf(newVal);
                                            viewerRef.current?.setConfidenceFilter(!newVal);
                                        }}
                                        className={`flex items-center justify-between gap-4 rounded-lg px-3 py-2 text-xs font-medium transition-all ${!showLowConf ? 'text-amber-400 bg-amber-400/10' : 'text-slate-400 hover:bg-white/5'}`}
                                    >
                                        {showLowConf ? 'Hide Low Confidence' : 'Show All Regions'}
                                        <ShieldCheck className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Bottom Utility Bar: Navigation & Status Dashboard */}
                    <div className="absolute bottom-8 left-8 right-8 z-30 flex items-end justify-between gap-6 pointer-events-none">
                        <div className="flex flex-col gap-4 max-w-[280px] pointer-events-auto">
                            {/* Compact Navigation Guide */}
                            <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-4 backdrop-blur-2xl shadow-2xl">
                                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-500 mb-3 flex items-center gap-2">
                                    <Info className="h-3 w-3" /> Navigation
                                </h3>
                                <div className="space-y-2 text-[10px] font-medium">
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Rotate</span>
                                        <span className="text-white">Left Click</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Pan</span>
                                        <span className="text-white">Right Click</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Zoom</span>
                                        <span className="text-white">Scroll</span>
                                    </div>
                                </div>
                            </div>

                            {/* Confidence Insights Panel */}
                            <ConfidenceInsights stats={confidenceStats} />
                        </div>

                        {/* Central Dashboard Cluster */}
                        <div className="flex flex-col items-center gap-4 pointer-events-auto">
                            {!pdbLoading && !error && pdbData && (
                                <div className="flex items-center gap-3 bg-slate-950/60 p-2 rounded-full border border-white/10 backdrop-blur-xl shadow-2xl">
                                    <button
                                        onClick={() => viewerRef.current?.reset()}
                                        className="flex items-center gap-2 rounded-full bg-blue-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-blue-500 transition-all shadow-lg"
                                    >
                                        <RefreshCw className="h-3.5 w-3.5" />
                                        Reset View
                                    </button>

                                    {isAdvanced && (
                                        <>
                                            <div className="h-6 w-px bg-white/10" />
                                            <button
                                                onClick={() => viewerRef.current?.setRepresentation('confidence')}
                                                className="flex items-center gap-2 rounded-full bg-slate-800 px-5 py-2.5 text-xs font-bold text-emerald-400 hover:bg-slate-700 transition-all border border-white/5"
                                            >
                                                <ShieldCheck className="h-3.5 w-3.5" />
                                                Confidence Map
                                            </button>

                                            <button
                                                onClick={() => alert(`GESTURE PROTOCOL (EXPERIMENTAL):\n\n1. Enable webcam (top right)\n2. One Finger Out: Rotate structure\n3. Two Fingers Out: Pan / Move structure\n4. Pinch (Thumb+Index): Zoom In/Out\n5. Open Palm: Reset Focus`)}
                                                className="flex items-center gap-2 rounded-full bg-slate-800 px-5 py-2.5 text-xs font-semibold text-white hover:bg-slate-700 transition-all border border-white/5"
                                            >
                                                <Hand className="h-3.5 w-3.5 text-emerald-400" />
                                                Gestures
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}

                            {/* Refined Status Bar */}
                            {!pdbLoading && !error && pdbData && (
                                <div className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500 bg-slate-950/40 px-4 py-1.5 rounded-full border border-white/5 backdrop-blur-sm">
                                    Structure Sync Active • <button onClick={() => viewerRef.current?.reset()} className="text-blue-500 hover:underline">Reset Focus</button>
                                </div>
                            )}
                        </div>

                        {/* Empty spacer to maintain layout balance */}
                        <div className="w-[100px] pointer-events-none" />
                    </div>
                </div>

                <ProteinAnalysisPanel
                    uniprotId={resolvedId}
                    metadata={metadata}
                    loading={metaLoading}
                    onAction={handleBotAction}
                    selectedPart={selectedPart}
                />

                <OnboardingTour />
            </main>
        </div>
    );
}
