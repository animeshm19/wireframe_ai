import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"; // Ensure this import matches your setup
import { motion, AnimatePresence } from "framer-motion";
import { Cpu, Grid3X3, Sparkles } from "lucide-react";

// Animation Phases
type Phase = "prompt" | "mesh" | "design";

export function HeroVisual() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>("prompt");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!mountRef.current) return;

    // --- Setup ---
    const getViewport = () => {
      if (!mountRef.current) return { w: 1, h: 1 };
      return { 
        w: mountRef.current.clientWidth, 
        h: mountRef.current.clientHeight 
      };
    };

    const { w, h } = getViewport();

    const scene = new THREE.Scene();
    scene.background = null;

    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
    
    // Initial Camera Position based on aspect ratio
    const isMobile = w < 768;
    camera.position.set(0, 2, isMobile ? 18 : 12); 

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    mountRef.current.appendChild(renderer.domElement);
    
    // Add controls for mobile interactivity
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = false; // Disable zoom to prevent breaking the layout
    controls.autoRotate = false; // We handle rotation manually

    // --- Materials ---
    // 1. Particle Material (The Prompt) - Rose Gold
    const particleMat = new THREE.PointsMaterial({
      color: 0xc69bb2, 
      size: 0.08,
      transparent: true,
      opacity: 0, 
      blending: THREE.AdditiveBlending,
    });

    // 2. Wireframe Material (The Mesh) - Rose Gold
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0xc69bb2,
      wireframe: true,
      transparent: true,
      opacity: 0, 
    });

    // 3. Solid Material (The Design) - Platinum
    const metalMat = new THREE.MeshStandardMaterial({
      color: 0xe5e4e2,
      metalness: 1.0,
      roughness: 0.15,
      transparent: true,
      opacity: 0, 
    });

    // Gem Material
    const gemMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0.0,
      roughness: 0.0,
      transmission: 1.0,
      thickness: 1.5,
      ior: 2.4,
      clearcoat: 1.0,
      transparent: true,
      opacity: 0,
    });

    // --- Geometry ---
    const ringGroup = new THREE.Group();
    scene.add(ringGroup);

    // Ring Geometry
    const shankGeom = new THREE.TorusGeometry(2.5, 0.25, 32, 100);
    const gemGeom = new THREE.OctahedronGeometry(1.2, 2);
    
    // Shank Meshes
    const shankParticles = new THREE.Points(shankGeom, particleMat);
    const shankWire = new THREE.Mesh(shankGeom, wireMat);
    const shankSolid = new THREE.Mesh(shankGeom, metalMat);
    
    [shankParticles, shankWire, shankSolid].forEach(m => {
        m.rotation.x = Math.PI / 2;
        ringGroup.add(m);
    });

    // Gem Meshes
    const gemParticles = new THREE.Points(gemGeom, particleMat);
    const gemWire = new THREE.Mesh(gemGeom, wireMat);
    const gemSolid = new THREE.Mesh(gemGeom, gemMat);

    [gemParticles, gemWire, gemSolid].forEach(m => {
        m.position.y = 2.8;
        ringGroup.add(m);
    });

    // Prongs
    const prongs: THREE.Group = new THREE.Group();
    ringGroup.add(prongs);
    
    for(let i=0; i<4; i++) {
        const angle = (i/4) * Math.PI*2 + Math.PI/4;
        const pGeom = new THREE.CapsuleGeometry(0.1, 1.5, 4, 8);
        
        const pPart = new THREE.Points(pGeom, particleMat);
        const pWire = new THREE.Mesh(pGeom, wireMat);
        const pSolid = new THREE.Mesh(pGeom, metalMat); 
        
        // Rose Gold Accent for Prongs
        const accentMat = new THREE.MeshStandardMaterial({ 
            color: 0x836e76, 
            metalness: 1.0, 
            roughness: 0.2, 
            transparent: true, 
            opacity: 0 
        });
        pSolid.material = accentMat;

        [pPart, pWire, pSolid].forEach(m => {
            m.position.set(Math.cos(angle)*1.0, 2.0, Math.sin(angle)*1.0);
            m.lookAt(0, 2.8, 0);
            m.userData.type = m === pPart ? 'particle' : m === pWire ? 'wire' : 'solid';
            prongs.add(m);
        });
    }

    // --- Lights ---
    const spot = new THREE.SpotLight(0xffffff, 20);
    spot.position.set(5, 10, 5);
    scene.add(spot);
    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambient);
    const roseRim = new THREE.PointLight(0xc69bb2, 5);
    roseRim.position.set(-5, 2, -10);
    scene.add(roseRim);

    // --- Animation Loop ---
    let time = 0;
    const CYCLE_DURATION = 600; 
    
    const animate = () => {
      requestAnimationFrame(animate);
      time++;
      controls.update(); // Required for damping
      
      const t = (time % CYCLE_DURATION) / CYCLE_DURATION;
      setProgress(t * 100);

      // Phases
      let currentPhase: Phase = "prompt";
      if (t > 0.33) currentPhase = "mesh";
      if (t > 0.66) currentPhase = "design";
      
      // Update React State only when changed (optimization)
      if (Math.floor(t * 3) !== Math.floor(((time-1) % CYCLE_DURATION) / CYCLE_DURATION * 3)) {
         setPhase(currentPhase);
      }

      // Smooth Opacity Transitions
      const fadeSpeed = 0.08;
      let targetPart = currentPhase === 'prompt' ? 1 : 0;
      let targetWire = currentPhase === 'mesh' ? 1 : 0;
      let targetSolid = currentPhase === 'design' ? 1 : 0;

      if (currentPhase === 'prompt' && t < 0.05) targetSolid = 0;

      const lerpOp = (mat: THREE.Material, target: number) => {
          mat.opacity += (target - mat.opacity) * fadeSpeed;
      };

      lerpOp(particleMat, targetPart);
      lerpOp(wireMat, targetWire);
      lerpOp(metalMat, targetSolid);
      lerpOp(gemMat, targetSolid);
      
      prongs.children.forEach(c => {
          const mesh = c as THREE.Mesh;
          if (mesh.userData.type === 'solid') {
             (mesh.material as THREE.Material).opacity += (targetSolid - (mesh.material as THREE.Material).opacity) * fadeSpeed;
          }
      });

      // Continuous Rotation
      ringGroup.rotation.y = time * 0.005;
      ringGroup.rotation.x = Math.sin(time * 0.002) * 0.1;

      // "Breathing" Effect
      if (currentPhase === 'prompt') {
          const breath = Math.sin(time * 0.05) * 0.1 + 1;
          shankParticles.scale.setScalar(breath);
          gemParticles.scale.setScalar(breath);
      } else {
          // Gently settle back to 1
          shankParticles.scale.lerp(new THREE.Vector3(1,1,1), 0.1);
          gemParticles.scale.lerp(new THREE.Vector3(1,1,1), 0.1);
      }

      renderer.render(scene, camera);
    };
    animate();

    // --- Responsive Resize Logic ---
    const handleResize = () => {
      if (!mountRef.current) return;
      const { w: newW, h: newH } = getViewport();
      
      camera.aspect = newW / newH;
      
      // Mobile Adjustment: Pull camera back on narrow screens
      const isNarrow = newW < 768;
      const targetZ = isNarrow ? 18 : 12;
      // Smoothly adjust would be better, but direct set is stable for resize
      camera.position.z = targetZ;

      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
      mountRef.current?.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div className="relative w-full h-full">
        {/* 3D Canvas */}
        <div 
            ref={mountRef} 
            className="w-full h-full min-h-[300px] sm:min-h-[400px] cursor-grab active:cursor-grabbing outline-none"
        />

        {/* HUD Overlay */}
        <div className="absolute inset-0 pointer-events-none p-4 sm:p-6 flex flex-col justify-between z-10">
            
            {/* Top Bar */}
            <div className="flex justify-between items-start">
                <div className="flex gap-2 flex-wrap max-w-[70%]">
                    <StatusChip 
                        label="INPUT" 
                        active={phase === 'prompt'} 
                        icon={Sparkles} 
                        color="text-rose-300" 
                        bg="bg-rose-500/10"
                        border="border-rose-500/20"
                    />
                    <StatusChip 
                        label="MESH" 
                        active={phase === 'mesh'} 
                        icon={Grid3X3} 
                        color="text-blue-300"
                        bg="bg-blue-500/10"
                        border="border-blue-500/20"
                    />
                    <StatusChip 
                        label="RENDER" 
                        active={phase === 'design'} 
                        icon={Cpu} 
                        color="text-emerald-300"
                        bg="bg-emerald-500/10"
                        border="border-emerald-500/20"
                    />
                </div>
                

            </div>

            {/* Bottom Bar */}
            <div className="space-y-3">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={phase}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="bg-black/40 backdrop-blur-md border border-white/10 rounded-xl p-3 inline-block max-w-full"
                    >
                        <div className="flex items-center gap-3">
                             <div className="h-8 w-8 shrink-0 rounded-lg bg-white/5 flex items-center justify-center border border-white/10">
                                {phase === 'prompt' && <Sparkles className="w-4 h-4 text-rose-300" />}
                                {phase === 'mesh' && <Grid3X3 className="w-4 h-4 text-blue-300" />}
                                {phase === 'design' && <Cpu className="w-4 h-4 text-emerald-300" />}
                             </div>
                             <div className="min-w-0">
                                 <div className="text-xs font-bold text-white uppercase tracking-wider truncate">
                                     {phase === 'prompt' ? "Processing Input" : 
                                      phase === 'mesh' ? "Generating Topology" : 
                                      "Finalizing Spec"}
                                 </div>
                                 <div className="text-[10px] text-white/50 font-mono truncate">
                                     {phase === 'prompt' ? "Analysis: 'Solitaire Ring'..." : 
                                      phase === 'mesh' ? "Verts: 12,404 | Edges: OK" : 
                                      "Material: Platinum"}
                                 </div>
                             </div>
                        </div>
                    </motion.div>
                </AnimatePresence>

                {/* Progress Bar */}
                <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                    <motion.div 
                        className="h-full bg-linear-to-r from-(--gold-500) to-white"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>
        </div>
    </div>
  );
}

function StatusChip({ label, active, icon: Icon, color, bg, border }: { label: string, active: boolean, icon: any, color: string, bg: string, border: string }) {
    return (
        <motion.div 
            animate={{ opacity: active ? 1 : 0.4, scale: active ? 1 : 0.95 }}
            className={`flex items-center gap-1.5 px-2 py-1 rounded text-[9px] font-bold tracking-widest border ${active ? `${bg} ${border} ${color}` : "bg-transparent border-transparent text-white"}`}
        >
            <Icon className="w-3 h-3" />
            {label}
        </motion.div>
    );
}