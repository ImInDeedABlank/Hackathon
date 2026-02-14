"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

function createStarField(count: number) {
  const points = new Float32Array(count * 3);

  for (let index = 0; index < count; index += 1) {
    const i = index * 3;
    points[i] = (Math.random() - 0.5) * 16;
    points[i + 1] = (Math.random() - 0.5) * 16;
    points[i + 2] = (Math.random() - 0.5) * 16;
  }

  return points;
}

export default function WebGLHeroScene() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fallbackRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const parent = canvas.parentElement;
    if (!parent) {
      return;
    }

    const showFallback = () => {
      canvas.style.display = "none";
      if (fallbackRef.current) {
        fallbackRef.current.style.display = "flex";
      }
    };

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const contextAttributes: WebGLContextAttributes = {
      alpha: true,
      antialias: true,
      powerPreference: "default",
    };
    const webgl2 = canvas.getContext("webgl2", contextAttributes) as WebGL2RenderingContext | null;
    const webgl = canvas.getContext("webgl", contextAttributes) as WebGLRenderingContext | null;
    const experimental = canvas.getContext("experimental-webgl", contextAttributes) as WebGLRenderingContext | null;
    const gl: WebGL2RenderingContext | WebGLRenderingContext | null = webgl2 ?? webgl ?? experimental;
    if (!gl) {
      showFallback();
      return;
    }

    let renderer: THREE.WebGLRenderer | null = null;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        context: gl,
        antialias: true,
        alpha: true,
      });
    } catch {
      showFallback();
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(44, 1, 0.1, 100);
    camera.position.set(0, 0, 4.8);

    const coreGeometry = new THREE.TorusKnotGeometry(1.1, 0.3, 220, 32);
    const coreMaterial = new THREE.MeshStandardMaterial({
      color: "#4f79ff",
      roughness: 0.26,
      metalness: 0.5,
      emissive: "#10265a",
      emissiveIntensity: 0.35,
    });
    const coreMesh = new THREE.Mesh(coreGeometry, coreMaterial);

    const haloGeometry = new THREE.IcosahedronGeometry(1.9, 1);
    const haloMaterial = new THREE.MeshBasicMaterial({
      color: "#81b9ff",
      wireframe: true,
      transparent: true,
      opacity: 0.33,
    });
    const haloMesh = new THREE.Mesh(haloGeometry, haloMaterial);

    const modelGroup = new THREE.Group();
    modelGroup.add(coreMesh);
    modelGroup.add(haloMesh);
    scene.add(modelGroup);

    const starsGeometry = new THREE.BufferGeometry();
    starsGeometry.setAttribute("position", new THREE.BufferAttribute(createStarField(1200), 3));
    const starsMaterial = new THREE.PointsMaterial({
      color: "#7cc8ff",
      size: 0.02,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.72,
    });
    const stars = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(stars);

    const ambientLight = new THREE.AmbientLight("#eef4ff", 0.55);
    const keyLight = new THREE.DirectionalLight("#ffffff", 0.88);
    keyLight.position.set(3, 2, 4);
    const rimLight = new THREE.PointLight("#84d2ff", 1.1, 10);
    rimLight.position.set(-2.4, -1.1, 2.4);

    scene.add(ambientLight, keyLight, rimLight);

    let targetX = 0;
    let targetY = 0;
    const handlePointerMove = (event: PointerEvent) => {
      const bounds = parent.getBoundingClientRect();
      const x = (event.clientX - bounds.left) / bounds.width;
      const y = (event.clientY - bounds.top) / bounds.height;
      targetX = (x - 0.5) * 2;
      targetY = (y - 0.5) * 2;
    };

    let frameId = 0;
    const clock = new THREE.Clock();

    const renderFrame = () => {
      const width = parent.clientWidth;
      const height = parent.clientHeight;

      if (width > 0 && height > 0) {
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      }

      const elapsed = clock.getElapsedTime();
      if (!prefersReducedMotion) {
        coreMesh.rotation.x = elapsed * 0.26;
        coreMesh.rotation.y = elapsed * 0.34;
        haloMesh.rotation.x = elapsed * 0.1;
        haloMesh.rotation.y = -elapsed * 0.14;
        stars.rotation.y = elapsed * 0.03;
        modelGroup.position.y = Math.sin(elapsed * 0.95) * 0.09;
      }

      camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetX * 0.38, 0.06);
      camera.position.y = THREE.MathUtils.lerp(camera.position.y, -targetY * 0.3, 0.06);
      camera.lookAt(0, 0, 0);

      try {
        renderer.render(scene, camera);
      } catch {
        window.cancelAnimationFrame(frameId);
        showFallback();
        return;
      }
      frameId = window.requestAnimationFrame(renderFrame);
    };

    frameId = window.requestAnimationFrame(renderFrame);
    parent.addEventListener("pointermove", handlePointerMove);

    return () => {
      window.cancelAnimationFrame(frameId);
      parent.removeEventListener("pointermove", handlePointerMove);

      coreGeometry.dispose();
      haloGeometry.dispose();
      starsGeometry.dispose();
      coreMaterial.dispose();
      haloMaterial.dispose();
      starsMaterial.dispose();
      renderer?.dispose();
      renderer?.forceContextLoss();
    };
  }, []);

  return (
    <div className="relative aspect-square w-full max-w-[540px] overflow-hidden rounded-[2rem] border border-white/70 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.85),rgba(255,255,255,0.35)_45%,rgba(173,220,255,0.24)_100%)] shadow-[0_35px_80px_-38px_rgba(28,64,138,0.7)] backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(130deg,rgba(16,34,78,0.08),transparent_35%,rgba(67,143,255,0.2))]" />
      <canvas ref={canvasRef} className="h-full w-full" aria-hidden="true" />
      <div
        ref={fallbackRef}
        className="absolute inset-0 hidden items-center justify-center bg-[radial-gradient(circle_at_50%_40%,rgba(111,189,255,0.35),rgba(255,255,255,0.06)_55%,transparent_70%)]"
      >
        <div className="rounded-2xl border border-white/60 bg-white/65 px-4 py-2 text-xs font-semibold tracking-wide text-slate-700 shadow-sm backdrop-blur">
          Interactive preview unavailable on this device
        </div>
      </div>
      <div className="pointer-events-none absolute bottom-4 left-4 rounded-full border border-white/70 bg-white/70 px-3 py-1 text-xs font-medium tracking-wide text-slate-700 backdrop-blur">
        Interactive learning space
      </div>
    </div>
  );
}
