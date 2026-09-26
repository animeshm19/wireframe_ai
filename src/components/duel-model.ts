import { MANUFACTURING_LIMITS, type MetalType } from "../lib/ring-spec";

/** US ring size to inner diameter in mm. The engine's relation (cad-engine, buildRingParts). */
export const innerDiameter = (size: number) => 11.63 + 0.8128 * size;

/** The reference ring both columns start from: 1.50 ct round, platinum, size 6.5. */
export const BASE = {
  size: 6.5,
  seat: 7.4, // mm, girdle of a 1.50 ct round
  wall: 1.8, // mm
  prong: 0.9, // mm
  carat: 1.5,
} as const;

export type Column = {
  seat: number;
  wall: number;
  prong: number;
  carat: number;
};

export type Verdict =
  | { kind: "same" }
  | { kind: "ok" }
  | { kind: "fail"; reason: "seat" | "prong" | "wall"; text: string };

export type Duel = {
  size: number;
  innerDia: number;
  k: number;
  mesh: Column;
  brep: Column;
  meshVerdict: Verdict;
  brepVerdict: Verdict;
};

/**
 * Uniform scaling of a mesh against a rebuild from the spec.
 *
 * Scaling to hit a new size multiplies every length by k and the stone's
 * volume, so its carat, by k³. A rebuild keeps the stone, prongs and wall.
 */
export function duelAt(size: number, metal: MetalType = "platinum"): Duel {
  const L = MANUFACTURING_LIMITS[metal];
  const k = innerDiameter(size) / innerDiameter(BASE.size);

  const mesh: Column = {
    seat: BASE.seat * k,
    wall: BASE.wall * k,
    prong: BASE.prong * k,
    carat: BASE.carat * k ** 3,
  };
  const brep: Column = { seat: BASE.seat, wall: BASE.wall, prong: BASE.prong, carat: BASE.carat };

  const same = Math.abs(size - BASE.size) < 1e-9;

  let meshVerdict: Verdict;
  if (same) meshVerdict = { kind: "same" };
  else if (Math.abs(mesh.seat - BASE.seat) > 0.05)
    meshVerdict = {
      kind: "fail",
      reason: "seat",
      text: `Stone no longer fits the seat (seat ${mesh.seat.toFixed(2)} mm, stone ${BASE.seat.toFixed(2)} mm)`,
    };
  else if (mesh.prong < L.minProngDia)
    meshVerdict = {
      kind: "fail",
      reason: "prong",
      text: `Prongs below casting minimum (${mesh.prong.toFixed(2)} mm, min ${L.minProngDia.toFixed(2)} mm)`,
    };
  else if (mesh.wall < L.minBandThickness)
    meshVerdict = { kind: "fail", reason: "wall", text: "Band below casting minimum" };
  else meshVerdict = { kind: "ok" };

  return {
    size,
    innerDia: innerDiameter(size),
    k,
    mesh,
    brep,
    meshVerdict,
    brepVerdict: same ? { kind: "same" } : { kind: "ok" },
  };
}

/** How far a circle drawn with n flat sides strays from the true circle, in mm. */
export const chordError = (radius: number, sides: number) => radius * (1 - Math.cos(Math.PI / sides));
