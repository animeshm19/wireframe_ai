/**
 * Is an STL a closed, printable surface? Pure JS, no kernel.
 *
 * A caster's slicer and a printer's repair tool both start by welding
 * identical vertices and counting how often each edge is used. A closed
 * surface uses every edge exactly twice, once from each side; anything else
 * is a hole, a fin or a sliver, and the bureau either repairs it by guesswork
 * or sends it back. So this does exactly that and nothing cleverer: vertices
 * merge only when their coordinates are bit-for-bit equal, as written in the
 * file, never within a tolerance. A tolerance would hide the very defects
 * this exists to find, such as the zero-area triangle OCCT leaves at a prong
 * tip, whose corners differ by less than any sensible epsilon.
 *
 * Used by the structure audit now, and by the worker before an STL download
 * later in the series.
 */

export type StlCheck = {
  format: "binary" | "ascii";
  triangles: number;
  /** Distinct vertices after the exact merge. */
  vertices: number;
  edges: number;
  /** Edges not used exactly twice: holes (1), fins and non-manifold joins (3+). */
  edgesNot2: number;
  openEdges: number;
  /** How many edges are used n times, keyed by n. */
  edgeUse: Record<number, number>;
  /** Triangles of area under 1e-9 mm². */
  zeroArea: number;
  /**
   * Connected pieces, joining two triangles only across an edge the two of
   * them alone share. That is the connectivity a closed surface has; a zero-
   * area sliver hanging off a non-manifold edge is therefore its own piece.
   */
  components: number;
  /** Triangle count of each component, largest first. */
  componentSizes: number[];
  /** Pieces counted the looser way, across any shared vertex. */
  vertexComponents: number;
  /**
   * Edges not used exactly twice once zero-area triangles are left out: 0
   * means the surface is closed apart from those slivers.
   */
  edgesNot2IgnoringZeroArea: number;
  /** Closed and clean: every edge used twice, no zero-area triangle. */
  watertight: boolean;
};

const ZERO_AREA = 1e-9;

/** Parses either STL flavour into triangles of exact-merged vertex indices. */
function parse(input: ArrayBuffer | Uint8Array | string): {
  format: "binary" | "ascii"; tris: Uint32Array; pos: Float64Array; nv: number;
} {
  let bytes: Uint8Array | null = null;
  if (typeof input !== "string") {
    bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  }

  // Binary is decided by size, not by the header: plenty of binary STLs,
  // OCCT's among them, begin their 80-byte header with the word "solid".
  if (bytes && bytes.byteLength >= 84) {
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const n = dv.getUint32(80, true);
    if (84 + n * 50 === bytes.byteLength) {
      const keyOf = new Map<string, number>();
      const pos: number[] = [];
      const tris = new Uint32Array(n * 3);
      for (let t = 0; t < n; t++) {
        for (let k = 0; k < 3; k++) {
          const at = 84 + t * 50 + 12 + k * 12;
          // The key is the stored bits themselves, so -0 and 0 stay distinct
          // exactly as a slicer reading the file would see them.
          const key = `${dv.getUint32(at, true)},${dv.getUint32(at + 4, true)},${dv.getUint32(at + 8, true)}`;
          let id = keyOf.get(key);
          if (id === undefined) {
            id = keyOf.size;
            keyOf.set(key, id);
            pos.push(dv.getFloat32(at, true), dv.getFloat32(at + 4, true), dv.getFloat32(at + 8, true));
          }
          tris[t * 3 + k] = id;
        }
      }
      return { format: "binary", tris, pos: Float64Array.from(pos), nv: keyOf.size };
    }
  }

  const text = typeof input === "string" ? input : new TextDecoder().decode(bytes!);
  const keyOf = new Map<string, number>();
  const pos: number[] = [];
  const ids: number[] = [];
  const re = /vertex\s+(\S+)\s+(\S+)\s+(\S+)/g;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    const xyz = [Number(m[1]), Number(m[2]), Number(m[3])];
    // Exact on the parsed doubles: two spellings of one number ("1.0", "1")
    // are the same coordinate, and anything else is a different one.
    const key = xyz.map((v) => (Object.is(v, -0) ? "-0" : String(v))).join(",");
    let id = keyOf.get(key);
    if (id === undefined) { id = keyOf.size; keyOf.set(key, id); pos.push(...xyz); }
    ids.push(id);
  }
  const usable = ids.length - (ids.length % 3);
  return { format: "ascii", tris: Uint32Array.from(ids.slice(0, usable)), pos: Float64Array.from(pos), nv: keyOf.size };
}

