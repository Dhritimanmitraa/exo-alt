import React, { useEffect, useMemo, useState, Suspense, useCallback, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF, Html, useProgress } from '@react-three/drei';
import { BackSide } from 'three';
import type { Planet } from '../lib/filters';
import { loadModelManifest, getModelUrl, slugFromPlanetName } from '../lib/modelManifest';
import type { CameraState, UserPresence } from '../lib/realtime/types';
import { useRealtime } from '../lib/realtime/RealtimeContext';
import CameraGhost from './multiplayer/CameraGhost';

type Planet3DViewerProps = {
  planet: Planet;
  onClose: () => void;
  peers?: UserPresence[];
  onCameraUpdate?: (camera: CameraState) => void;
};

// Slug generation now centralized in modelManifest.ts

function mapTemperatureToColor(temp?: number | null): string {
  if (temp == null) return '#8888aa';
  if (temp < 200) return '#6bb6ff'; // icy blue
  if (temp < 400) return '#8aa85b'; // temperate greenish
  if (temp < 800) return '#d9853b'; // hot orange
  return '#c32626'; // molten red
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function useEscapeToClose(onClose: () => void) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);
}

function Loader() {
  const { progress } = useProgress();
  return (
    <Html center>
      <div className="text-white text-sm">Loading... {progress.toFixed(0)}%</div>
    </Html>
  );
}

function GLBModel({ url, scale = 1 }: { url: string; scale?: number }) {
  const gltf = useGLTF(url) as any;
  return <primitive object={gltf.scene} scale={scale} />;
}

function Atmosphere({ radius }: { radius: number }) {
  // Simple fresnel-like atmosphere using onBeforeCompile
  return (
    <mesh>
      <sphereGeometry args={[radius * 1.03, 64, 64]} />
      <meshBasicMaterial
        color={0x66aaff}
        transparent
        opacity={0.2}
        side={BackSide}
        onBeforeCompile={(shader: any) => {
          shader.uniforms.fresnelPower = { value: 2.0 };
          shader.uniforms.fresnelIntensity = { value: 0.6 };
          shader.vertexShader = shader.vertexShader
            .replace(
              '#include <common>',
              `#include <common>\n varying vec3 vNormalW; varying vec3 vWorldPosition;`
            )
            .replace(
              '#include <worldpos_vertex>',
              `#include <worldpos_vertex>\n vNormalW = normalize(normalMatrix * normal); vWorldPosition = worldPosition.xyz;`
            );
          shader.fragmentShader = shader.fragmentShader
            .replace(
              '#include <common>',
              `#include <common>\n varying vec3 vNormalW; varying vec3 vWorldPosition; uniform float fresnelPower; uniform float fresnelIntensity;`
            )
            .replace(
              '#include <fog_fragment>',
              `float fresnel = pow(1.0 - abs(dot(normalize(vNormalW), normalize(vWorldPosition))), fresnelPower);\n gl_FragColor.a *= (0.1 + fresnel * fresnelIntensity);\n #include <fog_fragment>`
            );
        }}
      />
    </mesh>
  );
}

function ProceduralPlanet({ planet }: { planet: Planet }) {
  const radius = clamp(planet.pl_rade ?? 1, 0.5, 4.0);
  const color = mapTemperatureToColor(planet.pl_eqt);
  const showAtmosphere = (planet.pl_rade ?? 0) < 4 && (planet.pl_eqt ?? 0) < 1000;
  return (
    <group>
      <mesh castShadow receiveShadow>
        <sphereGeometry args={[radius, 64, 64]} />
        <meshStandardMaterial color={color} roughness={0.9} metalness={0.05} />
      </mesh>
      {showAtmosphere && <Atmosphere radius={radius} />}
    </group>
  );
}

export default function Planet3DViewer({ planet, onClose, onCameraUpdate }: Planet3DViewerProps) {
  useEscapeToClose(onClose);
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [manifestReady, setManifestReady] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const previouslyFocusedRef = useRef<Element | null>(null);
  const realtime = (() => { try { return useRealtime(); } catch { return null; } })();

  const slug = useMemo(() => slugFromPlanetName(planet.pl_name || ''), [planet.pl_name]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await loadModelManifest();
        if (!mounted) return;
        const url = getModelUrl(slug);
        setModelUrl(url || null);
        setManifestReady(true);
      } catch (err) {
        if (!mounted) return;
        console.warn(`[Planet3DViewer] Manifest load failed for slug "${slug}"`, err);
        setManifestReady(true);
        setModelUrl(null);
      }
    })();
    return () => { mounted = false; };
  }, [slug]);

  useEffect(() => {
    previouslyFocusedRef.current = document.activeElement;
    closeButtonRef.current?.focus();
    return () => {
      const prev = previouslyFocusedRef.current as HTMLElement | null;
      prev?.focus?.();
    };
  }, []);

  const initialCameraZ = useMemo(() => {
    const r = clamp(planet.pl_rade ?? 1, 0.5, 4.0);
    return r * 3.2;
  }, [planet.pl_rade]);

  const stopPropagation = useCallback((e: React.MouseEvent) => e.stopPropagation(), []);

  const handleCameraChange = useCallback((controls: any) => {
    const c: CameraState = {
      position: [controls.object.position.x, controls.object.position.y, controls.object.position.z],
      target: [controls.target.x, controls.target.y, controls.target.z],
      zoom: controls.object.zoom ?? 1,
      timestamp: Date.now(),
    };
    if (onCameraUpdate) onCameraUpdate(c);
    if (realtime) realtime.updateCamera(planet.pl_name, c);
  }, [onCameraUpdate, realtime, planet.pl_name]);

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center"
      style={{ zIndex: 2100 }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`3D view of ${planet.pl_name}`}
    >
      <div className="relative w-full h-full" onClick={stopPropagation}>
        <button
          onClick={onClose}
          ref={closeButtonRef}
          className="absolute top-4 right-4 z-10 bg-white/10 hover:bg-white/20 text-white rounded-md px-3 py-2"
          aria-label="Close 3D viewer"
        >
          ✕
        </button>
        <Canvas
          shadows
          camera={{ position: [0, 0, initialCameraZ], fov: 45 }}
        >
          <color attach="background" args={[0x000000]} />
          <ambientLight intensity={0.4} />
          <directionalLight position={[5, 5, 5]} intensity={1.2} castShadow />
          <directionalLight position={[-5, -3, -5]} intensity={0.3} />
          {!manifestReady ? (
            <Loader />
          ) : modelUrl ? (
            <Suspense fallback={<Loader />}>
              <GLBModel url={modelUrl} scale={1} />
            </Suspense>
          ) : (
            <ProceduralPlanet planet={planet} />
          )}
          <OrbitControls
            enablePan={false}
            enableDamping
            dampingFactor={0.08}
            minDistance={1.5}
            maxDistance={20}
            onChange={(e) => handleCameraChange(e.target)}
          />

          {/* Camera ghosts for peers viewing same planet */}
          {realtime && realtime.camerasInPlanet.get(planet.pl_name as any) && (
            <group>
              {Array.from(realtime.camerasInPlanet.get(planet.pl_name as any)!.entries()).map(([uid, cam]) => {
                const user = realtime.peers.find(p => String(p.id) === String(uid));
                if (!user) return null;
                return <CameraGhost key={String(uid)} user={user} camera={cam} />;
              })}
            </group>
          )}
        </Canvas>
      </div>
    </div>
  );
}

useGLTF.preload?.('/models/example.glb');


