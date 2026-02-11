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

        const fetchWithRetry = async (url: string, options: RequestInit = {}, retries = 3, backoff = 1000) => {
            for (let i = 0; i < retries; i++) {
                try {
                    const response = await fetch(url, options);
                    if (response.ok) return response;
                    if (response.status === 404) return response; // Don't retry 404s

                    if (response.status === 429 || response.status === 503 || response.status >= 500) {
                        console.warn(`[API] Attempt ${i + 1} failed with ${response.status}. Retrying...`);
                        await new Promise(r => setTimeout(r, backoff * (i + 1)));
                        continue;
                    }
                    return response;
                } catch (err) {
                    if (i === retries - 1) throw err;
                    await new Promise(r => setTimeout(r, backoff * (i + 1)));
                }
            }
            throw new Error('MAX_RETRIES_EXCEEDED');
        };

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

                // Check Cache first - with versioning to clear stale errors
                const cacheKey = `av_cache_v2_${uniprotId}`;
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
                    const searchResponse = await fetchWithRetry(searchUrl);

                    if (!searchResponse.ok) {
                        setError(`UniProt Search Failed (${searchResponse.status}). The service might be under heavy load.`);
                        setMetaLoading(false);
                        setPdbLoading(false);
                        return;
                    }

                    const searchData = await searchResponse.json();
                    if (searchData.results && searchData.results.length > 0) {
                        uniprotId = searchData.results[0].primaryAccession;
                    } else {
                        setError(`Protein "${currentInput}" not found. Try a specific ID like P0DTD1.`);
                        setMetaLoading(false);
                        setPdbLoading(false);
                        return;
                    }
                }

                setResolvedId(uniprotId);

                // Fetch UniProt Metadata
                setLoadingStep('Retrieving metadata...');
                const metaUrl = `https://rest.uniprot.org/uniprotkb/${uniprotId}?format=json`;
                const metaResponse = await fetchWithRetry(metaUrl);
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
                } else {
                    console.warn(`[Explorer] Metadata fetch failed with ${metaResponse.status}`);
                }

                // RELEASE META LOADING - This allows sidebar to start analysis
                setMetaLoading(false);

                // Fetch structure
                setLoadingStep('Fetching 3D structure...');
                let pdbUrl = `https://alphafold.ebi.ac.uk/files/AF-${uniprotId}-F1-model_v4.pdb`;

                // Try API first to be safe
                try {
                    const afApiUrl = `https://alphafold.ebi.ac.uk/api/prediction/${uniprotId}`;
                    const afApiResponse = await fetchWithRetry(afApiUrl, {}, 2);
                    if (afApiResponse.ok) {
                        const afApiData = await afApiResponse.json();
                        if (afApiData?.[0]?.pdbUrl) pdbUrl = afApiData[0].pdbUrl;
                    }
                } catch (e) { }

                const response = await fetchWithRetry(pdbUrl);
                if (!response.ok) {
                    if (response.status === 404) {
                        throw new Error('NO_STRUCTURE');
                    } else {
                        throw new Error(`AlphaFold Fetch Error (${response.status})`);
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
                console.error('[Explorer] Pipeline error:', err);
                if (err.message === 'NO_STRUCTURE') {
                    setError('AlphaFold structure not yet modeled for this specific sequence.');
                } else if (err.message === 'MAX_RETRIES_EXCEEDED') {
                    setError('Connection timed out. Biological databases are currently unresponsive.');
                } else {
                    setError(err.message || 'Structural data pipeline interrupted.');
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

            <header className="flex h-12 items-center justify-between border-b border-slate-900 bg-[#020617] px-4 z-30">
                <div className="flex items-center gap-3">
                    <Link href="/" className="flex items-center gap-2 text-slate-500 transition-colors hover:text-white">
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-blue-600/10 border border-blue-600/20 text-blue-400">
                            <Zap className="h-3.5 w-3.5" />
                            <span className="text-[11px] font-black uppercase tracking-tighter">AlphaView</span>
                        </div>
                    </Link>
                    <span className="text-slate-700 text-xs">/</span>
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-300">
                        <span className="text-white font-bold">{metadata?.name || id || 'Sequencing...'}</span>
                        {metadata?.organism && (
                            <span className="text-slate-500">({metadata.organism})</span>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase tracking-widest mr-4">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Live Structure
                    </div>

                    <button
                        id="copy-link-btn"
                        onClick={handleCopyLink}
                        className="p-1.5 text-slate-500 hover:text-white transition-colors"
                        title="Share Structure"
                    >
                        <Share2 className="h-4 w-4" />
                    </button>

                    <div className="h-8 w-px bg-slate-900 mx-1" />

                    <div className="flex items-center bg-slate-900/50 rounded-lg p-0.5 border border-white/5">
                        <button
                            onClick={() => setIsAdvanced(false)}
                            className={`px-3 py-1 rounded-md text-[9px] font-bold uppercase transition-all ${!isAdvanced ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            Beginner
                        </button>
                        <button
                            onClick={() => setIsAdvanced(true)}
                            className={`px-3 py-1 rounded-md text-[9px] font-bold uppercase transition-all ${isAdvanced ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            Advanced
                        </button>
                    </div>
                </div>
            </header>

            <main className="flex flex-1 overflow-hidden p-3 gap-3 bg-[#020617]">
                <div className="relative flex-1 flex flex-col gap-3 min-w-0">
                    {/* Framed Viewport Container */}
                    <div className="relative flex-1 rounded-xl border border-white/5 bg-black/20 overflow-hidden shadow-2xl ring-1 ring-white/5">
                        {isAdvanced && <GestureController onGesture={handleGesture} />}

                        {pdbLoading && (
                            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-slate-950/40 text-blue-400 backdrop-blur-[2px]">
                                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                                <div className="text-center">
                                    <p className="font-bold tracking-widest uppercase text-[9px] text-blue-500 mb-1">Synthesizing</p>
                                    <p className="text-xs font-medium text-white">{loadingStep || 'Processing...'}</p>
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
                                <div className="flex max-w-xs flex-col items-center gap-4 text-center">
                                    <AlertCircle className="h-10 w-10 text-red-500/50" />
                                    <div>
                                        <p className="text-sm font-bold text-white uppercase tracking-widest">Model Unavailable</p>
                                        <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">{error}</p>
                                    </div>
                                    <Link href="/" className="mt-2 text-[10px] font-bold text-blue-400 hover:underline uppercase tracking-tighter">
                                        Return to Search
                                    </Link>
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

                        {/* Relative Floating UI inside Viewport */}
                        <div className="absolute bottom-4 left-4 z-30 pointer-events-none">
                            <ConfidenceInsights stats={confidenceStats} />
                        </div>

                        <div className="absolute top-4 right-4 z-30 flex flex-col gap-2">
                            <button
                                onClick={() => viewerRef.current?.reset()}
                                className="p-2 rounded-lg bg-black/40 border border-white/10 text-slate-400 hover:text-white backdrop-blur-md transition-all pointer-events-auto"
                                title="Reset Camera"
                            >
                                <RefreshCw className="h-4 w-4" />
                            </button>
                            <button
                                className="p-2 rounded-lg bg-black/40 border border-white/10 text-slate-400 hover:text-white backdrop-blur-md transition-all pointer-events-auto"
                                title="Fullscreen"
                            >
                                <Share2 className="h-4 w-4 rotate-90" />
                            </button>
                        </div>
                    </div>

                    {/* Bottom Metadata Cluster */}
                    {!pdbLoading && metadata && (
                        <div className="h-40 rounded-xl border border-white/5 bg-black/20 p-4 shadow-xl flex flex-col gap-3 group transition-all hover:bg-black/30">
                            <div className="flex items-center justify-between">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500/80 flex items-center gap-2">
                                    <Info className="h-3 w-3" /> Protein Info
                                </h3>
                                <div className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">
                                    UniProt ID: {resolvedId}
                                </div>
                            </div>
                            <div className="grid grid-cols-4 gap-6">
                                <div className="col-span-1 space-y-1">
                                    <p className="text-[9px] font-bold text-slate-500 uppercase">Name</p>
                                    <p className="text-xs font-bold text-white truncate">{metadata.name}</p>
                                </div>
                                <div className="col-span-1 space-y-1">
                                    <p className="text-[9px] font-bold text-slate-500 uppercase">Organism</p>
                                    <p className="text-xs font-medium text-slate-300 truncate">{metadata.organism}</p>
                                </div>
                                <div className="col-span-1 space-y-1">
                                    <p className="text-[9px] font-bold text-slate-500 uppercase">Sequence</p>
                                    <p className="text-xs font-medium text-slate-300">{metadata.length} Residues</p>
                                </div>
                                <div className="col-span-1 space-y-1">
                                    <p className="text-[9px] font-bold text-slate-500 uppercase">Reliability</p>
                                    <div className="flex items-center gap-2">
                                        <div className="h-1 flex-1 bg-white/5 rounded-full overflow-hidden">
                                            <div className="h-full bg-blue-500" style={{ width: `${confidenceStats?.avg}%` }} />
                                        </div>
                                        <span className="text-[9px] font-bold text-blue-400">{Math.round(confidenceStats?.avg || 0)}%</span>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-1 pt-3 border-t border-white/5">
                                <p className="text-[10px] text-slate-400 leading-relaxed line-clamp-2 italic">
                                    {metadata.function || "Automatic functional annotation is currently being resolved via genomic evidence."}
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="w-80 flex flex-col gap-3 shrink-0">
                    {/* Visual Protocols (Docked in Sidebar) */}
                    {isAdvanced && (
                        <div className="rounded-xl border border-white/5 bg-black/20 p-4 shadow-xl">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-3 flex items-center gap-2 font-mono">
                                0x_PROT_MODES
                            </h3>
                            <div className="flex flex-col gap-1.5">
                                <button
                                    onClick={() => {
                                        setViewMode('default');
                                        viewerRef.current?.setRepresentation('default');
                                    }}
                                    className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-[11px] font-bold tracking-tight transition-all ${viewMode === 'default' ? 'bg-blue-600/20 text-blue-300 border border-blue-600/30' : 'text-slate-500 hover:bg-white/5'}`}
                                >
                                    Standard
                                    <div className={`h-1.5 w-1.5 rounded-full ${viewMode === 'default' ? 'bg-blue-400' : 'bg-slate-700'}`} />
                                </button>
                                <button
                                    onClick={() => {
                                        setViewMode('breakdown');
                                        viewerRef.current?.setRepresentation('breakdown');
                                    }}
                                    className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-[11px] font-bold tracking-tight transition-all ${viewMode === 'breakdown' ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-600/30' : 'text-slate-500 hover:bg-white/5'}`}
                                >
                                    Breakdown
                                    <div className={`h-1.5 w-1.5 rounded-full ${viewMode === 'breakdown' ? 'bg-indigo-400' : 'bg-slate-700'}`} />
                                </button>
                                <button
                                    onClick={() => {
                                        const next = !isDetailedMode;
                                        setIsDetailedMode(next);
                                        viewerRef.current?.setRepresentation(next ? 'detailed' : 'cartoon');
                                    }}
                                    className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-[11px] font-bold tracking-tight transition-all ${isDetailedMode ? 'bg-purple-600/20 text-purple-300 border border-purple-600/30' : 'text-slate-500 hover:bg-white/5'}`}
                                >
                                    Detailed
                                    <Zap className="h-3 w-3" />
                                </button>
                            </div>
                        </div>
                    )}

                    <ProteinAnalysisPanel
                        uniprotId={resolvedId}
                        metadata={metadata}
                        loading={metaLoading}
                        onAction={handleBotAction}
                        selectedPart={selectedPart}
                    />
                </div>

                <OnboardingTour />
            </main>
        </div>
    );
}
