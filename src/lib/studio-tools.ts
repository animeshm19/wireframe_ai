import * as THREE from "three";

/**
 * Viewport tooling for the Studio: section cuts, display modes, dimensions,
 * turntable and presentation export.
 *
 * Kept out of the React component deliberately. All of this is imperative
 * WebGL state with its own lifetimes, and interleaving it with render-driven
 * component code is how the Studio ended up with two canvases and an orphaned
 * scene the first time round.
 */

// ------------------------------------------------------------- section cut --

export type SectionAxis = "x" | "y" | "z";

const AXES: Record<SectionAxis, THREE.Vector3> = {
  x: new THREE.Vector3(-1, 0, 0),
  y: new THREE.Vector3(0, -1, 0),
  z: new THREE.Vector3(0, 0, -1),
};

/**
 * A clipping plane that shows a SOLID cross-section rather than a hollow shell.
 *
 * Clipping on its own cuts the triangles away and leaves you looking into an
 * empty husk, which tells a jeweller nothing about wall thickness — the exact
 * thing a section view exists to answer. The fix is the standard stencil
 * approach: draw the back faces of the clipped solid incrementing the stencil
 * and the front faces decrementing it, so every pixel where the cut passes
 * through material ends up non-zero, then fill just those pixels with a cap
 * quad. The result reads as cut metal.
 */
export function createSectionTool(renderer: THREE.WebGLRenderer) {
  renderer.localClippingEnabled = true;

  const plane = new THREE.Plane(AXES.x.clone(), 0);
  const group = new THREE.Group();
  group.visible = false;

  let caps: THREE.Mesh[] = [];
  let extent = 40;

  /**
   * One stencil pass and one cap per body, sequenced by render order.
   *
   * A single shared cap would fill every cut body with the same material, so a
   * sectioned solitaire came out with a diamond made of metal. Each body writes
   * its own stencil, gets its own cap drawn where that stencil is non-zero, and
   * then clears the buffer so the next body starts clean.
   *
   * The caps are unlit on purpose. A shaded cap takes its colour from whatever
   * the environment happens to be behind the cutting plane, so the cross-section
   * goes black exactly when you swing the cut round to look at it — and a
   * section view exists to be read, not admired.
   */
  const bodyGroup = (
    geometry: THREE.BufferGeometry, colour: number, slot: number
  ) => {
    const g = new THREE.Group();
    const base = new THREE.MeshBasicMaterial({
      depthWrite: false, depthTest: false, colorWrite: false,
      stencilWrite: true, stencilFunc: THREE.AlwaysStencilFunc,
    });

    const back = base.clone();
    back.side = THREE.BackSide;
    back.clippingPlanes = [plane];
    back.stencilFail = back.stencilZFail = back.stencilZPass =
      THREE.IncrementWrapStencilOp;

    const front = base.clone();
    front.side = THREE.FrontSide;
    front.clippingPlanes = [plane];
    front.stencilFail = front.stencilZFail = front.stencilZPass =
      THREE.DecrementWrapStencilOp;
    base.dispose();

    const backMesh = new THREE.Mesh(geometry, back);
    backMesh.renderOrder = slot * 10 + 1;
    const frontMesh = new THREE.Mesh(geometry, front);
    frontMesh.renderOrder = slot * 10 + 2;
    g.add(backMesh, frontMesh);

    const capMat = new THREE.MeshBasicMaterial({
      color: colour,
      stencilWrite: true,
      stencilRef: 0,
      stencilFunc: THREE.NotEqualStencilFunc,
      stencilFail: THREE.ReplaceStencilOp,
      stencilZFail: THREE.ReplaceStencilOp,
      stencilZPass: THREE.ReplaceStencilOp,
      side: THREE.DoubleSide,
    });
    const cap = new THREE.Mesh(new THREE.PlaneGeometry(extent, extent), capMat);
    cap.renderOrder = slot * 10 + 3;
    // Clear once this body's cap is down, or the next body inherits its stencil
    // and the two cross-sections bleed into each other.
    cap.onAfterRender = (r) => r.clearStencil();
    g.add(cap);
    caps.push(cap);
    return g;
  };

  const place = () => {
    for (const cap of caps) {
      cap.lookAt(plane.normal);
      cap.position.copy(plane.normal).multiplyScalar(-plane.constant);
    }
  };

  return {
    plane,
    group,

    /** Rebuilds the stencil machinery whenever the geometry changes. */
    attach(bodies: { geometry: THREE.BufferGeometry; colour: number }[], radius: number) {
      for (const cap of caps) {
        cap.geometry.dispose();
        (cap.material as THREE.Material).dispose();
      }
      caps = [];
      group.clear();
      extent = radius * 3;
      bodies.forEach((b, i) => group.add(bodyGroup(b.geometry, b.colour, i)));
      this.setOffset(0);
    },

    setAxis(axis: SectionAxis) {
      plane.normal.copy(AXES[axis]);
      place();
    },

    setOffset(d: number) {
      plane.constant = d;
      place();
    },

    setEnabled(on: boolean, bodies: THREE.Mesh[]) {
      group.visible = on;
      for (const b of bodies) {
        const m = b.material as THREE.Material;
        m.clippingPlanes = on ? [plane] : null;
        m.needsUpdate = true;
      }
    },
  };
}

