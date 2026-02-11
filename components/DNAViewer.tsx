import React, { useEffect, useRef, useState } from 'react';

const DNAViewer: React.FC = () => {
    const [mounted, setMounted] = useState(false);
    const parentRef = useRef<HTMLDivElement>(null);
    const pluginRef = useRef<any>(null);
    const initializedRef = useRef(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!parentRef.current || initializedRef.current || !mounted) return;

        const init = async () => {
            try {
                initializedRef.current = true;
                const { createPluginUI } = await import('molstar/lib/mol-plugin-ui');
                const { renderReact18 } = await import('molstar/lib/mol-plugin-ui/react18');
                const { DefaultPluginUISpec } = await import('molstar/lib/mol-plugin-ui/spec');
                const { Asset } = await import('molstar/lib/mol-util/assets');
                const { Color } = await import('molstar/lib/mol-util/color');

                if (!parentRef.current) return;

                // Force layout before init
                parentRef.current.style.width = '100%';
                parentRef.current.style.height = '100%';

                const spec = DefaultPluginUISpec();
                const plugin = await createPluginUI({
                    target: parentRef.current!,
                    spec: {
                        actions: spec.actions,
                        behaviors: spec.behaviors,
                        config: spec.config,
                        layout: {
                            initial: {
                                isExpanded: false,
                                showControls: false,
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

                // Load DNA (1BNA) with safety
                try {
                    const url = 'https://files.rcsb.org/download/1BNA.pdb';
                    console.log('[DNAViewer] Downloading DNA from RCSB...');
                    const data = await plugin.builders.data.download({ url: Asset.Url(url) });
                    const trajectory = await plugin.builders.structure.parseTrajectory(data, 'pdb');

                    // Load DNA
                    await plugin.builders.structure.hierarchy.applyPreset(trajectory, 'default', {
                        representationPresetParams: {
                            theme: {
                                globalName: 'element-symbol', // Scientific coloring
                                carbonColor: { name: 'element-symbol', params: {} },
                                focus: { name: 'element-symbol', params: {} }
                            }
                        }
                    });

                    // Add Ball-and-Stick for atomic detail (professional look)
                    const structure = plugin.managers.structure.hierarchy.current.structures[0];
                    if (structure) {
                        await plugin.builders.structure.representation.addRepresentation(structure.cell, {
                            type: 'ball-and-stick',
                            typeParams: { sizeFactor: 0.15 },
                            color: 'element-symbol',
                            colorParams: { carbonColor: { name: 'element-symbol', params: {} } }
                        });
                    }
                    console.log('[DNAViewer] DNA Loaded successfully');

                    // Robust Focus
                    setTimeout(() => {
                        try {
                            const structures = plugin.managers.structure.hierarchy.current.structures;
                            if (structures.length > 0) {
                                const components = structures[0].components;
                                if (components && components.length > 0) {
                                    (plugin.managers.structure.component as any).requestView(components);
                                }
                                console.log('[DNAViewer] Camera focused');
                            }
                        } catch (err) {
                            plugin.managers.camera?.reset();
                        }
                    }, 500);
                } catch (loadErr) {
                    console.warn('[DNAViewer] Failed to load 1BNA.pdb', loadErr);
                }

                if (plugin.canvas3d) {
                    const { renderer, postprocessing } = plugin.canvas3d.props;
                    plugin.canvas3d.setProps({
                        renderer: {
                            ...renderer,
                            backgroundColor: Color(0x020617), // Deep slate
                            ambientIntensity: 1.0, // balanced ambient
                        },
                        postprocessing: {
                            ...postprocessing,
                            occlusion: {
                                name: 'on',
                                params: {
                                    ...((postprocessing.occlusion as any)?.params || {}),
                                    samples: 64, // higher quality AO
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
                            // Bloom gives a nice "glow" - keep it subtle
                            bloom: {
                                name: 'on',
                                params: {
                                    ...((postprocessing.bloom as any)?.params || {}),
                                    strength: 0.3,
                                    radius: 2,
                                    threshold: 0.6
                                }
                            }
                        }
                    });

                    // Continuous slow rotation (relative to current focus)
                    const animate = () => {
                        if (!pluginRef.current || !plugin.canvas3d) return;
                        try {
                            const camera = plugin.canvas3d.camera;
                            const { position, target } = camera.getSnapshot();

                            // Rotate around Y axis relative to target
                            const speed = 0.005;
                            const dx = position[0] - target[0];
                            const dz = position[2] - target[2];

                            const x = dx * Math.cos(speed) - dz * Math.sin(speed);
                            const z = dx * Math.sin(speed) + dz * Math.cos(speed);

                            camera.setState({
                                ...camera.state,
                                position: [target[0] + x, position[1], target[2] + z] as any
                            });
                        } catch (err) { }
                        requestAnimationFrame(animate);
                    };
                    animate();
                }

            } catch (e) {
                console.error('DNAViewer: Mol* init failed', e);
            }
        };

        init();

        return () => {
            if (pluginRef.current) {
                pluginRef.current.dispose();
                pluginRef.current = null;
            }
        };
    }, [mounted]);

    if (!mounted) return null;

    return (
        <div className="relative w-full h-[550px] pointer-events-none">
            <style>{`
                .msp-viewport-controls, .msp-viewport-toggles { display: none !important; }
            `}</style>
            <div ref={parentRef} className="w-full h-full" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/20 via-transparent to-slate-950/20" />
            <div className="absolute inset-0 bg-gradient-to-b from-slate-950/20 via-transparent to-slate-950/20" />
        </div>
    );
};

export default DNAViewer;
