import { useEffect, useRef, useCallback } from "react";
import type { CSSProperties } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { createJewelleryEnvironment } from "../lib/studio-env";
import { finishMaps, applyTriplanar } from "../lib/finishes";
import {
  METAL_APPEARANCE,
  METAL_DENSITY,
  type MetalType,
} from "../lib/ring-spec";
import type { GemCut } from "../lib/cad-engine";
import { createBrilliantGeometry } from "../lib/brilliant-geometry";

export type HeroRevolutionSpec = {
  metalType: MetalType;
  gemShape: GemCut;
  gemSize: number; // carats (e.g. 1.0, 1.5, 2.0, 2.5)
  ringSize: number; // US size (e.g. 5.0, 6.0, 6.5, 7.0, 8.0)
  bandWidth: number; // mm (e.g. 2.0, 2.4, 2.8)
  prongCount: number; // 4 or 6
  displayMode: "solid" | "wireframe" | "section";
};

export type HeroMetrics = {
  volumeCm3: number;
  weightGrams: number;
  carat: number;
  diameterMm: number;
  isWatertight: boolean;
};

type Props = {
  spec: HeroRevolutionSpec;
  onMetricsChange?: (metrics: HeroMetrics) => void;
  className?: string;
  style?: CSSProperties;
};

// Aspect ratio mapping for fancy diamond cuts
const GEM_ASPECT_RATIOS: Record<GemCut, number> = {
  round: 1.0,
  oval: 1.36,
  marquise: 1.82,
  emerald: 1.34,
  princess: 1.0,
  cushion: 1.08,
  pear: 1.48,
};

