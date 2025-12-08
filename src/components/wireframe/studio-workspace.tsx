import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import { Loader2, Save, X, RotateCcw } from "lucide-react";
import { Button } from "../ui/button";
import { useCadWorker } from "../../hooks/useCadWorker";
import { subscribeDesignJob, DesignJob } from "../../lib/design-jobs";

export function StudioWorkspace({ jobId, onClose }: { jobId: string, onClose: () => void }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [params, setParams] = useState<any>(null); // Start null to wait for data
  
  // Use our new hook
  const { generate, modelBlob, isGenerating, error } = useCadWorker();

  // Three.js Refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);

  // 1. DATA: Listen to Firestore
  useEffect(() => {
    if (!jobId) return;
    console.log("Studio: Subscribing to job", jobId);

    const unsubscribe = subscribeDesignJob(jobId, (job: DesignJob) => {
      if (job && job.spec) {
        console.log("Studio: Received spec update", job.spec);
        setParams((prev: any) => ({ ...prev, ...job.spec }));
      }
    });
    return () => unsubscribe();
  }, [jobId]);

  // 2. LOGIC: Trigger Worker when params change
  useEffect(() => {
    if (params) {
      generate(params);
    }
  }, [params, generate]);

  // 3. RENDER: Update Mesh when Blob arrives
  useEffect(() => {
    if (!modelBlob || !sceneRef.current) return;
    
    console.log("Studio: Loading new STL Blob...");
    
    modelBlob.arrayBuffer().then(buffer => {
      const loader = new STLLoader();
      const geometry = loader.parse(buffer);
      geometry.center();
      geometry.computeVertexNormals();

      if (meshRef.current) {
        sceneRef.current.remove(meshRef.current);
        meshRef.current.geometry.dispose();
      }

      // Define colors for the metal types
      const metalColors: Record<string, string> = {
        "18k_gold": "#FFD700",  // Gold
        "14k_rose": "#C69BB2",  // Rose Gold
        "platinum": "#E5E4E2",  // Platinum
        "silver": "#C0C0C0",    // Silver
      };

      // Select color based on AI params (default to platinum if missing)
      const activeColor = params?.metalType ? metalColors[params.metalType] : "#E5E4E2";

      const material = new THREE.MeshStandardMaterial({ 
        color: new THREE.Color(activeColor), 
        metalness: 1.0, // High metalness for shiny look
        roughness: 0.15 // Low roughness for polish
      });
      
      const mesh = new THREE.Mesh(geometry, material);
      mesh.rotation.x = -Math.PI / 2;
      mesh.castShadow = true;
      
      sceneRef.current.add(mesh);
      meshRef.current = mesh;
      console.log("Studio: Mesh updated successfully");
    });
  }, [modelBlob]);

  // 4. SETUP: Initialize Three.js (Once)
  useEffect(() => {
    if (!mountRef.current) return;

    // Standard Three.js Setup
    const w = mountRef.current.clientWidth;
    const h = mountRef.current.clientHeight;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    mountRef.current.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#111");
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
    camera.position.set(0, 30, 50);
    
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // Lights
    RectAreaLightUniformsLib.init();
    const spot = new THREE.SpotLight(0xffffff, 20);
    spot.position.set(20, 40, 20);
    scene.add(spot);
    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambient);

    // Grid
    const grid = new THREE.GridHelper(50, 50, 0x333333, 0x111111);
    scene.add(grid);

    // Animation Loop
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
        const nw = mountRef.current?.clientWidth || 1;
        const nh = mountRef.current?.clientHeight || 1;
        camera.aspect = nw / nh;
        camera.updateProjectionMatrix();
        renderer.setSize(nw, nh);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      mountRef.current?.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div className="flex h-full w-full bg-black relative">
      {/* 3D Viewport */}
      <div ref={mountRef} className="flex-1 h-full w-full cursor-move" />

      {/* Loading Overlay */}
      {isGenerating && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-zinc-900/80 text-white px-4 py-2 rounded-full flex items-center gap-2 backdrop-blur-md border border-white/10">
          <Loader2 className="animate-spin h-4 w-4 text-yellow-500" />
          <span className="text-xs font-medium">Generating Geometry...</span>
        </div>
      )}

      {/* Error Overlay */}
      {error && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-red-900/90 text-white p-6 rounded-xl border border-red-500/50 max-w-md text-center">
          <h3 className="font-bold mb-2">Generation Failed</h3>
          <p className="text-sm opacity-80">{error}</p>
          <Button onClick={() => window.location.reload()} className="mt-4 bg-white/10 hover:bg-white/20">
            Reload Studio
          </Button>
        </div>
      )}

      {/* Close Button */}
      <Button 
        className="absolute top-4 right-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-full h-8 w-8 p-0 flex items-center justify-center"
        onClick={onClose}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}