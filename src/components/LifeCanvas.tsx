import React, { useRef, useEffect, useState } from 'react';
import { LifeEngineHandle, LifeEngineSnapshot, startLifeEngine } from '../webgl/lifeEngine';
import { ObjectiveMetrics, SimulationControls } from '../webgl/simulationTypes';

interface LifeCanvasProps {
    setFps?: (fps: number) => void;
    setPups?: (pups: number) => void;
    setObjectiveMetrics?: (metrics: ObjectiveMetrics) => void;
    controls: SimulationControls;
    onControlsChange: (partial: Partial<SimulationControls>) => void;
    handleOpacity: number;
}

interface CaptureReproDetail {
    resolve: (value: { snapshot: LifeEngineSnapshot; screenshotDataUrl: string }) => void;
    reject: (reason?: unknown) => void;
}

interface LoadReproDetail {
    snapshot: LifeEngineSnapshot;
    resolve?: () => void;
    reject?: (reason?: unknown) => void;
}

export default function LifeCanvas({
    setFps,
    setPups,
    setObjectiveMetrics,
    controls,
    onControlsChange,
    handleOpacity,
}: LifeCanvasProps) {
    type DragKind = 'black' | 'black2' | 'white';

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const controlsRef = useRef<SimulationControls>(controls);
    const onControlsChangeRef = useRef(onControlsChange);
    const engineRef = useRef<LifeEngineHandle | null>(null);

    const dragTarget = useRef<DragKind | null>(null);

    const offsetRef = useRef({ x: 0, y: 0 });

    const [scale, setScale] = useState(1);

    const toWorldFromScreen = (clientX: number, clientY: number, rect: DOMRect, paddingPx = 0) => {
        const paddedLeft = rect.left + paddingPx;
        const paddedTop = rect.top + paddingPx;
        const paddedWidth = Math.max(1, rect.width - paddingPx * 2);
        const paddedHeight = Math.max(1, rect.height - paddingPx * 2);
        const ux = (clientX - paddedLeft) / paddedWidth;
        const uy = (clientY - paddedTop) / paddedHeight;
        return {
            x: Math.min(1, Math.max(0, ux)),
            y: Math.min(1, Math.max(0, 1 - uy)),
        };
    };

    useEffect(() => {
        controlsRef.current = controls;
    }, [controls]);

    useEffect(() => {
        onControlsChangeRef.current = onControlsChange;
    }, [onControlsChange]);

    useEffect(() => {
        const canvas = canvasRef.current!;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        let offsetRaf = 0;
        let disposed = false;

        const boot = async () => {
            const handle = await startLifeEngine(canvas, {
                setFps,
                setPups,
                getOffset: () => offsetRef.current,
                getControls: () => controlsRef.current,
                onMetrics: setObjectiveMetrics,
            });

            if (disposed) {
                handle.stop();
                return;
            }

            engineRef.current = handle;
        };

        boot();

        const applyDragPosition = (kind: DragKind, e: MouseEvent) => {
            const rect = canvas.getBoundingClientRect();
            const next = toWorldFromScreen(e.clientX, e.clientY, rect, 14);
            if (kind === 'white') {
                controlsRef.current = {
                    ...controlsRef.current,
                    whiteHoleX: next.x,
                    whiteHoleY: next.y,
                };
                onControlsChangeRef.current({ whiteHoleX: next.x, whiteHoleY: next.y });
            } else if (kind === 'black2') {
                controlsRef.current = {
                    ...controlsRef.current,
                    blackHole2X: next.x,
                    blackHole2Y: next.y,
                };
                onControlsChangeRef.current({ blackHole2X: next.x, blackHole2Y: next.y });
            } else {
                controlsRef.current = {
                    ...controlsRef.current,
                    blackHoleX: next.x,
                    blackHoleY: next.y,
                };
                onControlsChangeRef.current({ blackHoleX: next.x, blackHoleY: next.y });
            }
        };

        const handleMouseMove = (e: MouseEvent) => {
            if (!dragTarget.current) return;
            if ((e.buttons & 1) === 0) {
                dragTarget.current = null;
                return;
            }
            applyDragPosition(dragTarget.current, e);
        };

        const handleMouseUp = () => {
            dragTarget.current = null;
        };

        const handleResize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            engineRef.current?.resize(canvas.width, canvas.height);
        };

        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();
            setScale((s) => Math.max(1, s + e.deltaY * -0.001));
        };

        const handleResetZoom = () => {
            setScale(1);
            offsetRef.current = { x: 0, y: 0 };
        };

        const handleResetSimulation = () => {
            engineRef.current?.randomize(controlsRef.current.seedDensity);
        };

        const handleCaptureReproBundle = (event: Event) => {
            const customEvent = event as CustomEvent<CaptureReproDetail>;
            try {
                if (!engineRef.current) {
                    throw new Error('Simulation engine is not ready.');
                }
                const snapshot = engineRef.current.captureSnapshot();
                const screenshotDataUrl = canvas.toDataURL('image/png');
                customEvent.detail?.resolve({ snapshot, screenshotDataUrl });
            } catch (error) {
                customEvent.detail?.reject(error);
            }
        };

        const handleLoadReproBundle = (event: Event) => {
            const customEvent = event as CustomEvent<LoadReproDetail>;
            try {
                if (!engineRef.current) {
                    throw new Error('Simulation engine is not ready.');
                }
                engineRef.current.restoreSnapshot(customEvent.detail.snapshot);
                customEvent.detail?.resolve?.();
            } catch (error) {
                customEvent.detail?.reject?.(error);
            }
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        window.addEventListener('resize', handleResize);
        canvas.addEventListener('wheel', handleWheel, { passive: false });
        window.addEventListener('resetZoom', handleResetZoom);
        window.addEventListener('resetSimulation', handleResetSimulation);
        window.addEventListener('captureReproBundle', handleCaptureReproBundle);
        window.addEventListener('loadReproBundle', handleLoadReproBundle);

        const updateOffset = () => {
            offsetRef.current = { x: 0, y: 0 };
            offsetRaf = requestAnimationFrame(updateOffset);
        };
        updateOffset();

        return () => {
            disposed = true;
            cancelAnimationFrame(offsetRaf);
            engineRef.current?.stop();
            engineRef.current = null;
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('resize', handleResize);
            canvas.removeEventListener('wheel', handleWheel);
            window.removeEventListener('resetZoom', handleResetZoom);
            window.removeEventListener('resetSimulation', handleResetSimulation);
            window.removeEventListener('captureReproBundle', handleCaptureReproBundle);
            window.removeEventListener('loadReproBundle', handleLoadReproBundle);
        };
    }, [setFps, setPups, setObjectiveMetrics]);

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <canvas
                ref={canvasRef}
                style={{
                    display: 'block',
                    width: '100%',
                    height: '100%',
                    transform: `scale(${scale})`,
                    transformOrigin: '0 0',
                }}
            />
            <button
                type="button"
                aria-label="Drag Black Hole 1"
                title="Black Hole 1"
                onMouseDown={(e) => {
                    e.preventDefault();
                    dragTarget.current = 'black';
                    const rect = canvasRef.current?.getBoundingClientRect();
                    if (!rect) return;
                    const next = toWorldFromScreen(e.clientX, e.clientY, rect, 14);
                    controlsRef.current = {
                        ...controlsRef.current,
                        blackHoleX: next.x,
                        blackHoleY: next.y,
                    };
                    onControlsChangeRef.current({ blackHoleX: next.x, blackHoleY: next.y });
                }}
                style={{
                    position: 'absolute',
                    left: `${controls.blackHoleX * 100}%`,
                    top: `${(1 - controls.blackHoleY) * 100}%`,
                    transform: 'translate(-50%, -50%)',
                    width: 28,
                    height: 28,
                    borderRadius: '9999px',
                    border: '2px solid rgba(255,255,255,0.9)',
                    background: 'rgba(255,255,255,0.2)',
                    cursor: 'grab',
                    zIndex: 40,
                    opacity: handleOpacity,
                    pointerEvents: 'auto',
                }}
            />
            <button
                type="button"
                aria-label="Drag Black Hole 2"
                title="Black Hole 2"
                onMouseDown={(e) => {
                    e.preventDefault();
                    dragTarget.current = 'black2';
                    const rect = canvasRef.current?.getBoundingClientRect();
                    if (!rect) return;
                    const next = toWorldFromScreen(e.clientX, e.clientY, rect, 14);
                    controlsRef.current = {
                        ...controlsRef.current,
                        blackHole2X: next.x,
                        blackHole2Y: next.y,
                    };
                    onControlsChangeRef.current({ blackHole2X: next.x, blackHole2Y: next.y });
                }}
                style={{
                    position: 'absolute',
                    left: `${controls.blackHole2X * 100}%`,
                    top: `${(1 - controls.blackHole2Y) * 100}%`,
                    transform: 'translate(-50%, -50%)',
                    width: 28,
                    height: 28,
                    borderRadius: '9999px',
                    border: '2px solid rgba(255,215,130,0.95)',
                    background: 'rgba(255,215,130,0.25)',
                    cursor: 'grab',
                    zIndex: 40,
                    opacity: handleOpacity,
                    pointerEvents: 'auto',
                }}
            />
            <button
                type="button"
                aria-label="Drag White Hole"
                title="White Hole"
                onMouseDown={(e) => {
                    e.preventDefault();
                    dragTarget.current = 'white';
                    const rect = canvasRef.current?.getBoundingClientRect();
                    if (!rect) return;
                    const next = toWorldFromScreen(e.clientX, e.clientY, rect, 14);
                    controlsRef.current = {
                        ...controlsRef.current,
                        whiteHoleX: next.x,
                        whiteHoleY: next.y,
                    };
                    onControlsChangeRef.current({ whiteHoleX: next.x, whiteHoleY: next.y });
                }}
                style={{
                    position: 'absolute',
                    left: `${controls.whiteHoleX * 100}%`,
                    top: `${(1 - controls.whiteHoleY) * 100}%`,
                    transform: 'translate(-50%, -50%)',
                    width: 28,
                    height: 28,
                    borderRadius: '9999px',
                    border: '2px solid rgba(100,200,255,0.95)',
                    background: 'rgba(100,200,255,0.24)',
                    cursor: 'grab',
                    zIndex: 40,
                    opacity: handleOpacity,
                    pointerEvents: 'auto',
                }}
            />
        </div>
    );
}
