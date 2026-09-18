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
import type { CSSProperties } from "react";
import * as THREE from "three";
import { createJewelleryEnvironment } from "../lib/studio-env";
import { finishMaps, applyTriplanar } from "../lib/finishes";
import { METAL_APPEARANCE } from "../lib/ring-spec";
import { createBrilliantGeometry } from "../lib/brilliant-geometry";

type Props = {
  /** 0 → 1. Drives the material state and the camera dolly. */
  progress: React.MutableRefObject<number>;
  /** -1 → 1 each axis. Pointer parallax, also a ref so it never re-renders. */
  pointer: React.MutableRefObject<{ x: number; y: number }>;
  className?: string;
  style?: CSSProperties;
};

export function HeroVisual({ progress, pointer, className, style }: Props) {
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
    renderer.toneMappingExposure = 1.25;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    /* The lighting rig is the Studio's, imported rather than reimplemented.
     *
     * Polished metal is a mirror, so what you see on it IS the rig — which
     * means the rig has to be modelled, not approximated with a few lamps.
     * studio-env builds a jeweller's diffusion tent: a graded enclosure, a
     * broad overhead softbox, deliberately unequal side strips, a low bounce
     * card, a front fill so the inside of the band is not a black hole, and
     * three small hard sources, which are what make a faceted stone throw fire
     * instead of looking like frosted glass.
     *
     * Using the same rig here is also the point: the ring on the landing page
     * and the ring in the Studio are lit by the same lights, so the page is
     * not promising a render the product does not produce. */
    const envScene = createJewelleryEnvironment();

    /* One panel added to the Studio's rig, for this shot only.
     *
     * The Studio shoots the piece from above at a three-quarter angle. The hero
     * shows it close to face-on, and a face-on polished band mirrors whatever
     * is BEHIND the camera — which in a diffusion tent is the one place there
     * is nothing. That is the whole reason the band was reading as gunmetal: it
     * was faithfully reflecting an empty wall. A photographer solves this with a
     * large fill card beside the lens, so that is what this is. The tent itself
     * is untouched, so the Studio is unaffected.
     */
    /* Sized to the front wall of the tent, not to a card. A mirror reflects a
     * solid angle, not a light: a small bright panel puts a small bright streak
     * on the band and leaves the rest of it reflecting black. Covering the
     * whole wall at a moderate level is what a real tent does, and it is what
     * turns the band from gunmetal into platinum. */
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

    /* The backdrop.
     *
     * Not decoration — it is what the stone refracts. transmission renders the
     * scene behind the gem into a buffer and looks through it, so with nothing
     * back there the diamond transmits empty space and comes out a dark hole
     * whatever the rig is doing. The Studio has a graded sweep behind the piece
     * for exactly this reason; this is the same sphere, tinted to the page's
     * ink rather than the Studio's neutral grey so the canvas sits in the
     * layout instead of on top of it.
     *
     * A flat background also makes any render look like a screenshot of a
     * viewport. A graded one makes it look photographed. */
    const backdropCanvas = document.createElement("canvas");
    backdropCanvas.width = 4;
    backdropCanvas.height = 512;
    {
      const g = backdropCanvas.getContext("2d")!;
      const grad = g.createLinearGradient(0, 0, 0, 512);
      grad.addColorStop(0, "#2a1220");
      grad.addColorStop(0.42, "#1b0c15");
      grad.addColorStop(0.72, "#12050e");
      grad.addColorStop(1, "#090106");
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

    // ----------------------------------------------------------- materials --

    /* Scene units are not millimetres here — the ring is drawn at a size that
     * frames well, not at 16.9mm. This is the conversion, so the finish maps
     * can still be placed in real millimetres. */
    const R = 2.45;                    // shank radius, scene units
    const MM_PER_UNIT = 8.45 / R;      // a size 6.5 band is 8.45mm inner radius

    const pointsMat = new THREE.PointsMaterial({
      color: 0xc69bb2,
      size: narrow() ? 0.055 : 0.042,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    const wireMat = new THREE.MeshBasicMaterial({
      color: 0xc69bb2,
      wireframe: true,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });

    /* Platinum, at its measured values.
     *
     * For a metal in a physically based renderer `color` is not a paint colour,
     * it is F0 — the specular reflectance at normal incidence. ring-spec already
     * carries the measured figure for 950 Pt/Ru along with the polish it will
     * actually hold, so the band on this page is the same platinum the Studio
     * renders rather than a colour picked to look nice against the background. */
    const look = METAL_APPEARANCE.platinum;
    const polish = finishMaps("polished");

    const metalMat = new THREE.MeshPhysicalMaterial({
      color: look.color,
      metalness: 1,
      roughness: Math.min(1, polish.roughness + (look.roughness - 0.16) * 0.5),
      normalMap: polish.normalMap,
      roughnessMap: polish.roughnessMap,
      /* The Studio runs this metal at 1.15, inside a viewport the rig fills.
       * Here the ring sits on a dark page with a lot of empty frame around it,
       * and a polished surface is a mirror — so at 1.15 it reflects mostly the
       * dark floor of the tent and reads as gunmetal. The rig is unchanged;
       * only how hard this material listens to it. */
      envMapIntensity: 2.6,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0,
    });
    metalMat.normalScale.set(polish.normalScale, polish.normalScale);
    /* The finish has no UVs to sit on, so it is projected from all three object
     * axes and blended by the surface normal. The scale is in millimetres, which
     * is why the conversion above exists: a polishing line is the width of a
     * real polishing line whatever size the ring is drawn at. */
    applyTriplanar(metalMat, MM_PER_UNIT / polish.tileMm);

    // The head is the same metal as the shank, because on a real solitaire it is.
    const prongMat = metalMat;

    /* Diamond, refractive rather than reflective.
     *
     * transmission must stay at 1: MeshPhysicalMaterial at metalness 0 keeps a
     * diffuse albedo and transmission is what cancels it, so anything less
     * renders a white plastic button. No clearcoat either — a clearcoat over a
     * transmissive body adds a second broad specular that reads as a milky film.
     *
     * Phones get a reflective stand-in. The transmission pass re-renders the
     * scene behind the stone every frame, which is the single most expensive
     * thing on this page, and at phone size the difference is not visible. */
    const gemMat = coarse
      ? new THREE.MeshPhysicalMaterial({
          color: 0xffffff,
          metalness: 0,
          roughness: 0.02,
          reflectivity: 1,
          specularIntensity: 1,
          envMapIntensity: 3.0,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0,
        })
      : new THREE.MeshPhysicalMaterial({
          color: 0xffffff,
          metalness: 0,
          roughness: 0,
          transmission: 1,
          // thickness is a world-space path length, and this scene's units
          // are not the Studio's millimetres. Set from the stone's own depth.
          thickness: 1.4,
          attenuationDistance: 40,
          ior: 2.417,        // diamond, measured
          dispersion: 3.2,   // fire; diamond disperses unusually strongly
          specularIntensity: 1,
          envMapIntensity: 3.2,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0,
        });

    // ------------------------------------------------------------ geometry --

    const ring = new THREE.Group();
    scene.add(ring);

    const shankGeom = new THREE.TorusGeometry(R, 0.26, 40, 160);

    /* A real round brilliant: 57 facets in the arrangement a cutter uses, at
     * GIA reference proportions. A brilliant's whole life comes from discrete
     * planar facets bouncing light at each other, so a smooth revolved cone —
     * which is what was here — has nothing to bounce and reads as a glass
     * pebble however good the material on it is.
     *
     * The girdle radius is set so the stone measures about 7.4mm across, which
     * is what 1.5 carats looks like. */
    const GIRDLE = 7.4 / 2 / MM_PER_UNIT;
    const gemGeom = createBrilliantGeometry({ girdleRadius: GIRDLE });

    // The culet has to clear the outside of the band or the stone reads as
    // embedded in it. Pavilion depth is 0.86 of the girdle radius.
    const GEM_Y = R + 0.26 + GIRDLE * 0.86 + 0.1;

    /* The torus stays in the XY plane, which stands the band upright with the
     * finger axis toward the camera, so the stone at +Y sits on top of the
     * band where a solitaire's stone sits. */
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

    // Four prongs, hugging the girdle and reaching down to the shank.
    const prongGeom = new THREE.CapsuleGeometry(0.092, GEM_Y - R - 0.15, 6, 12);
    const prongSolids: THREE.Mesh[] = [];
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const px = Math.cos(a) * GIRDLE * 0.9;
      const pz = Math.sin(a) * GIRDLE * 0.9;

      const p1 = new THREE.Points(prongGeom, pointsMat);
      const p2 = new THREE.Mesh(prongGeom, wireMat);
      const p3 = new THREE.Mesh(prongGeom, prongMat);
      for (const m of [p1, p2, p3]) {
        m.position.set(px, (GEM_Y + R + 0.26) / 2, pz);
        // A capsule's long axis is already Y; the prong only needs a lean
        // inward toward the girdle it grips.
        m.rotation.z = -Math.cos(a) * 0.16;
        m.rotation.x = Math.sin(a) * 0.16;
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

    /* One key, and only one. The environment does the rest — adding point
     * lights on top of a modelled rig doubles every highlight and is what
     * makes a render look lit rather than photographed. */
    const key = new THREE.DirectionalLight(0xffffff, 1.6);
    key.position.set(6, 9, 7);
    scene.add(key);

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
        ring.rotation.y = 0.34 + Math.sin(t * 0.126) * 0.3 + cur.px * 0.34;
        ring.rotation.x = 0.2 + Math.sin(t * 0.09) * 0.05 - cur.py * 0.16 + p * 0.08;

        // The points breathe while the prompt is being read, then settle.
        const breath = 1 + Math.sin(t * 2.1) * 0.06 * cur.pts;
        shankPoints.scale.setScalar(breath);
        gemPoints.scale.setScalar(breath);
      } else {
        ring.rotation.y = 0.34;
        ring.rotation.x = 0.2;
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
      gemMat.dispose();
      backdrop.geometry.dispose();
      (backdrop.material as THREE.Material).dispose();
      backdropTex.dispose();
      envTexture.dispose();
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

  return <div ref={mountRef} className={className} style={style} aria-hidden="true" />;
}

export default HeroVisual;
