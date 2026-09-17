import * as THREE from "three";

/**
 * A jewellery photography lighting rig, as an environment map.
 *
 * three's built-in RoomEnvironment is a generic interior: fine for matte
 * product shots, wrong for metal. Polished metal is a mirror — what you see on
 * it IS the lighting, so the rig has to be modelled, not approximated by a few
 * point lights. A jeweller shoots inside a diffusion tent: large soft sources
 * covering most of the upper hemisphere, black cards low and to the sides for
 * the dark passages that make metal read as metal rather than grey plastic.
 *
 * The balance matters more than the brightness. All-bright gives a flat white
 * blob; all-dark gives a black ring with one thin highlight. What reads as real
 * is a big graded source above and clear darks below.
 */

/** Vertical gradient texture — the graded falloff of a real tent. */
function gradient(stops: [number, string][], size = 256): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 4; c.height = size;
  const g = c.getContext("2d")!;
  const grad = g.createLinearGradient(0, 0, 0, size);
  for (const [at, col] of stops) grad.addColorStop(at, col);
  g.fillStyle = grad; g.fillRect(0, 0, 4, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function createJewelleryEnvironment(): THREE.Scene {
  const scene = new THREE.Scene();

  // The tent: graded from a lit ceiling down to near-black at the floor.
  const tent = new THREE.Mesh(
    new THREE.BoxGeometry(60, 44, 60),
    new THREE.MeshBasicMaterial({
      map: gradient([[0, "#8a8a92"], [0.34, "#3a3a41"], [0.62, "#141417"], [1, "#050506"]]),
      side: THREE.BackSide,
    })
  );
  scene.add(tent);

  const panel = (
    w: number, h: number, intensity: number,
    pos: [number, number, number], rot: [number, number, number],
    color = 0xffffff
  ) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide })
    );
    (m.material as THREE.MeshBasicMaterial).color.multiplyScalar(intensity);
    m.position.set(...pos);
    m.rotation.set(...rot);
    scene.add(m);
    return m;
  };

  // Key: a broad softbox overhead, tipped toward the front. Large on purpose —
  // it is the long soft sweep of light along the top of the band.
  panel(34, 24, 3.0, [0, 19, 7], [-Math.PI / 2.3, 0, 0]);

  // Side strips: the highlights that travel around the shank. Deliberately
  // unequal — a perfectly symmetric rig reads as CG, because nothing in a real
  // studio is symmetric.
  panel(7, 34, 2.0, [-19, 3, 3], [0, Math.PI / 2, 0]);
  panel(4, 30, 1.1, [19, 1, 2], [0, -Math.PI / 2, 0]);

  // Rim from behind: separates the piece from the backdrop.
  panel(18, 10, 1.3, [0, 7, -20], [0, 0, 0], 0xeef2ff);

  // Low bounce card: lifts the underside so the shank is not a black hole.
  panel(30, 18, 0.70, [0, -14, 4], [Math.PI / 2.1, 0, 0], 0xfff3e4);
  // Front fill at camera height. The inside of a band is the one surface that
  // sees nothing but the piece itself; without a source low and forward it
  // renders as a black hole, which is the classic CG jewellery giveaway.
  panel(22, 16, 0.55, [0, -2, 21], [0, 0, 0], 0xf2f4ff);

  // Small hard sources. Metal needs a few tight speculars to look polished, and
  // faceted stones need point-like sources to throw fire — a purely soft rig
  // makes a diamond look like frosted glass.
  panel(1.5, 1.5, 34, [-9, 14, 12], [-Math.PI / 3, 0, 0]);
  panel(1.1, 1.1, 26, [10, 11, 13], [-Math.PI / 3.2, 0, 0]);
  panel(1.3, 1.3, 20, [3, -6, 15], [0, 0, 0], 0xffeedd);

  return scene;
}

/** Builds the PMREM environment texture. Caller disposes the generator. */
export function buildEnvironmentTexture(renderer: THREE.WebGLRenderer) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = createJewelleryEnvironment();
  const texture = pmrem.fromScene(env, 0.02).texture;
  env.traverse((o: any) => {
    o.geometry?.dispose?.();
    o.material?.map?.dispose?.();
    o.material?.dispose?.();
  });
  return { texture, pmrem };
}

/**
 * Backdrop sphere. A flat black background makes every render look like a
 * screenshot of a 3D viewport; a graded sweep makes it look photographed.
 */
export function createBackdrop(radius: number): THREE.Mesh {
  const tex = gradient([
    [0, "#2b2833"], [0.42, "#17151d"], [0.72, "#0c0b10"], [1, "#070609"],
  ], 512);
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 32, 24),
    new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, depthWrite: false })
  );
  mesh.renderOrder = -1;
  return mesh;
}
