import * as THREE from "three";

/**
 * Turns a lasso drawn on screen into a set of regions of the ring.
 *
 * The naive approach is to intersect the lasso with triangles and remember
 * which ones were hit. That cannot work here: the ring is rebuilt from its spec
 * on every change, and after a rebuild those triangles — and the OCCT faces
 * under them — are different objects with different indices. Selections stored
 * that way silently reattach themselves to the wrong part of the ring. This is
 * the topological naming problem, and it is the reason parametric CAD packages
 * have a reputation for edits that wander.
 *
 * So nothing here refers to geometry. Each pixel is asked a different question:
 * *where on the ring are you?* — which body, and how far round the finger. That
 * answer is a property of the design, not of any particular tessellation of it,
 * so a region selected now still means the same thing after the carat changes,
 * after a rebuild, after a reload, and in the STEP.
 *
 * The angle is written into the colour buffer by a shader and read back, rather
 * than raycast, because a lasso is a region and not a point: reading a few
 * thousand pixels at once is both exact at the silhouette and far cheaper than
 * casting a ray per pixel.
 */

export type PickBody = "metal" | "stone";

export type Region = {
  body: PickBody;
  /** Radians around the finger, measured from the ring's own centre. */
  start: number;
  end: number;
};

const BODY_CODE: Record<PickBody, number> = { metal: 0.25, stone: 0.75 };

/**
 * Writes each fragment's position around the ring into the colour buffer.
 *
 * The angle needs 16 bits to be worth anything — 8 would quantise a ring into
 * 1.4 degree steps, which is coarser than the stones are spaced — so it is
 * split across the green and blue channels. Red carries which body this is.
 */
