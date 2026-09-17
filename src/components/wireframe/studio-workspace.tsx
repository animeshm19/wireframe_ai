import React, { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { Loader2, X, RotateCcw, Download, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { Button } from "../ui/button";
import { useCadWorker } from "../../hooks/useCadWorker";
import { subscribeDesignJob, DesignJob } from "../../lib/design-jobs";
import {
  DEFAULT_SPEC, RingSpec, parseSpecFromPrompt, withDefaults,
  GEM_CUTS, SETTINGS, BAND_PROFILES, METALS, METAL_LABELS,
  METAL_APPEARANCE, METAL_DENSITY,
} from "../../lib/ring-spec";

export function StudioWorkspace({ jobId, onClose }: { jobId: string; onClose: () => void }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [spec, setSpec] = useState<RingSpec>(DEFAULT_SPEC);
  const [jobSpec, setJobSpec] = useState<RingSpec | null>(null);

  const { generate, modelBlob, stoneBlob, isGenerating, error, progress, stage, metrics, issues } = useCadWorker();

  const sceneRef = useRef<THREE.Scene | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);
  const stoneMeshRef = useRef<THREE.Mesh | null>(null);
  const stoneMaterialRef = useRef<THREE.MeshPhysicalMaterial | null>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const frameRef = useRef<((r: number) => void) | null>(null);

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

  // --- spec -> geometry (debounced so dragging a slider stays smooth) ------
  const specKey = JSON.stringify(spec);
  useEffect(() => {
    const t = setTimeout(() => generate(spec), 120);
    return () => clearTimeout(t);
  }, [specKey, generate]);

  // --- metal appearance ---------------------------------------------------
  useEffect(() => {
    const look = METAL_APPEARANCE[spec.metalType] || METAL_APPEARANCE.platinum;
    if (materialRef.current) {
      materialRef.current.color.set(look.color);
      materialRef.current.roughness = look.roughness;
    }
  }, [spec.metalType]);

  // --- mesh swap ----------------------------------------------------------
  useEffect(() => {
    if (!modelBlob || !sceneRef.current) return;
    let cancelled = false;

    (async () => {
      const loader = new STLLoader();
      const metalGeom = loader.parse(await modelBlob.arrayBuffer());
      const stoneGeom = stoneBlob ? loader.parse(await stoneBlob.arrayBuffer()) : null;
      if (cancelled || !sceneRef.current || !materialRef.current) return;

      // Both bodies must share one origin. Centre BOTH on the metal's centre —
      // centring each independently would float the stone off its setting.
      metalGeom.computeBoundingBox();
      const c = metalGeom.boundingBox!.getCenter(new THREE.Vector3());
      metalGeom.translate(-c.x, -c.y, -c.z);
      stoneGeom?.translate(-c.x, -c.y, -c.z);

      metalGeom.computeVertexNormals();
      metalGeom.computeBoundingSphere();
      stoneGeom?.computeVertexNormals();

      for (const ref of [meshRef, stoneMeshRef]) {
        if (ref.current) {
          sceneRef.current.remove(ref.current);
          ref.current.geometry.dispose();
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

      frameRef.current?.(metalGeom.boundingSphere?.radius ?? 12);
    })();

    return () => { cancelled = true; };
  }, [modelBlob, stoneBlob]);

  // --- scene --------------------------------------------------------------
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const w = mount.clientWidth, h = mount.clientHeight;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.domElement.style.display = "block";
    mount.replaceChildren(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#0c0a10");
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    sceneRef.current = scene;

    // Diamond: refractive rather than reflective. IOR 2.42 is diamond's real
    // refractive index; dispersion is what produces fire.
    stoneMaterialRef.current = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0,
      roughness: 0.02,
      transmission: 1,
      thickness: 1.8,
      ior: 2.42,
      dispersion: 2.2,
      clearcoat: 1,
      clearcoatRoughness: 0.02,
      envMapIntensity: 2.2,
      side: THREE.DoubleSide,
    });

    materialRef.current = new THREE.MeshStandardMaterial({
      color: METAL_APPEARANCE.platinum.color,
      metalness: 1,
      roughness: METAL_APPEARANCE.platinum.roughness,
      side: THREE.DoubleSide,
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
    frameRef.current = (radius: number) => {
      floor.position.y = -radius - 0.4;
      grid.position.y = -radius - 0.4;
      // Fit on BOTH axes: in a narrow viewport the horizontal field of view is
      // the binding constraint, not the vertical one.
      const vHalf = (camera.fov * Math.PI) / 360;
      const hHalf = Math.atan(Math.tan(vHalf) * camera.aspect);
      const dist = (radius / Math.sin(Math.min(vHalf, hHalf))) * 1.15;
      // Three-quarter view: reads as a product shot rather than a flat elevation.
      camera.position.set(dist * 0.42, radius * 0.75, dist * 0.86);
      camera.near = dist / 100; camera.far = dist * 12;
      camera.updateProjectionMatrix();
      controls.target.set(0, 0, 0);
      controls.update();
      c.left = -radius * 2.4; c.right = radius * 2.4;
      c.top = radius * 2.4; c.bottom = -radius * 2.4;
      c.updateProjectionMatrix();
    };

    let raf = 0;
    const animate = () => { raf = requestAnimationFrame(animate); controls.update(); renderer.render(scene, camera); };
    animate();

    const onResize = () => {
      const nw = mount.clientWidth || 1, nh = mount.clientHeight || 1;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
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

  const download = () => {
    if (!modelBlob) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(modelBlob);
    a.download = `wireframe-${spec.gemShape}-${spec.setting}-us${spec.ringSize}.stl`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  };

  return (
    <div className="flex h-full w-full bg-black relative">
      <div ref={mountRef} className="flex-1 h-full cursor-move" />

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
        <Choice label="Setting" value={spec.setting} options={SETTINGS}
          onChange={(v) => set("setting", v as any)} />
        <Choice label="Band profile" value={spec.bandProfile} options={BAND_PROFILES}
          onChange={(v) => set("bandProfile", v as any)} />
        <Choice label="Metal" value={spec.metalType} options={METALS}
          labels={METAL_LABELS} onChange={(v) => set("metalType", v as any)} />

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
          <Metric label="Inner Ø" value={metrics ? `${metrics.innerDiameter} mm` : "—"} />
          <Metric label="Outer Ø" value={metrics ? `${metrics.outerDiameter} mm` : "—"} />
          <Metric label="Band" value={metrics ? `${metrics.bandWidth} × ${metrics.bandThickness} mm` : "—"} />
          <Metric label="Stone Ø" value={metrics ? `${metrics.girdleDiameter} mm` : "—"} />
          <Metric label="Stone height" value={metrics ? `${metrics.stoneHeight} mm` : "—"} />
          <Metric label="Metal volume" value={metrics ? `${metrics.volumeMm3} mm³` : "—"} />
          <Metric label="Stones" value={metrics ? `${metrics.stoneCount} · ${metrics.stoneVolumeMm3} mm³` : "—"} />
          <Metric label="Est. weight" value={weightG ? `${weightG.toFixed(2)} g` : "—"} highlight />
          <p className="text-[9px] text-white/30 pt-1 leading-relaxed">
            Metal only, in {METAL_LABELS[spec.metalType]}, assuming a solid casting.
            Stones are excluded — they are a separate body.
          </p>
        </div>

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

        <Button onClick={download} disabled={!modelBlob}
          className="w-full bg-white/10 hover:bg-white/20 text-white text-xs h-9">
          <Download className="h-3.5 w-3.5 mr-2" /> Download STL
        </Button>
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

function Slider({ label, value, min, max, step, unit = "", onChange }: {
  label: string; value: number; min: number; max: number; step: number;
  unit?: string; onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between text-[10px] uppercase tracking-wider text-white/40 mb-1">
        {label}
        <span className="text-white/70 font-mono normal-case">{value}{unit}</span>
      </span>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-[var(--gold-500)]"
      />
    </label>
  );
}

function Metric({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-baseline justify-between text-[11px]">
      <span className="text-white/40">{label}</span>
      <span className={"font-mono " + (highlight ? "text-[var(--gold-500)]" : "text-white/80")}>{value}</span>
    </div>
  );
}
