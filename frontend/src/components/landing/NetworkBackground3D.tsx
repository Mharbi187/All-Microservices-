// ============================================================
// NetworkBackground3D — Three.js interactive 3D background
// World map network with nodes, data flows, and hubs
// ============================================================

import { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';

// Simple world map outline coordinates (simplified for performance)
const WORLD_POINTS: [number, number][] = [
    // Africa outline
    [-0.1, 0.35], [0.0, 0.38], [0.05, 0.35], [0.1, 0.3],
    [0.15, 0.25], [0.2, 0.15], [0.25, 0.05], [0.2, -0.05],
    [0.15, -0.2], [0.1, -0.3], [0.05, -0.28], [-0.05, -0.2],
    [-0.1, -0.1], [-0.15, 0.0], [-0.15, 0.15], [-0.1, 0.25],
    // Europe outline
    [-0.1, 0.45], [0.0, 0.5], [0.1, 0.52], [0.15, 0.48],
    [0.2, 0.5], [0.25, 0.52], [0.3, 0.48],
    // Asia outline
    [0.35, 0.5], [0.45, 0.48], [0.55, 0.45], [0.6, 0.4],
    [0.65, 0.35], [0.7, 0.3], [0.6, 0.2], [0.55, 0.15],
    [0.5, 0.1], [0.45, 0.05], [0.4, 0.1], [0.35, 0.15],
    // Americas
    [-0.55, 0.5], [-0.5, 0.45], [-0.45, 0.4], [-0.4, 0.35],
    [-0.38, 0.25], [-0.35, 0.15], [-0.33, 0.1], [-0.3, 0.05],
    [-0.28, -0.05], [-0.3, -0.15], [-0.33, -0.25], [-0.35, -0.35],
    [-0.38, -0.4], [-0.4, -0.3], [-0.42, -0.2],
    // Additional scatter
    [-0.6, 0.3], [-0.55, 0.2], [-0.65, 0.45], [0.75, 0.25],
    [0.5, -0.05], [0.55, -0.1], [0.6, -0.15], [0.65, -0.2],
];

interface NodeData {
    pos: THREE.Vector3;
    connections: number[];
    isHub: boolean;
}

const NetworkBackground3D: React.FC = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const mouseRef = useRef({ x: 0, y: 0 });
    const scrollRef = useRef(0);
    const frameRef = useRef(0);
    const particlesRef = useRef<{ mesh: THREE.Mesh; t: number; speed: number; lineIdx: number }[]>([]);
    const waveRingsRef = useRef<THREE.Mesh[]>([]);

    const initScene = useCallback(() => {
        if (!containerRef.current) return;
        const w = window.innerWidth;
        const h = window.innerHeight;

        // Scene
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xf0f0f0);
        sceneRef.current = scene;

        // Camera
        const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
        camera.position.set(0, 0, 5);
        cameraRef.current = camera;

        // Renderer
        const renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
        });
        renderer.setSize(w, h);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        containerRef.current.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        // Ambient light
        scene.add(new THREE.AmbientLight(0xffffff, 0.6));
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.4);
        dirLight.position.set(2, 3, 5);
        scene.add(dirLight);

        // --- World Map Dots ---
        const mapGroup = new THREE.Group();
        const dotGeo = new THREE.SphereGeometry(0.012, 6, 6);
        const dotMat = new THREE.MeshBasicMaterial({ color: 0xcccccc, transparent: true, opacity: 0.35 });

        WORLD_POINTS.forEach(([x, y]) => {
            const dot = new THREE.Mesh(dotGeo, dotMat);
            dot.position.set(x * 5, y * 3, -0.5);
            mapGroup.add(dot);
        });

        // Create grid of faint dots for world map feel
        for (let gx = -3; gx <= 3; gx += 0.3) {
            for (let gy = -2; gy <= 2; gy += 0.3) {
                if (Math.random() > 0.4) {
                    const fdot = new THREE.Mesh(dotGeo, dotMat.clone());
                    (fdot.material as THREE.MeshBasicMaterial).opacity = 0.08 + Math.random() * 0.1;
                    fdot.position.set(gx, gy, -0.6);
                    mapGroup.add(fdot);
                }
            }
        }
        scene.add(mapGroup);

        // --- Network Nodes ---
        const nodes: NodeData[] = [];
        const nodeGroup = new THREE.Group();
        const cubeGeo = new THREE.BoxGeometry(0.06, 0.06, 0.06);
        const cubeMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.7 });
        const hubGeo = new THREE.BoxGeometry(0.14, 0.14, 0.14);
        const hubMat = new THREE.MeshStandardMaterial({
            color: 0xe60000,
            emissive: 0xe60000,
            emissiveIntensity: 0.8,
            roughness: 0.3,
        });

        // Hub positions
        const hubPositions = [
            new THREE.Vector3(0.2, -0.8, 0),
            new THREE.Vector3(1.8, 1.0, 0),
        ];

        // Generate random node positions
        const nodePositions: THREE.Vector3[] = [];
        for (let i = 0; i < 40; i++) {
            nodePositions.push(new THREE.Vector3(
                (Math.random() - 0.5) * 5,
                (Math.random() - 0.5) * 3.5,
                (Math.random() - 0.5) * 0.8,
            ));
        }

        // Add hubs
        hubPositions.forEach((pos) => {
            const hub = new THREE.Mesh(hubGeo, hubMat);
            hub.position.copy(pos);
            nodeGroup.add(hub);

            // Hub glow
            const glowGeo = new THREE.SphereGeometry(0.3, 16, 16);
            const glowMat = new THREE.MeshBasicMaterial({
                color: 0xe60000,
                transparent: true,
                opacity: 0.12,
            });
            const glow = new THREE.Mesh(glowGeo, glowMat);
            glow.position.copy(pos);
            nodeGroup.add(glow);

            nodes.push({ pos: pos.clone(), connections: [], isHub: true });
        });

        // Add regular nodes
        nodePositions.forEach((pos) => {
            const cube = new THREE.Mesh(cubeGeo, cubeMat);
            cube.position.copy(pos);
            cube.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
            nodeGroup.add(cube);
            nodes.push({ pos: pos.clone(), connections: [], isHub: false });
        });

        scene.add(nodeGroup);

        // --- Connection Lines ---
        const lineMat = new THREE.LineBasicMaterial({
            color: 0x999999,
            transparent: true,
            opacity: 0.2,
        });

        const linePositions: THREE.Vector3[][] = [];

        // Connect nodes that are close enough
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const dist = nodes[i].pos.distanceTo(nodes[j].pos);
                const threshold = (nodes[i].isHub || nodes[j].isHub) ? 2.5 : 1.2;
                if (dist < threshold) {
                    nodes[i].connections.push(j);
                    nodes[j].connections.push(i);

                    const points = [nodes[i].pos.clone(), nodes[j].pos.clone()];
                    const geo = new THREE.BufferGeometry().setFromPoints(points);
                    const line = new THREE.Line(geo, lineMat);
                    scene.add(line);
                    linePositions.push(points);
                }
            }
        }

        // --- Data Flow Particles ---
        const particleGeo = new THREE.SphereGeometry(0.025, 8, 8);
        const particleMat = new THREE.MeshBasicMaterial({
            color: 0xe60000,
            transparent: true,
            opacity: 0.9,
        });

        const particles: typeof particlesRef.current = [];
        const numParticles = Math.min(linePositions.length, 25);
        for (let i = 0; i < numParticles; i++) {
            const lineIdx = Math.floor(Math.random() * linePositions.length);
            const p = new THREE.Mesh(particleGeo, particleMat.clone());
            scene.add(p);
            particles.push({
                mesh: p,
                t: Math.random(),
                speed: 0.002 + Math.random() * 0.004,
                lineIdx,
            });
        }
        particlesRef.current = particles;

        // --- Concentric Wave Rings ---
        const waves: THREE.Mesh[] = [];
        hubPositions.forEach((hubPos) => {
            for (let r = 0; r < 3; r++) {
                const ringGeo = new THREE.RingGeometry(0.3 + r * 0.4, 0.32 + r * 0.4, 64);
                const ringMat = new THREE.MeshBasicMaterial({
                    color: 0xe60000,
                    transparent: true,
                    opacity: 0.15,
                    side: THREE.DoubleSide,
                });
                const ring = new THREE.Mesh(ringGeo, ringMat);
                ring.position.copy(hubPos);
                ring.position.z = -0.1;
                scene.add(ring);
                waves.push(ring);
            }
        });
        waveRingsRef.current = waves;

        // --- Animation Loop ---
        const animate = () => {
            frameRef.current = requestAnimationFrame(animate);

            // Mouse follow rotation
            const targetRotX = mouseRef.current.y * 0.08;
            const targetRotY = mouseRef.current.x * 0.08;
            scene.rotation.x += (targetRotX - scene.rotation.x) * 0.03;
            scene.rotation.y += (targetRotY - scene.rotation.y) * 0.03;

            // Scroll parallax
            const scrollY = scrollRef.current * 0.0004;
            camera.position.y = -scrollY;

            // Animate data flow particles
            particles.forEach((p) => {
                p.t += p.speed;
                if (p.t > 1) {
                    p.t = 0;
                    p.lineIdx = Math.floor(Math.random() * linePositions.length);
                }
                const line = linePositions[p.lineIdx];
                if (line) {
                    p.mesh.position.lerpVectors(line[0], line[1], p.t);
                }
                // Pulsing glow
                const mat = p.mesh.material as THREE.MeshBasicMaterial;
                mat.opacity = 0.5 + Math.sin(Date.now() * 0.005 + p.t * Math.PI) * 0.4;
            });

            // Animate waves
            const time = Date.now() * 0.001;
            waves.forEach((wave, i) => {
                const phase = (time + i * 0.8) % 3;
                const scale = 0.5 + phase * 1.2;
                wave.scale.set(scale, scale, 1);
                const mat = wave.material as THREE.MeshBasicMaterial;
                mat.opacity = Math.max(0, 0.2 - phase * 0.08);
            });

            renderer.render(scene, camera);
        };
        animate();
    }, []);

    useEffect(() => {
        initScene();

        const handleResize = () => {
            if (!rendererRef.current || !cameraRef.current) return;
            const w = window.innerWidth;
            const h = window.innerHeight;
            cameraRef.current.aspect = w / h;
            cameraRef.current.updateProjectionMatrix();
            rendererRef.current.setSize(w, h);
        };

        const handleMouseMove = (e: MouseEvent) => {
            mouseRef.current.x = (e.clientX / window.innerWidth) * 2 - 1;
            mouseRef.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
        };

        const handleScroll = () => {
            scrollRef.current = window.scrollY;
        };

        window.addEventListener('resize', handleResize);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('scroll', handleScroll);

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('scroll', handleScroll);
            if (frameRef.current) cancelAnimationFrame(frameRef.current);
            if (rendererRef.current && containerRef.current) {
                containerRef.current.removeChild(rendererRef.current.domElement);
                rendererRef.current.dispose();
            }
        };
    }, [initScene]);

    return (
        <div
            ref={containerRef}
            className="network-bg-canvas interactive"
            aria-hidden="true"
        />
    );
};

export default NetworkBackground3D;