function pickMaterial(bodyCode: number, ringCentre: THREE.Vector3) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uBody: { value: bodyCode },
      uCentre: { value: ringCentre.clone() },
    },
    vertexShader: /* glsl */`
      varying vec3 vObj;
      void main() {
        vObj = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */`
      varying vec3 vObj;
      uniform float uBody;
      uniform vec3 uCentre;
      void main() {
        // The mesh was recentred on its own bounding box when it was loaded, so
        // the ring's axis is NOT at the origin. Without adding the offset back,
        // every angle is measured about the wrong point and the whole selection
        // is skewed toward the head.
        vec3 p = vObj + uCentre;
        float theta = atan(p.y, p.x);                 // -pi .. pi
        float t = (theta + 3.14159265) / 6.28318531;  // 0 .. 1
        float hi = floor(t * 255.0) / 255.0;
        float lo = fract(t * 255.0);
        gl_FragColor = vec4(uBody, hi, lo, 1.0);
      }
    `,
    side: THREE.DoubleSide,
  });
}

export type Picker = {
  setSize: (w: number, h: number) => void;
  /** Reads the ring positions under a screen-space polygon. */
  pick: (polygon: [number, number][]) => Region[];
  dispose: () => void;
};

/** Even-odd point-in-polygon. */
function inside(px: number, py: number, poly: [number, number][]): boolean {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

/**
 * Groups a set of sampled angles into contiguous runs.
 *
 * A lasso across the shoulder of a ring picks up angles either side of a gap
 * where the metal is hidden behind the stone, and treating those as one region
 * from the first angle to the last would silently select the whole top of the
 * ring. Runs are split wherever the gap exceeds the sampling resolution by a
 * clear margin, and the wrap at ±pi is joined, because a region crossing the
 * bottom of the finger is one region and not two.
 */
/** Into [0, 2pi). */
export function norm2pi(a: number): number {
  const t = Math.PI * 2;
  return ((a % t) + t) % t;
}

/**
 * A gap this wide or narrower does not break a selection, in degrees.
 *
 * A lasso over the head crosses six prongs and the gaps between them, and with
 * a tight tolerance that came back as six separate slivers of three degrees
 * each — none of them wide enough to be worth editing, and all of them in the
 * designer's way. The gap between adjacent prongs on a 1ct head is about five
 * degrees, so anything up to eight is metal the designer meant to include.
 */
const JOIN_GAP_DEG = 8;

/**
 * The narrowest region worth making, in degrees.
 *
 * The engine eases a region in over about nine degrees at each end. A region
 * narrower than the ease can never reach full strength, so a designer who drags
 * the width slider on one sees almost nothing happen and concludes the tool is
 * broken. Selections narrower than this are widened about their own centre
 * rather than discarded: the designer pointed at something.
 */
const MIN_SPAN_DEG = 12;

export function toRegions(angles: number[], body: PickBody, bucket: number): Region[] {
  if (!angles.length) return [];
  // Fold the bucket index into [0, span): an angle a hair under 2pi rounds up
  // to a bucket that does not exist, and a full-ring selection then reads as a
  // region from 0 to 0 — a selection of everything that means nothing.
  const span = Math.round((Math.PI * 2) / bucket);
  const perDeg = span / 360;
  const join = Math.max(2, Math.round(JOIN_GAP_DEG * perDeg));
  const minSpan = Math.round(MIN_SPAN_DEG * perDeg);

  const sorted = [...new Set(
    angles.map((a) => ((Math.round(a / bucket) % span) + span) % span)
  )].sort((x, y) => x - y);

  const runs: number[][] = [];
  let run = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] - sorted[i - 1] <= join) run.push(sorted[i]);
    else { runs.push(run); run = [sorted[i]]; }
  }
  runs.push(run);

  // Join the wrap: the last run ending just under 2pi and the first starting at
  // 0 are the same stretch of metal seen from either side of the seam.
  if (runs.length > 1) {
    const first = runs[0], last = runs[runs.length - 1];
    if (first[0] <= join && last[last.length - 1] >= span - join) {
      runs[0] = [...last.map((v) => v - span), ...first];
      runs.pop();
    }
  }

  return runs
    .filter((r) => r.length > 1)          // a single bucket is a stray pixel
    .map((r) => {
      let lo = r[0], hi = r[r.length - 1];
      const short = minSpan - (hi - lo);
      if (short > 0) {
        // Grow about the centre, so the region stays where it was pointed.
        lo -= Math.floor(short / 2);
        hi += Math.ceil(short / 2);
      }
      return {
        body,
        // A wrapped or widened run can start at a negative bucket; normalising
        // leaves start > end, which is how the engine expects a wrap to look.
        start: norm2pi(lo * bucket),
        end: norm2pi(hi * bucket),
      };
    });
}

export function createPicker(
  renderer: THREE.WebGLRenderer,
  camera: THREE.Camera,
  bodies: () => { mesh: THREE.Mesh; body: PickBody }[],
  ringCentre: () => THREE.Vector3,
): Picker {
  let target = new THREE.WebGLRenderTarget(1, 1, {
    format: THREE.RGBAFormat,
    type: THREE.UnsignedByteType,
    depthBuffer: true,
  });
  const pickScene = new THREE.Scene();
  const materials = new Map<PickBody, THREE.ShaderMaterial>();

  return {
    setSize(w, h) { target.setSize(Math.max(1, w), Math.max(1, h)); },

    pick(polygon) {
      if (polygon.length < 3) return [];
      const size = renderer.getSize(new THREE.Vector2());
      const w = target.width, h = target.height;
      const centre = ringCentre();

      pickScene.clear();
      const proxies: THREE.Mesh[] = [];
      for (const { mesh, body } of bodies()) {
        let m = materials.get(body);
        if (!m) { m = pickMaterial(BODY_CODE[body], centre); materials.set(body, m); }
        (m.uniforms.uCentre.value as THREE.Vector3).copy(centre);
        const proxy = new THREE.Mesh(mesh.geometry, m);
        proxy.applyMatrix4(mesh.matrixWorld);
        pickScene.add(proxy);
        proxies.push(proxy);
      }

      const prevTarget = renderer.getRenderTarget();
      renderer.setRenderTarget(target);
      renderer.setClearColor(0x000000, 0);
      renderer.clear();
      renderer.render(pickScene, camera);

      const buf = new Uint8Array(w * h * 4);
      renderer.readRenderTargetPixels(target, 0, 0, w, h, buf);
      renderer.setRenderTarget(prevTarget);
      for (const p of proxies) pickScene.remove(p);

      // The lasso is in CSS pixels with y down; the buffer is in device pixels
      // with y up. Getting either wrong selects a mirror image of what was drawn.
      const sx = w / size.x, sy = h / size.y;
      const hits: Record<PickBody, number[]> = { metal: [], stone: [] };

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4;
          if (buf[i + 3] === 0) continue;                   // background
          const cssX = x / sx, cssY = size.y - y / sy;
          if (!inside(cssX, cssY, polygon)) continue;

          const body: PickBody | null =
            Math.abs(buf[i] / 255 - BODY_CODE.metal) < 0.15 ? "metal" :
            Math.abs(buf[i] / 255 - BODY_CODE.stone) < 0.15 ? "stone" : null;
          if (!body) continue;

          // The shader wrote theta as 0..1 across -pi..pi. Bring it back into
          // [0, 2pi) here and keep it there: the engine, the highlight shader
          // and the stored spec all use that range, and a selection that leaks
          // a negative angle into the spec silently matches nothing.
          const t = (buf[i + 1] + buf[i + 2] / 255) / 255;
          hits[body].push(norm2pi(t * Math.PI * 2 - Math.PI));
        }
      }

      // One bucket per degree: finer than a designer can aim, coarser than the
      // noise at a silhouette where a pixel can report almost any angle.
      const bucket = Math.PI / 180;
      return [
        ...toRegions(hits.metal, "metal", bucket),
        ...toRegions(hits.stone, "stone", bucket),
      ];
    },

    dispose() {
      target.dispose();
      for (const m of materials.values()) m.dispose();
      materials.clear();
    },
  };
}

/**
 * A translucent overlay marking the selected stretches of the ring.
 *
 * Drawn as a copy of the metal rather than by tinting the metal itself. The
 * metal's material already carries a triplanar shader injection for the surface
 * finish, and threading a second, unrelated concern through the same
 * onBeforeCompile is how that kind of code becomes impossible to change. An
 * overlay also switches off by hiding one object, which is what a selection
 * needs to do constantly.
 *
 * The shader discards every fragment outside the selection, so the highlight
 * follows the real silhouette of the piece — including around the far side —
 * instead of being a flat shape laid over it.
 */
export function createRegionHighlight(): {
  mesh: THREE.Mesh;
  set: (regions: Region[], centre: THREE.Vector3) => void;
  dispose: () => void;
} {
  const MAX = 8;
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    // The overlay is a copy of the metal, so every one of its fragments is
    // exactly coplanar with the surface underneath. Without a depth bias the
    // two take the pixel in turns and the selection renders as stripes.
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
    uniforms: {
      uCount: { value: 0 },
      uSpans: { value: Array.from({ length: MAX * 2 }, () => 0) },
      uCentre: { value: new THREE.Vector3() },
      uTint: { value: new THREE.Color(0x4fb7dd) },
    },
    vertexShader: /* glsl */`
      varying vec3 vObj;
      varying vec3 vNrm;
      void main() {
        vObj = position;
        vNrm = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */`
      varying vec3 vObj;
      varying vec3 vNrm;
      uniform int uCount;
      uniform float uSpans[${MAX * 2}];
      uniform vec3 uCentre;
      uniform vec3 uTint;

      float norm2pi(float a) {
        float t = 6.28318531;
        return mod(mod(a, t) + t, t);
      }

      void main() {
        vec3 p = vObj + uCentre;
        float theta = norm2pi(atan(p.y, p.x));

        bool hit = false;
        for (int i = 0; i < ${MAX}; i++) {
          if (i >= uCount) break;
          float from = norm2pi(uSpans[i * 2]);
          float span = norm2pi(uSpans[i * 2 + 1] - uSpans[i * 2]);
          if (norm2pi(theta - from) <= span) { hit = true; break; }
        }
        if (!hit) discard;

        // Brighter where the surface turns away, so the selection reads as a
        // band wrapped round the metal rather than a sticker on the front of it.
        float rim = pow(1.0 - abs(vNrm.z), 2.0);
        gl_FragColor = vec4(uTint * (0.22 + 0.55 * rim), 1.0);
      }
    `,
  });

  const mesh = new THREE.Mesh(new THREE.BufferGeometry(), material);
  mesh.visible = false;
  mesh.renderOrder = 6;

  return {
    mesh,
    set(regions, centre) {
      const metal = regions.filter((r) => r.body === "metal").slice(0, MAX);
      const spans = material.uniforms.uSpans.value as number[];
      metal.forEach((r, i) => { spans[i * 2] = r.start; spans[i * 2 + 1] = r.end; });
      material.uniforms.uCount.value = metal.length;
      (material.uniforms.uCentre.value as THREE.Vector3).copy(centre);
      mesh.visible = metal.length > 0;
    },
    dispose() {
      mesh.geometry.dispose();
      material.dispose();
    },
  };
}
