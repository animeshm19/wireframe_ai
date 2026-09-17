import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export type PreviewMesh = {
  vertices: Float32Array; normals: Float32Array; triangles: Uint32Array;
};

/**
 * Thumbnail preview of a generated ring.
 *
 * Takes tessellated geometry directly rather than a URL to an STL. The old path
 * serialised the ring to STL in the worker, wrapped it in an object URL and
 * fetched it back — three format conversions to draw a 200px thumbnail, and a
 * lifetime problem on top: revoking the URL while the loader was still fetching
 * produced "STL Load Error: Failed to fetch", which needed a 30-second delayed
 * revoke to paper over. Passing the arrays removes the fetch, the URL and the
 * bug together.
 */
export function StlPreview({ mesh: payload, height = 260 }: {
  mesh: PreviewMesh | null; height?: number;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!payload) return;
    const host = hostRef.current;
    if (!host) return;

    // 2. State Flags for Safety
    let mounted = true;      // Tracks if component is still on screen
    let rafId = 0;           // Animation frame ID
    let renderer: THREE.WebGLRenderer | null = null;
    let scene: THREE.Scene | null = null;
    let camera: THREE.PerspectiveCamera | null = null;
    let controls: OrbitControls | null = null;
    let mesh: THREE.Mesh | null = null;

    // 3. Setup Scene
    try {
      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x0b0610);

      // Camera
      camera = new THREE.PerspectiveCamera(45, host.clientWidth / height, 0.1, 2000);
      camera.position.set(0, 50, 120);

      // Renderer
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(host.clientWidth, height);
      
      // Clear previous canvas if any exists (React Strict Mode fix)
      while (host.firstChild) {
        host.removeChild(host.firstChild);
      }
      host.appendChild(renderer.domElement);

      // Lighting
      const grid = new THREE.GridHelper(200, 40, 0x3a2a44, 0x1b1222);
      (grid.material as THREE.Material).transparent = true;
      (grid.material as THREE.Material).opacity = 0.45;
      scene.add(grid);

      const hemi = new THREE.HemisphereLight(0xffffff, 0x150015, 0.9);
      scene.add(hemi);

      const dir = new THREE.DirectionalLight(0xffffff, 0.9);
      dir.position.set(80, 120, 60);
      scene.add(dir);

      // Controls
      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.07;

      // 4. Build the model. No load step: the geometry is already here.
      const geom = new THREE.BufferGeometry();
      geom.setAttribute("position", new THREE.BufferAttribute(payload.vertices, 3));
      geom.setAttribute("normal", new THREE.BufferAttribute(payload.normals, 3));
      geom.setIndex(new THREE.BufferAttribute(payload.triangles, 1));

      const mat = new THREE.MeshStandardMaterial({
        color: 0xe9e0ff, metalness: 0.2, roughness: 0.35,
      });
      mesh = new THREE.Mesh(geom, mat);
      scene.add(mesh);

      const box = new THREE.Box3().setFromObject(mesh);
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      box.getSize(size);
      box.getCenter(center);
      mesh.position.sub(center);

      const maxDim = Math.max(size.x, size.y, size.z);
      const dist = maxDim > 0 ? maxDim * 1.6 + 30 : 50;
      camera.position.set(0, maxDim * 0.6 + 20, dist);
      camera.lookAt(0, 0, 0);
      controls.target.set(0, 0, 0);
      controls.update();

      // 5. Animation Loop
      const animate = () => {
        if (!mounted || !renderer || !scene || !camera) return;
        
        rafId = requestAnimationFrame(animate);
        
        if (controls) controls.update();
        renderer.render(scene, camera);
      };
      animate();

      // 6. Resize Handler
      const handleResize = () => {
        if (!host || !renderer || !camera) return;
        const w = host.clientWidth;
        const h = height;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      };
      
      // Use ResizeObserver for robust resizing
      const resizeObserver = new ResizeObserver(() => handleResize());
      resizeObserver.observe(host);

      // --- CLEANUP FUNCTION ---
      return () => {
        mounted = false; // Stop all future actions
        cancelAnimationFrame(rafId);
        resizeObserver.disconnect();
        
        if (controls) controls.dispose();
        
        // Clean Mesh
        if (mesh) {
            if (scene) scene.remove(mesh);
            if (mesh.geometry) mesh.geometry.dispose();
            if (mesh.material) {
                if (Array.isArray(mesh.material)) {
                    mesh.material.forEach(m => m.dispose());
                } else {
                    (mesh.material as THREE.Material).dispose();
                }
            }
        }

        // Clean Renderer
        if (renderer) {
            renderer.dispose();
            if (host && renderer.domElement && renderer.domElement.parentNode === host) {
                host.removeChild(renderer.domElement);
            }
        }
      };

    } catch (e) {
      console.error("Three.js Init Error:", e);
      setError("Viewer initialization failed.");
      return () => {};
    }
  }, [payload, height]);

  return (
    <div className="relative group w-full rounded-xl overflow-hidden bg-slate-900/50" style={{ height }}>
        <div ref={hostRef} className="w-full h-full" />
        
        {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 text-red-400 text-sm font-mono p-4 text-center z-20">
                {error}
            </div>
        )}

        {/* Loading Spinner */}
        {!error && !payload && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground z-10">
                <div className="w-6 h-6 border-2 border-white/20 border-t-white/80 rounded-full animate-spin mb-2" />
                <span className="text-xs">Loading Viewer...</span>
            </div>
        )}

        {/* Exports live in the Studio, where the merged solid is. This card
            shows the unfused preview, which is right to look at and wrong to
            hand to a caster, so it deliberately offers no download. */}
    </div>
  );
}