import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";

export function StlPreview({ url, height = 260 }: { url: string; height?: number }) {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let raf = 0;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b0610);

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 2000);
    camera.position.set(0, 50, 120);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    host.appendChild(renderer.domElement);

    const grid = new THREE.GridHelper(200, 40, 0x3a2a44, 0x1b1222);
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.45;
    scene.add(grid);

    const hemi = new THREE.HemisphereLight(0xffffff, 0x150015, 0.9);
    scene.add(hemi);

    const dir = new THREE.DirectionalLight(0xffffff, 0.9);
    dir.position.set(80, 120, 60);
    scene.add(dir);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;

    let mesh: THREE.Mesh | null = null;

    const loader = new STLLoader();
    (loader as any).setCrossOrigin?.("anonymous");

    loader.load(
      url,
      (geom) => {
        geom.computeVertexNormals();

        const mat = new THREE.MeshStandardMaterial({
          color: 0xe9e0ff,
          metalness: 0.2,
          roughness: 0.35,
        });

        mesh = new THREE.Mesh(geom, mat);
        scene.add(mesh);

        // Center + frame camera
        const box = new THREE.Box3().setFromObject(mesh);
        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        box.getSize(size);
        box.getCenter(center);

        mesh.position.sub(center);

        const maxDim = Math.max(size.x, size.y, size.z);
        const dist = maxDim * 1.6 + 30;
        camera.position.set(0, maxDim * 0.6 + 20, dist);
        camera.lookAt(0, 0, 0);
        controls.target.set(0, 0, 0);
        controls.update();
      },
      undefined,
      (err) => {
        // eslint-disable-next-line no-console
        console.error("[StlPreview] Failed to load STL:", err);
      }
    );

    const resize = () => {
      const w = host.clientWidth || 1;
      const h = height;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };

    const ro = new ResizeObserver(resize);
    ro.observe(host);
    resize();

    const loop = () => {
      controls.update();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();

      if (mesh) {
        scene.remove(mesh);
        (mesh.geometry as THREE.BufferGeometry).dispose();
        ((mesh.material as any) as THREE.Material).dispose();
      }

      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [url, height]);

  return <div ref={hostRef} className="w-full rounded-xl overflow-hidden" style={{ height }} />;
}
