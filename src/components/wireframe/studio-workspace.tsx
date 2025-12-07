import React, { useEffect, useRef, useState, useMemo } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import { 
  X, Save, RotateCcw, 
  Layers, Box, Move3d, Download, Sun, 
  MousePointer2, Eye, Grid3X3, CircleDot
} from "lucide-react";
import { Button } from "../ui/button";

type StudioWorkspaceProps = {
  jobId: string;
  onClose: () => void;
};

type StudioParams = {
  ringSize: number;
  bandWidth: number;
  bandProfile: "round" | "flat" | "comfort";
  gemSize: number;
  gemShape: "round" | "princess";
  prongCount: 4 | 6;
  metalType: "18k_gold" | "14k_rose" | "platinum";
};

const DEFAULT_PARAMS: StudioParams = {
  ringSize: 6,
  bandWidth: 2.5,
  bandProfile: "comfort",
  gemSize: 1.0,
  gemShape: "round",
  prongCount: 6,
  metalType: "18k_gold",
};

export function StudioWorkspace({ jobId, onClose }: StudioWorkspaceProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [params, setParams] = useState<StudioParams>(DEFAULT_PARAMS);
  const [viewMode, setViewMode] = useState<"rendered" | "wireframe">("rendered");

  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  
  const shankMeshRef = useRef<THREE.Mesh | null>(null);
  const gemMeshRef = useRef<THREE.Mesh | null>(null);
  const prongsGroupRef = useRef<THREE.Group | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    const w = mountRef.current.clientWidth;
    const h = mountRef.current.clientHeight;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, logarithmicDepthBuffer: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#050505");
    scene.environment = null;
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(35, w / h, 0.1, 100);
    camera.position.set(4, 3, 6);
    cameraRef.current = camera;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 2;
    controls.maxDistance = 15;
    controls.target.set(0, 0.5, 0);
    controlsRef.current = controls;

    RectAreaLightUniformsLib.init();

    const spotLight = new THREE.SpotLight(0xffffff, 20);
    spotLight.position.set(5, 8, 5);
    spotLight.angle = Math.PI / 6;
    spotLight.penumbra = 0.2;
    spotLight.castShadow = true;
    spotLight.shadow.bias = -0.0001;
    scene.add(spotLight);

    const rectLight = new THREE.RectAreaLight(0xffffff, 5, 10, 10);
    rectLight.position.set(-5, 0, 5);
    rectLight.lookAt(0, 0, 0);
    scene.add(rectLight);

    const rimLight = new THREE.SpotLight(0xbfdbfe, 10);
    rimLight.position.set(0, 5, -8);
    rimLight.lookAt(0, 0, 0);
    scene.add(rimLight);

    const floorGeom = new THREE.PlaneGeometry(100, 100);
    const floorMat = new THREE.ShadowMaterial({ opacity: 0.3 });
    const floor = new THREE.Mesh(floorGeom, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    floor.position.y = -1.2;
    scene.add(floor);

    const grid = new THREE.GridHelper(20, 20, 0x333333, 0x111111);
    grid.position.y = -1.2;
    scene.add(grid);

    const shankMesh = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshStandardMaterial());
    shankMesh.castShadow = true;
    shankMesh.receiveShadow = true;
    scene.add(shankMesh);
    shankMeshRef.current = shankMesh;

    const gemMesh = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshPhysicalMaterial());
    gemMesh.castShadow = true;
    scene.add(gemMesh);
    gemMeshRef.current = gemMesh;

    const prongsGroup = new THREE.Group();
    scene.add(prongsGroup);
    prongsGroupRef.current = prongsGroup;

    let raf = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!mountRef.current || !renderer || !camera) return;
      const nw = mountRef.current.clientWidth;
      const nh = mountRef.current.clientHeight;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
      mountRef.current?.removeChild(renderer.domElement);
    };
  }, []);

  useEffect(() => {
    if (!shankMeshRef.current || !gemMeshRef.current || !prongsGroupRef.current) return;

    const metalColors = {
      "18k_gold": new THREE.Color("#FFD700"),
      "14k_rose": new THREE.Color("#F4C2C2"),
      "platinum": new THREE.Color("#E5E4E2"),
    };

    const metalMat = new THREE.MeshStandardMaterial({
      color: metalColors[params.metalType],
      metalness: 1.0,
      roughness: 0.15,
      envMapIntensity: 1.0,
    });

    const diamondMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0.0,
      roughness: 0.0,
      transmission: 1.0,
      thickness: 1.5,
      ior: 2.42,
      clearcoat: 1.0,
      attenuationColor: new THREE.Color(0xffffff),
      attenuationDistance: 0.5,
    });

    shankMeshRef.current.material = metalMat;
    shankMeshRef.current.material.wireframe = viewMode === "wireframe";

    gemMeshRef.current.material = diamondMat;
    gemMeshRef.current.material.wireframe = viewMode === "wireframe";

    const baseRadius = 0.8 + (params.ringSize - 6) * 0.05;
    const tubeThickness = params.bandWidth * 0.04;

    const shankGeom = new THREE.TorusGeometry(baseRadius, tubeThickness, 16, 64);
    
    if (params.bandProfile === "flat") {
      shankGeom.scale(1, 1, 0.6);
    }

    shankMeshRef.current.geometry.dispose();
    shankMeshRef.current.geometry = shankGeom;
    shankMeshRef.current.rotation.x = Math.PI / 2;
    shankMeshRef.current.position.y = 0;

    const gemScale = 0.3 + (params.gemSize - 0.5) * 0.15;
    const gemGeom = new THREE.CylinderGeometry(gemScale * 0.6, 0, gemScale, 8);
    
    gemMeshRef.current.geometry.dispose();
    gemMeshRef.current.geometry = gemGeom;
    
    const gemY = baseRadius + tubeThickness + (gemScale * 0.5);
    gemMeshRef.current.position.set(0, gemY, 0);
    gemMeshRef.current.rotation.y = Math.PI / 8;

    while(prongsGroupRef.current.children.length > 0){ 
        prongsGroupRef.current.remove(prongsGroupRef.current.children[0]); 
    }

    const prongCount = params.prongCount;
    const prongRadius = 0.03;
    const prongHeight = gemScale * 1.2;
    
    for (let i = 0; i < prongCount; i++) {
      const angle = (i / prongCount) * Math.PI * 2;
      const x = Math.cos(angle) * (gemScale * 0.7);
      const z = Math.sin(angle) * (gemScale * 0.7);
      
      const prongGeom = new THREE.CylinderGeometry(prongRadius, prongRadius, prongHeight, 8);
      const prongMesh = new THREE.Mesh(prongGeom, metalMat);
      
      prongMesh.position.set(x, gemY - (gemScale * 0.2), z);
      
      prongMesh.lookAt(0, gemY + gemScale, 0); 
      
      prongsGroupRef.current.add(prongMesh);
    }

  }, [params, viewMode]);

  return (
    <div className="flex h-full w-full bg-[#0a0005] overflow-hidden rounded-l-3xl shadow-2xl border-l border-white/10 relative animate-in slide-in-from-right duration-500">
      
      <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between pointer-events-none">
        <div className="flex gap-2 pointer-events-auto">
          <div className="bg-[#13010C]/90 backdrop-blur-md border border-white/10 rounded-lg p-1 flex gap-1">
            <ToolButton 
              active={viewMode === "rendered"} 
              onClick={() => setViewMode("rendered")} 
              icon={CircleDot} 
              label="Render" 
            />
            <ToolButton 
              active={viewMode === "wireframe"} 
              onClick={() => setViewMode("wireframe")} 
              icon={Grid3X3} 
              label="Wireframe" 
            />
          </div>
        </div>

        <div className="flex gap-2 pointer-events-auto">
          <Button 
            size="sm" 
            variant="outline" 
            className="h-9 gap-2 bg-[#13010C]/90 border-white/10 backdrop-blur-md hover:bg-(--gold-500) hover:text-black"
          >
            <Save className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Save</span>
          </Button>
          <Button 
            size="sm" 
            className="h-9 w-9 p-0 rounded-full bg-white/10 hover:bg-red-500/20 hover:text-red-400 border border-white/5"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div 
        ref={mountRef} 
        className="flex-1 h-full cursor-move relative"
        style={{ background: 'radial-gradient(circle at center, #1a1a20 0%, #050505 100%)' }}
      >
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-size-[100px_100px]" />
      </div>

      <div className="absolute top-20 right-4 bottom-4 w-72 bg-[#13010C]/80 backdrop-blur-xl border border-white/10 rounded-2xl flex flex-col shadow-2xl z-20 overflow-hidden">
        
        <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/70">
            <SlidersHorizontalIcon />
            Parameters
          </div>
          <button
            onClick={() => setParams(DEFAULT_PARAMS)}
            className="p-1 -mr-1 text-white/30 hover:text-white transition-colors rounded-md hover:bg-white/5"
            title="Reset to Defaults"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          
          <ControlGroup title="Metal & Shank">
            <div className="grid grid-cols-3 gap-2 mb-4">
              <MaterialButton 
                active={params.metalType === "18k_gold"} 
                color="#FFD700" 
                label="18K" 
                onClick={() => setParams(p => ({ ...p, metalType: "18k_gold" }))} 
              />
              <MaterialButton 
                active={params.metalType === "14k_rose"} 
                color="#F4C2C2" 
                label="Rose" 
                onClick={() => setParams(p => ({ ...p, metalType: "14k_rose" }))} 
              />
              <MaterialButton 
                active={params.metalType === "platinum"} 
                color="#E5E4E2" 
                label="Plat" 
                onClick={() => setParams(p => ({ ...p, metalType: "platinum" }))} 
              />
            </div>

            <RangeControl 
              label="Ring Size (US)" 
              value={params.ringSize} 
              min={3} max={13} step={0.5}
              onChange={(v) => setParams(p => ({ ...p, ringSize: v }))} 
            />
            
            <RangeControl 
              label="Band Width (mm)" 
              value={params.bandWidth} 
              min={1.5} max={6.0} step={0.1}
              onChange={(v) => setParams(p => ({ ...p, bandWidth: v }))} 
            />

            <div className="flex gap-2 mt-3">
              <ProfileButton 
                active={params.bandProfile === "round"} 
                onClick={() => setParams(p => ({ ...p, bandProfile: "round" }))}
                label="Round"
              />
              <ProfileButton 
                active={params.bandProfile === "flat"} 
                onClick={() => setParams(p => ({ ...p, bandProfile: "flat" }))}
                label="Flat"
              />
              <ProfileButton 
                active={params.bandProfile === "comfort"} 
                onClick={() => setParams(p => ({ ...p, bandProfile: "comfort" }))}
                label="Comfort"
              />
            </div>
          </ControlGroup>

          <div className="h-px bg-white/5" />

          <ControlGroup title="Center Stone">
            <RangeControl 
              label="Carat Weight" 
              value={params.gemSize} 
              min={0.5} max={5.0} step={0.1}
              suffix=" ct"
              onChange={(v) => setParams(p => ({ ...p, gemSize: v }))} 
            />

            <div className="flex items-center justify-between mt-4 bg-white/5 rounded-lg p-1">
              <button 
                className={`flex-1 py-1.5 text-xs rounded transition-colors ${params.prongCount === 4 ? "bg-white/10 text-white" : "text-white/40 hover:text-white"}`}
                onClick={() => setParams(p => ({ ...p, prongCount: 4 }))}
              >
                4 Prongs
              </button>
              <button 
                className={`flex-1 py-1.5 text-xs rounded transition-colors ${params.prongCount === 6 ? "bg-white/10 text-white" : "text-white/40 hover:text-white"}`}
                onClick={() => setParams(p => ({ ...p, prongCount: 6 }))}
              >
                6 Prongs
              </button>
            </div>
          </ControlGroup>

        </div>

        <div className="p-4 border-t border-white/10 bg-black/40">
          <Button className="w-full rounded-xl bg-(--gold-500) text-black hover:bg-white hover:text-black transition-colors gap-2 font-semibold">
            <Download className="h-4 w-4" />
            Export Production Files
          </Button>
          <div className="mt-2 text-[10px] text-center text-white/30">
            Exports STL (Mesh) + JSON (Params)
          </div>
        </div>
      </div>
    </div>
  );
}