function find(parent: Int32Array, i: number): number {
  while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; }
  return i;
}
function union(parent: Int32Array, a: number, b: number) {
  const ra = find(parent, a), rb = find(parent, b);
  if (ra !== rb) parent[ra] = rb;
}

export function checkStl(input: ArrayBuffer | Uint8Array | string): StlCheck {
  const { format, tris, pos, nv } = parse(input);
  const nt = tris.length / 3;

  let zeroArea = 0;
  const sliver = new Uint8Array(nt);
  // Undirected edge -> the triangles using it. A Map keyed by a number pair
  // packed into one double: exact for any vertex count an STL will have.
  const users = new Map<number, number[]>();
  const edgeKey = (a: number, b: number) => (a < b ? a * 4294967296 + b : b * 4294967296 + a);

  for (let t = 0; t < nt; t++) {
    const a = tris[t * 3], b = tris[t * 3 + 1], c = tris[t * 3 + 2];
    const ux = pos[b * 3] - pos[a * 3], uy = pos[b * 3 + 1] - pos[a * 3 + 1], uz = pos[b * 3 + 2] - pos[a * 3 + 2];
    const vx = pos[c * 3] - pos[a * 3], vy = pos[c * 3 + 1] - pos[a * 3 + 1], vz = pos[c * 3 + 2] - pos[a * 3 + 2];
    const area = 0.5 * Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx);
    if (area < ZERO_AREA) { zeroArea++; sliver[t] = 1; }
    for (const [p, q] of [[a, b], [b, c], [c, a]]) {
      const k = edgeKey(p, q);
      const list = users.get(k);
      if (list) list.push(t); else users.set(k, [t]);
    }
  }

  const edgeUse: Record<number, number> = {};
  let edgesNot2 = 0, openEdges = 0;
  const byEdge = new Int32Array(nt).map((_, i) => i);
  for (const list of users.values()) {
    const n = list.length;
    edgeUse[n] = (edgeUse[n] ?? 0) + 1;
    if (n !== 2) edgesNot2++;
    if (n === 1) openEdges++;
    // Two distinct triangles alone on an edge: that is a surface continuing.
    if (n === 2 && list[0] !== list[1]) union(byEdge, list[0], list[1]);
  }

  let edgesNot2IgnoringZeroArea = 0;
  for (const list of users.values()) {
    let n = 0;
    for (const t of list) n += sliver[t] ? 0 : 1;
    if (n !== 0 && n !== 2) edgesNot2IgnoringZeroArea++;
  }

  const sizes = new Map<number, number>();
  for (let t = 0; t < nt; t++) {
    const r = find(byEdge, t);
    sizes.set(r, (sizes.get(r) ?? 0) + 1);
  }

  const byVertex = new Int32Array(nv).map((_, i) => i);
  for (let t = 0; t < nt; t++) {
    union(byVertex, tris[t * 3], tris[t * 3 + 1]);
    union(byVertex, tris[t * 3], tris[t * 3 + 2]);
  }
  const used = new Set<number>();
  for (let i = 0; i < tris.length; i++) used.add(find(byVertex, tris[i]));

  return {
    format,
    triangles: nt,
    vertices: nv,
    edges: users.size,
    edgesNot2,
    openEdges,
    edgeUse,
    zeroArea,
    components: sizes.size,
    componentSizes: [...sizes.values()].sort((x, y) => y - x),
    vertexComponents: used.size,
    edgesNot2IgnoringZeroArea,
    watertight: nt > 0 && edgesNot2 === 0 && zeroArea === 0,
  };
}
