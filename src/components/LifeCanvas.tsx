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

interface SetHoleDynamicsDetail {
    velocities?: Partial<Record<PresetKind, Vec2>>;
    depths?: Partial<Record<PresetKind, { d: number; vd: number }>>;
}

type PresetKind = 'black' | 'black2' | 'black3' | 'white';
type DragTargetKind = `black-${number}` | 'white';

interface Vec2 {
    x: number;
    y: number;
}

interface Vec3 {
    x: number;
    y: number;
    z: number;
}

interface HoleBody {
    id: string;
    kind: 'black' | 'white';
    x: number;
    y: number;
    z: number;
    vx: number;
    vy: number;
    vz: number;
    mass: number;
    radius: number;
    dragged: boolean;
}

const SPEED_OF_LIGHT = 0.72;
const MIN_HOLE_SPEED = 0.012;
const HOLE_GRAVITY_SCALE = 0.085;
const WHITE_REACTION_SCALE = 0.35;
const SPIN_TRANSFER_SCALE = 0.32;
const ANTI_NUCLEUS_PAIR_SCALE = 0.065;

const wrap01 = (value: number) => {
    const wrapped = value % 1;
    return wrapped < 0 ? wrapped + 1 : wrapped;
};

const wrapDelta01 = (from: number, to: number) => {
    const delta = to - from;
    if (delta > 0.5) {
        return delta - 1;
    }
    if (delta < -0.5) {
        return delta + 1;
    }
    return delta;
};

const clampMagnitude3 = (velocity: Vec3, maxMagnitude: number): Vec3 => {
    const speed = Math.hypot(velocity.x, velocity.y, velocity.z);
    if (speed <= maxMagnitude || speed <= 1e-8) {
        return velocity;
    }
    const scale = maxMagnitude / speed;
    return {
        x: velocity.x * scale,
        y: velocity.y * scale,
        z: velocity.z * scale,
    };
};

const clampMagnitude = (velocity: Vec2, maxMagnitude: number): Vec2 => {
    const speed = Math.hypot(velocity.x, velocity.y);
    if (speed <= maxMagnitude || speed <= 1e-8) {
        return velocity;
    }
    const scale = maxMagnitude / speed;
    return {
        x: velocity.x * scale,
        y: velocity.y * scale,
    };
};

const gaussianKernel = (distance: number, sigma: number) => {
    const safeSigma = Math.max(1e-4, sigma);
    const ratio = distance / safeSigma;
    return Math.exp(-0.5 * ratio * ratio);
};

const randomCentered = () => Math.random() * 2 - 1;

const defaultBlackVelocity = (index: number): Vec2 => {
    if (index === 0) return { x: MIN_HOLE_SPEED, y: 0 };
    if (index === 1) return { x: 0, y: MIN_HOLE_SPEED };
    if (index === 2) return { x: -MIN_HOLE_SPEED, y: MIN_HOLE_SPEED };
    const angle = index * 1.61803398875;
    return {
        x: Math.cos(angle) * MIN_HOLE_SPEED,
        y: Math.sin(angle) * MIN_HOLE_SPEED,
    };
};

const defaultBlackDepth = (index: number) => ({
    d: wrap01(0.15 + index * 0.17),
    vd: index < 3 ? [0.01, -0.012, 0.008][index] : 0,
});

const keepOutsideEventHorizons = (
    _kind: DragTargetKind,
    candidate: Vec2,
    _controls: SimulationControls
): Vec2 => {
    return {
        x: wrap01(candidate.x),
        y: wrap01(candidate.y),
    };
};