function ToolButton({ active, onClick, icon: Icon, label }: { active: boolean, onClick: () => void, icon: any, label: string }) {
  return (
    <button 
      onClick={onClick}
      title={label}
      className={`p-2 rounded transition-colors ${active ? "bg-white/20 text-white" : "hover:bg-white/10 text-white/50"}`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function ControlGroup({ title, children }: { title: string, children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs font-semibold text-(--gold-500) uppercase tracking-wider">
        {title}
      </div>
      {children}
    </div>
  );
}

function RangeControl({ label, value, min, max, step, onChange, suffix = "" }: { label: string, value: number, min: number, max: number, step: number, onChange: (v: number) => void, suffix?: string }) {
  return (
    <div>
      <div className="flex justify-between text-xs text-white/60 mb-1.5">
        <span>{label}</span>
        <span className="font-mono text-white">{value.toFixed(step < 1 ? 1 : 0)}{suffix}</span>
      </div>
      <div className="relative h-4 flex items-center">
        <input
          type="range" min={min} max={max} step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="relative z-10 w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-(--gold-500) [&::-webkit-slider-thumb]:shadow-[0_0_10px_var(--gold-500)]"
        />
        <div className="absolute left-0 right-0 h-1 bg-white/10 rounded-lg overflow-hidden">
          <div className="h-full bg-(--gold-500)/30" style={{ width: `${((value - min) / (max - min)) * 100}%` }} />
        </div>
      </div>
    </div>
  );
}

function MaterialButton({ active, color, label, onClick }: { active: boolean, color: string, label: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`
        flex flex-col items-center justify-center gap-1 h-12 rounded-lg border transition-all
        ${active ? "bg-white/10 border-white/40" : "bg-transparent border-white/5 hover:bg-white/5"}
      `}
    >
      <div className="w-4 h-4 rounded-full shadow-inner" style={{ backgroundColor: color }} />
      <span className={`text-[9px] uppercase tracking-wide ${active ? "text-white" : "text-white/40"}`}>{label}</span>
    </button>
  );
}

function ProfileButton({ active, label, onClick }: { active: boolean, label: string, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-1.5 text-[10px] uppercase tracking-wide rounded border transition-colors
        ${active ? "bg-(--gold-500)/20 border-(--gold-500) text-(--gold-500)" : "border-white/10 text-white/40 hover:bg-white/5"}
      `}
    >
      {label}
    </button>
  );
}

function SlidersHorizontalIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" x2="20" y1="21" y2="21" />
      <line x1="4" x2="20" y1="14" y2="14" />
      <line x1="4" x2="20" y1="7" y2="7" />
      <circle cx="12" cy="21" r="1" />
      <circle cx="12" cy="14" r="1" />
      <circle cx="12" cy="7" r="1" />
    </svg>
  );
}