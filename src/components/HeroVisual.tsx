/**
 * The hero stage.
 *
 * One ring, lit properly, driven by scroll. The scroll position moves it
 * through the three states the product actually has — a cloud of points while
 * the prompt is being read, a wireframe while topology is built, solid metal
 * once it resolves — so scrolling the page *is* the demo. Nothing here is on
 * a timer.
 *
 * This is a pure renderer: it takes a progress number and draws. The prompt
 * line, the spec readout and the copy all live in Hero.tsx, because they are
 * layout and this is a canvas.
 *
 * Three things the previous version did that had to go:
 *
 *   1. It called setProgress() inside the animation loop, so React re-rendered
 *      the whole subtree sixty times a second forever.
 *   2. requestAnimationFrame was never cancelled on unmount. Navigating away
 *      left the loop running for the life of the tab, holding the scene, the
 *      geometry and the WebGL context alive behind it.
 *   3. It rendered at full rate whether or not it was on screen, or whether
 *      the tab was even visible.
 *
 * All three are fixed below: no React state at all, a cancelled handle on
 * teardown with full disposal, and an IntersectionObserver plus a visibility
 * listener that stop the loop when nobody is looking at it.
 */

import { useEffect, useRef } from "react";
import * as THREE from "three";

type Props = {
  /** 0 → 1. Drives the material state and the camera dolly. */
  progress: React.MutableRefObject<number>;
  /** -1 → 1 each axis. Pointer parallax, also a ref so it never re-renders. */
  pointer: React.MutableRefObject<{ x: number; y: number }>;
  className?: string;
};

