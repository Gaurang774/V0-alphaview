import { Info, ExternalLink, Activity, Target, BookOpen, ShieldCheck, Volume2, VolumeX } from 'lucide-react';
import { useEffect, useState } from 'react';

interface SelectionInfo {
    label: string;
    description?: string;
    confidence?: number;
    type?: 'helix' | 'sheet' | 'loop' | 'unknown';
}

interface ProteinAnalysisPanelProps {
    uniprotId: string | null;
    metadata: { name?: string, organism?: string, length?: number, function?: string } | null;
    loading: boolean;
    onAction?: (action: string) => void;
    selectedPart?: SelectionInfo | null;
}

interface ProteinAnalysis {
    identity: string;
    function: string;
    visuals: string;
    reliability: string;
}

const API_KEY = process.env.NEXT_PUBLIC_GROQ_API_KEY || '';

export default function ProteinAnalysisPanel({ uniprotId, metadata, loading: structureLoading, onAction, selectedPart }: ProteinAnalysisPanelProps) {
    const [analysis, setAnalysis] = useState<ProteinAnalysis | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [chatInput, setChatInput] = useState('');
    const [messages, setMessages] = useState<{ role: 'user' | 'ai', text: string }[]>([]);
    const [chatLoading, setChatLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'analysis' | 'chat'>('analysis');
    const [selectionAnalysis, setSelectionAnalysis] = useState<string | null>(null);
    const [selectionLoading, setSelectionLoading] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [recognition, setRecognition] = useState<any>(null);

    useEffect(() => {
        if (!uniprotId) {
            setAnalysis(null);
            return;
        }

        const fetchAnalysis = async () => {
            const cacheKey = `av_ai_v2_cache_${uniprotId}`;
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
                try {
                    const { data, timestamp } = JSON.parse(cached);
                    // Validate data has all required keys
                    const requiredKeys = ['identity', 'function', 'visuals', 'reliability'];
                    const hasAllKeys = data && requiredKeys.every(k => data[k]);

                    // 24h cache expiry
                    if (hasAllKeys && (Date.now() - timestamp < 24 * 60 * 60 * 1000)) {
                        console.log(`[ProteinAnalysisPanel] Loading AI analysis from cache`);
                        setAnalysis(data);
                        setLoading(false);
                        return;
                    }
                } catch (e) {
                    localStorage.removeItem(cacheKey);
                }
            }

            setLoading(true);
            setError(null);

            // Try Groq models via direct fetch
            const models = ["llama3-70b-8192", "llama-3.3-70b-versatile"];
            let success = false;
            let lastErr = '';

            for (const model of models) {
                try {
                    console.log(`[Groq] Trying ${model}...`);
                    const response = await fetch(
                        `https://api.groq.com/openai/v1/chat/completions`,
                        {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                "Authorization": `Bearer ${API_KEY}`
                            },
                            body: JSON.stringify({
                                model: model,
                                messages: [{
                                    role: "user",
                                    content: `Provide a professional structural and functional analysis for the protein with UniProt ID: ${uniprotId}. 
                                        ${metadata ? `Factual Data from UniProt:
                                        - Name: ${metadata.name}
                                        - Organism: ${metadata.organism}
                                        - Sequence Length: ${metadata.length} amino acids
                                        - Functional Role: ${metadata.function || 'Not specified'}
                                        ` : ''}
                                        Explain it as if for a non-biologist student.
                                        Return the result strictly as a JSON object with these EXACT keys:
                                        "identity": What this protein is (max 2 sentences).
                                        "function": What it primarily does in the organism (max 2 sentences).
                                        "visuals": What the structural shape tells us about its mechanics (max 2 sentences).
                                        "reliability": Non-technical explanation of the AlphaFold confidence (max 2 sentences).
                                        
                                        Constraint: AI must NOT hallucinate unknown facts. Use provided data as ground truth. Educational summary generated from UniProt and AlphaFold data.`
                                }]
                            })
                        }
                    );

                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.error?.message || response.statusText);
                    }

                    const result = await response.json();
                    const text = result.choices?.[0]?.message?.content;

                    if (text) {
                        const cleanJson = text.replace(/```json|```/g, '').trim();
                        const data = JSON.parse(cleanJson);
                        setAnalysis(data);

                        // Cache the result
                        localStorage.setItem(cacheKey, JSON.stringify({
                            data,
                            timestamp: Date.now()
                        }));

                        success = true;
                        console.log(`[Groq] Success with ${model}`);
                        break;
                    }
                } catch (e: any) {
                    console.warn(`[Groq] Fail ${model}:`, e.message);
                    lastErr = e.message;
                }
            }

            if (!success) {
                setError(`AI unavailable: ${lastErr}`);
                setAnalysis({
                    identity: `Information for ${uniprotId} is currently restricted.`,
                    function: `The primary biological function is under active research.`,
                    visuals: `Structural motifs are being characterized.`,
                    reliability: `AlphaFold confidence varies by region.`
                });
            }
            setLoading(false);
        };

        fetchAnalysis();
    }, [uniprotId]);

    // Selection Inspector: Analyze specific parts on click with debouncing
    useEffect(() => {
        if (!selectedPart || !uniprotId) {
            setSelectionAnalysis(null);
            return;
        }

        const timer = setTimeout(async () => {
            setSelectionLoading(true);
            try {
                const response = await fetch(
                    `https://api.groq.com/openai/v1/chat/completions`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${API_KEY}`
                        },
                        body: JSON.stringify({
                            model: "llama3-70b-8192",
                            messages: [{
                                role: "user",
                                content: `As a structural expert, briefly (2 sentences max) explain the significance of this ${selectedPart.type} region (${selectedPart.label}) in ${uniprotId}. Focus on functional stability. Return plain text.`
                            }]
                        })
                    }
                );

                if (response.ok) {
                    const result = await response.json();
                    const text = result.choices?.[0]?.message?.content;
                    setSelectionAnalysis(text || "No specific data found.");
                }
            } catch (e) {
                console.error('[Selection-Analysis] Error:', e);
            } finally {
                setSelectionLoading(false);
            }
        }, 500); // 500ms debounce

        return () => clearTimeout(timer);
    }, [selectedPart, uniprotId]);

    // Voice Engine: Speech-to-Text Setup with Conversational Context
    useEffect(() => {
        if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
            const SpeechRecognition = (window as any).webkitSpeechRecognition;
            const rec = new SpeechRecognition();
            rec.continuous = false;
            rec.interimResults = false;
            rec.lang = 'en-US';

            rec.onstart = () => setIsListening(true);
            rec.onend = () => setIsListening(false);
            rec.onerror = () => setIsListening(false);
            rec.onresult = (event: any) => {
                let transcript = event.results[0][0].transcript.toLowerCase();

                // Conversational Context: Map "this" or "what is this" to the selection
                if (selectedPart && (transcript.includes('this') || transcript.includes('what am i seeing') || transcript.includes('explain this'))) {
                    transcript = `Regarding selection "${selectedPart.label}": ${transcript}`;
                }

                setChatInput(transcript);
                if (transcript.length > 5) {
                    const fakeEvent = { preventDefault: () => { } } as any;
                    handleSendMessage(fakeEvent, transcript);
                }
            };
            setRecognition(rec);
        }
    }, [selectedPart]);

    const toggleListening = () => {
        if (!recognition) {
            alert("Voice recognition not supported in this browser.");
            return;
        }
        if (isListening) recognition.stop();
        else recognition.start();
    };

    const speak = (text: string) => {
        if (isMuted) return;
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            // Cancel any current speech
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.onstart = () => setIsSpeaking(true);
            utterance.onend = () => setIsSpeaking(false);
            window.speechSynthesis.speak(utterance);
        }
    };

    // Stop speaking when switching tabs or unmounting
    useEffect(() => {
        return () => {
            if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                window.speechSynthesis.cancel();
            }
        };
    }, []);

    useEffect(() => {
        if (activeTab === 'analysis' && typeof window !== 'undefined' && 'speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
    }, [activeTab]);

    const handleSendMessage = async (e: React.FormEvent, overrideMsg?: string) => {
        if (e) e.preventDefault();
        const msgToSend = overrideMsg || chatInput;
        if (!msgToSend.trim() || chatLoading) return;

        const userMsg = msgToSend.trim();
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setChatInput('');
        setChatLoading(true);

        try {
            const models = ["llama3-70b-8192", "llama-3.3-70b-versatile"];
            let success = false;
            let lastErr = '';

            for (const model of models) {
                try {
                    const response = await fetch(
                        `https://api.groq.com/openai/v1/chat/completions`,
                        {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                "Authorization": `Bearer ${API_KEY}`
                            },
                            body: JSON.stringify({
                                model: model,
                                messages: [{
                                    role: "user",
                                    content: `You are AlphaBot, a protein structural biology expert. 
                                        The current protein UniProt ID is ${uniprotId}.
                                        ${selectedPart ? `The user is currently pointing at or has selected: "${selectedPart.label}" (type: ${selectedPart.type}). Answer their question specifically about this part of the protein structure if relevant.` : ""}
                                        Answer the user's question concisely. 
                                        
                                        You can trigger 3D view actions by including one of these tags at the end of your response:
                                        [ACTION:SHOW_HELICES] - to highlight alpha helices.
                                        [ACTION:SHOW_SHEETS] - to highlight beta sheets.
                                        [ACTION:SHOW_CONFIDENCE] - to show pLDDT confidence view.
                                        [ACTION:RESET] - to reset the view.
                                        
                                        User question: ${userMsg}`
                                }]
                            })
                        }
                    );

                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.error?.message || response.statusText);
                    }

                    const result = await response.json();
                    let aiText = result.choices?.[0]?.message?.content;

                    if (aiText) {
                        const actionMatch = aiText.match(/\[ACTION:(.*?)\]/);
                        if (actionMatch && onAction) {
                            onAction(actionMatch[1]);
                            aiText = aiText.replace(/\[ACTION:.*?\]/g, '').trim();
                        }

                        setMessages(prev => [...prev, { role: 'ai', text: aiText }]);
                        speak(aiText);
                        success = true;
                        break;
                    }
                } catch (e: any) {
                    console.warn(`[AlphaBot] ${model} try failed:`, e.message);
                    lastErr = e.message;
                }
            }

            if (!success) {
                setMessages(prev => [...prev, { role: 'ai', text: `AlphaBot is temporarily restricted: ${lastErr}. Please verify your Groq API key in settings.` }]);
            }
        } catch (e) {
            setMessages(prev => [...prev, { role: 'ai', text: "AlphaBot encountered a critical connection error." }]);
        }
        finally {
            setChatLoading(false);
        }
    };

    if (!uniprotId) {
        return (
            <div className="flex h-full w-96 flex-col items-center justify-center border-l border-slate-800 bg-slate-950/50 p-6 text-center text-slate-500 backdrop-blur">
                <BookOpen className="mb-4 h-12 w-12 opacity-20" />
                <p className="text-sm">Search for a protein to begin AI analysis.</p>
            </div>
        );
    }

    return (
        <div className="h-full w-96 flex flex-col border-l border-slate-800 bg-slate-950/50 backdrop-blur">
            {/* Tabs */}
            <div className="flex border-b border-slate-800">
                <button
                    onClick={() => setActiveTab('analysis')}
                    className={`flex-1 py-4 text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'analysis' ? 'text-blue-400 border-b-2 border-blue-500 bg-blue-500/5' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    Analysis
                </button>
                <button
                    onClick={() => setActiveTab('chat')}
                    className={`flex-1 py-4 text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'chat' ? 'text-emerald-400 border-b-2 border-emerald-500 bg-emerald-500/5' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    AlphaBot AI
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-8">
                {activeTab === 'analysis' ? (
                    <>
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold tracking-tight text-white">Insights</h2>
                            <div className="flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-400 border border-blue-500/20">
                                Gemini v1.5
                            </div>
                        </div>

                        {/* General Info / WH Questions */}
                        <section className="space-y-4 rounded-xl border border-white/5 bg-slate-900/20 p-4 relative overflow-hidden">
                            {selectedPart && (
                                <div className="absolute inset-0 bg-blue-600/5 backdrop-blur-3xl animate-in fade-in duration-500" />
                            )}
                            <div className="relative z-10 space-y-4">
                                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 flex items-center justify-between gap-2">
                                    <span className="flex items-center gap-2 px-1"><Info className="h-3.5 w-3.5 text-blue-400" /> Selection Analysis</span>
                                    {selectedPart && (
                                        <div className="bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/20 text-[9px] font-black animate-pulse">LIVE</div>
                                    )}
                                </h3>

                                {selectedPart ? (
                                    <div className="bg-white/5 rounded-lg p-3 border border-white/10 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-tighter">Target: {selectedPart.label.split('|')[0]}</p>
                                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${selectedPart.type === 'helix' ? 'bg-indigo-500/20 text-indigo-400' : selectedPart.type === 'sheet' ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-500/20 text-slate-400'}`}>
                                                {selectedPart.type}
                                            </span>
                                        </div>
                                        {selectionLoading ? (
                                            <div className="space-y-2 py-1">
                                                <div className="h-2 w-full bg-white/5 animate-pulse rounded" />
                                                <div className="h-2 w-3/4 bg-white/5 animate-pulse rounded" />
                                            </div>
                                        ) : (
                                            <p className="text-xs text-slate-300 leading-relaxed italic">
                                                {selectionAnalysis || selectedPart.description}
                                            </p>
                                        )}
                                        {selectedPart.confidence !== undefined && (
                                            <div className="pt-1 flex items-center gap-2">
                                                <div className="h-1 flex-1 bg-slate-800 rounded-full overflow-hidden">
                                                    <div className="h-full bg-blue-500" style={{ width: `${selectedPart.confidence}%` }} />
                                                </div>
                                                <span className="text-[8px] font-bold text-slate-500">pLDDT: {Math.round(selectedPart.confidence)}</span>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="py-4 text-center">
                                        <div className="mx-auto h-8 w-8 rounded-full border border-dashed border-slate-700 flex items-center justify-center mb-2">
                                            <Target className="h-4 w-4 text-slate-600" />
                                        </div>
                                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Residue Not Selected</p>
                                        <p className="text-[9px] text-slate-600 mt-1">Click any part of the 3D model to inspect</p>
                                    </div>
                                )}
                            </div>
                        </section>

                        <div className="space-y-6">
                            <div className="rounded-xl bg-blue-500/5 p-4 border border-blue-500/10">
                                <h3 className="text-[10px] font-bold uppercase tracking-widest text-blue-400 mb-3 flex items-center gap-2">
                                    <Activity className="h-3 w-3" /> Identity & Function
                                </h3>
                                <div className="space-y-4">
                                    <section className="space-y-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className="text-xs font-semibold text-slate-200">What it is</h4>
                                            <span className="text-[8px] font-bold text-slate-600 border border-slate-800 px-1 rounded uppercase">Source: UniProt</span>
                                        </div>
                                        {loading ? <div className="h-3 w-full animate-pulse rounded bg-slate-800/50" /> : <p className="text-sm text-slate-400 leading-relaxed">{analysis?.identity}</p>}
                                    </section>
                                    <section className="space-y-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className="text-xs font-semibold text-slate-200">What it does</h4>
                                            <span className="text-[8px] font-bold text-slate-600 border border-slate-800 px-1 rounded uppercase">Source: UniProt</span>
                                        </div>
                                        {loading ? <div className="h-3 w-full animate-pulse rounded bg-slate-800/50" /> : <p className="text-sm text-slate-400 leading-relaxed">{analysis?.function}</p>}
                                    </section>
                                </div>
                            </div>

                            <div className="rounded-xl bg-indigo-500/5 p-4 border border-indigo-500/10">
                                <h3 className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 mb-3 flex items-center gap-2">
                                    <ShieldCheck className="h-3 w-3" /> Structural Context
                                </h3>
                                <div className="space-y-4">
                                    <section className="space-y-1">
                                        <h4 className="text-xs font-semibold text-slate-200">What structure shows</h4>
                                        {loading ? <div className="h-3 w-full animate-pulse rounded bg-slate-800/50" /> : <p className="text-sm text-slate-400 leading-relaxed">{analysis?.visuals}</p>}
                                    </section>
                                    <section className="space-y-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className="text-xs font-semibold text-slate-200">Reliability</h4>
                                            <span className="text-[8px] font-bold text-slate-600 border border-slate-800 px-1 rounded uppercase">Source: AlphaFold</span>
                                        </div>
                                        {loading ? <div className="h-3 w-full animate-pulse rounded bg-slate-800/50" /> : <p className="text-sm text-slate-400 leading-relaxed italic">{analysis?.reliability}</p>}
                                    </section>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-slate-800 space-y-4">
                            <div className="flex items-center justify-between px-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Source:</span>
                                    <div className="bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded text-[9px] font-bold border border-blue-500/20">UniProt</div>
                                </div>
                                <span className="text-[9px] text-slate-600 font-medium italic">Educational summary generated from UniProt and AlphaFold data.</span>
                            </div>
                            <a
                                href={`https://www.uniprot.org/uniprotkb/${uniprotId}/entry`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-800 py-3 text-xs font-medium text-slate-400 transition-colors hover:bg-slate-900 hover:text-white"
                            >
                                Official UniProt Page
                                <ExternalLink className="h-3 w-3" />
                            </a>
                        </div>
                    </>
                ) : (
                    <div className="flex h-full flex-col">
                        <div className="flex-1 space-y-4">
                            {messages.length === 0 && (
                                <div className="text-center py-12">
                                    <div className="mx-auto h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4 border border-emerald-500/20 text-emerald-400">
                                        AI
                                    </div>
                                    <p className="text-xs text-slate-500">Ask AlphaBot about this structure.<br />Try: "Highlight helices"</p>
                                </div>
                            )}
                            {messages.map((m, i) => (
                                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-200 border border-white/5'}`}>
                                        {m.text}
                                    </div>
                                </div>
                            ))}
                            {chatLoading && (
                                <div className="flex justify-start">
                                    <div className="rounded-2xl bg-slate-800 px-4 py-2 text-sm text-slate-400 animate-pulse">
                                        AlphaBot is thinking...
                                    </div>
                                </div>
                            )}
                        </div>

                        {selectedPart && (
                            <div className="mb-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-3 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                                        <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Context Selected</span>
                                    </div>
                                    <span className="text-xs text-slate-300 font-medium">{selectedPart.label.split('|')[0]}</span>
                                </div>
                            </div>
                        )}

                        <form onSubmit={handleSendMessage} className="mt-4 pt-4 border-t border-slate-800">
                            <div className="relative">
                                <input
                                    type="text"
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    placeholder={isListening ? "Listening..." : "Type or click mic to talk..."}
                                    className={`w-full rounded-xl bg-slate-900 border p-3 pr-24 text-sm text-white focus:ring-0 outline-none transition-all ${isListening ? 'border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'border-slate-800 focus:border-emerald-500/50'}`}
                                />
                                <div className="absolute right-2 top-1.5 flex items-center gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (isSpeaking) window.speechSynthesis.cancel();
                                            setIsMuted(!isMuted);
                                        }}
                                        className={`rounded-lg p-1.5 text-slate-400 hover:text-white transition-all hover:bg-slate-800`}
                                        title={isMuted ? "Unmute Voice" : "Mute Voice"}
                                    >
                                        {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                                    </button>
                                    <div className="h-4 w-px bg-slate-800" />
                                    <button
                                        type="button"
                                        onClick={toggleListening}
                                        className={`rounded-lg p-1.5 text-white transition-all shadow-lg ${isListening ? 'bg-red-600 animate-pulse' : 'bg-slate-800 hover:bg-slate-700'}`}
                                    >
                                        <Activity className={`h-4 w-4 ${isListening ? 'animate-bounce' : ''}`} />
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={chatLoading}
                                        className="rounded-lg bg-emerald-600 p-1.5 text-white hover:bg-emerald-500 disabled:opacity-50"
                                    >
                                        <ExternalLink className="h-4 w-4 rotate-90" />
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
}
