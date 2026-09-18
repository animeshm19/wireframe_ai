import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { Loader2, X, RotateCcw, Download, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
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
      const paletteW = 202;                       // 186px panel + its margin
      const usableW = Math.max(120, mount.clientWidth - paletteW);
      const vHalf = (camera.fov * Math.PI) / 360;
      const hHalf = Math.atan(Math.tan(vHalf) * (usableW / Math.max(1, mount.clientHeight)));
      const dist = (radius / Math.sin(Math.min(vHalf, hHalf))) * 1.15;

      // Three-quarter view: reads as a product shot rather than a flat elevation.
      // The azimuth is fixed; only the elevation moves, so leaning over the head
      // does not also spin the ring and lose the profile the designer was just
      // looking at. 22 degrees is the product-shot angle; 46 is high enough to
      // read a halo's arrangement while the band still reads as a ring.
      const elev = ((22 + 24 * clamp01(lean)) * Math.PI) / 180;
      const ce = Math.cos(elev), se = Math.sin(elev);
      camera.position.set(dist * ce * 0.669, dist * se, dist * ce * 0.743);
      camera.near = dist / 100; camera.far = dist * 12;
      camera.updateProjectionMatrix();

      const visibleW = 2 * dist * Math.tan(Math.atan(Math.tan(vHalf) * camera.aspect));
      const shift = (paletteW / 2 / Math.max(1, mount.clientWidth)) * visibleW;
      const right = new THREE.Vector3()
        .crossVectors(camera.up, camera.position.clone().normalize())
        .normalize()
        .multiplyScalar(-shift);

      controls.target.copy(right);
      camera.position.add(right);
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

  // Escape abandons a lasso in progress. Without it the only way out of a
  // half-drawn selection is to complete one you did not want.
  useEffect(() => {
    if (!lasso) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setLasso(false); lassoRef.current = []; }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lasso]);

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

  return (
    <div className="flex h-full w-full bg-black relative">
      <div
        ref={mountRef}
        className={"flex-1 h-full " + (lasso ? "cursor-crosshair" : "cursor-move")}
        onPointerDown={(e) => {
          if (!lasso) return;
          const r = e.currentTarget.getBoundingClientRect();
          lassoRef.current = [[e.clientX - r.left, e.clientY - r.top]];
          drawLasso();
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          // The path lives in a ref, not in state. A pointer emits ~60 moves a
          // second and this component owns the renderer; re-rendering it that
          // often to redraw one polygon would cost more than the drawing does.
          const path = lassoRef.current;
          if (!lasso || path.length === 0) return;
          const r = e.currentTarget.getBoundingClientRect();
          const x = e.clientX - r.left, y = e.clientY - r.top;
          const last = path[path.length - 1];
          // Thin the path: every retained point is another side in the
          // point-in-polygon test that runs for each pixel of the pick buffer.
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

      {/* The lasso itself. An SVG overlay rather than anything in the 3D scene:
          it is a gesture on the screen, not an object in the world, and it must
          not appear in the very buffer it is about to read. */}
      {lasso && (
        <svg className="absolute inset-0 pointer-events-none" style={{ zIndex: 20 }}>
          <polygon ref={polyRef} points=""
            fill="rgba(79,183,221,0.14)"
            stroke="#4fb7dd" strokeWidth="1.5" strokeDasharray="5 4" />
        </svg>
      )}

      {lasso && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-6 z-20 pointer-events-none
                        px-3 py-1.5 rounded-full border border-white/10 bg-black/70 backdrop-blur
                        text-[11px] text-white/70">
          {lassoMiss
            ? "Nothing metal in that loop \u2014 draw around part of the band"
            : "Draw around a part of the band \u00b7 Esc to cancel"}
        </div>
      )}

      {/* Designer toolbar. Floating over the viewport rather than buried in the
          parameter panel: these change how you LOOK at the piece, and you reach
          for them while your eye is on the model, not on a form. */}
      <div className="absolute top-4 left-4 w-[186px] space-y-2 text-white select-none">
        <div className="rounded-lg border border-white/10 bg-[#0c0710]/90 backdrop-blur p-2 space-y-1.5">
          <div className="text-[9px] uppercase tracking-widest text-white/35 px-0.5">Display</div>
          <div className="grid grid-cols-2 gap-1">
            {DISPLAY_MODES.map((m) => (
              <button key={m} onClick={() => setDisplay(m)}
                className={"text-[10px] px-1.5 py-1 rounded border transition-colors " +
                  (display === m
                    ? "bg-[var(--gold-500)]/15 border-[var(--gold-500)]/50 text-[var(--gold-500)]"
                    : "bg-white/5 border-white/10 text-white/55 hover:text-white/90")}>
                {DISPLAY_LABELS[m]}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-[#0c0710]/90 backdrop-blur p-2 space-y-1.5">
          <Toggle label="Section cut" on={sectionOn} onChange={setSectionOn} />
          {sectionOn && (
            <>
              <div className="grid grid-cols-3 gap-1">
                {(["x", "y", "z"] as SectionAxis[]).map((a) => (
                  <button key={a} onClick={() => setSectionAxis(a)}
                    className={"text-[10px] py-1 rounded border uppercase transition-colors " +
                      (sectionAxis === a
                        ? "bg-white/15 border-white/30 text-white"
                        : "bg-white/5 border-white/10 text-white/50 hover:text-white/80")}>
                    {a}
                  </button>
                ))}
              </div>
              <input type="range" min={-cutRange} max={cutRange} step={0.1}
                value={sectionOffset}
                onChange={(e) => setSectionOffset(parseFloat(e.target.value))}
                className="w-full accent-[var(--gold-500)]" />
            </>
          )}
          <Toggle label="Dimensions" on={dimsOn} onChange={setDimsOn} />
          <Toggle
            label={lasso ? "Drawing… (Esc)" : "Select a section"}
            on={lasso}
            onChange={(v) => { setLasso(v); lassoRef.current = []; setLassoMiss(false); }} />
          <Toggle label="Turntable" on={turntable} onChange={setTurntable} />
        </div>

        {spec.regions.length > 0 && (
          <div className="rounded-lg border border-white/10 bg-[#0c0710]/90 backdrop-blur p-2 space-y-1.5">
            <div className="text-[9px] uppercase tracking-widest text-white/35 px-0.5">
              Sections ({spec.regions.length})
            </div>
            {spec.regions.map((r, i) => {
              const deg = (a: number) => Math.round(((a * 180) / Math.PI + 360) % 360);
              return (
                <button key={i} onClick={() => setActiveRegion(activeRegion === i ? null : i)}
                  className={"w-full text-left text-[10px] px-2 py-1 rounded border transition-colors " +
                    (activeRegion === i
                      ? "bg-[var(--gold-500)]/15 border-[var(--gold-500)]/50 text-[var(--gold-500)]"
                      : "bg-white/5 border-white/10 text-white/55 hover:text-white/90")}>
                  {deg(r.start)}° – {deg(r.end)}°
                </button>
              );
            })}

            {activeRegion !== null && spec.regions[activeRegion] && (
              <div className="pt-1 space-y-1.5 border-t border-white/10">
                <RegionSlider label="Width" value={spec.regions[activeRegion].widthScale ?? 1}
                  onChange={(v) => editRegion(activeRegion, { widthScale: v })} />
                <RegionSlider label="Thickness" value={spec.regions[activeRegion].thicknessScale ?? 1}
                  onChange={(v) => editRegion(activeRegion, { thicknessScale: v })} />
                <button
                  onClick={() => {
                    setSpec((p) => ({ ...p, regions: p.regions.filter((_, i) => i !== activeRegion) }));
                    setActiveRegion(null);
                  }}
                  className="w-full text-[10px] px-2 py-1 rounded border border-red-500/30
                             bg-red-900/15 text-red-300/80 hover:text-red-200">
                  Remove section
                </button>
              </div>
            )}
          </div>
        )}

        <div className="rounded-lg border border-white/10 bg-[#0c0710]/90 backdrop-blur p-2 space-y-1.5">
          <Toggle
            label={pinned ? "Re-pin this version" : "Pin for compare"}
            on={false}
            onChange={() => { setPinned(spec); setShowPinned(false); }} />
          {pinned && (
            <>
              <Toggle
                label={showPinned ? "Showing: pinned" : "Showing: current"}
                on={showPinned}
                onChange={setShowPinned} />
              {changed.length > 0 && (
                <div className="text-[9px] text-white/40 leading-snug px-0.5 pt-0.5">
                  {changed.join(", ")} changed
                </div>
              )}
            </>
          )}
          <button onClick={() => shotRef.current?.()}
            className="w-full text-[11px] px-2 py-1.5 rounded border border-white/10
                       bg-white/5 text-white/60 hover:text-white/90 transition-colors">
            Save render (PNG)
          </button>
        </div>
      </div>

      {/* Parameter panel */}
      <aside className="w-[260px] shrink-0 h-full overflow-y-auto border-l border-white/10 bg-[#0c0710]/95 backdrop-blur p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs uppercase tracking-widest text-white/50 font-semibold">Parameters</h3>
          {jobSpec && (
            <button onClick={() => setSpec(jobSpec)} title="Reset to the generated design"
              className="text-white/40 hover:text-white/80"><RotateCcw className="h-3.5 w-3.5" /></button>
          )}
        </div>

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

        <div className="pt-2 border-t border-white/10 space-y-1.5">
          <h3 className="text-xs uppercase tracking-widest text-white/50 font-semibold mb-2">Measurements</h3>
          {isResolving && (
            <div className="flex items-center gap-1.5 text-[10px] text-white/45 pb-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Merging solids — measurements follow
            </div>
          )}
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
          {/* These three are the merge's output, and nothing else here is. While
              a merge is in flight the rest of the panel is still true of the
              design on screen, but these belong to the previous one — so they
              are marked stale rather than left looking authoritative. A quoted
              weight that is one edit out of date is a real invoice, wrong. */}
          <Metric label="Metal volume" stale={isResolving}
            value={metrics ? `${metrics.volumeMm3} mm³` : "—"} />
          <Metric label="Stones" stale={isResolving}
            value={metrics ? `${metrics.stoneCount} · ${metrics.stoneVolumeMm3} mm³` : "—"} />
          <Metric label="Est. weight" stale={isResolving}
            value={weightG ? `${weightG.toFixed(2)} g` : "—"} highlight />
          <p className="text-[9px] text-white/30 pt-1 leading-relaxed">
            Metal only, in {METAL_LABELS[spec.metalType]}, assuming a solid casting.
            Stones are excluded — they are a separate body.
          </p>
        </div>

        {/* Manufacturability is only meaningful once the piece is one solid, and
            that is what the merge decides. Showing last design's verdict beside
            this design's geometry would be worse than showing none. */}
        <div className="pt-2 border-t border-white/10">
          <h3 className="text-xs uppercase tracking-widest text-white/50 font-semibold mb-2">
            Manufacturability
          </h3>
          {issues.length === 0 ? (
            <div className="flex items-center gap-2 text-[11px] text-green-400">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              <span>Castable in {METAL_LABELS[spec.metalType]}</span>
            </div>
          ) : (
            <ul className="space-y-1.5">
              {issues.map((i: any) => (
                <li key={i.code} className="flex gap-2 text-[10px] leading-relaxed">
                  {i.severity === "error"
                    ? <XCircle className="h-3.5 w-3.5 shrink-0 text-red-400 mt-px" />
                    : <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-400 mt-px" />}
                  <span className={i.severity === "error" ? "text-red-300" : "text-amber-200/80"}>
                    {i.message}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-1.5">
          <Button onClick={() => download("step")} disabled={!!exporting || isResolving || !metrics}
            className="w-full bg-[var(--gold-500)]/15 border border-[var(--gold-500)]/40
                       hover:bg-[var(--gold-500)]/25 text-[var(--gold-500)] text-xs h-9">
            {exporting === "step"
              ? <><Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> Writing STEP…</>
              : <><Download className="h-3.5 w-3.5 mr-2" /> Download STEP</>}
          </Button>
          <Button onClick={() => download("stl")} disabled={!!exporting || isResolving || !metrics}
            className="w-full bg-white/10 hover:bg-white/20 text-white text-xs h-9">
            {exporting === "stl"
              ? <><Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> Writing STL…</>
              : <><Download className="h-3.5 w-3.5 mr-2" /> Download STL</>}
          </Button>
          <p className="text-[9px] text-white/30 leading-snug">
            {isResolving
              ? "Merging solids — export unlocks when the piece is one body."
              : "STEP carries editable surfaces for a CAD package. STL is metal only, tessellated for printing."}
          </p>
          {exportError && (
            <p className="text-[10px] text-red-300/90">{exportError}</p>
          )}
        </div>
      </aside>

      {isGenerating && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-zinc-900/85 text-white px-4 py-2 rounded-full flex items-center gap-2 backdrop-blur-md border border-white/10">
          <Loader2 className="animate-spin h-4 w-4 text-yellow-500" />
          <span className="text-xs font-medium">{stage || "Generating"} · {progress}%</span>
        </div>
      )}

      {error && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-red-900/90 text-white p-6 rounded-xl border border-red-500/50 max-w-md text-center">
          <h3 className="font-bold mb-2">Generation Failed</h3>
          <p className="text-sm opacity-80">{error}</p>
        </div>
      )}

      <Button
        className="absolute top-4 right-[276px] bg-zinc-800 hover:bg-zinc-700 text-white rounded-full h-8 w-8 p-0 flex items-center justify-center"
        onClick={onClose}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

function Choice({ label, value, options, labels, onChange }: {
  label: string; value: string; options: readonly string[];
  labels?: Record<string, string>; onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase tracking-wider text-white/40 mb-1">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-xs text-white/90 capitalize focus:outline-none focus:border-[var(--gold-500)]"
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
    <label className="block">
      <span className="flex items-baseline justify-between text-[10px] uppercase tracking-wider text-white/40 mb-1">
        {label}
        <span className="flex items-baseline gap-0.5">
          <input
            value={draft ?? String(value)}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
            inputMode="decimal"
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
        className="w-full accent-[var(--gold-500)]"
      />
    </label>
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
        className="w-full accent-[var(--gold-500)]" />
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
