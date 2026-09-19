import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { GTAOPass } from "three/examples/jsm/postprocessing/GTAOPass.js";
import { buildEnvironmentTexture, createBackdrop } from "../../lib/studio-env";
import {
  finishMaps, applyTriplanar, addCylindricalUVs, FINISHES, FINISH_LABELS,
} from "../../lib/finishes";
import { createPicker, createRegionHighlight, type Region } from "../../lib/studio-pick";
import {
  createSectionTool, createDimensions, applyDisplayMode, renderPNG,
  DISPLAY_MODES, DISPLAY_LABELS, type DisplayMode, type SectionAxis,
} from "../../lib/studio-tools";
import {
  Loader2, X, RotateCcw, Download, CheckCircle2, AlertTriangle, XCircle,
  Camera, Pin, GitCompare, Scissors, Ruler, Lasso, RotateCw, SlidersHorizontal,
  Command as CommandIcon, Keyboard, Layers,
} from "lucide-react";
import { attachShortcuts, chord, type Binding } from "../../lib/keyboard";
import { useMediaQuery } from "../../lib/use-media-query";
import { CommandPalette, ShortcutSheet, type Command } from "../ui/command-center";
import { Button } from "../ui/button";
import { useBrepWorker, type RingMesh } from "../../hooks/useBrepWorker";
import { subscribeDesignJob, DesignJob } from "../../lib/design-jobs";
import {
  DEFAULT_SPEC, RingSpec, parseSpecFromPrompt, withDefaults,
  GEM_CUTS, SETTINGS, BAND_PROFILES, METALS, METAL_LABELS,
  METAL_APPEARANCE, METAL_DENSITY, SHANK_STONES, SHANK_STONE_LABELS, SETTING_LABELS,
  SHANK_STYLES, SHANK_STYLE_LABELS,
} from "../../lib/ring-spec";

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export function StudioWorkspace({ jobId, onClose }: { jobId: string; onClose: () => void }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [spec, setSpec] = useState<RingSpec>(DEFAULT_SPEC);
  const [jobSpec, setJobSpec] = useState<RingSpec | null>(null);

  const {
    generate, exportFile, mesh: ringMesh, resolvedMetal, metrics, issues,
    isBuilding: isGenerating, isResolving, error, progress, stage,
  } = useBrepWorker();

  const sceneRef = useRef<THREE.Scene | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);
  const stoneMeshRef = useRef<THREE.Mesh | null>(null);
  const stoneMaterialRef = useRef<THREE.MeshPhysicalMaterial | null>(null);
  const materialRef = useRef<THREE.MeshPhysicalMaterial | null>(null);
  const frameRef = useRef<((r: number, lean?: number) => void) | null>(null);
  /**
   * How much of the viewport's left edge the floating tool palette is covering,
   * in CSS pixels. The framing used to assume the palette was always there —
   * a hardcoded 202 — so on a phone, where it is not, the fit believed it had
   * 188px of a 390px screen to work with and drew the ring at half size, shoved
   * to the right. It is a live measurement now: nothing covered, nothing lost.
   */
  const paletteWRef = useRef(0);

  /**
   * How far the default camera should lean over the head, 0..1.
   *
   * A halo, a cluster or a three-stone is a design ABOUT its head: the stones
   * are arranged in the plane of the ring, and the three-quarter view that
   * flatters a solitaire's profile shows them edge-on, as a row of spikes.
   * Leaning the camera over reads the arrangement, at the cost of some of the
   * shank — which for those designs is the right trade, and for a plain
   * solitaire is not.
   */
  const viewLean = useMemo(() => {
    if (spec.setting === "halo" || spec.setting === "three_stone") return 1;
    if (spec.setting === "bezel") return 0.35;
    return 0;
  }, [spec.setting]);
  const leanRef = useRef(viewLean);
  leanRef.current = viewLean;
  // The material is created inside the mount effect, which runs AFTER the
  // appearance effect below. Without this flag that effect saw a null material
  // on its only run and returned, so whatever metal and finish the design
  // arrived with were never applied — the piece rendered as polished platinum
  // no matter what it was meant to be, and only started obeying once someone
  // touched a dropdown.
  const [rendererReady, setRendererReady] = useState(false);

  const [display, setDisplay] = useState<DisplayMode>("shaded");
  const [sectionOn, setSectionOn] = useState(false);
  const [sectionAxis, setSectionAxis] = useState<SectionAxis>("x");
  const [sectionOffset, setSectionOffset] = useState(0);
  const [dimsOn, setDimsOn] = useState(false);
  const [turntable, setTurntable] = useState(false);
  const [lasso, setLasso] = useState(false);
  const [lassoMiss, setLassoMiss] = useState(false);
  const [activeRegion, setActiveRegion] = useState<number | null>(null);
  const pickerRef = useRef<ReturnType<typeof createPicker> | null>(null);
  const highlightRef = useRef<ReturnType<typeof createRegionHighlight> | null>(null);

  const [pinned, setPinned] = useState<RingSpec | null>(null);
  const [showPinned, setShowPinned] = useState(false);

  const sectionRef = useRef<ReturnType<typeof createSectionTool> | null>(null);
  const dimsRef = useRef<ReturnType<typeof createDimensions> | null>(null);
  const metalEdgesRef = useRef<THREE.LineSegments | null>(null);
  const stoneEdgesRef = useRef<THREE.LineSegments | null>(null);
  const controlsRef = useRef<any>(null);
  const shotRef = useRef<(() => void) | null>(null);
  // The offset the preview was centred by. The merged mesh must be moved by the
  // SAME amount, not re-centred on its own bounds: the two differ by the metal
  // the seats removed, and re-centring would make the piece jump when the merge
  // lands.
  const centreRef = useRef<THREE.Vector3 | null>(null);

  // --- job -> spec ---------------------------------------------------------
  useEffect(() => {
    if (!jobId) return;
    const unsubscribe = subscribeDesignJob(jobId, (job: DesignJob) => {
      if (!job) return;
      const incoming = withDefaults(job.spec ?? parseSpecFromPrompt(job.prompt));
      setJobSpec(incoming);
      setSpec(incoming);
    });
    return () => unsubscribe();
  }, [jobId]);

  // Section slider bounds follow the piece, so the cut always sweeps the whole
  // of it whatever size the ring is.
  const cutRange = useMemo(
    () => Math.max(6, (metrics?.outerDiameter ?? 20) / 2 + 2),
    [metrics?.outerDiameter]
  );

  // A/B compare. Everything downstream — geometry, materials, measurements —
  // reads `live`, so flipping to the pinned version exercises the whole pipeline
  // rather than swapping a cached mesh. Slower by a frame or two, and honest:
  // what you are comparing against is genuinely that design, rebuilt.
  const live = showPinned && pinned ? pinned : spec;

  // Which parameters actually differ, so the compare says what moved rather
  // than leaving the designer to spot it.
  const changed = useMemo(() => {
    if (!pinned) return [] as string[];
    return (Object.keys(spec) as (keyof RingSpec)[])
      .filter((k) => spec[k] !== pinned[k])
      .map((k) => String(k));
  }, [spec, pinned]);

  // --- spec -> geometry (debounced so dragging a slider stays smooth) ------
  const specKey = JSON.stringify(live);
  useEffect(() => {
    const t = setTimeout(() => generate(live), 120);
    return () => clearTimeout(t);
  }, [specKey, generate]);

  // --- metal appearance ---------------------------------------------------
  useEffect(() => {
    const m = materialRef.current;
    if (!m) return;
    const look = METAL_APPEARANCE[live.metalType] || METAL_APPEARANCE.platinum;
    const maps = finishMaps(live.finish);
    m.color.set(look.color);
    // The finish sets the roughness floor; the alloy nudges it.
    m.roughness = Math.min(1, maps.roughness + (look.roughness - 0.16) * 0.5);
    m.normalMap = maps.normalMap;
    m.normalScale.set(maps.normalScale, maps.normalScale);
    m.roughnessMap = maps.roughnessMap;
    m.anisotropy = maps.anisotropy;
    m.anisotropyRotation = maps.anisotropyRotation;
    // Without UVs the texture is placed in millimetres: one tile per tileMm, so a
    // hammer dent is the size of a real hammer dent regardless of ring size.
    applyTriplanar(m, 1 / maps.tileMm);
    m.needsUpdate = true;
  }, [live.metalType, live.finish, rendererReady]);

  // --- mesh swap ----------------------------------------------------------
  useEffect(() => {
    if (!ringMesh || !sceneRef.current || !materialRef.current) return;

    // Geometry arrives from the kernel as typed arrays, not as an STL to parse.
    //
    // The old path serialised the ring to binary STL in the worker and parsed
    // it back here, which cost a round of encode/decode per slider tick and
    // threw away everything OCCT knew: STL has no vertex sharing, so normals
    // had to be reconstructed by guessing a crease angle, and edges had to be
    // inferred from the triangles. Now the tessellator's own per-face normals
    // come straight through — smooth across a curved surface, hard at a real
    // edge, because the kernel knows which is which.
    const build = (m: { vertices: Float32Array; normals: Float32Array; triangles: Uint32Array }) => {
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(m.vertices, 3));
      g.setAttribute("normal", new THREE.BufferAttribute(m.normals, 3));
      g.setIndex(new THREE.BufferAttribute(m.triangles, 1));
      return g;
    };

    const metalGeom = build(ringMesh.metal);
    const stoneGeom = ringMesh.stones ? build(ringMesh.stones) : null;

    // Both bodies must share one origin. Centre BOTH on the metal's centre —
    // centring each independently would float the stone off its setting.
    metalGeom.computeBoundingBox();
    const c = metalGeom.boundingBox!.getCenter(new THREE.Vector3());
    metalGeom.translate(-c.x, -c.y, -c.z);
    stoneGeom?.translate(-c.x, -c.y, -c.z);
    centreRef.current = c.clone();
    metalGeom.computeBoundingSphere();

    addCylindricalUVs(metalGeom);

    for (const ref of [meshRef, stoneMeshRef]) {
      if (ref.current) {
        sceneRef.current.remove(ref.current);
        ref.current.geometry.dispose();
        ref.current = null;
      }
    }
    for (const ref of [metalEdgesRef, stoneEdgesRef]) {
      if (ref.current) {
        ref.current.geometry.dispose();
        (ref.current.material as THREE.Material).dispose();
        ref.current = null;
      }
    }

    const metalMesh = new THREE.Mesh(metalGeom, materialRef.current);
    metalMesh.castShadow = true;
    metalMesh.receiveShadow = true;
    sceneRef.current.add(metalMesh);
    meshRef.current = metalMesh;

    if (stoneGeom && stoneMaterialRef.current) {
      const stoneMesh = new THREE.Mesh(stoneGeom, stoneMaterialRef.current);
      stoneMesh.castShadow = true;
      sceneRef.current.add(stoneMesh);
      stoneMeshRef.current = stoneMesh;
    }

    // The kernel's own edge curves, not edges guessed from triangles.
    // EdgesGeometry compares triangle normals and keeps what exceeds an angle,
    // so it both invents edges across a coarsely tessellated curve and misses
    // real ones that happen to meet shallowly. These are the actual boundaries
    // between surfaces, which is what a CAD wireframe means.
    const ep = ringMesh.edges.slice();
    for (let i = 0; i < ep.length; i += 3) {
      ep[i] -= c.x; ep[i + 1] -= c.y; ep[i + 2] -= c.z;
    }
    const edgeGeom = new THREE.BufferGeometry();
    edgeGeom.setAttribute("position", new THREE.BufferAttribute(ep, 3));
    const metalEdges = new THREE.LineSegments(edgeGeom, new THREE.LineBasicMaterial({
      color: 0x7fd4ff, transparent: true, opacity: 0.55,
    }));
    metalEdges.visible = false;
    metalMesh.add(metalEdges);
    metalEdgesRef.current = metalEdges;

    if (highlightRef.current) highlightRef.current.mesh.geometry = metalGeom;

    const radius = metalGeom.boundingSphere?.radius ?? 12;
    // Cap colours name the material at the cut: warm grey for metal, ice for
    // the stone, so a cross-section reads at a glance.
    sectionRef.current?.attach(
      stoneGeom
        ? [{ geometry: metalGeom, colour: 0xc9c2b4 },
           { geometry: stoneGeom, colour: 0x9fd8ef }]
        : [{ geometry: metalGeom, colour: 0xc9c2b4 }],
      radius
    );
    setSectionOffset(0);
    frameRef.current?.(radius);
  }, [ringMesh]);

  // A setting change that changes where the interest is re-frames the shot.
  // Only on a change of lean: re-framing on every edit would fight the designer
  // every time they orbited to look at something.
  useEffect(() => {
    const r = meshRef.current?.geometry?.boundingSphere?.radius;
    if (r) frameRef.current?.(r, viewLean);
  }, [viewLean]);

  // The merge finished: replace the preview's metal with the real thing.
  useEffect(() => {
    const c = centreRef.current;
    const mesh = meshRef.current;
    if (!resolvedMetal || !mesh || !c || !sceneRef.current) return;

    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(resolvedMetal.vertices, 3));
    g.setAttribute("normal", new THREE.BufferAttribute(resolvedMetal.normals, 3));
    g.setIndex(new THREE.BufferAttribute(resolvedMetal.triangles, 1));
    g.translate(-c.x, -c.y, -c.z);
    g.computeBoundingSphere();
    addCylindricalUVs(g);

    mesh.geometry.dispose();
    mesh.geometry = g;
    if (highlightRef.current) highlightRef.current.mesh.geometry = g;

    // The section tool holds the old geometry for its stencil pass; rebuild it
    // against the new one or the cut caps the shape that is no longer there.
    const stone = stoneMeshRef.current?.geometry;
    sectionRef.current?.attach(
      stone
        ? [{ geometry: g, colour: 0xc9c2b4 }, { geometry: stone, colour: 0x9fd8ef }]
        : [{ geometry: g, colour: 0xc9c2b4 }],
      g.boundingSphere?.radius ?? 12
    );
  }, [resolvedMetal]);

  // Display mode, section and dimensions are viewport state, not design state:
  // they change how the piece is drawn, never what it is.
  useEffect(() => {
    const bodies = [
      { mesh: meshRef.current, edges: metalEdgesRef.current },
      { mesh: stoneMeshRef.current, edges: stoneEdgesRef.current },
    ].filter((b) => b.mesh) as { mesh: THREE.Mesh; edges: THREE.LineSegments | null }[];
    if (bodies.length) applyDisplayMode(display, bodies);
  }, [display, ringMesh, rendererReady]);

  useEffect(() => {
    const bodies = [meshRef.current, stoneMeshRef.current].filter(Boolean) as THREE.Mesh[];
    sectionRef.current?.setAxis(sectionAxis);
    sectionRef.current?.setOffset(sectionOffset);
    sectionRef.current?.setEnabled(sectionOn, bodies);
  }, [sectionOn, sectionAxis, sectionOffset, ringMesh, rendererReady]);

  useEffect(() => {
    if (!dimsRef.current) return;
    dimsRef.current.setVisible(dimsOn);
    if (dimsOn && metrics) {
      const r = meshRef.current?.geometry?.boundingSphere?.radius ?? 12;
      dimsRef.current.update(metrics as any, r);
    }
  }, [dimsOn, metrics, ringMesh, rendererReady]);

  useEffect(() => {
    if (controlsRef.current) controlsRef.current.autoRotate = turntable;
  }, [turntable, rendererReady]);

  // Orbiting and lassoing are both click-drag on the same canvas, so one has to
  // yield. The lasso wins while it is armed.
  useEffect(() => {
    if (controlsRef.current) controlsRef.current.enabled = !lasso;
  }, [lasso, rendererReady]);

  // Show the regions the design currently carries, or the one being inspected.
  useEffect(() => {
    const h = highlightRef.current;
    if (!h) return;
    const shown: Region[] = (activeRegion === null ? spec.regions : [spec.regions[activeRegion]])
      .filter(Boolean)
      .map((r: any) => ({ body: "metal" as const, start: r.start, end: r.end }));
    h.set(shown, centreRef.current ?? new THREE.Vector3());
  }, [spec.regions, activeRegion, ringMesh, rendererReady]);

  // --- scene --------------------------------------------------------------
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const w = mount.clientWidth, h = mount.clientHeight;
    // preserveDrawingBuffer so a presentation render can be read back out of the
    // canvas; without it toDataURL returns an empty image on most drivers.
    const renderer = new THREE.WebGLRenderer({
      antialias: true, preserveDrawingBuffer: true, stencil: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.85;
    renderer.domElement.style.display = "block";
    mount.replaceChildren(renderer.domElement);

    const scene = new THREE.Scene();
    
    const { texture: envTexture, pmrem } = buildEnvironmentTexture(renderer);
    scene.environment = envTexture;
    const backdrop = createBackdrop(600);
    scene.add(backdrop);
    sceneRef.current = scene;

    // Diamond: refractive rather than reflective. IOR 2.42 is diamond's real
    // refractive index; dispersion is what produces fire.
    stoneMaterialRef.current = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0,
      roughness: 0,
      // transmission MUST be 1 here. MeshPhysicalMaterial at metalness 0 keeps a
      // diffuse albedo, and transmission is what cancels it — anything less and
      // the stone renders as white plastic lit by the rig, which is exactly what
      // a frosted-button gem looks like. No clearcoat either: a clearcoat layer
      // over a transmissive body adds a second broad specular that reads as a
      // milky film. What sells the stone is facet contrast — each of the 57
      // facets mirrors a different part of the rig, some the softbox, some the
      // black card — so the rig needs darks in it as much as lights.
      transmission: 1.0,
      thickness: 2.6,
      attenuationDistance: 40,
      ior: 2.417,             // diamond, measured
      dispersion: 3.2,        // fire: diamond disperses unusually strongly
      specularIntensity: 1,
      envMapIntensity: 2.4,
      side: THREE.DoubleSide,
    });

    materialRef.current = new THREE.MeshPhysicalMaterial({
      color: METAL_APPEARANCE.platinum.color,
      metalness: 1,
      roughness: METAL_APPEARANCE.platinum.roughness,
      side: THREE.DoubleSide,
      envMapIntensity: 1.15,
    });

    const camera = new THREE.PerspectiveCamera(35, w / h, 0.1, 2000);
    camera.position.set(0, 16, 58);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;

    // Key light casts the contact shadow; the environment map does the rest.
    const key = new THREE.DirectionalLight(0xffffff, 2.4);
    key.position.set(24, 40, 22);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.bias = -0.0008;
    key.shadow.normalBias = 0.02;
    const c = key.shadow.camera as THREE.OrthographicCamera;
    c.left = -30; c.right = 30; c.top = 30; c.bottom = -30; c.near = 1; c.far = 140;
    c.updateProjectionMatrix();
    scene.add(key);
    scene.add(new THREE.AmbientLight(0xffffff, 0.25));

    // Shadow-catching floor: invisible except where the ring darkens it.
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(400, 400),
      new THREE.ShadowMaterial({ opacity: 0.55 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const grid = new THREE.GridHelper(120, 60, 0x4a3a58, 0x241c2c);
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.32;
    scene.add(grid);

    // Frame the camera and drop the floor to the object's underside.
    frameRef.current = (radius: number, lean = leanRef.current) => {
      floor.position.y = -radius - 0.4;
      grid.position.y = -radius - 0.4;
      // Fit the piece into the space the tool palette ISN'T covering.
      //
      // Two separate corrections, and both are needed. Fitting to the full
      // canvas and then shifting makes the ring too large for what is left;
      // shrinking it without shifting leaves it centred under the palette. So
      // the horizontal fit uses the usable width, and the camera then slides
      // over by half the palette. On a wide viewport the palette is a small
      // fraction of the width and this barely does anything, which is right.
      const mountW = mount.clientWidth || 1;
      const mountH = mount.clientHeight || 1;
      const paletteW = Math.min(paletteWRef.current, mountW * 0.4);
      const usableW = Math.max(120, mountW - paletteW);
      const vHalf = (camera.fov * Math.PI) / 360;
      const hHalf = Math.atan(Math.tan(vHalf) * (usableW / mountH));

      // Three-quarter view: reads as a product shot rather than a flat elevation.
      // The azimuth is fixed; only the elevation moves, so leaning over the head
      // does not also spin the ring and lose the profile the designer was just
      // looking at. 22 degrees is the product-shot angle; 46 is high enough to
      // read a halo's arrangement while the band still reads as a ring.
      const elev = ((22 + 24 * clamp01(lean)) * Math.PI) / 180;
      const ce = Math.cos(elev), se = Math.sin(elev);
      const dir = new THREE.Vector3(ce * 0.669, se, ce * 0.743).normalize();
      const rightAxis = new THREE.Vector3().crossVectors(camera.up, dir).normalize();
      const upAxis = new THREE.Vector3().crossVectors(dir, rightAxis).normalize();

      // Breathing room around the piece. A phone has none to spare, so it gets
      // less of it: the same margin that reads as composure on a desktop reads
      // as a small ring lost in a big black rectangle on a 390px screen.
      const margin = mountW < 640 ? 1.06 : 1.16;

      // Fit the SILHOUETTE, not the bounding sphere.
      //
      // A ring is a disc with a stone on it: nothing like a ball. Fitting the
      // sphere that contains it reserves room for a piece that is not there, and
      // the narrower the viewport the worse the waste — on a phone, where width
      // is the binding constraint, it left the ring at half the size it could
      // have been. So the eight corners of the real bounding box are projected
      // onto the camera's own axes and the distance solved from those extents.
      // The sphere stays as the fallback for the first call, before there is a
      // mesh to measure.
      const box = new THREE.Box3();
      for (const o of [meshRef.current, stoneMeshRef.current]) {
        if (!o) continue;
        const b = new THREE.Box3().setFromObject(o);
        if (!b.isEmpty()) box.isEmpty() ? box.copy(b) : box.union(b);
      }

      let dist: number;
      const centre = new THREE.Vector3();
      if (box.isEmpty()) {
        dist = (radius / Math.sin(Math.min(vHalf, hHalf))) * margin;
      } else {
        box.getCenter(centre);
        // Solved point by point, not axis by axis.
        //
        // Taking the widest extent, the tallest extent and the nearest extent
        // and adding them together budgets for a piece whose extremes all
        // coincide. A ring's never do: the part sticking out sideways is the
        // part leaning away from the lens. So each sampled point asks only for
        // the distance IT needs to stay in frame — its own depth plus its own
        // offset over the tangent — and the answer is the largest of those.
        //
        // And the points are the mesh's own, not the bounding box's corners. A
        // ring is a disc: the box around it is mostly air, and its corners are
        // in the four places where there is no ring at all. Fitting to them
        // left a third of a phone screen empty around a piece that could have
        // filled it.
        const tH = Math.tan(hHalf), tV = Math.tan(vHalf);
        const v = new THREE.Vector3();
        dist = 0;
        const need = () => {
          const depth = v.dot(dir);
          dist = Math.max(
            dist,
            depth + (Math.abs(v.dot(rightAxis)) * margin) / tH,
            depth + (Math.abs(v.dot(upAxis)) * margin) / tV,
          );
        };

        let sampled = 0;
        for (const o of [meshRef.current, stoneMeshRef.current]) {
          const pos = (o?.geometry as THREE.BufferGeometry | undefined)?.getAttribute("position");
          if (!o || !pos) continue;
          o.updateWorldMatrix(true, false);
          // A solved ring is tens of thousands of vertices and this runs on
          // every resize. Every 4000th of them describes the silhouette to well
          // under a pixel, and the margin covers the rest.
          const stride = Math.max(1, Math.floor(pos.count / 4000));
          for (let i = 0; i < pos.count; i += stride) {
            v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld).sub(centre);
            need();
            sampled++;
          }
        }

        if (!sampled) {
          for (let i = 0; i < 8; i++) {
            v.set(
              i & 1 ? box.max.x : box.min.x,
              i & 2 ? box.max.y : box.min.y,
              i & 4 ? box.max.z : box.min.z,
            ).sub(centre);
            need();
          }
        }
      }

      camera.position.copy(dir).multiplyScalar(dist).add(centre);
      camera.near = Math.max(0.01, dist / 100); camera.far = dist * 12;
      camera.updateProjectionMatrix();

      const visibleW = 2 * dist * Math.tan(Math.atan(Math.tan(vHalf) * camera.aspect));
      const shift = rightAxis.clone().multiplyScalar(-(paletteW / 2 / mountW) * visibleW);

      controls.target.copy(centre).add(shift);
      camera.position.add(shift);
      controls.update();
      c.left = -radius * 2.4; c.right = radius * 2.4;
      c.top = radius * 2.4; c.bottom = -radius * 2.4;
      c.updateProjectionMatrix();
    };

    // Sparkle is a camera artefact. Without bloom, gems look inert.
    // The composer's own target must carry a stencil buffer, or the section
    // cut's cap has nothing to test against and the cross-section renders
    // hollow — the one thing a section view must not do.
    const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(
      w, h, { stencilBuffer: true, samples: 4, type: THREE.HalfFloatType }
    ));
    composer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    composer.setSize(w, h);
    composer.addPass(new RenderPass(scene, camera));

    // Ground-truth ambient occlusion. Jewellery is mostly tight concave joints —
    // where a prong meets the head, where the head meets the shank, the seat the
    // stone sits in — and those are exactly the places an environment map
    // over-lights, because it has no idea the geometry is occluding itself.
    // Without this, every junction glows and the piece looks assembled from
    // floating parts. Radius is in millimetres, so it is tuned to the real
    // scale of those joints rather than to the viewport.
    const gtao = new GTAOPass(scene, camera, w, h);
    gtao.output = GTAOPass.OUTPUT.Default;
    gtao.updateGtaoMaterial({
      radius: 0.9, distanceExponent: 1.4, thickness: 1.2,
      scale: 1.1, samples: 16, screenSpaceRadius: false,
    });
    composer.addPass(gtao);
    const bloom = new UnrealBloomPass(new THREE.Vector2(w, h), 0.20, 0.40, 0.90);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());

    controlsRef.current = controls;
    controls.autoRotateSpeed = 2.4;

    const section = createSectionTool(renderer);
    scene.add(section.group);
    sectionRef.current = section;

    const dims = createDimensions();
    scene.add(dims.group);
    dimsRef.current = dims;

    const picker = createPicker(
      renderer, camera,
      () => ([
        meshRef.current ? { mesh: meshRef.current, body: "metal" as const } : null,
        stoneMeshRef.current ? { mesh: stoneMeshRef.current, body: "stone" as const } : null,
      ].filter(Boolean) as { mesh: THREE.Mesh; body: "metal" | "stone" }[]),
      () => centreRef.current ?? new THREE.Vector3(),
    );
    picker.setSize(w, h);
    pickerRef.current = picker;
    // Dev escape hatch: the pick buffer is invisible by construction, so there
    // is no way to debug a selection from the UI alone.
    if (import.meta.env.DEV) (window as any).__picker = picker;

    const highlight = createRegionHighlight();
    scene.add(highlight.mesh);
    highlightRef.current = highlight;

    shotRef.current = () => {
      const url = renderPNG(renderer, composer, camera,
        (pw, ph) => { bloom.setSize(pw, ph); gtao.setSize(pw, ph); });
      const a = document.createElement("a");
      a.href = url;
      a.download = "ring-render.png";
      a.click();
    };

    let raf = 0;
    const animate = () => { raf = requestAnimationFrame(animate); controls.update(); composer.render(); };
    animate();
    setRendererReady(true);

    const onResize = () => {
      const nw = mount.clientWidth || 1, nh = mount.clientHeight || 1;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
      composer.setSize(nw, nh);
      bloom.setSize(nw, nh);
      gtao.setSize(nw, nh);
      picker.setSize(nw, nh);
      const r = meshRef.current?.geometry?.boundingSphere?.radius;
      if (r) frameRef.current?.(r);
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(mount);
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      ro.disconnect();
      cancelAnimationFrame(raf);
      controls.dispose();
      dims.dispose();
      picker.dispose();
      highlight.dispose();
      composer.dispose();
      backdrop.geometry.dispose();
      (backdrop.material as any).map?.dispose?.();
      (backdrop.material as THREE.Material).dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      sceneRef.current = null;
      meshRef.current = null;
    };
  }, []);

  const weightG = useMemo(() => {
    if (!metrics?.volumeMm3) return null;
    const d = METAL_DENSITY[spec.metalType] ?? 21.45;
    return (metrics.volumeMm3 / 1000) * d;
  }, [metrics?.volumeMm3, spec.metalType]);

  const set = <K extends keyof RingSpec>(k: K, v: RingSpec[K]) =>
    setSpec((s) => ({ ...s, [k]: v }));

  const lassoRef = useRef<[number, number][]>([]);
  const polyRef = useRef<SVGPolygonElement>(null);
  const drawLasso = useCallback(() => {
    const el = polyRef.current;
    if (el) el.setAttribute("points", lassoRef.current.map(([x, y]) => `${x},${y}`).join(" "));
  }, []);

  const editRegion = (i: number, patch: Partial<RingSpec["regions"][number]>) =>
    setSpec((s) => ({
      ...s,
      regions: s.regions.map((r, j) => (j === i ? { ...r, ...patch } : r)),
    }));

  const [exporting, setExporting] = useState<"step" | "stl" | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const download = async (format: "step" | "stl") => {
    setExporting(format);
    setExportError(null);
    try {
      const blob = await exportFile(format);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `wireframe-${spec.gemShape}-${spec.setting}-us${spec.ringSize}.${format}`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    } catch (e: any) {
      setExportError(e?.message || "Export failed");
    } finally {
      setExporting(null);
    }
  };

  /* ------------------------------------------------------------ chrome -- */

  const isWide = useMediaQuery("(min-width: 1024px)");
  const [panelOpen, setPanelOpen] = useState(true);
  const [toolsOpen, setToolsOpen] = useState(true);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // On a narrow screen both panels start out of the way: the model is the
  // point, and two overlays on a phone leave nothing to look at.
  useEffect(() => { setPanelOpen(isWide); setToolsOpen(isWide); }, [isWide]);

  // Tell the framing how much of the viewport's left edge is spoken for, and
  // re-frame when that changes. Only the wide layout puts the tools beside the
  // model; on a phone they are a sheet over the bottom, so nothing is lost off
  // the left and the piece gets the whole width.
  useEffect(() => {
    paletteWRef.current = isWide && toolsOpen ? 236 : 0;
    const r = meshRef.current?.geometry?.boundingSphere?.radius;
    if (r) frameRef.current?.(r);
  }, [isWide, toolsOpen]);

  const say = useCallback((m: string) => {
    setToast(m);
    window.setTimeout(() => setToast((v) => (v === m ? null : v)), 2200);
  }, []);

  const exportable = !exporting && !isResolving && !!metrics;

  /* Shortcuts.
   *
   * A modelling tool driven only by a mouse is one nobody uses for eight
   * hours. Single letters for the things you reach for constantly, digits for
   * the display modes, and every one of them is listed under ?.
   */
  const bindings: Binding[] = useMemo(() => [
    ...DISPLAY_MODES.map((m, i) => ({
      keys: String(i + 1),
      label: `Display: ${DISPLAY_LABELS[m]}`,
      group: "View",
      run: () => setDisplay(m),
    })),
    { keys: "s", label: "Section cut", group: "View", run: () => setSectionOn((v) => !v) },
    { keys: "d", label: "Dimensions", group: "View", run: () => setDimsOn((v) => !v) },
    { keys: "t", label: "Turntable", group: "View", run: () => setTurntable((v) => !v) },
    { keys: "backslash", label: "Show or hide the panels", group: "View",
      run: () => { const next = !(panelOpen || toolsOpen); setPanelOpen(next); setToolsOpen(next); } },

    { keys: "l", label: "Select a section of the band", group: "Edit",
      run: () => { setLasso((v) => !v); lassoRef.current = []; setLassoMiss(false); } },
    { keys: "p", label: "Pin this version for compare", group: "Edit",
      run: () => { setPinned(spec); setShowPinned(false); say("Pinned for compare"); } },
    { keys: "c", label: "Compare against the pinned version", group: "Edit",
      disabled: !pinned, run: () => setShowPinned((v) => !v) },
    { keys: "r", label: "Reset to the generated design", group: "Edit",
      disabled: !jobSpec, run: () => { if (jobSpec) { setSpec(jobSpec); say("Reset to the generated design"); } } },

    { keys: "e", label: "Download STEP", group: "Export",
      disabled: !exportable, run: () => exportable && download("step") },
    { keys: "shift+e", label: "Download STL", group: "Export",
      disabled: !exportable, run: () => exportable && download("stl") },
    { keys: "g", label: "Save a render (PNG)", group: "Export",
      run: () => { shotRef.current?.(); say("Render saved"); } },

    { keys: "mod+k", label: "Command palette", group: "General", whenTyping: true,
      run: () => setPaletteOpen((v) => !v) },
    { keys: "?", label: "Keyboard shortcuts", group: "General",
      run: () => setHelpOpen((v) => !v) },
    { keys: "escape", label: "Cancel, or close the Studio", group: "General", whenTyping: true,
      run: () => {
        if (paletteOpen) return setPaletteOpen(false);
        if (helpOpen) return setHelpOpen(false);
        // A half-drawn lasso is abandoned before the Studio is: otherwise the
        // only way out of a selection you did not want is to finish it.
        if (lasso) { setLasso(false); lassoRef.current = []; return; }
        onClose();
      } },
  ], [spec, pinned, jobSpec, exportable, lasso, paletteOpen, helpOpen, panelOpen, toolsOpen, say, onClose]);

  useEffect(() => attachShortcuts(bindings), [bindings]);

  const commands: Command[] = useMemo(() => [
    ...DISPLAY_MODES.map((m, i) => ({
      id: `disp-${m}`, label: `Display: ${DISPLAY_LABELS[m]}`, group: "View",
      keys: String(i + 1), run: () => setDisplay(m),
    })),
    { id: "sec", label: sectionOn ? "Hide the section cut" : "Section cut", group: "View",
      keys: "s", run: () => setSectionOn((v) => !v) },
    ...(["x", "y", "z"] as SectionAxis[]).map((a) => ({
      id: `axis-${a}`, label: `Cut along ${a.toUpperCase()}`, group: "View",
      disabled: !sectionOn, run: () => setSectionAxis(a),
    })),
    { id: "dims", label: dimsOn ? "Hide dimensions" : "Show dimensions", group: "View",
      keys: "d", run: () => setDimsOn((v) => !v) },
    { id: "turn", label: turntable ? "Stop the turntable" : "Turntable", group: "View",
      keys: "t", run: () => setTurntable((v) => !v) },
    { id: "lasso", label: "Select a section of the band", group: "Edit", keys: "l",
      run: () => { setLasso(true); lassoRef.current = []; setLassoMiss(false); } },
    { id: "pin", label: "Pin this version for compare", group: "Edit", keys: "p",
      run: () => { setPinned(spec); setShowPinned(false); say("Pinned for compare"); } },
    { id: "cmp", label: showPinned ? "Show the current version" : "Show the pinned version",
      group: "Edit", keys: "c", disabled: !pinned, run: () => setShowPinned((v) => !v) },
    { id: "reset", label: "Reset to the generated design", group: "Edit", keys: "r",
      disabled: !jobSpec, run: () => jobSpec && setSpec(jobSpec) },
    { id: "spec", label: "Copy the spec as JSON", group: "Edit", keywords: "clipboard export",
      run: () => {
        navigator.clipboard?.writeText(JSON.stringify(spec, null, 2))
          .then(() => say("Spec copied")).catch(() => say("Clipboard is blocked"));
      } },
    { id: "step", label: "Download STEP", group: "Export", keys: "e",
      disabled: !exportable, run: () => download("step") },
    { id: "stl", label: "Download STL", group: "Export", keys: "shift+e",
      disabled: !exportable, run: () => download("stl") },
    { id: "png", label: "Save a render (PNG)", group: "Export", keys: "g",
      run: () => { shotRef.current?.(); say("Render saved"); } },
    { id: "keys", label: "Keyboard shortcuts", group: "General", keys: "?",
      run: () => setHelpOpen(true) },
    { id: "close", label: "Close the Studio", group: "General", keys: "escape", run: onClose },
  ], [spec, pinned, jobSpec, exportable, sectionOn, dimsOn, turntable, showPinned, say, onClose]);

  const title = `${spec.gemShape} · ${SETTING_LABELS[spec.setting] ?? spec.setting} · ${METAL_LABELS[spec.metalType]}`;
  const errorCount = issues.filter((i: any) => i.severity === "error").length;

  return (
    <div className="relative flex h-full w-full flex-col bg-ink-950 text-white">
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} commands={commands} />
      <ShortcutSheet open={helpOpen} onClose={() => setHelpOpen(false)} bindings={bindings} />

      {/* Header. The close button used to be pinned at right-[276px] — the
          parameter panel's width, written as a magic number — so it drifted off
          the panel the moment that width changed and had nowhere to go at all
          once the panel could be hidden. It lives in a bar now. */}
      <header className="z-30 flex h-12 shrink-0 items-center gap-2 border-b border-white/8 bg-ink-950/90 px-3 backdrop-blur-xl">
        <span className="mono-label !text-[0.44rem] !text-metal-400">Studio</span>
        <span className="h-3 w-px bg-white/10" />
        <h2 className="min-w-0 flex-1 truncate text-[0.85rem] capitalize tracking-tight text-white/85">
          {title}
        </h2>

        <StatusPill
          building={isGenerating} resolving={isResolving}
          errors={errorCount} ready={!!metrics} progress={progress} stage={stage}
        />

        <button onClick={() => { setToolsOpen((v) => !v); if (!isWide) setPanelOpen(false); }}
                title={`Tools · ${chord("backslash")}`}
                aria-label="Toggle tools" aria-pressed={toolsOpen}
                className={"grid h-8 w-8 place-items-center rounded-lg transition-colors hover:bg-white/8 " + (toolsOpen ? "text-white" : "text-white/40")}>
          <SlidersHorizontal className="h-4 w-4" />
        </button>
        <button onClick={() => setPaletteOpen(true)} title={`Commands · ${chord("mod+k")}`}
                aria-label="Command palette"
                className="grid h-8 w-8 place-items-center rounded-lg text-white/45 transition-colors hover:bg-white/8 hover:text-white">
          <CommandIcon className="h-4 w-4" />
        </button>
        <button onClick={() => setHelpOpen(true)} title="Keyboard shortcuts · ?"
                aria-label="Keyboard shortcuts"
                className="hidden h-8 w-8 place-items-center rounded-lg text-white/45 transition-colors hover:bg-white/8 hover:text-white sm:grid">
          <Keyboard className="h-4 w-4" />
        </button>
        <button onClick={onClose} title="Close · Esc" aria-label="Close the Studio"
                className="grid h-8 w-8 place-items-center rounded-lg text-white/45 transition-colors hover:bg-white/8 hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </header>

      <div className="relative flex min-h-0 flex-1">
        {/* ------------------------------------------------------ viewport -- */}
        <div className="relative min-w-0 flex-1">
          <div
            ref={mountRef}
            className={"h-full w-full " + (lasso ? "cursor-crosshair" : "cursor-move")}
            onPointerDown={(e) => {
              if (!lasso) return;
              const r = e.currentTarget.getBoundingClientRect();
              lassoRef.current = [[e.clientX - r.left, e.clientY - r.top]];
              drawLasso();
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              // The path lives in a ref, not in state. A pointer emits ~60 moves
              // a second and this component owns the renderer; re-rendering it
              // that often to redraw one polygon would cost more than the
              // drawing does.
              const path = lassoRef.current;
              if (!lasso || path.length === 0) return;
              const r = e.currentTarget.getBoundingClientRect();
              const x = e.clientX - r.left, y = e.clientY - r.top;
              const last = path[path.length - 1];
              // Thin the path: every retained point is another side in the
              // point-in-polygon test that runs for each pixel of the buffer.
              if (Math.hypot(x - last[0], y - last[1]) < 4) return;
              path.push([x, y]);
              drawLasso();
            }}
            onPointerUp={(e) => {
              if (!lasso) return;
              const path = lassoRef.current;
              lassoRef.current = [];
              drawLasso();
              e.currentTarget.releasePointerCapture?.(e.pointerId);
              if (path.length < 3 || !pickerRef.current) return;

              const picked = pickerRef.current.pick(path).filter((r) => r.body === "metal");
              if (!picked.length) { setLassoMiss(true); return; }
              setLassoMiss(false);

              setSpec((prev) => {
                const next = [...prev.regions, ...picked.map((r) => ({ start: r.start, end: r.end }))];
                setActiveRegion(next.length - 1);
                return { ...prev, regions: next };
              });
              setLasso(false);
            }}
          />

          {/* The lasso itself. An SVG overlay rather than anything in the 3D
              scene: it is a gesture on the screen, not an object in the world,
              and it must not appear in the very buffer it is about to read. */}
          {lasso && (
            <svg className="pointer-events-none absolute inset-0 z-20">
              <polygon ref={polyRef} points=""
                fill="rgba(225,40,130,0.12)" stroke="var(--accent-400)"
                strokeWidth="1.5" strokeDasharray="5 4" />
            </svg>
          )}

          {lasso && (
            <div className="pointer-events-none absolute bottom-5 left-1/2 z-20 -translate-x-1/2 rounded-full border border-white/12 bg-ink-950/85 px-3.5 py-2 text-[0.75rem] text-white/75 backdrop-blur">
              {lassoMiss
                ? "Nothing metal in that loop — draw around part of the band"
                : "Draw around part of the band · Esc to cancel"}
            </div>
          )}

          {/* Tools. Floating over the viewport rather than buried in the
              parameter panel: these change how you LOOK at the piece, and you
              reach for them while your eye is on the model, not on a form. */}
          <AnimatePresence>
            {toolsOpen && (
              <motion.div
                initial={isWide ? { opacity: 0, x: -12 } : { opacity: 0, y: 28 }}
                animate={isWide ? { opacity: 1, x: 0 } : { opacity: 1, y: 0 }}
                exit={isWide ? { opacity: 0, x: -12 } : { opacity: 0, y: 28 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                aria-label="Tools"
                className={isWide
                  ? "absolute left-3 top-3 z-20 w-[13.5rem] space-y-2 select-none"
                  : "absolute inset-x-0 bottom-0 z-30 max-h-[70%] select-none space-y-2 overflow-y-auto overscroll-contain rounded-t-2xl border-t border-white/10 bg-ink-950/96 px-3 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-xl"}
              >
                {/* A sheet needs a head you can aim a thumb at. The column does
                    not: its dismiss lives in the header bar, where it is always
                    in the same place. */}
                {!isWide && (
                  <div className="sticky top-0 z-10 -mx-3 mb-1 flex items-center justify-between border-b border-white/8 bg-ink-950/96 px-3 py-2.5 backdrop-blur-xl">
                    <h3 className="mono-label !text-[0.46rem]">Tools</h3>
                    <button onClick={() => setToolsOpen(false)} aria-label="Hide tools"
                            className="grid h-7 w-7 place-items-center rounded text-white/40 hover:text-white">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}

                <Panel>
                  <PanelHead>Display</PanelHead>
                  <div className="space-y-1">
                    {DISPLAY_MODES.map((m, i) => (
                      <Chip key={m} full on={display === m} onClick={() => setDisplay(m)} hint={String(i + 1)}>
                        {DISPLAY_LABELS[m]}
                      </Chip>
                    ))}
                  </div>
                </Panel>

                <Panel>
                  <ToolRow icon={Scissors} label="Section cut" hint="S"
                           on={sectionOn} onClick={() => setSectionOn((v) => !v)} />
                  {sectionOn && (
                    <div className="space-y-1.5 pt-0.5">
                      <div className="grid grid-cols-3 gap-1">
                        {(["x", "y", "z"] as SectionAxis[]).map((a) => (
                          <Chip key={a} on={sectionAxis === a} onClick={() => setSectionAxis(a)}>
                            {a.toUpperCase()}
                          </Chip>
                        ))}
                      </div>
                      <input type="range" min={-cutRange} max={cutRange} step={0.1}
                             value={sectionOffset} aria-label="Section position"
                             onChange={(e) => setSectionOffset(parseFloat(e.target.value))}
                             className="slider-metal" />
                    </div>
                  )}
                  <ToolRow icon={Ruler} label="Dimensions" hint="D"
                           on={dimsOn} onClick={() => setDimsOn((v) => !v)} />
                  <ToolRow icon={Lasso} label={lasso ? "Drawing…" : "Select a section"} hint="L"
                           on={lasso}
                           onClick={() => { setLasso((v) => !v); lassoRef.current = []; setLassoMiss(false); }} />
                  <ToolRow icon={RotateCw} label="Turntable" hint="T"
                           on={turntable} onClick={() => setTurntable((v) => !v)} />
                </Panel>

                {spec.regions.length > 0 && (
                  <Panel>
                    <PanelHead>Sections · {spec.regions.length}</PanelHead>
                    <div className="space-y-1">
                      {spec.regions.map((r, i) => {
                        const deg = (a: number) => Math.round(((a * 180) / Math.PI + 360) % 360);
                        return (
                          <Chip key={i} full on={activeRegion === i}
                                onClick={() => setActiveRegion(activeRegion === i ? null : i)}>
                            {deg(r.start)}° – {deg(r.end)}°
                          </Chip>
                        );
                      })}
                    </div>
                    {activeRegion !== null && spec.regions[activeRegion] && (
                      <div className="space-y-1.5 border-t border-white/8 pt-2">
                        <RegionSlider label="Width" value={spec.regions[activeRegion].widthScale ?? 1}
                          onChange={(v) => editRegion(activeRegion, { widthScale: v })} />
                        <RegionSlider label="Thickness" value={spec.regions[activeRegion].thicknessScale ?? 1}
                          onChange={(v) => editRegion(activeRegion, { thicknessScale: v })} />
                        <button
                          onClick={() => {
                            setSpec((p) => ({ ...p, regions: p.regions.filter((_, i) => i !== activeRegion) }));
                            setActiveRegion(null);
                          }}
                          className="w-full rounded-md border border-red-500/25 bg-red-500/10 px-2 py-1.5 text-[0.72rem] text-red-300/85 transition-colors hover:text-red-200"
                        >
                          Remove section
                        </button>
                      </div>
                    )}
                  </Panel>
                )}

                <Panel>
                  <ToolRow icon={Pin} label={pinned ? "Re-pin this version" : "Pin for compare"} hint="P"
                           on={false} onClick={() => { setPinned(spec); setShowPinned(false); say("Pinned for compare"); }} />
                  {pinned && (
                    <>
                      <ToolRow icon={GitCompare} label={showPinned ? "Showing: pinned" : "Showing: current"}
                               hint="C" on={showPinned} onClick={() => setShowPinned((v) => !v)} />
                      {changed.length > 0 && (
                        <p className="px-1 pt-0.5 text-[0.64rem] leading-snug text-white/40">
                          {changed.join(", ")} changed
                        </p>
                      )}
                    </>
                  )}
                  <ToolRow icon={Camera} label="Save render" hint="G" on={false}
                           onClick={() => { shotRef.current?.(); say("Render saved"); }} />
                </Panel>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Build status, centred over the model where the eye already is. */}
          <AnimatePresence>
            {isGenerating && (
              <motion.div
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                className="pointer-events-none absolute left-1/2 top-3 z-20 flex -translate-x-1/2 items-center gap-2.5 rounded-full border border-white/12 bg-ink-950/85 px-3.5 py-2 backdrop-blur"
              >
                <Loader2 className="h-3.5 w-3.5 animate-spin text-metal-300" />
                <span className="text-[0.75rem] text-white/80">{stage || "Building"}</span>
                <span className="tabular text-[0.72rem] text-white/45">{progress}%</span>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {toast && (
              <motion.div
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                role="status"
                className="pointer-events-none absolute bottom-5 right-5 z-30 rounded-lg border border-white/12 bg-ink-950/90 px-3.5 py-2 text-[0.78rem] text-white/85 backdrop-blur"
              >
                {toast}
              </motion.div>
            )}
          </AnimatePresence>

          {error && (
            <div className="absolute left-1/2 top-1/2 z-30 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-red-500/35 bg-ink-950/95 p-6 text-center backdrop-blur">
              <XCircle className="mx-auto h-6 w-6 text-red-400" />
              <h3 className="mt-3 text-[1rem] font-medium text-white">That build did not finish</h3>
              <p className="mt-1.5 text-[0.82rem] leading-relaxed text-white/55">{error}</p>
              {jobSpec && (
                <button onClick={() => setSpec(jobSpec)}
                        className="mt-4 rounded-full border border-white/15 px-4 py-2 text-[0.8rem] text-white/80 hover:text-white">
                  Back to the generated design
                </button>
              )}
            </div>
          )}

          {/* On a phone both panels are sheets, and this is what calls them
              back. It is the whole of the Studio's chrome at that size, so it
              carries both doors rather than only the one: a phone that can
              change the metal but never section the band is a demo, not a tool. */}
          <AnimatePresence>
            {!isWide && !panelOpen && !toolsOpen && !lasso && (
              <motion.div
                initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 18 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="absolute bottom-[max(1.25rem,env(safe-area-inset-bottom))] left-1/2 z-20 flex -translate-x-1/2 items-center gap-0.5 rounded-full border border-white/12 bg-ink-950/90 p-1 shadow-[0_18px_50px_-12px_rgba(0,0,0,0.9)] backdrop-blur"
              >
                <button onClick={() => setToolsOpen(true)}
                        className="flex items-center gap-2 rounded-full px-3.5 py-2 text-[0.8rem] text-white/70 transition-colors active:bg-white/10">
                  <Layers className="h-3.5 w-3.5" /> Tools
                </button>
                <span className="h-4 w-px bg-white/10" />
                <button onClick={() => setPanelOpen(true)}
                        className="flex items-center gap-2 rounded-full px-3.5 py-2 text-[0.8rem] text-white/85 transition-colors active:bg-white/10">
                  <SlidersHorizontal className="h-3.5 w-3.5" /> Parameters
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ------------------------------------------------------- panel -- */}
        <AnimatePresence>
          {panelOpen && (
            <motion.aside
              initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 24 }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
              aria-label="Parameters"
              className="absolute inset-y-0 right-0 z-30 w-full max-w-sm overflow-y-auto border-l border-white/8 bg-ink-950/97 backdrop-blur-xl lg:static lg:z-auto lg:w-[19rem] lg:max-w-none lg:shrink-0 lg:bg-ink-950/95"
            >
              <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
                <h3 className="mono-label !text-[0.46rem]">Parameters</h3>
                <div className="flex items-center gap-1">
                  {jobSpec && (
                    <button onClick={() => { setSpec(jobSpec); say("Reset to the generated design"); }}
                            title={`Reset · ${chord("r")}`} aria-label="Reset to the generated design"
                            className="grid h-7 w-7 place-items-center rounded text-white/40 hover:text-white">
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button onClick={() => setPanelOpen(false)} aria-label="Hide parameters"
                          className="grid h-7 w-7 place-items-center rounded text-white/40 hover:text-white lg:hidden">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-4 p-4">
                <div className="grid grid-cols-2 gap-2.5">
                  <Choice label="Stone cut" value={spec.gemShape} options={GEM_CUTS}
                    onChange={(v) => set("gemShape", v as any)} />
                  <Choice label="Setting" value={spec.setting} options={SETTINGS} labels={SETTING_LABELS}
                    onChange={(v) => set("setting", v as any)} />
                  <Choice label="Band profile" value={spec.bandProfile} options={BAND_PROFILES}
                    onChange={(v) => set("bandProfile", v as any)} />
                  <Choice label="Shank shape" value={spec.shankStyle} options={SHANK_STYLES}
                    labels={SHANK_STYLE_LABELS} onChange={(v) => set("shankStyle", v as any)} />
                  <Choice label="Shank stones" value={spec.shankStones} options={SHANK_STONES}
                    labels={SHANK_STONE_LABELS} onChange={(v) => set("shankStones", v as any)} />
                  <Choice label="Metal" value={spec.metalType} options={METALS}
                    labels={METAL_LABELS} onChange={(v) => set("metalType", v as any)} />
                  <Choice label="Finish" value={spec.finish} options={FINISHES}
                    labels={FINISH_LABELS} onChange={(v) => set("finish", v as any)} />
                </div>

                <hr className="hairline" />

                <Slider label="Ring size (US)" value={spec.ringSize} min={3} max={16} step={0.5}
                  onChange={(v) => set("ringSize", v)} />
                <Slider label="Carat" value={spec.gemSize} min={0.1} max={6} step={0.05} unit=" ct"
                  onChange={(v) => set("gemSize", v)} />
                <Slider label="Band width" value={spec.bandWidth} min={1.2} max={8} step={0.1} unit=" mm"
                  onChange={(v) => set("bandWidth", v)} />
                {spec.setting !== "bezel" && (
                  <Slider label="Prongs" value={spec.prongCount} min={3} max={8} step={1}
                    onChange={(v) => set("prongCount", v)} />
                )}

                <hr className="hairline" />

                <div>
                  <h3 className="mono-label !text-[0.46rem]">Measurements</h3>
                  {isResolving && (
                    <div className="mt-2 flex items-center gap-1.5 text-[0.7rem] text-white/45">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Merging solids — measurements follow
                    </div>
                  )}
                  <dl className="mt-2.5 space-y-1">
                    <Metric label="Inner Ø" value={metrics ? `${metrics.innerDiameter} mm` : "—"} />
                    <Metric label="Outer Ø" value={metrics ? `${metrics.outerDiameter} mm` : "—"} />
                    <Metric label="Band" value={metrics ? `${metrics.bandWidth} × ${metrics.bandThickness} mm` : "—"} />
                    <Metric
                      label={metrics && metrics.stoneLength !== metrics.stoneWidth ? "Stone" : "Stone Ø"}
                      value={!metrics ? "—"
                        : metrics.stoneLength === metrics.stoneWidth
                          ? `${metrics.stoneLength} mm`
                          : `${metrics.stoneLength} × ${metrics.stoneWidth} mm`} />
                    <Metric label="Stone height" value={metrics ? `${metrics.stoneHeight} mm` : "—"} />
                    <Metric label="Stone weight" stale={isResolving}
                      value={metrics?.caratActual ? `${metrics.caratActual.toFixed(2)} ct` : "—"} />
                    {/* These three are the merge's output, and nothing else here
                        is. While a merge is in flight the rest of the panel is
                        still true of the design on screen, but these belong to
                        the previous one — so they are marked stale rather than
                        left looking authoritative. A quoted weight that is one
                        edit out of date is a real invoice, wrong. */}
                    <Metric label="Metal volume" stale={isResolving}
                      value={metrics ? `${metrics.volumeMm3} mm³` : "—"} />
                    <Metric label="Stones" stale={isResolving}
                      value={metrics ? `${metrics.stoneCount} · ${metrics.stoneVolumeMm3} mm³` : "—"} />
                    <Metric label="Est. weight" stale={isResolving}
                      value={weightG ? `${weightG.toFixed(2)} g` : "—"} highlight />
                  </dl>
                  <p className="mt-2 text-[0.64rem] leading-relaxed text-white/32">
                    Metal only, in {METAL_LABELS[spec.metalType]}, assuming a solid
                    casting. Stones are excluded — they are a separate body.
                  </p>
                </div>

                <hr className="hairline" />

                {/* Manufacturability is only meaningful once the piece is one
                    solid, and that is what the merge decides. Showing the last
                    design's verdict beside this design's geometry would be worse
                    than showing none. */}
                <div>
                  <h3 className="mono-label !text-[0.46rem]">Manufacturability</h3>
                  {issues.length === 0 ? (
                    <div className="mt-2.5 flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.07] px-3 py-2.5 text-[0.78rem] text-emerald-300/90">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                      <span>Castable in {METAL_LABELS[spec.metalType]}</span>
                    </div>
                  ) : (
                    <ul className="mt-2.5 space-y-1.5">
                      {issues.map((i: any) => (
                        <li key={i.code}
                            className={"flex gap-2 rounded-lg border px-3 py-2.5 text-[0.75rem] leading-relaxed " +
                              (i.severity === "error"
                                ? "border-red-500/25 bg-red-500/[0.07] text-red-300/90"
                                : "border-amber-500/25 bg-amber-500/[0.06] text-amber-200/85")}>
                          {i.severity === "error"
                            ? <XCircle className="mt-px h-3.5 w-3.5 shrink-0" />
                            : <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" />}
                          <span>{i.message}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <hr className="hairline" />

                <div className="space-y-2">
                  <button onClick={() => download("step")} disabled={!exportable}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-[0.82rem] font-medium text-ink-900 transition-colors hover:bg-metal-200 disabled:bg-white/10 disabled:text-white/30">
                    {exporting === "step"
                      ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Writing STEP…</>
                      : <><Download className="h-3.5 w-3.5" /> Download STEP
                          <kbd className="mono-label !text-[0.42rem] !text-ink-900/45">{chord("e")}</kbd></>}
                  </button>
                  <button onClick={() => download("stl")} disabled={!exportable}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/12 px-4 py-2.5 text-[0.82rem] text-white/80 transition-colors hover:border-white/25 hover:text-white disabled:opacity-40">
                    {exporting === "stl"
                      ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Writing STL…</>
                      : <><Download className="h-3.5 w-3.5" /> Download STL
                          <kbd className="mono-label !text-[0.42rem] !text-white/30">{chord("shift+e")}</kbd></>}
                  </button>
                  <p className="text-[0.64rem] leading-relaxed text-white/32">
                    {isResolving
                      ? "Merging solids — export unlocks when the piece is one body."
                      : "STEP carries editable surfaces for a CAD package. STL is metal only, tessellated for printing."}
                  </p>
                  {exportError && <p className="text-[0.72rem] text-red-300/90">{exportError}</p>}
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- chrome -- */

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-1.5 rounded-xl border border-white/10 bg-ink-950/85 p-2 backdrop-blur-xl">
      {children}
    </div>
  );
}

function PanelHead({ children }: { children: React.ReactNode }) {
  return <div className="mono-label px-0.5 !text-[0.44rem]">{children}</div>;
}

function Chip({
  children, on, onClick, hint, full,
}: { children: React.ReactNode; on: boolean; onClick: () => void; hint?: string; full?: boolean }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      className={"flex items-center justify-between gap-1 rounded-md border px-2 py-1.5 text-[0.72rem] capitalize transition-colors max-lg:px-3 max-lg:py-2.5 max-lg:text-[0.82rem] " +
        (full ? "w-full " : "") +
        (on
          ? "border-metal-400/45 bg-metal-400/12 text-metal-200"
          : "border-white/10 bg-white/[0.03] text-white/55 hover:text-white/90")}
    >
      <span className="truncate">{children}</span>
      {hint && <kbd className="mono-label shrink-0 !text-[0.4rem] !text-white/25 max-lg:hidden">{hint}</kbd>}
    </button>
  );
}

function ToolRow({
  icon: Icon, label, hint, on, onClick,
}: { icon: any; label: string; hint?: string; on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      className={"flex w-full items-center gap-2 rounded-md px-1.5 py-1.5 text-[0.76rem] transition-colors max-lg:gap-3 max-lg:px-3 max-lg:py-2.5 max-lg:text-[0.86rem] " +
        (on ? "bg-metal-400/12 text-metal-200" : "text-white/60 hover:bg-white/5 hover:text-white")}
    >
      <Icon className="h-3.5 w-3.5 shrink-0 max-lg:h-4 max-lg:w-4" />
      <span className="flex-1 truncate text-left">{label}</span>
      {hint && <kbd className="mono-label !text-[0.4rem] !text-white/25 max-lg:hidden">{hint}</kbd>}
    </button>
  );
}

function StatusPill({
  building, resolving, errors, ready, progress, stage,
}: { building: boolean; resolving: boolean; errors: number; ready: boolean; progress: number; stage?: string }) {
  const [dot, text] =
    building ? ["bg-metal-300 animate-pulse", `${stage || "Building"} ${progress}%`]
    : resolving ? ["bg-amber-400 animate-pulse", "Merging"]
    : errors > 0 ? ["bg-red-400", `${errors} issue${errors === 1 ? "" : "s"}`]
    : ready ? ["bg-emerald-400", "Ready"]
    : ["bg-white/25", "Idle"];

  return (
    <span className="mono-label hidden items-center gap-2 rounded-full border border-white/10 px-2.5 py-1 !text-[0.44rem] sm:flex">
      <span className={"h-1.5 w-1.5 rounded-full " + dot} />
      {text}
    </span>
  );
}


function Choice({ label, value, options, labels, onChange }: {
  label: string; value: string; options: readonly string[];
  labels?: Record<string, string>; onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] uppercase tracking-wider text-white/40">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className="w-full cursor-pointer rounded-lg border border-white/10 bg-white/[0.04] px-2 py-2 text-[0.78rem] capitalize text-white/90 transition-colors hover:border-white/20 focus:border-[var(--gold-500)] focus:outline-none"
      >
        {options.map((o) => (
          <option key={o} value={o} className="bg-[#160c1c]">{labels?.[o] || o}</option>
        ))}
      </select>
    </label>
  );
}

/**
 * Slider with a typed entry box.
 *
 * A designer works to a number — 2.35mm, not "about there" — and dragging a
 * range input cannot reliably hit a step boundary. The box is the authoritative
 * input; the slider is for exploring. Typing is only committed on blur or
 * Enter, so a half-typed "2." never rebuilds the geometry, and out-of-range
 * values are clamped rather than rejected, because a designer who types 9 into
 * a 8mm-max band wants the widest band, not an error.
 */
function Slider({ label, value, min, max, step, unit = "", onChange }: {
  label: string; value: number; min: number; max: number; step: number;
  unit?: string; onChange: (v: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    if (draft === null) return;
    const n = parseFloat(draft);
    setDraft(null);
    if (Number.isFinite(n)) onChange(Math.min(max, Math.max(min, n)));
  };
  return (
    <div className="block">
      <span className="mb-1 flex items-baseline justify-between text-[10px] uppercase tracking-wider text-white/40">
        {label}
        <span className="flex items-baseline gap-0.5">
          <input
            value={draft ?? String(value)}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
            inputMode="decimal"
            aria-label={`${label}${unit ? ` (${unit.trim()})` : ""}`}
            className="w-12 bg-white/5 border border-white/10 rounded px-1 py-0.5 text-right
                       text-white/80 font-mono text-[11px] normal-case focus:outline-none
                       focus:border-[var(--gold-500)]"
          />
          <span className="text-white/40 font-mono normal-case text-[10px]">{unit}</span>
        </span>
      </span>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        aria-label={label}
        className="slider-metal"
      />
    </div>
  );
}

/** A ×0.5–×2 multiplier, shown as a percentage because that is how it reads. */
function RegionSlider({ label, value, onChange }: {
  label: string; value: number; onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between text-[9px] uppercase tracking-wider text-white/40 mb-0.5">
        {label}
        <span className="text-white/70 font-mono normal-case">{Math.round(value * 100)}%</span>
      </span>
      <input type="range" min={0.5} max={2} step={0.05} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="slider-metal" />
    </label>
  );
}

function Toggle({ label, on, onChange }: {
  label: string; on: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!on)}
      className={"w-full text-left text-[11px] px-2 py-1.5 rounded border transition-colors " +
        (on ? "bg-[var(--gold-500)]/15 border-[var(--gold-500)]/50 text-[var(--gold-500)]"
            : "bg-white/5 border-white/10 text-white/60 hover:text-white/90")}
    >{label}</button>
  );
}

function Metric({ label, value, highlight, stale }: {
  label: string; value: string; highlight?: boolean; stale?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between text-[11px]">
      <span className="text-white/40">{label}</span>
      <span
        title={stale ? "From the previous build — this one is still merging" : undefined}
        className={"font-mono transition-opacity " +
          (stale ? "opacity-30 line-through decoration-white/30 "
                 : (highlight ? "text-[var(--gold-500)] " : "text-white/80 "))}
      >{value}</span>
    </div>
  );
}