// ------------------------------------------------------------ display modes --

export type DisplayMode = "shaded" | "edges" | "wireframe" | "xray";
export const DISPLAY_MODES: DisplayMode[] = ["shaded", "edges", "wireframe", "xray"];
export const DISPLAY_LABELS: Record<DisplayMode, string> = {
  shaded: "Shaded",
  edges: "Shaded + edges",
  wireframe: "Wireframe",
  xray: "X-ray",
};

/**
 * Edge overlay for the CAD display modes.
 *
 * EdgesGeometry at 24 degrees picks out the real construction edges — the
 * girdle, the facet boundaries, where the shank meets the head — and ignores
 * the tessellation of the curved surfaces, which is what makes it read as a
 * drawing rather than a mesh dump.
 */
export function buildEdges(geometry: THREE.BufferGeometry, colour = 0x7fd4ff) {
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(geometry, 24),
    new THREE.LineBasicMaterial({ color: colour, transparent: true, opacity: 0.55 })
  );
  edges.visible = false;
  return edges;
}

export function applyDisplayMode(
  mode: DisplayMode,
  bodies: { mesh: THREE.Mesh; edges: THREE.LineSegments | null }[],
) {
  for (const { mesh, edges } of bodies) {
    const m = mesh.material as THREE.MeshPhysicalMaterial;
    mesh.visible = true;
    m.wireframe = mode === "wireframe";
    if (mode === "xray") {
      // Depth-write off with additive blending: overlapping shells accumulate,
      // so the prong seats and the stone's pavilion show through the metal —
      // which is the whole point of asking for x-ray on a setting.
      m.transparent = true;
      m.opacity = 0.28;
      m.depthWrite = false;
      m.blending = THREE.AdditiveBlending;
    } else {
      m.transparent = false;
      m.opacity = 1;
      m.depthWrite = true;
      m.blending = THREE.NormalBlending;
    }
    m.needsUpdate = true;
    if (edges) edges.visible = mode === "edges" || mode === "wireframe";
  }
}

// -------------------------------------------------------------- dimensions --

function labelSprite(text: string): THREE.Sprite {
  const pad = 10, font = 42;
  const c = document.createElement("canvas");
  const ctx = c.getContext("2d")!;
  ctx.font = `${font}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  const w = Math.ceil(ctx.measureText(text).width) + pad * 2;
  c.width = w; c.height = font + pad * 2;
  const g = c.getContext("2d")!;
  g.font = `${font}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  g.fillStyle = "rgba(10,10,14,0.82)";
  g.beginPath();
  if ((g as any).roundRect) (g as any).roundRect(0, 0, c.width, c.height, 10);
  else g.rect(0, 0, c.width, c.height);
  g.fill();
  g.fillStyle = "#9fe6ff";
  g.textBaseline = "middle";
  g.fillText(text, pad, c.height / 2);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  // sizeAttenuation off keeps the label at a constant size on screen instead of
  // scaling with distance. A dimension annotation is a piece of drawing, not a
  // physical object in the scene: it should be equally legible whether you are
  // looking at the whole ring or zoomed into a prong, exactly as it behaves in
  // any CAD package. Sizing them in world units instead gave labels taller than
  // the ring they were measuring.
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: tex, transparent: true, depthTest: false, depthWrite: false,
    sizeAttenuation: false,
  }));
  sprite.renderOrder = 10;
  const h = 0.030;                       // fraction of viewport height
  sprite.scale.set((c.width / c.height) * h, h, 1);
  return sprite;
}

