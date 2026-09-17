import * as THREE from "three";

/**
 * Surface finishes.
 *
 * The single biggest reason CG jewellery reads as fake is that the metal is
 * perfectly smooth. Real metal carries polishing lines, roughness variation and
 * — for brushed finishes — directional (anisotropic) reflection. These maps are
 * generated procedurally on a canvas so there are no texture assets to ship.
 */
export type Finish =
  | "polished" | "satin" | "matte" | "hammered" | "florentine";

export const FINISHES: Finish[] = ["polished", "satin", "matte", "hammered", "florentine"];

export const FINISH_LABELS: Record<Finish, string> = {
  polished: "High polish",
  satin: "Satin / brushed",
  matte: "Matte / sandblasted",
  hammered: "Hammered",
  florentine: "Florentine",
};

const SIZE = 512;

function canvas2d(size = SIZE) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  return { c, ctx: c.getContext("2d")! };
}

/** Sobel a height field into a tangent-space normal map. */
function heightToNormal(height: HTMLCanvasElement, strength: number): THREE.CanvasTexture {
  const w = height.width, h = height.height;
  const src = height.getContext("2d")!.getImageData(0, 0, w, h).data;
  const { c, ctx } = canvas2d(w);
  const out = ctx.createImageData(w, h);
  const at = (x: number, y: number) =>
    src[((((y % h) + h) % h) * w + (((x % w) + w) % w)) * 4];

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = ((at(x + 1, y) - at(x - 1, y)) / 255) * strength;
      const dy = ((at(x, y + 1) - at(x, y - 1)) / 255) * strength;
      const len = Math.hypot(dx, dy, 1);
      const i = (y * w + x) * 4;
      out.data[i] = ((-dx / len) * 0.5 + 0.5) * 255;
      out.data[i + 1] = ((-dy / len) * 0.5 + 0.5) * 255;
      out.data[i + 2] = ((1 / len) * 0.5 + 0.5) * 255;
      out.data[i + 3] = 255;
    }
  }
  ctx.putImageData(out, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function toTexture(c: HTMLCanvasElement, repeat: number) {
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  return tex;
}

/** Height field per finish. Grey = flat; deviations become surface relief. */
function heightField(finish: Finish): HTMLCanvasElement {
  const { c, ctx } = canvas2d();
  ctx.fillStyle = "#808080";
  ctx.fillRect(0, 0, SIZE, SIZE);

  switch (finish) {
    case "polished": {
      // Faint, mostly-random polishing haze. Barely there, but it stops the
      // surface being mathematically perfect.
      const img = ctx.getImageData(0, 0, SIZE, SIZE);
      for (let i = 0; i < img.data.length; i += 4) {
        const n = 128 + (Math.random() - 0.5) * 6;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = n;
      }
      ctx.putImageData(img, 0, 0);
      break;
    }

    case "satin": {
      // Directional brushing: long fine scratches along one axis.
      for (let i = 0; i < 2600; i++) {
        const y = Math.random() * SIZE;
        const v = 128 + (Math.random() - 0.5) * 70;
        ctx.strokeStyle = `rgb(${v},${v},${v})`;
        ctx.lineWidth = Math.random() * 1.6 + 0.3;
        ctx.beginPath();
        const x0 = Math.random() * SIZE;
        ctx.moveTo(x0, y);
        ctx.lineTo(x0 + SIZE * (0.3 + Math.random() * 0.9), y + (Math.random() - 0.5) * 2);
        ctx.stroke();
      }
      break;
    }

    case "matte": {
      // Sandblasted: dense fine pitting, no direction.
      const img = ctx.getImageData(0, 0, SIZE, SIZE);
      for (let i = 0; i < img.data.length; i += 4) {
        const n = 128 + (Math.random() - 0.5) * 90;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = n;
      }
      ctx.putImageData(img, 0, 0);
      break;
    }

    case "hammered": {
      // Overlapping planishing dents from a rounded hammer face.
      //
      // A dent is a smooth concave bowl, so the height falls toward the centre
      // and returns to the surrounding level at the rim. Ending the gradient on
      // a dark ring instead of a transparent one puts a hard step at every
      // dent's edge, and the Sobel turns each of those steps into a crease — the
      // surface then reads as cracked glaze rather than beaten metal.
      //
      // Each dent is drawn nine times, offset by one tile in each direction, so
      // the pattern wraps. Without that the tile edges leave straight seams
      // running around the band, which no hammer ever made.
      for (let i = 0; i < 150; i++) {
        const x = Math.random() * SIZE, y = Math.random() * SIZE;
        const r = 18 + Math.random() * 26;
        const depth = 0.55 + Math.random() * 0.35;
        for (const dx of [-SIZE, 0, SIZE]) for (const dy of [-SIZE, 0, SIZE]) {
          const cx = x + dx, cy = y + dy;
          if (cx < -r || cx > SIZE + r || cy < -r || cy > SIZE + r) continue;
          const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
          g.addColorStop(0, `rgba(84,84,84,${depth})`);
          g.addColorStop(0.55, `rgba(112,112,112,${depth * 0.45})`);
          g.addColorStop(1, "rgba(128,128,128,0)");
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;
    }

    case "florentine": {
      // Cross-hatched engraving, the classic two-pass Florentine texture.
      for (const angle of [Math.PI / 5, -Math.PI / 5]) {
        ctx.save();
        ctx.translate(SIZE / 2, SIZE / 2);
        ctx.rotate(angle);
        ctx.translate(-SIZE, -SIZE);
        for (let y = 0; y < SIZE * 2; y += 5) {
          const v = 128 + (Math.random() - 0.5) * 95;
          ctx.strokeStyle = `rgb(${v},${v},${v})`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(SIZE * 2, y);
          ctx.stroke();
        }
        ctx.restore();
      }
      break;
    }
  }
  return c;
}

/** Roughness field: darker = shinier. Variation here is what kills the plastic look. */
function roughnessField(finish: Finish, base: number): HTMLCanvasElement {
  const { c, ctx } = canvas2d(256);
  const b = Math.round(base * 255);
  ctx.fillStyle = `rgb(${b},${b},${b})`;
  ctx.fillRect(0, 0, 256, 256);
  const spread = finish === "polished" ? 12 : finish === "satin" ? 46 : 30;
  const img = ctx.getImageData(0, 0, 256, 256);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.max(0, Math.min(255, b + (Math.random() - 0.5) * spread));
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

export type FinishMaps = {
  normalMap: THREE.Texture;
  roughnessMap: THREE.Texture;
  normalScale: number;
  roughness: number;
  anisotropy: number;
  anisotropyRotation: number;
  repeat: number;
  /** Texture tile size in millimetres — the finish's real physical scale. */
  tileMm: number;
};

const SETTINGS: Record<Finish, {
  strength: number; normalScale: number; roughness: number;
  anisotropy: number; repeat: number; tileMm: number;
}> = {
  polished:   { strength: 1.2, normalScale: 0.06, roughness: 0.07, anisotropy: 0.0, repeat: 3, tileMm: 2.0 },
  satin:      { strength: 5.0, normalScale: 0.38, roughness: 0.34, anisotropy: 0.9, repeat: 4, tileMm: 1.6 },
  matte:      { strength: 6.0, normalScale: 0.50, roughness: 0.62, anisotropy: 0.0, repeat: 7, tileMm: 1.1 },
  hammered:   { strength: 7.0, normalScale: 0.85, roughness: 0.20, anisotropy: 0.0, repeat: 2, tileMm: 17.0 },
  florentine: { strength: 6.5, normalScale: 0.55, roughness: 0.30, anisotropy: 0.5, repeat: 3, tileMm: 5.5 },
};

const cache = new Map<Finish, FinishMaps>();

/** Builds (and caches) the micro-surface maps for a finish. */
export function finishMaps(finish: Finish): FinishMaps {
  const hit = cache.get(finish);
  if (hit) return hit;

  const s = SETTINGS[finish];
  const normalMap = heightToNormal(heightField(finish), s.strength);
  normalMap.repeat.set(s.repeat, s.repeat);
  const roughnessMap = toTexture(roughnessField(finish, s.roughness), s.repeat);

  const maps: FinishMaps = {
    normalMap,
    roughnessMap,
    normalScale: s.normalScale,
    roughness: s.roughness,
    anisotropy: s.anisotropy,
    anisotropyRotation: Math.PI / 2,
    repeat: s.repeat,
    tileMm: s.tileMm,
  };
  cache.set(finish, maps);
  return maps;
}

// ------------------------------------------------------- triplanar mapping --

/**
 * Projects the finish maps onto the metal without UV coordinates.
 *
 * The geometry reaches the renderer as an STL — a triangle soup with positions
 * and normals and nothing else. No UVs means every texture lookup samples the
 * same texel, so the finish maps were being applied and having no effect at all:
 * a constant normal perturbation is the identity, and a constant roughness is
 * just a number. Unwrapping CAD output is a problem with no good answer (seams,
 * stretched prongs, a new unwrap every time a parameter changes), so instead the
 * texture is projected from all three axes in object space and blended by the
 * surface normal. No UVs, no seams, no unwrap step, and it keeps working for
 * every future body — pavé, milgrain, split shanks — for free.
 *
 * The normals use the UDN blend: sample three tangent-space normals, fold each
 * into the object normal, and weight them by the same blend. Averaging the raw
 * vectors instead would cancel out the detail on any surface facing between two
 * axes, which on a ring is most of it.
 */
export function applyTriplanar(
  mat: THREE.MeshPhysicalMaterial, worldScale: number
) {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTriScale = { value: worldScale };

    shader.vertexShader = shader.vertexShader
      .replace("#include <common>",
        "#include <common>\nvarying vec3 vObjPos;\nvarying vec3 vObjNrm;")
      .replace("#include <begin_vertex>",
        "#include <begin_vertex>\nvObjPos = transformed;\nvObjNrm = objectNormal;");

    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", /* glsl */`
        #include <common>
        varying vec3 vObjPos;
        varying vec3 vObjNrm;
        uniform float uTriScale;
        // three declares normalMatrix in the vertex stage only; the object->view
        // rotation is needed here to put the triplanar normal back in view space.
        uniform mat3 normalMatrix;
        vec3 triBlend(vec3 n) {
          vec3 b = pow(abs(n), vec3(6.0));
          return b / max(b.x + b.y + b.z, 1e-4);
        }
        vec4 triSample(sampler2D m, vec3 p, vec3 b) {
          return texture2D(m, p.zy * uTriScale) * b.x
               + texture2D(m, p.xz * uTriScale) * b.y
               + texture2D(m, p.xy * uTriScale) * b.z;
        }
      `)
      .replace("#include <roughnessmap_fragment>", /* glsl */`
        float roughnessFactor = roughness;
        #ifdef USE_ROUGHNESSMAP
          roughnessFactor *= triSample(
            roughnessMap, vObjPos, triBlend(normalize(vObjNrm))).g;
        #endif
      `)
      .replace("#include <normal_fragment_maps>", /* glsl */`
        #ifdef USE_NORMALMAP
          {
            vec3 on = normalize(vObjNrm);
            vec3 bl = triBlend(on);
            vec3 tx = triSample3(normalMap, vObjPos.zy * uTriScale);
            vec3 ty = triSample3(normalMap, vObjPos.xz * uTriScale);
            vec3 tz = triSample3(normalMap, vObjPos.xy * uTriScale);
            tx.xy *= normalScale; ty.xy *= normalScale; tz.xy *= normalScale;
            // UDN blend: fold each tangent normal into the object normal.
            tx = vec3(tx.xy + on.zy, abs(tx.z) * on.x);
            ty = vec3(ty.xy + on.xz, abs(ty.z) * on.y);
            tz = vec3(tz.xy + on.xy, abs(tz.z) * on.z);
            vec3 objN = normalize(tx.zyx * bl.x + ty.xzy * bl.y + tz.xyz * bl.z);
            normal = normalize(normalMatrix * objN);
          }
        #endif
      `);

    // Small helper, declared after <common> so it can use the sampler type.
    shader.fragmentShader = shader.fragmentShader.replace(
      "vec4 triSample(sampler2D m, vec3 p, vec3 b) {",
      "vec3 triSample3(sampler2D m, vec2 uv) { return texture2D(m, uv).xyz * 2.0 - 1.0; }\n        vec4 triSample(sampler2D m, vec3 p, vec3 b) {"
    );
  };
  // Without this, three reuses a cached program compiled for a different scale.
  mat.customProgramCacheKey = () => "triplanar:" + worldScale.toFixed(4);
  mat.needsUpdate = true;
}

/**
 * Writes cylindrical UVs around the finger axis onto CAD geometry.
 *
 * These are not used to place textures — the triplanar projection above does
 * that. They exist only so three can build a tangent frame, which it derives
 * from UV derivatives. Anisotropic reflection needs that frame: it is what tells
 * the shader which way the surface is brushed, and with no UVs the derivatives
 * are zero, the frame degenerates, and every lit pixel comes out NaN — which is
 * why a satin band rendered as nothing at all.
 *
 * Wrapping the angle around the finger axis is not an arbitrary choice: a
 * jeweller brushes a band by spinning it against the wheel, so the grain runs
 * around the circumference, which is exactly where this frame points.
 *
 * The seam is handled per triangle. STL geometry is non-indexed, so a triangle
 * straddling the ±pi cut can simply have its low corners pushed up by one turn;
 * left alone it would report an enormous UV derivative and put a bright scar
 * down one side of the ring.
 */
export function addCylindricalUVs(geom: THREE.BufferGeometry, vScale = 0.25) {
  const pos = geom.getAttribute("position");
  const n = pos.count;
  const uv = new Float32Array(n * 2);
  const TAU = Math.PI * 2;

  for (let t = 0; t < n; t += 3) {
    const a: number[] = [];
    for (let k = 0; k < 3; k++) {
      a.push(Math.atan2(pos.getY(t + k), pos.getX(t + k)) / TAU);
    }
    const hi = Math.max(...a);
    if (hi - Math.min(...a) > 0.5) {
      for (let k = 0; k < 3; k++) if (hi - a[k] > 0.5) a[k] += 1;
    }
    for (let k = 0; k < 3; k++) {
      uv[(t + k) * 2] = a[k];
      uv[(t + k) * 2 + 1] = pos.getZ(t + k) * vScale;
    }
  }
  geom.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
}
