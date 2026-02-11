import { useEffect, useRef, useImperativeHandle, forwardRef, useState } from 'react';

interface SelectionInfo {
    label: string;
    description?: string;
    confidence?: number;
    type?: 'helix' | 'sheet' | 'loop' | 'unknown';
}

interface ProteinViewerProps {
    pdbData: string | null;
    onSelect?: (info: SelectionInfo | null) => void;
    onConfidenceStats?: (stats: { avg: number; high: number; medium: number; low: number }) => void;
}

export interface ProteinViewerRef {
    rotate: (x: number, y: number) => void;
    pan: (x: number, y: number) => void;
    zoom: (delta: number) => void;
    reset: () => void;
    setRepresentation: (mode: 'default' | 'breakdown' | 'confidence' | 'cartoon' | 'detailed') => void;
    toggleStructureView: (type: 'helices' | 'sheets' | 'loops', visible: boolean) => void;
    setConfidenceFilter: (hideLow: boolean) => void;
    highlightRegion: (type: 'helices' | 'sheets' | 'loops') => void;
    pick: (x: number, y: number) => void;
}

const ProteinViewer = forwardRef<ProteinViewerRef, ProteinViewerProps>(({ pdbData, onSelect, onConfidenceStats }, ref) => {
    const [mounted, setMounted] = useState(false);
    const parentRef = useRef<HTMLDivElement>(null);
    const pluginRef = useRef<any>(null); // Using any for dynamic imports
    const initializedRef = useRef(false);
    const lastZoom = useRef<number | null>(null);
    const onSelectRef = useRef(onSelect);
    const onConfidenceStatsRef = useRef(onConfidenceStats);

    useEffect(() => {
        onConfidenceStatsRef.current = onConfidenceStats;
    }, [onConfidenceStats]);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Update the ref whenever the onSelect prop changes
    useEffect(() => {
        onSelectRef.current = onSelect;
    }, [onSelect]);

    useImperativeHandle(ref, () => ({
        rotate: (x: number, y: number) => {
            const plugin = pluginRef.current;
            if (!plugin?.canvas3d) return;

            // Use MolStar's built-in camera rotation for stability
            // x and y should be deltas
            plugin.managers.camera.rotate(x, y);
        },
        pan: (x: number, y: number) => {
            const plugin = pluginRef.current;
            if (!plugin?.canvas3d) return;

            // Use MolStar's built-in panning
            plugin.managers.camera.pan(x, y);
        },
        zoom: (delta: number) => {
            const plugin = pluginRef.current;
            if (!plugin?.canvas3d) return;

            // Use MolStar's built-in zoom
            // delta comes from GestureController
            plugin.managers.camera.zoom(delta);
        },
        reset: () => {
            const plugin = pluginRef.current;
            if (!plugin) return;
            try {
                // More robust focus on all structures
                const structures = plugin.managers.structure.hierarchy.current.structures;
                if (structures.length > 0) {
                    plugin.managers.camera.reset();
                    const components = structures[0].components;
                    if (components && components.length > 0) {
                        plugin.managers.structure.component.requestView(components);
                    }
                } else if (plugin.managers.camera?.reset) {
                    plugin.managers.camera.reset();
                }
            } catch (e) {
                console.warn('[ProteinViewer] Reset failed:', e);
            }
            lastZoom.current = null;
        },
        setRepresentation: async (mode: 'default' | 'breakdown' | 'confidence' | 'cartoon' | 'detailed') => {
            const plugin = pluginRef.current;
            if (!plugin) return;

            const structures = plugin.managers.structure.hierarchy.current.structures;
            if (structures.length === 0) return;

            if (mode === 'detailed') {
                // High quality spacefill/ball-and-stick
                await plugin.builders.structure.hierarchy.applyPreset(structures, 'default', {
                    representationPresetParams: {
                        theme: { globalName: 'plddt-confidence' as any },
                        kind: 'everything' as any
                    }
                });
            } else {
                // Cartoon representation (default)
                const themeName = (mode === 'confidence' || mode === 'default') ? 'plddt-confidence' : 'chain-id';
                await plugin.builders.structure.hierarchy.applyPreset(structures, 'default', {
                    representationPresetParams: { theme: { globalName: themeName as any } }
                });
            }
        },
        toggleStructureView: async (type: 'helices' | 'sheets' | 'loops', visible: boolean) => {
            // Placeholder to satisfy interface
        },
        setConfidenceFilter: async (hideLow: boolean) => {
            const plugin = pluginRef.current;
            if (!plugin) return;

            const structures = plugin.managers.structure.hierarchy.current.structures;
            if (structures.length === 0) return;

            try {
                const { StructureSelection } = await import('molstar/lib/mol-model/structure');
                const { MolScriptBuilder: MS } = await import('molstar/lib/mol-script/language/builder');

                // Toggle visibility of low confidence regions
                // We do this by creating a component or updating the current one.
                // For simplicity and speed in this demo, we'll use the 'setProps' on the representation
                // to effectively hide atoms below the threshold via a specialized query if supported,
                // or just log the action and focus on high confidence.

                if (hideLow) {
                    const query = MS.struct.generator.atomGroups({
                        'atom-test': MS.core.rel.gr([(MS.struct.atomProperty.macromolecular as any).B_factor(), 70])
                    });
                    const selection = (StructureSelection as any).fromQuery(query as any, structures[0].cell.obj?.data!);
                    const loci = (StructureSelection as any).toLociWithSource(selection);

                    plugin.managers.camera.focusLoci(loci);
                } else {
                    plugin.managers.camera.reset();
                }
            } catch (e) {
                console.warn('[ProteinViewer] Filter failed:', e);
            }
        },
        highlightRegion: async (type: 'helices' | 'sheets' | 'loops') => {
            const plugin = pluginRef.current;
            if (!plugin) return;

            try {
                const structures = plugin.managers.structure.hierarchy.current.structures;
                if (structures.length > 0) {
                    const { StructureSelection, StructureQuery } = await import('molstar/lib/mol-model/structure');
                    const { MolScriptBuilder: MS } = await import('molstar/lib/mol-script/language/builder');

                    let query: any;
                    const flags = (MS.core as any).flags;
                    const gen = (MS.struct as any).generator;

                    if (type === 'helices') query = gen.atomGroups({ 'residue-test': flags.hasSecondaryStructure(['helix']) });
                    else if (type === 'sheets') query = gen.atomGroups({ 'residue-test': flags.hasSecondaryStructure(['beta']) });
                    else query = gen.atomGroups({ 'residue-test': flags.hasSecondaryStructure(['none']) });

                    const selection = (StructureSelection as any).fromQuery(query as any, structures[0].cell.obj?.data!);
                    const loci = (StructureSelection as any).toLociWithSource(selection);

                    plugin.managers.camera.focusLoci(loci);
                    plugin.managers.interactivity.lociHighlights.highlightOnly({ loci });
                }
            } catch (e) {
                console.warn('[ProteinViewer] Highlight failed:', e);
                plugin.managers.camera.reset();
            }
        },
        pick: (x: number, y: number) => {
            const plugin = pluginRef.current;
            const container = parentRef.current;
            if (!plugin?.canvas3d || !container) return;

            // Find the canvas element robustly
            const canvas = container.querySelector('canvas');
            if (!canvas) return;

            const rect = canvas.getBoundingClientRect();
            // x, y are normalized [0, 1] relative to the video feed, 
            // but since it's mirrored in UI we need to be careful. 
            // In GestureController we use -scale-x-100 on video/canvas.

            const screenX = (1 - x) * rect.width;
            const screenY = y * rect.height;

            const clientX = rect.left + screenX;
            const clientY = rect.top + screenY;

            const options: any = {
                clientX,
                clientY,
                bubbles: true,
                button: 0,
                buttons: 1,
                view: window
            };

            // Dispatch to trigger MolStar's internal logic
            canvas.dispatchEvent(new PointerEvent('pointerdown', { ...options, pointerType: 'mouse' }));
            canvas.dispatchEvent(new PointerEvent('pointerup', { ...options, pointerType: 'mouse' }));
            canvas.dispatchEvent(new MouseEvent('mousedown', options));
            canvas.dispatchEvent(new MouseEvent('mouseup', options));
            canvas.dispatchEvent(new MouseEvent('click', options));
        }
    }));

    useEffect(() => {
        if (!parentRef.current || initializedRef.current || !mounted) return;

        const init = async () => {
            try {
                initializedRef.current = true;
                const { PluginConfig } = await import('molstar/lib/mol-plugin/config');
                const { createPluginUI } = await import('molstar/lib/mol-plugin-ui');
                const { renderReact18 } = await import('molstar/lib/mol-plugin-ui/react18');
                const { DefaultPluginUISpec } = await import('molstar/lib/mol-plugin-ui/spec');
                const { Color } = await import('molstar/lib/mol-util/color');
                const { StructureElement, StructureProperties } = await import('molstar/lib/mol-model/structure');

                if (!parentRef.current) return;

                // Force size before init as recommended for production stability
                parentRef.current.style.width = '100%';
                parentRef.current.style.height = '100%';

                const spec = DefaultPluginUISpec();
                const plugin = await createPluginUI({
                    target: parentRef.current!,
                    spec: {
                        actions: spec.actions,
                        behaviors: spec.behaviors,
                        config: [
                            ...(spec.config || []),
                            [PluginConfig.Viewport.ShowControls, false],
                            [PluginConfig.Viewport.ShowExpand, false],
                            [PluginConfig.Viewport.ShowSettings, false],
                            [PluginConfig.Viewport.ShowSelectionMode, false],
                            [PluginConfig.Viewport.ShowAnimation, false],
                            [PluginConfig.Viewport.ShowTrajectoryControls, false],
                        ],
                        layout: {
                            initial: {
                                isExpanded: false,
                                showControls: false,
                                regionState: { top: 'hidden', bottom: 'hidden', left: 'hidden', right: 'hidden' }
                            },
                        },
                        components: {
                            controls: { left: 'none', right: 'none', top: 'none', bottom: 'none' },
                            remoteState: 'none',
                        }
                    },
                    render: renderReact18,
                });

                pluginRef.current = plugin;
                if (plugin.canvas3d) {
                    const { renderer, postprocessing } = plugin.canvas3d.props;
                    plugin.canvas3d.setProps({
                        renderer: {
                            ...renderer,
                            backgroundColor: Color(0x020617) as any,
                            ambientIntensity: 0.8,
                        },
                        postprocessing: {
                            ...postprocessing,
                            occlusion: {
                                name: 'on',
                                params: {
                                    ...((postprocessing.occlusion as any)?.params || {}),
                                    samples: 64,
                                    radius: 6,
                                    bias: 0.5,
                                    blurKernelSize: 15,
                                    resolutionScale: 1
                                }
                            },
                            outline: {
                                name: 'on',
                                params: {
                                    ...((postprocessing.outline as any)?.params || {}),
                                    scale: 1,
                                    threshold: 0.1,
                                    color: Color(0x000000),
                                    includeTransparent: true,
                                }
                            },
                            bloom: {
                                name: 'on',
                                params: {
                                    ...((postprocessing.bloom as any)?.params || {}),
                                    strength: 0.2,
                                    radius: 2,
                                    threshold: 0.6
                                }
                            }
                        }
                    });
                }

                // Interaction listener for selection
                const clickSub = plugin.behaviors.interaction.click.subscribe((e: any) => {
                    if (onSelectRef.current) {
                        const labels = (plugin.managers.lociLabels as any).getLabels(e.current.loci);
                        if (labels.length > 0) {
                            const rawLabel = labels[0];
                            const label = rawLabel.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

                            // More robust parsing for secondary structure

                            let type: 'helix' | 'sheet' | 'loop' | 'unknown' = 'unknown';

                            try {
                                const loci = e.current.loci;
                                if ((StructureElement.Loci as any).is(loci) && (loci as any).elements.length > 0) {
                                    const loc = (StructureElement.Location as any).create(loci.structure);
                                    const el = (loci as any).elements[0];
                                    (StructureElement.Location as any).set(loc, loci.structure, el.unit, el.indices[0]);

                                    // Get secondary structure key (works for DSSP and PDB records)
                                    // Common keys: 'helix', 'beta', 'turn', 'coil', 'none'
                                    const ssKey = StructureProperties.residue.secondary_structure_key(loc) as any;

                                    if (ssKey === 'helix' || ssKey === 'alpha' || ssKey === '3-10' || ssKey === 'pi') type = 'helix';
                                    else if (ssKey === 'beta' || ssKey === 'strand' || ssKey === 'sheet') type = 'sheet';
                                    else type = 'loop';
                                } else {
                                    // Fallback to label parsing if logic unavailable
                                    const lowerLabel = label.toLowerCase();
                                    if (lowerLabel.includes('helix')) type = 'helix';
                                    else if (lowerLabel.includes('sheet') || lowerLabel.includes('strand') || lowerLabel.includes('beta')) type = 'sheet';
                                    else if (lowerLabel.includes('loop') || lowerLabel.includes('coil') || lowerLabel.includes('turn')) type = 'loop';
                                }
                            } catch (err) {
                                console.warn('SS detection failed:', err);
                                type = 'loop'; // Safe default
                            }

                            // Extract residue info from common format "Residue Name [Index] (Chain)"
                            const residueMatch = label.match(/([A-Z0-9]{3})\s+(\d+)/);
                            const displayLabel = residueMatch ? `${residueMatch[1]} ${residueMatch[2]}` : label.split('|')[0].trim();

                            // Try to get confidence from the loci if possible (B-factor)
                            let confidence: number | undefined = undefined;
                            try {
                                const loci = e.current.loci;
                                if (loci && (loci as any).kind === 'element-loci') {
                                    const el = (loci as any);
                                    if (el.indices.length > 0) {
                                        const unit = el.structure.units[el.indices[0]];
                                        const atomIdx = el.indices[0].indices[0];
                                        if (unit && unit.model && unit.model.atomicResidueAndAtom) {
                                            confidence = unit.model.atomicResidueAndAtom.atom.B_factor.array[atomIdx];
                                        }
                                    }
                                }
                            } catch (err) { }

                            onSelectRef.current({
                                label: displayLabel,
                                type,
                                description: `Part of ${type !== 'unknown' ? `the ${type} structure` : 'the protein chain'}.`,
                                confidence
                            });

                            // Visually keep the selection highlighted
                            plugin.managers.interactivity.lociHighlights.highlightOnly({ loci: e.current.loci });
                            plugin.managers.camera.focusLoci(e.current.loci);
                        } else {
                            onSelectRef.current(null);
                        }
                    }
                });

                (plugin as any)._clickSub = clickSub;

                if (pdbData && pluginRef.current) loadStructure(plugin, pdbData);
            } catch (e) {
                console.error('ProteinViewer: Mol* init failed', e);
            }
        };

        const loadStructure = async (plugin: any, dataStr: string) => {
            try {
                await plugin.clear();
                const data = await plugin.builders.data.rawData({ data: dataStr, label: 'Structure' });
                const trajectory = await plugin.builders.structure.parseTrajectory(data, 'pdb');
                const model = await plugin.builders.structure.hierarchy.applyPreset(trajectory, 'default', {
                    representationPresetParams: { theme: { globalName: 'plddt-confidence' as any } }
                });

                // Calculate pLDDT confidence statistics
                try {
                    const structures = plugin.managers.structure.hierarchy.current.structures;
                    if (structures.length > 0) {
                        const root = structures[0].cell.obj?.data;
                        if (root) {
                            const bFactors = root.atomicResidueAndAtom.atom.B_factor.array;
                            let total = 0;
                            let high = 0;
                            let med = 0;
                            let low = 0;
                            let count = bFactors.length;

                            for (let i = 0; i < count; i++) {
                                const val = bFactors[i];
                                total += val;
                                if (val > 90) high++;
                                else if (val >= 70) med++;
                                else low++;
                            }

                            if (onConfidenceStatsRef.current) {
                                onConfidenceStatsRef.current({
                                    avg: total / count,
                                    high: (high / count) * 100,
                                    medium: (med / count) * 100,
                                    low: (low / count) * 100
                                });
                            }
                        }
                    }
                } catch (err) {
                    console.warn('[ProteinViewer] Stats calculation failed:', err);
                }

                // Robust Focus after loading
                setTimeout(() => {
                    try {
                        const structures = plugin.managers.structure.hierarchy.current.structures;
                        if (structures.length > 0) {
                            const components = structures[0].components;
                            plugin.managers.structure.component.requestView(components);
                            console.log('[ProteinViewer] Camera auto-focused on structure');
                        }
                        plugin.canvas3d?.requestDraw();
                    } catch (err) {
                        console.warn('[ProteinViewer] Auto-focus failed, falling back to reset');
                        plugin.managers.camera.reset();
                    }
                }, 500); // 500ms delay to ensure geometry is ready in production
            } catch (e) {
                console.error('[ProteinViewer] Load error:', e);
            }
        };

        init();

        return () => {
            if (pluginRef.current) {
                if (pluginRef.current._clickSub) {
                    pluginRef.current._clickSub.unsubscribe();
                }
                pluginRef.current.dispose();
                pluginRef.current = null;
            }
        };
    }, [mounted]);

    useEffect(() => {
        if (pluginRef.current && pdbData) {
            const load = async () => {
                const plugin = pluginRef.current;
                try {
                    await plugin.clear();
                    const data = await plugin.builders.data.rawData({ data: pdbData, label: 'Structure' });
                    const trajectory = await plugin.builders.structure.parseTrajectory(data, 'pdb');
                    await plugin.builders.structure.hierarchy.applyPreset(trajectory, 'default', {
                        representationPresetParams: { theme: { globalName: 'plddt-confidence' as any } }
                    });
                    setTimeout(() => {
                        plugin.managers.camera.reset();
                        plugin.canvas3d?.requestDraw();
                    }, 100);
                } catch (e) {
                    console.error('[ProteinViewer] Update error:', e);
                }
            };
            load();
        }
    }, [pdbData]);

    if (!mounted) return null;

    return (
        <div ref={parentRef} className="absolute inset-0 z-10 w-full h-full">
            <style>{`
                .msp-viewport-controls, .msp-viewport-toggles { display: none !important; }
            `}</style>
        </div>
    );
});

ProteinViewer.displayName = 'ProteinViewer';
export default ProteinViewer;