export type DimensionMetrics = {
  innerDiameter: number; outerDiameter: number;
  bandWidth: number; bandThickness: number;
  girdleDiameter: number; stoneHeight: number;
};

/**
 * Dimension annotations that sit in the scene rather than over it.
 *
 * Drawn in 3D so they rotate with the piece and a designer can see which
 * measurement belongs to which feature from any angle. Labels are sprites, so
 * they stay readable side-on; lines are drawn with depthTest off so a leader
 * never disappears behind the shank it is measuring.
 */
export function createDimensions() {
  const group = new THREE.Group();
  group.visible = false;

  const lineMat = new THREE.LineBasicMaterial({
    color: 0x4fb7dd, transparent: true, opacity: 0.85,
    depthTest: false, depthWrite: false,
  });

  const clear = () => {
    for (const child of [...group.children]) {
      group.remove(child);
      const anyChild = child as any;
      anyChild.geometry?.dispose?.();
      anyChild.material?.map?.dispose?.();
      anyChild.material?.dispose?.();
    }
  };

  const leader = (a: THREE.Vector3, b: THREE.Vector3, text: string) => {
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([a, b]), lineMat
    );
    line.renderOrder = 9;
    group.add(line);
    const s = labelSprite(text);
    s.position.copy(b);
    group.add(s);
  };

  return {
    group,
    setVisible: (v: boolean) => { group.visible = v; },
    update(m: DimensionMetrics, radius: number) {
      clear();
      const ri = m.innerDiameter / 2, ro = m.outerDiameter / 2;
      const k = radius;

      // Inner diameter, drawn straight across the finger hole.
      leader(
        new THREE.Vector3(-ri, 0, 0), new THREE.Vector3(ri, 0, 0),
        `Ø${m.innerDiameter.toFixed(2)}`
      );
      // Band thickness, radially outward at four o'clock — clear of the tool
      // palette, which lives over the top-left of the viewport.
      const a = -Math.PI * 0.25;
      leader(
        new THREE.Vector3(Math.cos(a) * ri, Math.sin(a) * ri, 0),
        new THREE.Vector3(Math.cos(a) * (ro + k * 0.28), Math.sin(a) * (ro + k * 0.28), 0),
        `${m.bandThickness.toFixed(2)} t`
      );
      // Band width, along the finger axis.
      leader(
        new THREE.Vector3(0, -ro, -m.bandWidth / 2),
        new THREE.Vector3(0, -(ro + k * 0.28), m.bandWidth / 2),
        `${m.bandWidth.toFixed(2)} w`
      );
      // Stone girdle, out to the side of the head.
      const gy = ro + m.stoneHeight * 0.55;
      leader(
        new THREE.Vector3(-m.girdleDiameter / 2, gy, 0),
        new THREE.Vector3(m.girdleDiameter / 2 + k * 0.26, gy + k * 0.2, 0),
        `Ø${m.girdleDiameter.toFixed(2)}`
      );
    },
    dispose: clear,
  };
}

// ------------------------------------------------------------------ export --

/**
 * Renders the current view at a multiple of the viewport size.
 *
 * A client-facing render has to survive being dropped into a deck at full
 * width, and the viewport is rarely more than 900px across. Rendering at 3x and
 * letting the browser downsample also does the antialiasing the post-processing
 * chain otherwise eats.
 */
export function renderPNG(
  renderer: THREE.WebGLRenderer,
  composer: { setSize: (w: number, h: number) => void; render: () => void },
  camera: THREE.PerspectiveCamera,
  onResize: (w: number, h: number) => void,
  scale = 3,
): string {
  const size = renderer.getSize(new THREE.Vector2());
  const w = Math.round(size.x * scale), h = Math.round(size.y * scale);
  const dpr = renderer.getPixelRatio();

  renderer.setPixelRatio(1);
  renderer.setSize(w, h, false);
  composer.setSize(w, h);
  onResize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  composer.render();

  const url = renderer.domElement.toDataURL("image/png");

  renderer.setPixelRatio(dpr);
  renderer.setSize(size.x, size.y, false);
  composer.setSize(size.x, size.y);
  onResize(size.x, size.y);
  camera.aspect = size.x / size.y;
  camera.updateProjectionMatrix();
  composer.render();

  return url;
}
