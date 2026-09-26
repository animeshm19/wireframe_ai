import { useEffect, useRef } from "react";
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
import {
  gemOutline,
  gemDims,
  radiusAtAngle,
  girdleRadiusFor,
} from "../lib/cad-engine";
import {
  createAccurateGemGeometry,
  getProngAnglesForCut,
} from "../lib/gem-geometries";

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

  const updateMaterialRef = useRef<(() => void) | null>(null);
  const rebuildGeometryRef = useRef<(() => void) | null>(null);
  const updateDisplayModeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let width = mount.clientWidth || 1;
    let height = mount.clientHeight || 1;

    // ----------------------------------------------------------- renderer --
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.10;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.localClippingEnabled = true;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(34, width / height, 0.1, 200);
    camera.position.set(0, 3.2, 17.5);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.autoRotate = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    controls.autoRotateSpeed = 0.7;
    controls.maxPolarAngle = Math.PI / 2 + 0.35;
    controls.minDistance = 9;
    controls.maxDistance = 30;
    controls.target.set(0, 1.2, 0);

    // Lighting: a diffusion tent with a softbox and side cards, as for jewellery photography.
    const envScene = createJewelleryEnvironment();

    const frontFill = new THREE.Mesh(
      new THREE.PlaneGeometry(58, 42),
      new THREE.MeshBasicMaterial({ color: 0xfff6fa, side: THREE.DoubleSide })
    );
    (frontFill.material as THREE.MeshBasicMaterial).color.multiplyScalar(1.5);
    frontFill.position.set(-3, 3, 26);
    envScene.add(frontFill);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTexture = pmrem.fromScene(envScene, 0.02).texture;
    envScene.traverse((o: any) => {
      o.geometry?.dispose?.();
      o.material?.map?.dispose?.();
      o.material?.dispose?.();
    });
    scene.environment = envTexture;

    // ------------------------------------------------------------- Backdrop --
    const backdropCanvas = document.createElement("canvas");
    backdropCanvas.width = 4;
    backdropCanvas.height = 512;
    {
      const g = backdropCanvas.getContext("2d")!;
      const grad = g.createLinearGradient(0, 0, 0, 512);
      grad.addColorStop(0, "#221c26");
      grad.addColorStop(0.38, "#140f18");
      grad.addColorStop(0.72, "#0b070e");
      grad.addColorStop(1, "#050307");
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

    // --------------------------------------------------------- Scene Lights --
    const key = new THREE.DirectionalLight(0xffffff, 1.5);
    key.position.set(6, 10, 8);
    scene.add(key);

    const rim = new THREE.DirectionalLight(0xfff5ea, 0.7);
    rim.position.set(-6, -4, -6);
    scene.add(rim);

    // Section Clipping Plane (cuts X axis cleanly)
    const clipPlane = new THREE.Plane(new THREE.Vector3(1, 0, 0), 0);

    // --------------------------------------------------------- Materials --
    const polish = finishMaps("polished");

    const appearance = METAL_APPEARANCE[specRef.current.metalType];
    const metalMat = new THREE.MeshPhysicalMaterial({
      color: appearance.color,
      metalness: 1,
      roughness: Math.min(1, polish.roughness + (appearance.roughness - 0.16) * 0.5),
      normalMap: polish.normalMap,
      roughnessMap: polish.roughnessMap,
      envMapIntensity: 2.2,
      side: THREE.DoubleSide,
    });
    metalMat.normalScale.set(polish.normalScale, polish.normalScale);

    const wireframeMat = new THREE.MeshBasicMaterial({
      color: 0x93c5fd,
      wireframe: true,
      transparent: true,
      opacity: 0.85,
    });

    const gemMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0,
      roughness: 0,
      transmission: 1.0,
      thickness: 1.5,
      attenuationDistance: 45,
      attenuationColor: new THREE.Color(0xffffff),
      ior: 2.417,
      dispersion: 2.4,
      specularIntensity: 1.0,
      envMapIntensity: 2.5,
      side: THREE.DoubleSide,
    });

    // ---------------------------------------------------------- Geometry --
    const ringGroup = new THREE.Group();
    scene.add(ringGroup);

    // Floor shadow
    const shadowCanvas = document.createElement("canvas");
    shadowCanvas.width = shadowCanvas.height = 256;
    const sctx = shadowCanvas.getContext("2d")!;
    const grad = sctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    grad.addColorStop(0, "rgba(0,0,0,0.60)");
    grad.addColorStop(0.42, "rgba(0,0,0,0.25)");
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

    // Dynamic mesh references
    let currentShankGeom: THREE.BufferGeometry | null = null;
    let currentGemGeom: THREE.BufferGeometry | null = null;
    const currentMetalGeoms: THREE.BufferGeometry[] = [];

    let shankMesh: THREE.Mesh | null = null;
    let gemMesh: THREE.Mesh | null = null;
    const metalHeadMeshes: THREE.Mesh[] = [];

    const computeAndEmitMetrics = (
      rScene: number,
      tubeScene: number,
      girdleR_mm: number,
      mmPerUnit: number
    ) => {
      const currentSpec = specRef.current;
      const innerRadiusMm = rScene * mmPerUnit;
      const tubeRadiusMm = tubeScene * mmPerUnit;
      const majorRadiusMm = innerRadiusMm + tubeRadiusMm;

      // Torus volume
      const torusVolMm3 =
        2 * Math.PI * Math.PI * majorRadiusMm * Math.pow(tubeRadiusMm, 2);
      // Prongs, gallery, base collar
      const headVolMm3 = currentSpec.prongCount * 12 + 25;
      const totalVolMm3 = torusVolMm3 * 0.93 + headVolMm3;
      const volumeCm3 = totalVolMm3 / 1000;

      const density = METAL_DENSITY[currentSpec.metalType] || 21.45;
      const weightGrams = volumeCm3 * density;
      const diameterMm = girdleR_mm * 2;

      onMetricsChangeRef.current?.({
        volumeCm3: Number(volumeCm3.toFixed(2)),
        weightGrams: Number(weightGrams.toFixed(2)),
        carat: currentSpec.gemSize,
        diameterMm: Number(diameterMm.toFixed(1)),
        isWatertight: true,
      });
    };

    // Shank, stone, collar, gallery rail and prongs, all touching so the preview reads as one piece.
    const rebuildGeometry = () => {
      const currentSpec = specRef.current;

      // Dispose existing geometries
      if (shankMesh) {
        ringGroup.remove(shankMesh);
        currentShankGeom?.dispose();
        shankMesh = null;
      }
      if (gemMesh) {
        ringGroup.remove(gemMesh);
        currentGemGeom?.dispose();
        gemMesh = null;
      }
      for (const m of metalHeadMeshes) {
        ringGroup.remove(m);
      }
      metalHeadMeshes.length = 0;
      for (const g of currentMetalGeoms) {
        g.dispose();
      }
      currentMetalGeoms.length = 0;

      const activeMetalMat =
        currentSpec.displayMode === "wireframe" ? wireframeMat : metalMat;

      // Shank
      // Size 6.5 inner radius = 8.45 mm
      const baseInnerRadiusMm = 8.45 + (currentSpec.ringSize - 6.5) * 0.41;
      const R = 2.45 * (baseInnerRadiusMm / 8.45);
      const MM_PER_UNIT = baseInnerRadiusMm / R;

      const bandWidthMm = currentSpec.bandWidth;
      const tubeRadius = (bandWidthMm / 2) / MM_PER_UNIT;

      // Comfort-fit dome torus
      const shankGeom = new THREE.TorusGeometry(R, tubeRadius, 40, 160);
      currentShankGeom = shankGeom;

      applyTriplanar(metalMat, MM_PER_UNIT / polish.tileMm);

      shankMesh = new THREE.Mesh(shankGeom, activeMetalMat);
      ringGroup.add(shankMesh);

      // Stone
      const girdleR_mm = girdleRadiusFor(currentSpec.gemShape, currentSpec.gemSize);
      const GIRDLE = girdleR_mm / MM_PER_UNIT;

      const gemGeom = createAccurateGemGeometry(currentSpec.gemShape, GIRDLE);
      currentGemGeom = gemGeom;

      const { pavH: pavH_mm, girdleH: girdleH_mm, crownH: crownH_mm } = gemDims(girdleR_mm);
      const pavH = pavH_mm / MM_PER_UNIT;
      const girdleH = girdleH_mm / MM_PER_UNIT;
      const crownH = crownH_mm / MM_PER_UNIT;

      // The crest (top apex) of the ring band
      const crestY = R + tubeRadius;

      // Base collar thickness and placement:
      // The base collar is embedded 0.08 units into the shank crest so they form one solid piece.
      const baseDonutY = crestY - 0.08;
      const baseDonutRadius = Math.max(0.45, GIRDLE * 0.38);
      const baseDonutTube = 0.09;

      // Culet sits just inside the opening of the base collar
      const culetY = baseDonutY + 0.06;
      const girdleBottomY = culetY + pavH;
      const girdleTopY = girdleBottomY + girdleH;

      // Position diamond so its culet sits at culetY
      gemMesh = new THREE.Mesh(gemGeom, gemMat);
      gemMesh.position.set(0, culetY, 0);
      ringGroup.add(gemMesh);

      // Collar under the head, sitting on the shank; the prongs root in it.
      const baseCollarGeom = new THREE.TorusGeometry(
        baseDonutRadius,
        baseDonutTube,
        16,
        48
      );
      baseCollarGeom.rotateX(Math.PI / 2); // Lay horizontal
      currentMetalGeoms.push(baseCollarGeom);

      const baseCollarMesh = new THREE.Mesh(baseCollarGeom, activeMetalMat);
      baseCollarMesh.position.set(0, baseDonutY, 0);
      ringGroup.add(baseCollarMesh);
      metalHeadMeshes.push(baseCollarMesh);

      // Solid bridge block beneath the collar to fill any clearance down to the band bore
      const bridgeGeom = new THREE.CylinderGeometry(
        baseDonutRadius * 0.85,
        baseDonutRadius * 0.95,
        tubeRadius * 0.8,
        32
      );
      currentMetalGeoms.push(bridgeGeom);
      const bridgeMesh = new THREE.Mesh(bridgeGeom, activeMetalMat);
      bridgeMesh.position.set(0, baseDonutY - tubeRadius * 0.38, 0);
      ringGroup.add(bridgeMesh);
      metalHeadMeshes.push(bridgeMesh);

      // Gallery rail at about 55% of the pavilion height.
      const galleryY = culetY + pavH * 0.55;
      const galleryScale = 0.65; // scale relative to girdle
      const galleryTubeR = 0.065;

      const o = gemOutline(currentSpec.gemShape, 64);
      // Build a closed 3D spline along the stone silhouette at gallery height
      const galleryCurvePts: THREE.Vector3[] = o.map(([px, py]) => {
        return new THREE.Vector3(
          px * GIRDLE * galleryScale,
          galleryY,
          py * GIRDLE * galleryScale
        );
      });
      const gallerySpline = new THREE.CatmullRomCurve3(galleryCurvePts, true);
      const galleryRailGeom = new THREE.TubeGeometry(gallerySpline, 64, galleryTubeR, 8, true);
      currentMetalGeoms.push(galleryRailGeom);

      const galleryRailMesh = new THREE.Mesh(galleryRailGeom, activeMetalMat);
      ringGroup.add(galleryRailMesh);
      metalHeadMeshes.push(galleryRailMesh);

      // Prongs
      const prongAngles = getProngAnglesForCut(currentSpec.gemShape, currentSpec.prongCount);
      const prongWireRadius = Math.max(0.08, GIRDLE * 0.085);

      for (const angle of prongAngles) {
        // Find exact distance from center to stone edge in this direction
        const edgeR = radiusAtAngle(o, angle) * GIRDLE;

        const cosA = Math.cos(angle);
        const sinA = Math.sin(angle);

        // Point 1: Base Anchor on the Donut Collar
        const p1 = new THREE.Vector3(
          cosA * (baseDonutRadius * 0.95),
          baseDonutY,
          sinA * (baseDonutRadius * 0.95)
        );

        // Point 2: Mid-shank support passing through Gallery Rail
        const p2 = new THREE.Vector3(
          cosA * (edgeR * galleryScale * 1.02),
          galleryY,
          sinA * (edgeR * galleryScale * 1.02)
        );

        // Point 3: Stone Girdle Seat Notch (firmly touching the diamond girdle)
        const p3 = new THREE.Vector3(
          cosA * (edgeR * 1.01),
          girdleBottomY + girdleH * 0.5,
          sinA * (edgeR * 1.01)
        );

        // Point 4: claw tip, curving over the crown
        const clawReachInward = 0.88; // curls inward over crown
        const p4 = new THREE.Vector3(
          cosA * (edgeR * clawReachInward),
          girdleTopY + crownH * 0.35,
          sinA * (edgeR * clawReachInward)
        );

        const prongCurve = new THREE.CatmullRomCurve3([p1, p2, p3, p4]);
        const prongGeom = new THREE.TubeGeometry(prongCurve, 24, prongWireRadius, 10, false);
        currentMetalGeoms.push(prongGeom);

        const prongMesh = new THREE.Mesh(prongGeom, activeMetalMat);
        ringGroup.add(prongMesh);
        metalHeadMeshes.push(prongMesh);

        // Rounded spherical claw cap at the tip
        const capGeom = new THREE.SphereGeometry(prongWireRadius * 1.05, 12, 12);
        currentMetalGeoms.push(capGeom);
        const capMesh = new THREE.Mesh(capGeom, activeMetalMat);
        capMesh.position.copy(p4);
        ringGroup.add(capMesh);
        metalHeadMeshes.push(capMesh);
      }

      shadowMesh.position.y = -R - tubeRadius - 0.25;

      computeAndEmitMetrics(R, tubeRadius, girdleR_mm, MM_PER_UNIT);
    };

    rebuildGeometryRef.current = rebuildGeometry;

    const updateMaterial = () => {
      const currentSpec = specRef.current;
      const app = METAL_APPEARANCE[currentSpec.metalType];
      metalMat.color.set(app.color);
      metalMat.roughness = Math.min(
        1,
        polish.roughness + (app.roughness - 0.16) * 0.5
      );
      metalMat.needsUpdate = true;

      if (rebuildGeometryRef.current) {
        rebuildGeometryRef.current();
      }
    };
    updateMaterialRef.current = updateMaterial;

    const updateDisplayMode = () => {
      const mode = specRef.current.displayMode;

      if (mode === "section") {
        renderer.clippingPlanes = [clipPlane];
      } else {
        renderer.clippingPlanes = [];
      }

      const activeMetalMat = mode === "wireframe" ? wireframeMat : metalMat;
      if (shankMesh) shankMesh.material = activeMetalMat;
      for (const m of metalHeadMeshes) {
        m.material = activeMetalMat;
      }

      gemMat.wireframe = mode === "wireframe";
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

    const ro = new ResizeObserver(() => {
      if (!mount.clientWidth || !mount.clientHeight) return;
      width = mount.clientWidth;
      height = mount.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    });
    ro.observe(mount);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);

      currentShankGeom?.dispose();
      currentGemGeom?.dispose();
      for (const g of currentMetalGeoms) g.dispose();
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
        // Vertical swipes still scroll the page on a phone; horizontal drags turn the ring.
        touchAction: "pan-y",
        ...style,
      }}
      role="img"
      aria-label="3D preview of the ring. Drag to turn it."
    />
  );
}

export default HeroRevolutionVisual;