export function HeroVisual({ progress, pointer, className }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarse = window.matchMedia("(pointer: coarse)").matches;

    let width = mount.clientWidth || 1;
    let height = mount.clientHeight || 1;
    const narrow = () => width < 768;

    // ---------------------------------------------------------------- core --

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 200);
    camera.position.set(0, 2.6, 17);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    // Capped at 2: beyond that the transmission pass costs more than the extra
    // sharpness is worth, and phones lie about their device pixel ratio.
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    /* The environment is the whole difference between metal and grey plastic.
     * A metalness-1 surface has no diffuse colour of its own — it is nothing
     * but a reflection of whatever is around it, so a lamp pointed at it does
     * almost nothing and with no environment at all it renders black.
     *
     * three's stock RoomEnvironment is a grey office and leaves platinum
     * looking like slate. This is a jeweller's bench instead: a large soft
     * overhead box for the long highlight down the top of the band, two
     * upright strips at the sides for the edge catches that describe its
     * curvature, and one warm bounce below so the underside is not a void.
     * Those four rectangles are what the metal is actually showing you. */
    const envScene = new THREE.Scene();
    envScene.background = new THREE.Color(0x3a2730);

    const lightBox = (
      w: number, h: number, colour: number, intensity: number,
      pos: [number, number, number], look: [number, number, number]
    ) => {
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(w, h),
        new THREE.MeshBasicMaterial({ color: colour })
      );
      (m.material as THREE.MeshBasicMaterial).color.multiplyScalar(intensity);
      m.position.set(...pos);
      m.lookAt(...look);
      envScene.add(m);
      return m;
    };

    const envParts = [
      lightBox(16, 16, 0xffffff, 5.2, [0, 9, 0], [0, 0, 0]),      // overhead softbox
      lightBox(5, 13, 0xffe9f2, 3.4, [-8, 1, 2], [0, 1, 0]),      // left strip
      lightBox(5, 13, 0xffffff, 3.0, [8, 1, -1], [0, 1, 0]),      // right strip
      lightBox(12, 7, 0xc69bb2, 1.6, [0, -6, 3], [0, 0, 0]),      // warm bounce
      lightBox(10, 8, 0xe12882, 0.5, [0, 2, -10], [0, 1, 0]),     // rim, brand pink
    ];

    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    const envRT = pmrem.fromScene(envScene, 0.02);
    scene.environment = envRT.texture;

    // ----------------------------------------------------------- materials --

    const PALETTE = {
      metal: 0xd9cbd2,   // the brand mauve, lifted to a polished highlight
      accent: 0xc69bb2,  // --metal-400
      deep: 0x836e76,    // --metal-500
    };

    const pointsMat = new THREE.PointsMaterial({
      color: PALETTE.accent,
      size: narrow() ? 0.055 : 0.042,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    const wireMat = new THREE.MeshBasicMaterial({
      color: PALETTE.accent,
      wireframe: true,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });

    const metalMat = new THREE.MeshStandardMaterial({
      color: PALETTE.metal,
      metalness: 1.0,
      roughness: 0.19,
      envMapIntensity: 2.0,
      transparent: true,
      opacity: 0,
    });

    const prongMat = new THREE.MeshStandardMaterial({
      color: PALETTE.deep,
      metalness: 1.0,
      roughness: 0.2,
      envMapIntensity: 2.1,
      transparent: true,
      opacity: 0,
    });

    // Transmission is the expensive one — it re-renders the scene into a
    // buffer behind the surface every frame. Worth it on a desktop GPU for a
    // hero diamond; not worth it on a phone, which gets a bright dielectric
    // that reads almost the same at that size.
    const gemMat = coarse
      ? new THREE.MeshPhysicalMaterial({
          color: 0xffffff,
          metalness: 0,
          roughness: 0.02,
          clearcoat: 1,
          reflectivity: 1,
          envMapIntensity: 3.0,
          flatShading: true,
          transparent: true,
          opacity: 0,
        })
      : new THREE.MeshPhysicalMaterial({
          color: 0xffffff,
          metalness: 0,
          roughness: 0,
          transmission: 1,
          thickness: 1.1,
          ior: 2.42,          // diamond
          dispersion: 2.2,    // the fire; r180+ ships this on the physical material
          clearcoat: 1,
          envMapIntensity: 3.4,
          specularIntensity: 1,
          flatShading: true,  // facets need flat normals or they read as a blob
          transparent: true,
          opacity: 0,
        });

    // ------------------------------------------------------------ geometry --

    const ring = new THREE.Group();
    scene.add(ring);

    const R = 2.45;          // shank radius
    const shankGeom = new THREE.TorusGeometry(R, 0.26, 40, 160);

    /* A round brilliant, revolved from its real profile rather than faked with
     * an octahedron. Sixteen radial segments with flat shading gives facets
     * that actually catch the environment; the proportions are the standard
     * ones — table a little over half the girdle, crown shallow, pavilion deep. */
    const girdleR = 1.02;
    const profile = [
      new THREE.Vector2(0.0, -1.0),            // culet
      new THREE.Vector2(girdleR * 0.62, -0.28),
      new THREE.Vector2(girdleR, 0.0),         // girdle
      new THREE.Vector2(girdleR * 0.97, 0.06),
      new THREE.Vector2(girdleR * 0.56, 0.34), // table edge
      new THREE.Vector2(0.0, 0.34),            // table
    ];
    const gemGeom = new THREE.LatheGeometry(profile, 16);
    gemGeom.computeVertexNormals();

    /* The culet has to clear the outside of the band, or the stone reads as
     * embedded in it rather than held above it. Band outer edge is R + tube;
     * the stone's lowest point is GEM_Y - 1.0, so this puts roughly 0.2 of
     * clear air under the culet, which is where a head actually holds it. */
    const GEM_Y = R + 1.45;

    /* The torus is left in the XY plane, which stands the band upright with
     * the finger axis pointing at the camera — so the stone at +Y sits on top
     * of the band where a solitaire's stone actually sits. The previous
     * version rotated this by a quarter turn, which laid the band flat and
     * left the stone hovering in the middle of the hole with nothing under
     * it. That is why the old hero read as a spiral disc rather than a ring. */
    const shankPoints = new THREE.Points(shankGeom, pointsMat);
    const shankWire = new THREE.Mesh(shankGeom, wireMat);
    const shankSolid = new THREE.Mesh(shankGeom, metalMat);
    for (const m of [shankPoints, shankWire, shankSolid]) ring.add(m);

    const gemPoints = new THREE.Points(gemGeom, pointsMat);
    const gemWire = new THREE.Mesh(gemGeom, wireMat);
    const gemSolid = new THREE.Mesh(gemGeom, gemMat);
    for (const m of [gemPoints, gemWire, gemSolid]) {
      m.position.y = GEM_Y;
      ring.add(m);
    }

    // Four prongs, angled in toward the girdle the way a real head sits.
    const prongGeom = new THREE.CapsuleGeometry(0.085, 1.35, 6, 12);
    const prongSolids: THREE.Mesh[] = [];
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const px = Math.cos(a) * 0.82;
      const pz = Math.sin(a) * 0.82;

      const p1 = new THREE.Points(prongGeom, pointsMat);
      const p2 = new THREE.Mesh(prongGeom, wireMat);
      const p3 = new THREE.Mesh(prongGeom, prongMat);
      for (const m of [p1, p2, p3]) {
        m.position.set(px, GEM_Y - 0.62, pz);
        /* A capsule's long axis is already Y, so the prong only needs a small
         * lean inward toward the girdle. Pointing it with lookAt instead laid
         * each one across the face of the stone, which is what the earlier
         * pass was drawing. */
        m.rotation.z = -Math.cos(a) * 0.2;
        m.rotation.x = Math.sin(a) * 0.2;
        ring.add(m);
      }
      prongSolids.push(p3);
    }

    /* A soft contact shadow. A radial gradient on a plane costs one draw call
     * and does more to seat the object in space than a shadow map would at
     * this size. */
    const shadowCanvas = document.createElement("canvas");
    shadowCanvas.width = shadowCanvas.height = 256;
    const sctx = shadowCanvas.getContext("2d")!;
    const grad = sctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    grad.addColorStop(0, "rgba(0,0,0,0.55)");
    grad.addColorStop(0.45, "rgba(0,0,0,0.22)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    sctx.fillStyle = grad;
    sctx.fillRect(0, 0, 256, 256);
    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(11, 11),
      new THREE.MeshBasicMaterial({
        map: shadowTex,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = -R - 0.5;
    scene.add(shadow);

    // -------------------------------------------------------------- lights --

    const key = new THREE.DirectionalLight(0xfff4f8, 2.4);
    key.position.set(5, 8, 6);
    scene.add(key);

    const rim = new THREE.PointLight(PALETTE.accent, 40, 40);
    rim.position.set(-6, 1.5, -7);
    scene.add(rim);

    const fill = new THREE.PointLight(0xe12882, 14, 30);
    fill.position.set(5, -3, 3);
    scene.add(fill);

    // ---------------------------------------------------------------- loop --

    let raf = 0;
    let running = true;
    let t = 0;
    let last = performance.now();

    // Current values, eased toward their targets so a fast scroll does not
    // snap the materials.
    const cur = { pts: 0, wire: 0, solid: 0, shadow: 0, px: 0, py: 0 };

    const lerp = (a: number, b: number, n: number) => a + (b - a) * n;

    /* Frame-rate independent easing.
     *
     * A fixed per-frame factor is not a speed, it is a speed per frame: the
     * same 0.075 settles twice as fast on a 120Hz display as on 60Hz, and on
     * a machine dropping frames it crawls. Converting a time constant into
     * this frame's factor makes the motion take the same wall-clock time
     * everywhere. tau is the time to close about 63% of the remaining gap. */
    const approach = (dt: number, tau: number) => 1 - Math.exp(-dt / tau);
    const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
    // Smooth ramp between two thresholds — a plain step makes the materials pop.
    const band = (v: number, from: number, to: number) =>
      clamp01((v - from) / (to - from));

    const render = () => {
      const now = performance.now();
      // Clamped so a backgrounded tab or a long stall does not arrive back
      // with a single enormous step.
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;

      const p = clamp01(progress.current);

      /* Three overlapping windows rather than three hard phases, so the states
       * cross-dissolve through each other as you scroll. */
      const tPts = 1 - band(p, 0.06, 0.34);
      const tWire = band(p, 0.14, 0.36) * (1 - band(p, 0.46, 0.66));
      const tSolid = band(p, 0.52, 0.78);

      const ease = reduced ? 1 : approach(dt, 0.16);
      cur.pts = lerp(cur.pts, tPts, ease);
      cur.wire = lerp(cur.wire, tWire, ease);
      cur.solid = lerp(cur.solid, tSolid, ease);
      cur.shadow = lerp(cur.shadow, tSolid * 0.9, ease);

      pointsMat.opacity = cur.pts;
      wireMat.opacity = cur.wire * 0.85;
      metalMat.opacity = cur.solid;
      prongMat.opacity = cur.solid;
      gemMat.opacity = cur.solid;
      (shadow.material as THREE.MeshBasicMaterial).opacity = cur.shadow;

      // Materials with opacity 0 still cost a draw call and, for the gem, a
      // whole transmission pass. Skip them outright.
      shankPoints.visible = gemPoints.visible = cur.pts > 0.01;
      shankWire.visible = gemWire.visible = cur.wire > 0.01;
      shankSolid.visible = gemSolid.visible = cur.solid > 0.01;
      for (const m of prongSolids) m.visible = cur.solid > 0.01;

      if (!reduced) {
        t += dt;

        // Pointer parallax, eased hard so it feels like weight rather than
        // like the object is stuck to the cursor.
        const pEase = approach(dt, 0.34);
        cur.px = lerp(cur.px, pointer.current.x, pEase);
        cur.py = lerp(cur.py, pointer.current.y, pEase);

        /* An upright ring spun continuously about Y goes edge-on twice a
         * turn and vanishes. It sways inside a range that always keeps a
         * three-quarter view instead — you see the face and the side of the
         * band at once, which is how a ring is photographed. */
        ring.rotation.y = Math.sin(t * 0.126) * 0.42 + cur.px * 0.38;
        ring.rotation.x = -0.14 + Math.sin(t * 0.09) * 0.05 - cur.py * 0.16 + p * 0.1;

        // The points breathe while the prompt is being read, then settle.
        const breath = 1 + Math.sin(t * 2.1) * 0.06 * cur.pts;
        shankPoints.scale.setScalar(breath);
        gemPoints.scale.setScalar(breath);
      } else {
        ring.rotation.y = 0.42;
        ring.rotation.x = -0.14;
      }

      // The camera closes in a little as the piece resolves.
      const camEase = approach(dt, 0.22);
      const z = (narrow() ? 20.5 : 17.0) - p * 1.8;
      camera.position.z = lerp(camera.position.z, z, camEase);
      camera.position.y = lerp(camera.position.y, 2.6 - p * 0.7, camEase);
      // Aimed between the band and the stone, not at the origin, so the piece
      // is framed as one object rather than sliding off the top.
      camera.lookAt(0, 0.9, 0);

      renderer.render(scene, camera);
    };

    const tick = () => {
      if (!running) return;
      raf = requestAnimationFrame(tick);
      render();
    };

    const start = () => {
      if (running) return;
      running = true;
      raf = requestAnimationFrame(tick);
    };
    const stop = () => {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };

    raf = requestAnimationFrame(tick);

    // Stop when scrolled past, and when the tab is in the background.
    const io = new IntersectionObserver(
      ([e]) => (e.isIntersecting ? start() : stop()),
      { threshold: 0 }
    );
    io.observe(mount);

    const onVisibility = () => (document.hidden ? stop() : start());
    document.addEventListener("visibilitychange", onVisibility);

    // -------------------------------------------------------------- resize --

    const ro = new ResizeObserver(() => {
      if (!mount.clientWidth || !mount.clientHeight) return;
      width = mount.clientWidth;
      height = mount.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      pointsMat.size = narrow() ? 0.055 : 0.042;
    });
    ro.observe(mount);

    // ------------------------------------------------------------- cleanup --

    return () => {
      stop();
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);

      shankGeom.dispose();
      gemGeom.dispose();
      prongGeom.dispose();
      shadow.geometry.dispose();
      (shadow.material as THREE.Material).dispose();
      shadowTex.dispose();
      pointsMat.dispose();
      wireMat.dispose();
      metalMat.dispose();
      prongMat.dispose();
      gemMat.dispose();
      for (const m of envParts) {
        m.geometry.dispose();
        (m.material as THREE.Material).dispose();
      }
      envRT.dispose();
      pmrem.dispose();

      renderer.dispose();
      // Frees the GL context outright rather than waiting for the driver to
      // notice. Browsers cap the number of live contexts per page, and this
      // one used to be leaked on every navigation away from the home route.
      renderer.forceContextLoss();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, [progress, pointer]);

  return <div ref={mountRef} className={className} aria-hidden="true" />;
}

export default HeroVisual;