export function HeroRevolutionVisual({
  spec,
  onMetricsChange,
  className,
  style,
}: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const specRef = useRef<HeroRevolutionSpec>(spec);
  specRef.current = spec;

  const onMetricsChangeRef = useRef(onMetricsChange);
  onMetricsChangeRef.current = onMetricsChange;

  // Scene state handles
  const updateMaterialRef = useRef<(() => void) | null>(null);
  const rebuildGeometryRef = useRef<(() => void) | null>(null);
  const updateDisplayModeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const coarse = window.matchMedia("(pointer: coarse)").matches;
    let width = mount.clientWidth || 1;
    let height = mount.clientHeight || 1;

    // ----------------------------------------------------------- renderer --
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
      preserveDrawingBuffer: false,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.28;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.localClippingEnabled = true;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 200);
    camera.position.set(0, 3.2, 17.5);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.75;
    controls.maxPolarAngle = Math.PI / 2 + 0.32;
    controls.minDistance = 9;
    controls.maxDistance = 28;
    controls.target.set(0, 1.1, 0);

    // Environment Lighting
    const envScene = createJewelleryEnvironment();

    // Studio front fill panel to reflect cleanly in polished face-on metal
    const frontFill = new THREE.Mesh(
      new THREE.PlaneGeometry(64, 46),
      new THREE.MeshBasicMaterial({ color: 0xfff8fa, side: THREE.DoubleSide })
    );
    (frontFill.material as THREE.MeshBasicMaterial).color.multiplyScalar(1.6);
    frontFill.position.set(-2, 3, 28);
    envScene.add(frontFill);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTexture = pmrem.fromScene(envScene, 0.02).texture;
    envScene.traverse((o: any) => {
      o.geometry?.dispose?.();
      o.material?.map?.dispose?.();
      o.material?.dispose?.();
    });
    scene.environment = envTexture;

    // Radial backdrop
    const backdropCanvas = document.createElement("canvas");
    backdropCanvas.width = 4;
    backdropCanvas.height = 512;
    {
      const g = backdropCanvas.getContext("2d")!;
      const grad = g.createLinearGradient(0, 0, 0, 512);
      grad.addColorStop(0, "#251222");
      grad.addColorStop(0.38, "#180a15");
      grad.addColorStop(0.72, "#0f050d");
      grad.addColorStop(1, "#080106");
      g.fillStyle = grad;
      g.fillRect(0, 0, 4, 512);
    }
    const backdropTex = new THREE.CanvasTexture(backdropCanvas);
    backdropTex.colorSpace = THREE.SRGBColorSpace;
    const backdrop = new THREE.Mesh(
      new THREE.SphereGeometry(120, 32, 24),
      new THREE.MeshBasicMaterial({
        map: backdropTex,
        side: THREE.BackSide,
        depthWrite: false,
      })
    );
    backdrop.renderOrder = -1;
    scene.add(backdrop);

    // Subtle Key light
    const key = new THREE.DirectionalLight(0xffffff, 1.6);
    key.position.set(7, 10, 8);
    scene.add(key);

    const key2 = new THREE.DirectionalLight(0xfff5ea, 0.8);
    key2.position.set(-6, -4, -6);
    scene.add(key2);

    // Section Clipping Plane (cuts X axis cleanly)
    const clipPlane = new THREE.Plane(new THREE.Vector3(1, 0, 0), 0);

    // --------------------------------------------------------- materials --
    const polish = finishMaps("polished");

    const metalMat = new THREE.MeshPhysicalMaterial({
      color: METAL_APPEARANCE[specRef.current.metalType].color,
      metalness: 1,
      roughness: METAL_APPEARANCE[specRef.current.metalType].roughness,
      normalMap: polish.normalMap,
      roughnessMap: polish.roughnessMap,
      envMapIntensity: 2.7,
      side: THREE.DoubleSide,
    });
    metalMat.normalScale.set(polish.normalScale, polish.normalScale);

    const wireframeMat = new THREE.MeshBasicMaterial({
      color: 0x93c5fd,
      wireframe: true,
      transparent: true,
      opacity: 0.85,
    });

    // Diamond: Refractive with high dispersion
    const gemMat = coarse
      ? new THREE.MeshPhysicalMaterial({
          color: 0xffffff,
          metalness: 0,
          roughness: 0.01,
          reflectivity: 1,
          specularIntensity: 1,
          envMapIntensity: 3.2,
          side: THREE.DoubleSide,
        })
      : new THREE.MeshPhysicalMaterial({
          color: 0xffffff,
          metalness: 0,
          roughness: 0,
          transmission: 1.0,
          thickness: 1.6,
          attenuationDistance: 45,
          ior: 2.417,
          dispersion: 3.2,
          specularIntensity: 1.2,
          envMapIntensity: 3.4,
          side: THREE.DoubleSide,
        });

    // ---------------------------------------------------------- geometry --
    const ringGroup = new THREE.Group();
    scene.add(ringGroup);

    // Floor shadow
    const shadowCanvas = document.createElement("canvas");
    shadowCanvas.width = shadowCanvas.height = 256;
    const sctx = shadowCanvas.getContext("2d")!;
    const grad = sctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    grad.addColorStop(0, "rgba(0,0,0,0.58)");
    grad.addColorStop(0.42, "rgba(0,0,0,0.24)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    sctx.fillStyle = grad;
    sctx.fillRect(0, 0, 256, 256);
    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    const shadowMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 12),
      new THREE.MeshBasicMaterial({
        map: shadowTex,
        transparent: true,
        opacity: 0.88,
        depthWrite: false,
      })
    );
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = -2.9;
    scene.add(shadowMesh);

    // Geometry handles
    let currentShankGeom: THREE.BufferGeometry | null = null;
    let currentGemGeom: THREE.BufferGeometry | null = null;
    let currentProngGeoms: THREE.BufferGeometry[] = [];

    let shankMesh: THREE.Mesh | null = null;
    let gemMesh: THREE.Mesh | null = null;
    const prongMeshes: THREE.Mesh[] = [];

    // Helper to calculate exact physics/specs
    const computeAndEmitMetrics = (
      rScene: number,
      tubeScene: number,
      girdleScene: number,
      ratio: number,
      mmPerUnit: number
    ) => {
      const currentSpec = specRef.current;
      const innerRadiusMm = rScene * mmPerUnit;
      const tubeRadiusMm = tubeScene * mmPerUnit;
      const majorRadiusMm = innerRadiusMm + tubeRadiusMm;

      // Torus volume = 2 * pi^2 * R * r^2
      const torusVolMm3 =
        2 * Math.PI * Math.PI * majorRadiusMm * Math.pow(tubeRadiusMm, 2);
      // Prongs and head estimate
      const prongsVolMm3 = currentSpec.prongCount * (Math.PI * 0.45 * 0.45 * 4.5);
      const totalVolMm3 = torusVolMm3 * 0.92 + prongsVolMm3; // account for bore cut
      const volumeCm3 = totalVolMm3 / 1000;

      const density = METAL_DENSITY[currentSpec.metalType] || 21.45;
      const weightGrams = volumeCm3 * density;
      const diameterMm = girdleScene * 2 * mmPerUnit;

      onMetricsChangeRef.current?.({
        volumeCm3: Number(volumeCm3.toFixed(2)),
        weightGrams: Number(weightGrams.toFixed(2)),
        carat: currentSpec.gemSize,
        diameterMm: Number(diameterMm.toFixed(1)),
        isWatertight: true,
      });
    };

    // Rebuild geometry when shape, carat, ring size or prong count changes
    const rebuildGeometry = () => {
      const currentSpec = specRef.current;

      // Clean existing meshes
      if (shankMesh) {
        ringGroup.remove(shankMesh);
        currentShankGeom?.dispose();
      }
      if (gemMesh) {
        ringGroup.remove(gemMesh);
        currentGemGeom?.dispose();
      }
      for (const p of prongMeshes) {
        ringGroup.remove(p);
      }
      prongMeshes.length = 0;
      for (const g of currentProngGeoms) {
        g.dispose();
      }
      currentProngGeoms.length = 0;

      // Scene unit scaling: Size 6.5 inner radius is 8.45mm
      const baseInnerRadiusMm = 8.45 + (currentSpec.ringSize - 6.5) * 0.41;
      const R = 2.45 * (baseInnerRadiusMm / 8.45);
      const MM_PER_UNIT = baseInnerRadiusMm / R;

      // Band width in scene units
      const tubeRadius = (currentSpec.bandWidth / 2) / MM_PER_UNIT;

      // Torus shank (comfort fit proportion)
      const shankGeom = new THREE.TorusGeometry(R, tubeRadius, 36, 140);
      currentShankGeom = shankGeom;

      applyTriplanar(metalMat, MM_PER_UNIT / polish.tileMm);

      const activeMetalMat =
        currentSpec.displayMode === "wireframe" ? wireframeMat : metalMat;
      shankMesh = new THREE.Mesh(shankGeom, activeMetalMat);
      ringGroup.add(shankMesh);

      // Girdle radius from carat weight (GIA 1.0ct ~ 6.5mm diameter)
      const targetDiaMm = 6.5 * Math.pow(currentSpec.gemSize, 1 / 3);
      const GIRDLE = (targetDiaMm / 2) / MM_PER_UNIT;
      const aspect = GEM_ASPECT_RATIOS[currentSpec.gemShape] || 1.0;

      const gemGeom = createBrilliantGeometry({
        girdleRadius: GIRDLE,
        lengthToWidth: aspect,
      });
      currentGemGeom = gemGeom;

      const pavilionDepth = GIRDLE * 0.86;
      const GEM_Y = R + tubeRadius + pavilionDepth + 0.12;

      gemMesh = new THREE.Mesh(gemGeom, gemMat);
      gemMesh.position.y = GEM_Y;
      ringGroup.add(gemMesh);

      // Prongs
      const prongLength = GEM_Y - R - 0.08;
      const prongRadius = Math.max(0.08, GIRDLE * 0.095);
      const prongsCount = currentSpec.prongCount;

      for (let i = 0; i < prongsCount; i++) {
        const angle =
          (i / prongsCount) * Math.PI * 2 +
          (prongsCount === 4 ? Math.PI / 4 : 0);
        const px = Math.cos(angle) * GIRDLE * 0.94;
        const pz = Math.sin(angle) * GIRDLE * 0.94 * aspect;

        const pGeom = new THREE.CapsuleGeometry(
          prongRadius,
          prongLength,
          6,
          10
        );
        currentProngGeoms.push(pGeom);

        const pMesh = new THREE.Mesh(pGeom, activeMetalMat);
        pMesh.position.set(px, (GEM_Y + R + tubeRadius) / 2, pz);
        pMesh.rotation.z = -Math.cos(angle) * 0.18;
        pMesh.rotation.x = Math.sin(angle) * 0.18;

        ringGroup.add(pMesh);
        prongMeshes.push(pMesh);
      }

      shadowMesh.position.y = -R - tubeRadius - 0.25;

      computeAndEmitMetrics(R, tubeRadius, GIRDLE, aspect, MM_PER_UNIT);
    };

    rebuildGeometryRef.current = rebuildGeometry;

    // Update material properties dynamically without re-creating geometry
    const updateMaterial = () => {
      const currentSpec = specRef.current;
      const appearance = METAL_APPEARANCE[currentSpec.metalType];
      metalMat.color.set(appearance.color);
      metalMat.roughness = Math.min(
        1,
        polish.roughness + (appearance.roughness - 0.16) * 0.5
      );
      metalMat.needsUpdate = true;

      // Recalculate metrics for new metal density
      if (rebuildGeometryRef.current) {
        rebuildGeometryRef.current();
      }
    };
    updateMaterialRef.current = updateMaterial;

    // Update display modes (Solid, Wireframe, Section)
    const updateDisplayMode = () => {
      const mode = specRef.current.displayMode;

      if (mode === "section") {
        renderer.clippingPlanes = [clipPlane];
      } else {
        renderer.clippingPlanes = [];
      }

      const activeMetalMat = mode === "wireframe" ? wireframeMat : metalMat;
      if (shankMesh) shankMesh.material = activeMetalMat;
      for (const p of prongMeshes) p.material = activeMetalMat;

      if (mode === "wireframe") {
        gemMat.wireframe = true;
      } else {
        gemMat.wireframe = false;
      }
      gemMat.needsUpdate = true;
      metalMat.needsUpdate = true;
    };
    updateDisplayModeRef.current = updateDisplayMode;

    // Initial build
    rebuildGeometry();
    updateDisplayMode();

    // ----------------------------------------------------------- loop --
    let raf = 0;
    let running = true;

    const render = () => {
      controls.update();
      renderer.render(scene, camera);
    };

    const tick = () => {
      if (!running) return;
      raf = requestAnimationFrame(tick);
      render();
    };

    raf = requestAnimationFrame(tick);

    // Pause when tab is hidden or element is scrolled offscreen
    const io = new IntersectionObserver(([e]) => {
      running = e.isIntersecting;
      if (running && !raf) tick();
    });
    io.observe(mount);

    const onVisibility = () => {
      running = !document.hidden;
      if (running && !raf) tick();
    };
    document.addEventListener("visibilitychange", onVisibility);

    // Resize
    const ro = new ResizeObserver(() => {
      if (!mount.clientWidth || !mount.clientHeight) return;
      width = mount.clientWidth;
      height = mount.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    });
    ro.observe(mount);

    // Cleanup
    return () => {
      running = false;
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);

      currentShankGeom?.dispose();
      currentGemGeom?.dispose();
      for (const g of currentProngGeoms) g.dispose();
      shadowMesh.geometry.dispose();
      (shadowMesh.material as THREE.Material).dispose();
      shadowTex.dispose();

      backdrop.geometry.dispose();
      (backdrop.material as THREE.Material).dispose();
      backdropTex.dispose();

      metalMat.dispose();
      wireframeMat.dispose();
      gemMat.dispose();
      envTexture.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.forceContextLoss();

      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Reactive updates triggered by props
  useEffect(() => {
    updateMaterialRef.current?.();
  }, [spec.metalType]);

  useEffect(() => {
    rebuildGeometryRef.current?.();
  }, [
    spec.gemShape,
    spec.gemSize,
    spec.ringSize,
    spec.bandWidth,
    spec.prongCount,
  ]);

  useEffect(() => {
    updateDisplayModeRef.current?.();
  }, [spec.displayMode]);

  return (
    <div
      ref={mountRef}
      className={className}
      style={{
        touchAction: "none",
        ...style,
      }}
      aria-label="Interactive 3D Jewelry Studio Viewport"
    />
  );
}

export default HeroRevolutionVisual;