export default function LifeCanvas({
    setFps,
    setPups,
    setObjectiveMetrics,
    controls,
    onControlsChange,
    handleOpacity,
}: LifeCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const controlsRef = useRef<SimulationControls>(controls);
    const onControlsChangeRef = useRef(onControlsChange);
    const engineRef = useRef<LifeEngineHandle | null>(null);

    const dragTarget = useRef<DragTargetKind | null>(null);
    const holeVelocityRef = useRef<Map<string, Vec2>>(
        new Map([
            ['black-0', { x: MIN_HOLE_SPEED, y: 0 }],
            ['black-1', { x: 0, y: MIN_HOLE_SPEED }],
            ['black-2', { x: -MIN_HOLE_SPEED, y: MIN_HOLE_SPEED }],
            ['white', { x: -MIN_HOLE_SPEED, y: 0 }],
        ])
    );
    const holeDepthRef = useRef<Map<string, { d: number; vd: number }>>(
        new Map([
            ['black-0', { d: 0.15, vd: 0.01 }],
            ['black-1', { d: 0.65, vd: -0.012 }],
            ['black-2', { d: 0.35, vd: 0.008 }],
            ['white', { d: 0.85, vd: -0.009 }],
        ])
    );
    const holeCrowdingResidualRef = useRef<Map<string, Vec2>>(new Map());
    const dragSampleRef = useRef<{
        kind: DragTargetKind;
        x: number;
        y: number;
        t: number;
    } | null>(null);

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
        const searchParams = new URLSearchParams(window.location.search);
        const perfProbeEnabled =
            searchParams.get('perfProbe') === '1' ||
            window.localStorage.getItem('elife:perfProbe') === '1';
        const holeDynamicsEnabled = searchParams.get('holeDynamics') !== 'off';

        let offsetRaf = 0;
        let dynamicsRaf = 0;
        let lastDynamicsTime = performance.now();
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

        const applyDragPosition = (kind: DragTargetKind, e: MouseEvent) => {
            const rect = canvas.getBoundingClientRect();
            const currentControls = controlsRef.current;
            const candidate = toWorldFromScreen(e.clientX, e.clientY, rect, 14);
            const next = keepOutsideEventHorizons(kind, candidate, currentControls);

            const nowTime = performance.now();
            const prevSample = dragSampleRef.current;
            if (prevSample && prevSample.kind === kind) {
                const dt = Math.max(1e-4, (nowTime - prevSample.t) / 1000);
                const rawVelocity = {
                    x: wrapDelta01(prevSample.x, next.x) / dt,
                    y: wrapDelta01(prevSample.y, next.y) / dt,
                };
                holeVelocityRef.current.set(kind, clampMagnitude(rawVelocity, SPEED_OF_LIGHT));
            }
            dragSampleRef.current = { kind, x: next.x, y: next.y, t: nowTime };

            if (kind === 'white') {
                controlsRef.current = {
                    ...controlsRef.current,
                    whiteHoleX: next.x,
                    whiteHoleY: next.y,
                };
                onControlsChangeRef.current({ whiteHoleX: next.x, whiteHoleY: next.y });
            } else {
                const index = Number(kind.slice('black-'.length));
                const nextBlackHoles = controlsRef.current.blackHoles.map((hole, holeIndex) =>
                    holeIndex === index
                        ? { ...hole, x: next.x, y: next.y }
                        : hole
                );
                controlsRef.current = {
                    ...controlsRef.current,
                    blackHoles: nextBlackHoles,
                };
                onControlsChangeRef.current({ blackHoles: nextBlackHoles });
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
            dragSampleRef.current = null;
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

        const stepHoleDynamics = () => {
            const stepStart = performance.now();
            const now = performance.now();
            const dt = Math.min(0.05, Math.max(1 / 240, (now - lastDynamicsTime) / 1000));
            lastDynamicsTime = now;

            const current = controlsRef.current;
            if (!current.paused) {
                const draggedKind = dragTarget.current;
                const bodies: HoleBody[] = current.blackHoles.map((hole, index) => {
                    const id = `black-${index}`;
                    if (!holeVelocityRef.current.has(id)) {
                        holeVelocityRef.current.set(id, defaultBlackVelocity(index));
                    }
                    if (!holeDepthRef.current.has(id)) {
                        holeDepthRef.current.set(id, defaultBlackDepth(index));
                    }

                    const velocity = holeVelocityRef.current.get(id)!;
                    const depth = holeDepthRef.current.get(id)!;
                    return {
                        id,
                        kind: 'black',
                        x: hole.x,
                        y: hole.y,
                        z: depth.d,
                        vx: velocity.x,
                        vy: velocity.y,
                        vz: depth.vd,
                        mass: hole.enabled ? Math.max(0.05, hole.mass) : 0,
                        radius: hole.enabled ? Math.max(0.001, current.eventHorizonRadius) : 0,
                        dragged: draggedKind === id && hole.enabled,
                    };
                });

                if (!holeVelocityRef.current.has('white')) {
                    holeVelocityRef.current.set('white', { x: -MIN_HOLE_SPEED, y: 0 });
                }
                if (!holeDepthRef.current.has('white')) {
                    holeDepthRef.current.set('white', { d: 0.85, vd: -0.009 });
                }

                const whiteVelocity = holeVelocityRef.current.get('white')!;
                const whiteDepth = holeDepthRef.current.get('white')!;
                bodies.push({
                    id: 'white',
                    kind: 'white',
                    x: current.whiteHoleX,
                    y: current.whiteHoleY,
                    z: whiteDepth.d,
                    vx: whiteVelocity.x,
                    vy: whiteVelocity.y,
                    vz: whiteDepth.vd,
                    mass: current.whiteHoleEnabled ? Math.max(0.05, current.whiteHoleMass) : 0,
                    radius: current.whiteHoleEnabled
                        ? Math.max(0.001, Math.max(current.eventHorizonRadius, current.whiteHoleRadius))
                        : 0,
                    dragged: draggedKind === 'white' && current.whiteHoleEnabled,
                });

                const whiteIndex = bodies.length - 1;

                const acceleration = bodies.map(() => ({ x: 0, y: 0, z: 0 }));
                const soft = Math.max(0.005, current.gravitySoftening * 0.01);

                for (let i = 0; i < bodies.length; i += 1) {
                    if (bodies[i].dragged) {
                        continue;
                    }
                    for (let j = 0; j < bodies.length; j += 1) {
                        if (i === j) {
                            continue;
                        }
                        if (bodies[j].mass <= 0) {
                            continue;
                        }
                        const dx = wrapDelta01(bodies[i].x, bodies[j].x);
                        const dy = wrapDelta01(bodies[i].y, bodies[j].y);
                        const dz = wrapDelta01(bodies[i].z, bodies[j].z);
                        const r2 = dx * dx + dy * dy + dz * dz + soft * soft;
                        const r = Math.sqrt(r2);
                        const invR = 1 / Math.max(1e-6, r);
                        const gravAccel =
                            current.gravityStrength *
                            HOLE_GRAVITY_SCALE *
                            bodies[j].mass *
                            invR *
                            invR;
                        acceleration[i].x += dx * invR * gravAccel;
                        acceleration[i].y += dy * invR * gravAccel;
                        acceleration[i].z += dz * invR * gravAccel;
                    }
                }

                const white = bodies[whiteIndex];
                if (!white.dragged && current.whiteHoleEmission > 1e-5) {
                    const whiteSpeed = Math.hypot(white.vx, white.vy);
                    const dirX = whiteSpeed > 1e-6 ? white.vx / whiteSpeed : 1;
                    const dirY = whiteSpeed > 1e-6 ? white.vy / whiteSpeed : 0;
                    const recoilAccel =
                        (current.whiteHoleEmission * WHITE_REACTION_SCALE) / Math.max(0.05, white.mass);
                    acceleration[whiteIndex].x -= dirX * recoilAccel;
                    acceleration[whiteIndex].y -= dirY * recoilAccel;
                }

                const activeBlackIndices: number[] = [];
                for (let i = 0; i < whiteIndex; i += 1) {
                    if (bodies[i].mass > 0 && bodies[i].kind === 'black') {
                        activeBlackIndices.push(i);
                    }
                }

                // Remove last frame's transient crowding boost before recomputing this frame.
                for (const index of activeBlackIndices) {
                    const body = bodies[index];
                    const residual = holeCrowdingResidualRef.current.get(body.id);
                    if (!residual) {
                        continue;
                    }
                    body.vx -= residual.x;
                    body.vy -= residual.y;
                }
                holeCrowdingResidualRef.current = new Map();

                if (activeBlackIndices.length > 1) {
                    const preferredSpacing = Math.max(0.02, current.holePreferredSpacing);
                    const strongSigma = preferredSpacing * 0.55;
                    const weakCenter = preferredSpacing * 1.55;
                    const weakWidth = preferredSpacing * 0.9;

                    for (let aIndex = 0; aIndex < activeBlackIndices.length; aIndex += 1) {
                        for (let bIndex = aIndex + 1; bIndex < activeBlackIndices.length; bIndex += 1) {
                            const i = activeBlackIndices[aIndex];
                            const j = activeBlackIndices[bIndex];
                            const bodyA = bodies[i];
                            const bodyB = bodies[j];

                            const dx = wrapDelta01(bodyA.x, bodyB.x);
                            const dy = wrapDelta01(bodyA.y, bodyB.y);
                            const dz = wrapDelta01(bodyA.z, bodyB.z);
                            const dist = Math.max(1e-5, Math.hypot(dx, dy, dz));
                            const distXY = Math.max(1e-5, Math.hypot(dx, dy));
                            const invDist = 1 / dist;
                            const nx = dx * invDist;
                            const ny = dy * invDist;
                            const nz = dz * invDist;

                            const strongRepel =
                                current.holeSeparationForce * gaussianKernel(dist, strongSigma);
                            const weakBind =
                                current.holeWeakAttraction * gaussianKernel(dist - weakCenter, weakWidth);
                            const radialStrength = (weakBind - strongRepel) * ANTI_NUCLEUS_PAIR_SCALE;

                            acceleration[i].x += nx * radialStrength * bodyB.mass;
                            acceleration[i].y += ny * radialStrength * bodyB.mass;
                            acceleration[i].z += nz * radialStrength * bodyB.mass;
                            acceleration[j].x -= nx * radialStrength * bodyA.mass;
                            acceleration[j].y -= ny * radialStrength * bodyA.mass;
                            acceleration[j].z -= nz * radialStrength * bodyA.mass;

                            const depthBand = Math.max(0.06, preferredSpacing * 0.7);
                            const depthCloseness = Math.max(0, 1 - Math.abs(dz) / depthBand);
                            const depthPush = current.holeDepthSeparation * depthCloseness * 0.09;
                            const depthSign = dz >= 0 ? 1 : -1;

                            acceleration[i].z += depthSign * depthPush;
                            acceleration[j].z -= depthSign * depthPush;

                            const tx = -dy / distXY;
                            const ty = dx / distXY;
                            const orbitSign = (aIndex + bIndex) % 2 === 0 ? 1 : -1;
                            const orbitStrength =
                                current.holeOrbitCoupling * (0.04 + 0.18 * strongRepel + 0.1 * weakBind);

                            acceleration[i].x += tx * orbitStrength * orbitSign;
                            acceleration[i].y += ty * orbitStrength * orbitSign;
                            acceleration[j].x -= tx * orbitStrength * orbitSign;
                            acceleration[j].y -= ty * orbitStrength * orbitSign;

                            // Direct crowding repulsion: whenever holes are close, push them apart
                            // based on the crowding momentum slider.
                            if (current.holeCrowdingMomentum > 1e-5) {
                                const crowdRepelRadius = preferredSpacing * 1.6;
                                const crowdRepelStrength = current.holeCrowdingMomentum * 5.2;
                                if (distXY < crowdRepelRadius) {
                                    const proxFactor = 1 - distXY / crowdRepelRadius;
                                    const repelForceXY = crowdRepelStrength * proxFactor * proxFactor;
                                    acceleration[i].x += nx * repelForceXY;
                                    acceleration[i].y += ny * repelForceXY;
                                    acceleration[j].x -= nx * repelForceXY;
                                    acceleration[j].y -= ny * repelForceXY;
                                }
                            }
                        }
                    }

                    for (const index of activeBlackIndices) {
                        if (bodies[index].dragged) {
                            continue;
                        }
                        const body = bodies[index];
                        const massScale = 1 / Math.sqrt(Math.max(0.05, body.mass));
                        const brownianStrength = current.holeBrownianStrength * 0.16 * massScale;

                        acceleration[index].x += randomCentered() * brownianStrength;
                        acceleration[index].y += randomCentered() * brownianStrength;
                        acceleration[index].z += randomCentered() * brownianStrength * 0.6;

                        const burstChancePerSecond = 0.1 + current.holeRearrangeBurst * 0.85;
                        if (Math.random() < burstChancePerSecond * dt) {
                            const bx = randomCentered();
                            const by = randomCentered();
                            const bz = randomCentered() * 0.55;
                            const bLen = Math.max(1e-5, Math.hypot(bx, by, bz));
                            const burstScale =
                                (0.24 + current.holeRearrangeBurst * 0.75) * massScale;

                            acceleration[index].x += (bx / bLen) * burstScale;
                            acceleration[index].y += (by / bLen) * burstScale;
                            acceleration[index].z += (bz / bLen) * burstScale;
                        }
                    }

                    if (current.holeCrowdingMomentum > 1e-5) {
                        // Simple direct crowding: detect local mass concentration and push outward.
                        const crowdRadius = preferredSpacing * 1.8;
                        const crowdRadiusSq = crowdRadius * crowdRadius;

                        for (const index of activeBlackIndices) {
                            const body = bodies[index];
                            if (body.dragged) {
                                continue;
                            }

                            // Find center of nearby mass.
                            let nearbyX = 0, nearbyY = 0, nearbyMass = 0;
                            let neighborCount = 0;

                            for (const otherIndex of activeBlackIndices) {
                                if (otherIndex === index) {
                                    continue;
                                }
                                const other = bodies[otherIndex];
                                if (other.mass <= 0) {
                                    continue;
                                }
                                const dx = wrapDelta01(body.x, other.x);
                                const dy = wrapDelta01(body.y, other.y);
                                const distSq = dx * dx + dy * dy;
                                if (distSq > crowdRadiusSq) {
                                    continue;
                                }
                                neighborCount += 1;
                                nearbyMass += other.mass;
                                nearbyX += other.x * other.mass;
                                nearbyY += other.y * other.mass;
                            }

                            if (neighborCount < 2 || nearbyMass < 0.5) {
                                continue;
                            }

                            // Normalize to get center of nearby mass.
                            nearbyX /= nearbyMass;
                            nearbyY /= nearbyMass;

                            // Vector away from nearby center.
                            let awayX = wrapDelta01(nearbyX, body.x);
                            let awayY = wrapDelta01(nearbyY, body.y);
                            const awayDist = Math.hypot(awayX, awayY);

                            if (awayDist > 1e-6) {
                                awayX /= awayDist;
                                awayY /= awayDist;
                            } else {
                                awayX = randomCentered();
                                awayY = randomCentered();
                                const len = Math.hypot(awayX, awayY);
                                if (len > 1e-6) {
                                    awayX /= len;
                                    awayY /= len;
                                }
                            }

                            // Push outward from the crowd, scaled by momentum and neighbor count.
                            const crowdStrength =
                                current.holeCrowdingMomentum *
                                (2.5 + neighborCount * 0.8) *
                                0.15;

                            acceleration[index].x += awayX * crowdStrength;
                            acceleration[index].y += awayY * crowdStrength;
                        }
                    }
                }

                const damping = Math.pow(Math.min(0.9999, Math.max(0.97, current.driftDamping)), dt * 60 * 0.12);
                for (let i = 0; i < bodies.length; i += 1) {
                    if (bodies[i].dragged) {
                        continue;
                    }
                    if (bodies[i].mass <= 0) {
                        continue;
                    }
                    bodies[i].vx += acceleration[i].x * dt;
                    bodies[i].vy += acceleration[i].y * dt;
                    bodies[i].vz += acceleration[i].z * dt;
                    bodies[i].vx *= damping;
                    bodies[i].vy *= damping;
                    bodies[i].vz *= damping;
                    const limited = clampMagnitude3(
                        { x: bodies[i].vx, y: bodies[i].vy, z: bodies[i].vz },
                        SPEED_OF_LIGHT
                    );
                    bodies[i].vx = limited.x;
                    bodies[i].vy = limited.y;
                    bodies[i].vz = limited.z;
                    bodies[i].x += bodies[i].vx * dt;
                    bodies[i].y += bodies[i].vy * dt;
                    bodies[i].z += bodies[i].vz * dt;
                }

                if (activeBlackIndices.length > 0 && current.holeEnergyFloor > 1e-4) {
                    let kineticEnergy = 0;
                    for (const index of activeBlackIndices) {
                        if (bodies[index].dragged) {
                            continue;
                        }
                        const body = bodies[index];
                        kineticEnergy +=
                            0.5 *
                            body.mass *
                            (body.vx * body.vx + body.vy * body.vy + body.vz * body.vz);
                    }

                    const targetEnergy = current.holeEnergyFloor * activeBlackIndices.length * 0.012;
                    if (kineticEnergy < targetEnergy) {
                        const energyScale = Math.min(
                            1.18,
                            Math.sqrt(targetEnergy / Math.max(1e-6, kineticEnergy))
                        );
                        for (const index of activeBlackIndices) {
                            if (bodies[index].dragged) {
                                continue;
                            }
                            const body = bodies[index];
                            const speed = Math.hypot(body.vx, body.vy, body.vz);
                            if (speed < 1e-4) {
                                const push = 0.03 * energyScale;
                                body.vx += randomCentered() * push;
                                body.vy += randomCentered() * push;
                                body.vz += randomCentered() * push * 0.5;
                            } else {
                                body.vx *= energyScale;
                                body.vy *= energyScale;
                                body.vz *= energyScale;
                            }
                        }
                    }
                }

                for (const body of bodies) {
                    if (body.dragged) {
                        continue;
                    }
                    if (body.mass <= 0) {
                        continue;
                    }
                    body.x = wrap01(body.x);
                    body.y = wrap01(body.y);
                    body.z = wrap01(body.z);

                    const normalized = clampMagnitude3(
                        { x: body.vx, y: body.vy, z: body.vz },
                        SPEED_OF_LIGHT
                    );
                    body.vx = normalized.x;
                    body.vy = normalized.y;
                    body.vz = normalized.z;
                }

                const spinDelta = new Map<string, number>();

                for (let pass = 0; pass < 3; pass += 1) {
                    for (let i = 0; i < bodies.length; i += 1) {
                        for (let j = i + 1; j < bodies.length; j += 1) {
                            const a = bodies[i];
                            const b = bodies[j];
                            const minDist = a.radius + b.radius;
                            if (minDist <= 0) {
                                continue;
                            }
                            const dx = wrapDelta01(a.x, b.x);
                            const dy = wrapDelta01(a.y, b.y);
                            const dz = wrapDelta01(a.z, b.z);
                            const dist = Math.hypot(dx, dy, dz);
                            if (dist >= minDist) {
                                continue;
                            }

                            const inv = dist > 1e-6 ? 1 / dist : 0;
                            const nx = dist > 1e-6 ? dx * inv : 0.7071068;
                            const ny = dist > 1e-6 ? dy * inv : 0.7071068;
                            const nz = dist > 1e-6 ? dz * inv : 0.0;
                            const overlap = minDist - dist;

                            if (a.dragged && !b.dragged) {
                                b.x = wrap01(b.x + nx * overlap);
                                b.y = wrap01(b.y + ny * overlap);
                                b.z = wrap01(b.z + nz * overlap);
                            } else if (!a.dragged && b.dragged) {
                                a.x = wrap01(a.x - nx * overlap);
                                a.y = wrap01(a.y - ny * overlap);
                                a.z = wrap01(a.z - nz * overlap);
                            } else if (!a.dragged && !b.dragged) {
                                const totalMass = Math.max(1e-6, a.mass + b.mass);
                                const moveA = overlap * (b.mass / totalMass);
                                const moveB = overlap * (a.mass / totalMass);
                                a.x = wrap01(a.x - nx * moveA);
                                a.y = wrap01(a.y - ny * moveA);
                                a.z = wrap01(a.z - nz * moveA);
                                b.x = wrap01(b.x + nx * moveB);
                                b.y = wrap01(b.y + ny * moveB);
                                b.z = wrap01(b.z + nz * moveB);
                            }

                            const rvx = b.vx - a.vx;
                            const rvy = b.vy - a.vy;
                            const rvz = b.vz - a.vz;
                            const inwardVelocity = rvx * nx + rvy * ny + rvz * nz;
                            if (inwardVelocity < 0) {
                                const tx = -ny;
                                const ty = nx;
                                const relTangential = rvx * tx + rvy * ty;
                                const spinKick = Math.min(0.3, Math.abs(inwardVelocity) * SPIN_TRANSFER_SCALE);

                                if (!a.dragged) {
                                    const aNormal = a.vx * nx + a.vy * ny + a.vz * nz;
                                    a.vx -= nx * aNormal;
                                    a.vy -= ny * aNormal;
                                    a.vz -= nz * aNormal;
                                }
                                if (!b.dragged) {
                                    const bNormal = b.vx * nx + b.vy * ny + b.vz * nz;
                                    b.vx -= nx * bNormal;
                                    b.vy -= ny * bNormal;
                                    b.vz -= nz * bNormal;
                                }

                                const spinSign = relTangential >= 0 ? 1 : -1;
                                if (a.kind === 'black') {
                                    spinDelta.set(a.id, (spinDelta.get(a.id) ?? 0) + spinKick * spinSign);
                                }
                                if (b.kind === 'black') {
                                    spinDelta.set(b.id, (spinDelta.get(b.id) ?? 0) - spinKick * spinSign);
                                }
                            }
                        }
                    }
                }

                for (const body of bodies) {
                    body.x = wrap01(body.x);
                    body.y = wrap01(body.y);
                    body.z = wrap01(body.z);
                    if (!body.dragged) {
                        if (body.mass <= 0) {
                            continue;
                        }
                        const bounded = clampMagnitude3(
                            { x: body.vx, y: body.vy, z: body.vz },
                            SPEED_OF_LIGHT
                        );
                        body.vx = bounded.x;
                        body.vy = bounded.y;
                        body.vz = bounded.z;
                    }
                }

                for (const body of bodies) {
                    holeVelocityRef.current.set(body.id, { x: body.vx, y: body.vy });
                    holeDepthRef.current.set(body.id, { d: body.z, vd: body.vz });
                }

                const nextBlackHoles = current.blackHoles.map((hole, index) => {
                    const id = `black-${index}`;
                    const body = bodies[index];
                    return {
                        ...hole,
                        x: body ? body.x : hole.x,
                        y: body ? body.y : hole.y,
                        spin: Math.max(-1, Math.min(1, hole.spin + (spinDelta.get(id) ?? 0))),
                    };
                });

                const whiteBody = bodies[whiteIndex];

                const partial: Partial<SimulationControls> = {
                    blackHoles: nextBlackHoles,
                    whiteHoleX: whiteBody.x,
                    whiteHoleY: whiteBody.y,
                };

                controlsRef.current = {
                    ...controlsRef.current,
                    ...partial,
                };
                onControlsChangeRef.current(partial);
            }

            if (perfProbeEnabled) {
                const stepDurationMs = performance.now() - stepStart;
                if (stepDurationMs >= 6) {
                    console.warn(
                        `[perf-probe] holeDynamics step ${stepDurationMs.toFixed(2)}ms`
                    );
                }
            }

            dynamicsRaf = requestAnimationFrame(stepHoleDynamics);
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

        const handleSetHoleDynamicsState = (event: Event) => {
            const customEvent = event as CustomEvent<SetHoleDynamicsDetail>;
            const detail = customEvent.detail;
            const kinds: PresetKind[] = ['black', 'black2', 'black3', 'white'];
            const presetToId: Record<PresetKind, string> = {
                black: 'black-0',
                black2: 'black-1',
                black3: 'black-2',
                white: 'white',
            };

            for (const kind of kinds) {
                const targetId = presetToId[kind];
                const nextVelocity = detail?.velocities?.[kind];
                if (nextVelocity) {
                    holeVelocityRef.current.set(targetId, clampMagnitude(nextVelocity, SPEED_OF_LIGHT));
                }

                const nextDepth = detail?.depths?.[kind];
                if (nextDepth) {
                    holeDepthRef.current.set(targetId, {
                        d: wrap01(nextDepth.d),
                        vd: Math.max(-SPEED_OF_LIGHT, Math.min(SPEED_OF_LIGHT, nextDepth.vd)),
                    });
                }
            }

            dragSampleRef.current = null;
            holeCrowdingResidualRef.current = new Map();
        };

        const isTextInputTarget = (target: EventTarget | null) => {
            const element = target as HTMLElement | null;
            if (!element) {
                return false;
            }

            const tag = element.tagName;
            return (
                element.isContentEditable ||
                tag === 'INPUT' ||
                tag === 'TEXTAREA' ||
                tag === 'SELECT' ||
                tag === 'BUTTON'
            );
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.code !== 'Space' || event.repeat) {
                return;
            }
            if (isTextInputTarget(event.target)) {
                return;
            }

            event.preventDefault();
            const nextPaused = !controlsRef.current.paused;
            controlsRef.current = {
                ...controlsRef.current,
                paused: nextPaused,
            };
            onControlsChangeRef.current({ paused: nextPaused });
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        window.addEventListener('resize', handleResize);
        canvas.addEventListener('wheel', handleWheel, { passive: false });
        window.addEventListener('resetZoom', handleResetZoom);
        window.addEventListener('resetSimulation', handleResetSimulation);
        window.addEventListener('captureReproBundle', handleCaptureReproBundle);
        window.addEventListener('loadReproBundle', handleLoadReproBundle);
        window.addEventListener('setHoleDynamicsState', handleSetHoleDynamicsState);
        window.addEventListener('keydown', handleKeyDown);
        if (holeDynamicsEnabled) {
            dynamicsRaf = requestAnimationFrame(stepHoleDynamics);
        }

        const updateOffset = () => {
            offsetRef.current = { x: 0, y: 0 };
            offsetRaf = requestAnimationFrame(updateOffset);
        };
        updateOffset();

        return () => {
            disposed = true;
            cancelAnimationFrame(offsetRaf);
            cancelAnimationFrame(dynamicsRaf);
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
            window.removeEventListener('setHoleDynamicsState', handleSetHoleDynamicsState);
            window.removeEventListener('keydown', handleKeyDown);
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
            {controls.blackHoles.map((hole, index) => {
                const palette = [
                    {
                        border: '2px solid rgba(255,255,255,0.9)',
                        background: 'rgba(255,255,255,0.2)',
                    },
                    {
                        border: '2px solid rgba(255,215,130,0.95)',
                        background: 'rgba(255,215,130,0.25)',
                    },
                    {
                        border: '2px solid rgba(200,150,255,0.95)',
                        background: 'rgba(200,150,255,0.25)',
                    },
                    {
                        border: '2px solid rgba(255,145,145,0.95)',
                        background: 'rgba(255,145,145,0.25)',
                    },
                    {
                        border: '2px solid rgba(145,255,185,0.95)',
                        background: 'rgba(145,255,185,0.25)',
                    },
                    {
                        border: '2px solid rgba(255,190,120,0.95)',
                        background: 'rgba(255,190,120,0.25)',
                    },
                ];
                const styleToken = palette[index % palette.length];
                return (
                    <button
                        key={`drag-black-hole-${index}`}
                        type="button"
                        aria-label={`Drag Black Hole ${index + 1}`}
                        title={`Black Hole ${index + 1}`}
                        onMouseDown={(e) => {
                            e.preventDefault();
                            const targetKind: DragTargetKind = `black-${index}`;
                            dragTarget.current = targetKind;
                            const rect = canvasRef.current?.getBoundingClientRect();
                            if (!rect) return;
                            const next = keepOutsideEventHorizons(
                                targetKind,
                                toWorldFromScreen(e.clientX, e.clientY, rect, 14),
                                controlsRef.current
                            );
                            dragSampleRef.current = {
                                kind: targetKind,
                                x: next.x,
                                y: next.y,
                                t: performance.now(),
                            };
                            const nextBlackHoles = controlsRef.current.blackHoles.map((item, itemIndex) =>
                                itemIndex === index ? { ...item, x: next.x, y: next.y } : item
                            );
                            controlsRef.current = {
                                ...controlsRef.current,
                                blackHoles: nextBlackHoles,
                            };
                            onControlsChangeRef.current({ blackHoles: nextBlackHoles });
                        }}
                        style={{
                            position: 'absolute',
                            left: `${hole.x * 100}%`,
                            top: `${(1 - hole.y) * 100}%`,
                            transform: 'translate(-50%, -50%)',
                            width: 28,
                            height: 28,
                            borderRadius: '9999px',
                            border: styleToken.border,
                            background: styleToken.background,
                            cursor: 'grab',
                            zIndex: 40,
                            opacity: handleOpacity,
                            pointerEvents: hole.enabled ? 'auto' : 'none',
                            display: hole.enabled ? 'block' : 'none',
                        }}
                    />
                );
            })}
            <button
                type="button"
                aria-label="Drag White Hole"
                title="White Hole"
                onMouseDown={(e) => {
                    e.preventDefault();
                    dragTarget.current = 'white';
                    const rect = canvasRef.current?.getBoundingClientRect();
                    if (!rect) return;
                    const next = keepOutsideEventHorizons(
                        'white',
                        toWorldFromScreen(e.clientX, e.clientY, rect, 14),
                        controlsRef.current
                    );
                    dragSampleRef.current = {
                        kind: 'white',
                        x: next.x,
                        y: next.y,
                        t: performance.now(),
                    };
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
                    pointerEvents: controls.whiteHoleEnabled ? 'auto' : 'none',
                    display: controls.whiteHoleEnabled ? 'block' : 'none',
                }}
            />
        </div>
    );
}
