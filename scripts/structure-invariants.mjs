/**
 * The structure invariants: what a ring's head must be, and from which prompt
 * of the ring-structure series each rule is enforced.
 *
 * One table, so a later prompt flips an expectation in exactly one place.
 * `requiredFrom(spec)` names the stage at which the rule starts to bind for
 * that design; before it the result is reported and nothing fails. Rules that
 * bind some settings earlier than others say so here, as a predicate on the
 * spec, rather than as a single stage.
 *
 * Every threshold is read from the EFFECTIVE bench values the audit recorded
 * for that design (result.bench.values), never from a default: a design that
 * asks for a 0.8 mm gap under the culet is held to 0.8 (STRUCTURE-RULES 6a).
 *
 * Statuses:
 *   PASS  measured and within the rule
 *   FAIL  measured and outside it, or the measurement itself failed
 *   N/A   the rule has nothing to measure on this design (no gallery on a bezel)
 *   TODO  the rule applies but its measurement does not exist yet; a TODO
 *         that is required counts as a failure, so the prompt that makes a
 *         rule binding cannot forget to give it a measurement
 */

export const STAGES = ["S0", "S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8"];
export const stageIndex = (s) => {
  const i = STAGES.indexOf(s);
  if (i < 0) throw new Error(`unknown stage ${s}; expected one of ${STAGES.join(", ")}`);
  return i;
};

// Fixed standards the rules use, mirrored from FIXED_STANDARDS in
// src/lib/setting-standards.ts; checked against it by the audit script at
// start-up, so the two cannot drift.
export const JOINT_AREA_RATIO = 1.0;

const setting = (spec) => spec.setting ?? "prong";
/** Settings whose centre stone the S1 seat work must clear of all metal. */
const prongLike = (spec) => setting(spec) === "prong" || setting(spec) === "three_stone";
/** Settings with a prong head at the centre: every one gets S1's seats and as-cast prongs. */
const prongHead = (spec) => setting(spec) !== "bezel";
/** The centre head's bearings, or none (a bezel). */
const centreBearings = (r) => (r.bearings ?? []).filter((b) => b.head === "centre");
const num = (x) => typeof x === "number" && Number.isFinite(x);
/** A measured gap, or Infinity (as JSON writes it) where nothing is there to measure. */
const clearOrNone = (x) => num(x) || x === Infinity || x === "Infinity";
const fmt = (x) => (num(x) ? String(+x.toFixed(4)) : String(x));

/**
 * A value the engine held to what this stone's size allows, and reported as
 * an engine clamp with the value asked and the value built (Animesh's
 * decision on S2's question 25, 2026-10-18: impossible combinations are
 * clamped by size, reported with both numbers, and the bounds stay): the
 * value built, for judging; else the value asked.
 */
const heldTo = (r, key, asked) => {
  // Only a hold that lowers the value, and not under the field's own minimum
  // for the alloy, as the audit read it from the standards (review: the
  // warning alone was taken on the engine's word).
  const min = r.bounds?.[key]?.min;
  const w = (r.bench?.warnings ?? []).find((x) => x.key === key && x.kind === "engine-clamped" &&
    num(x.asked) && num(x.delivered) && Math.abs(x.asked - asked) < 1e-9 &&
    x.delivered < asked - 1e-9 && num(min) && x.delivered >= min - 1e-9);
  return w ? w.delivered : asked;
};

const pass = (detail = "") => ({ status: "PASS", detail });
const fail = (detail) => ({ status: "FAIL", detail });
const na = (detail = "") => ({ status: "N/A", detail });
const todo = (detail) => ({ status: "TODO", detail });

/** All of a list of checks; the first failure explains the row. */
function all(checks) {
  const bad = checks.find((c) => !c.ok);
  return bad ? fail(bad.why) : pass(checks.map((c) => c.note).filter(Boolean).join("; "));
}

/**
 * How each bench field shows up in the measured geometry, for I13: `(r, v) =>
 * ({ ok, why })`, with v the value the design ASKED for (r.requested, before
 * any engine clamp: a clamp that drops a user's value must fail here, not
 * pass against itself). The prompt that wires a field adds its entry here.
 * Judged on the centre head.
 */
const everyBearing = (r, test) => {
  const bs = centreBearings(r);
  if (!bs.length) return { ok: false, why: "no bearings measured" };
  const bad = bs.find((b) => !test(b).ok);
  return bad ? { ok: false, why: `prong ${bad.index}: ${test(bad).why}` } : { ok: true, why: "" };
};
export const BENCH_MEASURES = {
  // S1
  bearingDepth: (r, v) => everyBearing(r, (b) => {
    const want = (v / 100) * b.expected.d;
    return { ok: num(b.notch) && Math.abs(b.notch - want) <= 0.02, why: `seat ${fmt(b.notch)} mm deep, wants ${fmt(want)} ± 0.02` };
  }),
  seatTolerance: (r, v) => everyBearing(r, (b) => ({
    ok: num(b.seatGap) && b.seatGap >= v - 0.01 && b.seatGap <= v + 0.02,
    why: `room round the stone ${fmt(b.seatGap)} mm, wants ${fmt(v - 0.01)} to ${fmt(v + 0.02)}`,
  })),
  culetClearance: (r, asked) => {
    const got = r.centre.culetClearance;
    // Held by the stone's size where the engine said so (see heldTo).
    const v = heldTo(r, "culetClearance", asked);
    return { ok: num(got) && got >= v - 0.01 && got <= v + 0.05, why: `culet ${fmt(got)} mm, wants ${fmt(v - 0.01)} to ${fmt(v + 0.05)}${v !== asked ? ` (held from ${fmt(asked)}, reported)` : ""}` };
  },
  pavilionClearance: (r, v) => everyBearing(r, (b) => ({
    ok: clearOrNone(b.pavilionClearance) && Number(b.pavilionClearance) >= v - 0.02,
    why: `${fmt(b.pavilionClearance)} mm from the pavilion, wants ≥ ${fmt(v - 0.02)}`,
  })),
  // Thinned by the engine to the thickest whose joint holds them on a
  // narrow band (I7; Animesh, 2026-10-19) and reported with both numbers:
  // judged by the thickness built.
  prongDiameter: (r, asked) => {
    const v = heldTo(r, "prongDiameter", asked);
    return everyBearing(r, (b) => ({
      ok: num(b.postWidth) && Math.abs(b.postWidth - v) <= 0.01,
      why: `post ${fmt(b.postWidth)} mm across, wants ${fmt(v)} ± 0.01`,
    }));
  },
  asCastProngHeight: (r, v) => everyBearing(r, (b) => {
    const want = b.expected.zT + v;
    return { ok: num(b.top) && Math.abs(b.top - want) <= 0.05, why: `top ${fmt(b.top)} mm above the culet, wants ${fmt(want)} ± 0.05` };
  }),
  // S3. Each joint of the centre head as built: filleted, its fillet faces'
  // radius; flared, the flare's added radius; either way the radius the
  // layout gave that joint ± 0.02. That is v itself unless the engine held
  // it to what the parts could take and said so (an engine clamp reported
  // with the value asked and the value built).
  filletRadius: (r, v) => {
    const b = r.blend;
    if (!b?.planned) return { ok: false, why: "no blend measured" };
    // The hold must be reported with both numbers, and no joint may sit under
    // the least it reports (review: any warning used to cover any joint).
    const held = (r.bench?.warnings ?? []).find((w) => w.key === "filletRadius" && w.kind === "engine-clamped" &&
      num(w.asked) && num(w.delivered) && Math.abs(w.asked - v) < 1e-9);
    for (const j of ["feet", "base", "shank"]) {
      const want = b.paths?.[j] === "flare" ? b.flarePlanned?.[j] : b.planned[j], m = b.measured?.[j];
      if (!num(want)) return { ok: false, why: `${j}: no radius laid out` };
      if (want < v - 1e-9 && !held) return { ok: false, why: `${j}: laid out at ${fmt(want)} mm, asked ${fmt(v)}, not reported` };
      if (want < v - 1e-9 && want < held.delivered - 1e-9) return { ok: false, why: `${j}: laid out at ${fmt(want)} mm, under the ${fmt(held.delivered)} reported` };
      if (want > v + 1e-9) return { ok: false, why: `${j}: laid out at ${fmt(want)} mm, more than the ${fmt(v)} asked` };
      if (!m || !num(m.min) || !num(m.max)) return { ok: false, why: `${j}: ${b.paths?.[j] ?? "no"} blend not measured` };
      if (Math.abs(m.min - want) > 0.02 || Math.abs(m.max - want) > 0.02) {
        return { ok: false, why: `${j}: ${b.paths[j]} radius ${fmt(m.min)} to ${fmt(m.max)} mm, wants ${fmt(want)} ± 0.02` };
      }
    }
    return { ok: true, why: "" };
  },
  // S3b: where the feet end, as the geometry shows it: the mean of the feet's
  // distance out ÷ the girdle's (to 0.03) and every foot (to 0.10: on a fancy
  // cut the wire's corners are rounded, so the feet sit a little off the
  // girdle's own shape). A taper the stone forces is judged by the value
  // built where the engine reported it with both numbers, inside the bounds
  // (it widens the basket, so heldTo, for holds that lower, does not apply).
  basketTaper: (r, asked) => {
    const b = r.basket;
    if (!b) return { ok: false, why: "no basket measured" };
    const { min, max } = r.bounds?.basketTaper ?? {};
    const w = (r.bench?.warnings ?? []).find((x) => x.key === "basketTaper" && x.kind === "engine-clamped" &&
      num(x.asked) && num(x.delivered) && Math.abs(x.asked - asked) < 1e-9 && num(min) && x.delivered >= min - 1e-9 && x.delivered <= max + 1e-9);
    const v = w ? w.delivered : asked;
    const worst = Math.max(...b.tapers.map((t) => Math.abs(t - v)));
    return {
      ok: num(b.taper) && Math.abs(b.taper - v) <= 0.03 && num(worst) && worst <= 0.10,
      why: `feet at ${fmt(b.taper)} of the girdle on average, wants ${fmt(v)} ± 0.03 (worst foot ${fmt(worst)} off)${w ? ` (held from ${fmt(asked)}, reported)` : ""}`,
    };
  },
  // S2
  galleryClearance: (r, asked) => {
    const g = r.galleries.find((x) => x.head === "centre");
    if (!g) return { ok: false, why: "no centre gallery" };
    const v = heldTo(r, "galleryClearance", asked);
    return { ok: num(g.clearanceToStone) && g.clearanceToStone >= v - 0.02 && g.clearanceToStone <= v + 0.10,
      why: `gallery ${fmt(g.clearanceToStone)} mm from the stone, wants ${fmt(v - 0.02)} to ${fmt(v + 0.10)}${v !== asked ? ` (held from ${fmt(asked)}, reported)` : ""}` };
  },
  galleryThickness: (r, v) => {
    const g = r.galleries.find((x) => x.head === "centre");
    if (!g) return { ok: false, why: "no centre gallery" };
    // Thinner only where the engine said so, to hide it under the girdle
    // (Animesh's decision, S2), and then by exactly what it said.
    if (g.thinnedReported && num(g.bench?.galleryThickness) && g.bench.galleryThickness < v) {
      // Never below the alloy's minimum wall, whatever the engine said.
      return { ok: num(g.thicknessEstimate) && Math.abs(g.thicknessEstimate - g.bench.galleryThickness) <= 0.02 &&
        !(num(g.minWall) && g.bench.galleryThickness < g.minWall - 1e-6),
        why: `gallery ${fmt(g.thicknessEstimate)} mm thick, thinned from ${fmt(v)} to ${fmt(g.bench.galleryThickness)} ± 0.02 (reported)` };
    }
    return { ok: num(g.thicknessEstimate) && Math.abs(g.thicknessEstimate - v) <= 0.02,
      why: `gallery ${fmt(g.thicknessEstimate)} mm thick, wants ${fmt(v)} ± 0.02` };
  },
};

/**
 * The centre head's gallery, for I5b. A three-stone's side heads carry
 * galleries too (S2), and I4 and I5 hold them as they always have; but their
 * stones, 0.62 × the centre's girdle, are S6's, and at the default 1 ct ring a
 * 0.7 mm wire (the platinum minimum wall) under a 0.24 ct side stone shows
 * 0.01 mm beyond its girdle at any height. Their figures stay in the report.
 */
const centreGalleries = (r) => r.galleries.filter((g) => g.head === "centre");

export const INVARIANTS = [
  {
    id: "I1",
    title: "one solid, nothing dropped by the fuse",
    // Oval and marquise prong rings fail today because of the round rail;
    // halo and bezel are reworked in S6.
    requiredFrom: (spec) => (["halo", "bezel"].includes(setting(spec)) ? "S6" : "S2"),
    evaluate: (r) => all([
      { ok: r.solidCount === 1, why: `${r.solidCount} solids` },
      { ok: r.dropped === 0, why: `${r.dropped} part(s) dropped by the fuse` },
    ]),
  },
  {
    id: "I2a",
    title: "centre stone does not overlap metal (≤ 0.001 mm³)",
    requiredFrom: (spec) => (prongLike(spec) ? "S1" : "S6"),
    evaluate: (r) => {
      const v = r.stones[0]?.overlapWithMetal;
      return num(v) && v <= 0.001 ? pass(fmt(v)) : fail(`centre overlap ${fmt(v)} mm³`);
    },
  },
  {
    id: "I2b",
    title: "no stone overlaps metal (≤ 0.001 mm³ each)",
    requiredFrom: () => "S6",
    evaluate: (r) => {
      const bad = r.stones.filter((s) => !(num(s.overlapWithMetal) && s.overlapWithMetal <= 0.001));
      const total = r.stones.reduce((t, s) => t + (num(s.overlapWithMetal) ? s.overlapWithMetal : 0), 0);
      return bad.length
        ? fail(`${bad.length} of ${r.stones.length} stones overlap metal, total ${fmt(total)} mm³`)
        : pass(`${r.stones.length} stones`);
    },
  },
  {
    id: "I2c",
    title: "centre head's prongs and gallery do not overlap the centre stone (≤ 0.001 mm³ each)",
    // Halo and cathedral too: their prong heads are S1's; only their bearers
    // and struts (S6) may still reach the stone.
    requiredFrom: (spec) => (prongHead(spec) ? "S1" : null),
    evaluate: (r) => {
      const parts = [
        ...r.prongs.filter((p) => p.head === "centre").map((p) => ({ what: `prong ${p.index}`, v: p.inStone })),
        ...r.galleries.filter((g) => g.head === "centre").map((g) => ({ what: "gallery", v: g.inStone })),
      ];
      if (!parts.length) return na("no prong head");
      const bad = parts.find((x) => !(num(x.v) && x.v <= 0.001));
      return bad ? fail(`${bad.what} in stone ${fmt(bad.v)} mm³`) : pass(`${parts.length} parts`);
    },
  },
  {
    id: "I3a",
    title: "culet clearance ≥ culetClearance (effective) − 0.01",
    requiredFrom: (spec) => (prongLike(spec) ? "S1" : "S6"),
    evaluate: (r) => {
      // The value asked, or the one built where the engine held it by the
      // stone's size and said so (see heldTo; S3, logged).
      const want = heldTo(r, "culetClearance", (r.requested ?? r.bench.values).culetClearance) - 0.01;
      const got = r.centre.culetClearance;
      return num(got) && got >= want ? pass(fmt(got)) : fail(`culet ${fmt(got)} mm, needs ≥ ${fmt(want)}`);
    },
  },
  {
    id: "I3b",
    title: "side stones' culet clearance ≥ culetClearance (effective) − 0.01",
    requiredFrom: () => "S6",
    evaluate: (r) => {
      const sides = r.stones.filter((s) => s.role === "side");
      if (!sides.length) return na("no side stones");
      const want = (r.requested ?? r.bench.values).culetClearance - 0.01;
      const worst = Math.min(...sides.map((s) => (num(s.culetClearance) ? s.culetClearance : -Infinity)));
      return worst >= want ? pass(fmt(worst)) : fail(`side culet ${fmt(worst)} mm, needs ≥ ${fmt(want)}`);
    },
  },
  {
    id: "I3c",
    title: "halo and shank accents: culet not inside metal (≥ 0)",
    requiredFrom: () => "S6",
    evaluate: (r) => {
      const acc = r.stones.filter((s) => s.role === "halo" || s.role === "accent");
      if (!acc.length) return na("no accents");
      const worst = Math.min(...acc.map((s) => (num(s.culetClearance) ? s.culetClearance : -Infinity)));
      return worst >= 0 ? pass(`worst ${fmt(worst)}`) : fail(`an accent culet is ${fmt(-worst)} mm inside metal`);
    },
  },
  {
    id: "I11",
    title: "stones never intersect each other (≤ 0.001 mm³ per pair)",
    requiredFrom: () => "S6",
    evaluate: (r) => {
      const bad = r.stonePairs.filter((p) => !(num(p.volume) && p.volume <= 0.001));
      return bad.length ? fail(`${bad.length} pair(s), worst ${fmt(r.maxStoneStoneOverlap)} mm³`) : pass();
    },
  },
  {
    id: "I4",
    title: "gallery clear of the stone, at galleryClearance, touching every prong",
    requiredFrom: () => "S2",
    evaluate: (r) => {
      if (!r.galleries.length) return na("no gallery");
      return all(r.galleries.flatMap((g) => {
        // Each head by the values it asked for (a side head's automatic ones
        // follow its smaller stone), not the engine's; reports from before
        // S2 carry only the built ones.
        const gcAsked = g.requested?.galleryClearance ?? g.bench?.galleryClearance ?? r.bench.values.galleryClearance;
        // The centre head's, held by the stone's size where the engine said
        // so (see heldTo; S3, an assertion change logged in STRUCTURE-LOG).
        const gc = g.head === "centre" ? heldTo(r, "galleryClearance", gcAsked) : gcAsked;
        return [
        { ok: num(g.inStone) && g.inStone <= 0.001, why: `${g.head} gallery in stone ${fmt(g.inStone)} mm³` },
        { ok: num(g.clearanceToStone) && g.clearanceToStone >= gc - 0.02 && g.clearanceToStone <= gc + 0.10,
          why: `${g.head} gallery clearance ${fmt(g.clearanceToStone)}, needs ${fmt(gc - 0.02)} to ${fmt(gc + 0.10)}` },
        { ok: g.prongsTouched === g.prongCount, why: `${g.head} gallery touches ${g.prongsTouched} of ${g.prongCount} prongs` },
        ];
      }));
    },
  },
  {
    id: "I5",
    title: "gallery at the rule-of-thirds height (±0.05), or lower by a reported amount; galleryThickness thick",
    requiredFrom: () => "S2",
    evaluate: (r) => {
      if (!r.galleries.length) return na("no gallery");
      return all(r.galleries.flatMap((g) => {
        // The thickness asked; or, where the engine reported thinning the
        // wire to hide it under the girdle (Animesh's decision, S2), the
        // thickness it reported.
        const t = (g.thinnedReported ? g.bench?.galleryThickness : g.requested?.galleryThickness) ??
          g.bench?.galleryThickness ?? r.bench.values.galleryThickness;
        const h = g.centreHeightAboveCulet, rule = g.ruleOfThirdsHeight;
        // Since S2 (Animesh's decision, STRUCTURE-LOG): where a wire of the
        // rule's thickness at mid-pavilion would show beyond the girdle, it
        // sits lower, by as much as hiding it takes, and that is reported.
        // The old rule (±0.05 of mid-pavilion, always) is no longer the right
        // answer because no gallery of that thickness and gap fits under the
        // girdle there on most fancy cuts and small stones. Measured
        // (structure-audit-s2, 55494e5): 148 of 216 centre galleries sit
        // lower, all reported; the rule's height holds on round and cushion
        // at 1 and 3 ct; the most lowered are 1 ct oval and marquise bench
        // corners at 0.66 of mid-pavilion, a 0.25 ct marquise at 0.66,
        // emerald 0.51; 8 designs, all asking galleryThickness 2.0 or a 0.6
        // gap, are also thinned (2.0 -> 1.685 on the default ring; the
        // all-max marquise to 0.766), never below the minimum wall.
        const lowered = num(g.planHeight) && g.planHeight < rule - 0.05;
        const where = lowered
          ? { ok: num(h) && Math.abs(h - g.planHeight) <= 0.05 && g.loweredReported === true,
            why: `${g.head} gallery centre ${fmt(h)} above culet, laid out at ${fmt(g.planHeight)} (${fmt(g.lowered)} below the rule's ${fmt(rule)})${g.loweredReported ? "" : ", not reported"}` }
          : { ok: num(h) && Math.abs(h - rule) <= 0.05,
            why: `${g.head} gallery centre ${fmt(h)} above culet, rule says ${fmt(rule)}` };
        return [
        where,
        // 0.01 allows for the section being read off a 0.002 mm mesh.
        { ok: num(g.thicknessEstimate) && g.thicknessEstimate >= t - 0.01,
          why: `${g.head} gallery ${fmt(g.thicknessEstimate)} thick, needs ${fmt(t)}` },
        // A reported thinning still never goes below the alloy's minimum wall.
        { ok: !num(g.minWall) || t >= g.minWall - 1e-6,
          why: `${g.head} gallery thinned to ${fmt(t)}, under the minimum wall of ${fmt(g.minWall)}` },
        ];
      }));
    },
  },
  {
    id: "I5b",
    title: "centre gallery hidden under the girdle seen from above (360 directions)",
    requiredFrom: () => "S2",
    evaluate: (r) => {
      const gs = centreGalleries(r);
      if (!gs.length) return na("no gallery");
      return all(gs.map((g) => ({
        ok: num(g.beyondGirdle) && g.beyondGirdle <= 0,
        why: `${g.head} gallery reaches ${fmt(g.beyondGirdle)} mm beyond the girdle`,
      })));
    },
  },
  // Split in S3, as I3 is: the S3 prompt builds the base for the centre head
  // of every prong setting, and a three-stone's side heads get theirs in S6
  // ("reusing what you build here"). Until then their prongs still stand in
  // the band, so they are held by I6b, from S6. Nothing is dropped: every
  // prong of every head is in one or the other.
  {
    id: "I6",
    title: "every centre prong stands in the base (> 0.02 mm³) and not in the band",
    requiredFrom: (spec) => (prongHead(spec) ? "S3" : null),
    evaluate: (r) => {
      const ps = r.prongs.filter((p) => p.head === "centre");
      if (!ps.length) return na("no prongs");
      return all(ps.flatMap((p) => [
        { ok: num(p.inBase) && p.inBase > 0.02, why: `${p.head} prong ${p.index} in base ${fmt(p.inBase)} mm³` },
        { ok: num(p.inBand) && p.inBand <= 1e-6, why: `${p.head} prong ${p.index} in band ${fmt(p.inBand)} mm³` },
      ]));
    },
  },
  {
    id: "I6b",
    title: "every side-head prong stands in its base (> 0.02 mm³) and not in the band",
    requiredFrom: () => "S6",
    evaluate: (r) => {
      const ps = r.prongs.filter((p) => p.head !== "centre");
      if (!ps.length) return na("no side heads");
      return all(ps.flatMap((p) => [
        { ok: num(p.inBase) && p.inBase > 0.02, why: `${p.head} prong ${p.index} in base ${fmt(p.inBase)} mm³` },
        { ok: num(p.inBand) && p.inBand <= 1e-6, why: `${p.head} prong ${p.index} in band ${fmt(p.inBand)} mm³` },
      ]));
    },
  },
  {
    id: "I14",
    title: "every joint of the centre head blended, by fillet or by flare",
    requiredFrom: (spec) => (prongHead(spec) ? "S3" : null),
    evaluate: (r) => {
      if (!(r.bases ?? []).some((b) => b.head === "centre")) return r.prongs.some((p) => p.head === "centre") ? fail("no base") : na("no prong head");
      const paths = r.blend?.paths ?? {};
      const bad = ["feet", "base", "shank"].filter((j) => paths[j] !== "fillet" && paths[j] !== "flare");
      return bad.length ? fail(`no blend at ${bad.join(", ")}`) : pass(["feet", "base", "shank"].map((j) => `${j} ${paths[j]}`).join(", "));
    },
  },
  {
    id: "I12",
    title: "the centre base's section ≥ max(prongDiameter, minWall), at a prong-free angle",
    requiredFrom: (spec) => (prongHead(spec) ? "S3" : null),
    evaluate: (r) => {
      const bs = (r.bases ?? []).filter((b) => b.head === "centre");
      if (!bs.length) return r.prongs.some((p) => p.head === "centre") ? fail("no base measured") : na("no prong head");
      // 0.005 for the section being read off a 0.002 mm mesh.
      return all(bs.map((b) => ({
        ok: num(b.thickness) && b.thickness >= b.need - 0.005,
        why: `base section ${fmt(b.thickness)} mm, needs ${fmt(b.need)}`,
      })));
    },
  },
  // The joint is taken within the centre head's own footprint, its saddle's
  // plate (open question 14, decided in S3: "the centre head's own metal").
  // The disc of girdleR × 1.2 it replaced also cut a three-stone's side heads
  // and a cathedral's struts, and on a small stone with thick prongs it held
  // only part of the base. The prong sum uses the prongDiameter built.
  {
    id: "I7",
    title: "joint section ≥ JOINT_AREA_RATIO × summed prong sections",
    requiredFrom: () => "S3",
    evaluate: (r) => {
      // A prong head whose joint could not be measured fails: a missing
      // number is never a pass (the cause is in result.errors).
      if (!r.joint) return r.prongs.some((p) => p.head === "centre") ? fail("joint not measured") : na("no prong head");
      const { jointSectionArea: a, prongSectionSum: p, baseSeat, saddleSeat } = r.joint;
      if (!(num(a) && a >= JOINT_AREA_RATIO * p)) return fail(`joint ${fmt(a)} mm² vs prongs ${fmt(p)} mm²`);
      // And on a head with a base, both links that carry it (S3, review):
      // the plane above cuts the base itself, so on its own it shows the base
      // is big enough, not that the saddle holds it or the band the saddle.
      // Stricter only.
      if (r.bases?.some((b) => b.head === "centre")) {
        if (!(num(baseSeat) && baseSeat >= JOINT_AREA_RATIO * p)) return fail(`base held over ${fmt(baseSeat)} mm² of its saddle vs prongs ${fmt(p)} mm²`);
        if (!(num(saddleSeat) && saddleSeat >= JOINT_AREA_RATIO * p)) return fail(`saddle held over ${fmt(saddleSeat)} mm² of the band vs prongs ${fmt(p)} mm²`);
      }
      return pass(`${fmt(a)} vs ${fmt(p)}; seats ${fmt(baseSeat)}, ${fmt(saddleSeat)}`);
    },
  },
  // S3b: the head below the stone is a basket on a joint that grows out of
  // the band, not a plate on a puck (Animesh, on S3's question 30).
  {
    id: "I15",
    title: "flush with the band: nothing at or under the band's line more than 0.05 mm beyond its flank, at the joint's front, middle and back",
    requiredFrom: (spec) => (prongHead(spec) ? "S3" : null),
    evaluate: (r) => {
      if (!r.basket) return r.prongs.some((p) => p.head === "centre") ? fail("not measured") : na("no prong head");
      const o = r.basket.overhang;
      if (!(num(o) || o === -Infinity)) return fail(`overhang not measured`);
      return o <= 0.05 ? pass(`${fmt(o)} mm${r.basket.overhangAt ? ` (${r.basket.overhangAt})` : ""}`) : fail(`${fmt(o)} mm beyond the flank at ${r.basket.overhangAt}`);
    },
  },
  {
    id: "I16",
    title: "basket form: below the upper gallery the wire and pad within the feet's footprint + one prong diameter, every leg only coming in, and the base a ring open at the centre",
    requiredFrom: (spec) => (prongHead(spec) ? "S3" : null),
    evaluate: (r) => {
      const b = r.basket;
      if (!b) return r.prongs.some((p) => p.head === "centre") ? fail("not measured") : na("no prong head");
      const cc = r.bench?.values?.culetClearance;
      return all([
        { ok: num(b.outside) && b.outside <= 0.01, why: `${fmt(b.outside)} mm outside the footprint + d${b.outsideAt ? `, ${b.outsideAt}` : ""}` },
        // 0.02 for the 0.02 mm mesh the slices are read off.
        // No leg below the gallery at all (a small stone, its wire just under
        // the gallery): nothing to come in.
        { ok: b.legsOut === -Infinity || (num(b.legsOut) && b.legsOut <= 0.02), why: `a leg reaches ${fmt(b.legsOut)} mm further out going down${b.legsOutAt ? `, ${b.legsOutAt}` : ""}` },
        // Open at the centre: the culet's own clearance passes through it.
        // 0.01 for the 0.02 mm mesh.
        { ok: num(b.opening) && num(cc) && b.opening >= cc - 0.01, why: `the wire ${fmt(b.opening)} mm from the culet at its nearest, the culet gap ${fmt(cc)}` },
        { ok: num(b.padOpening) && num(cc) && b.padOpening >= cc - 0.01, why: `the pad ${fmt(b.padOpening)} mm from the culet at its nearest, the culet gap ${fmt(cc)}` },
        // A ring, not a plate: the head's axis, from the band's top up to the
        // wire's, runs through an opening in both (review: the culet
        // distances alone would pass a disc culetClearance under the culet).
        // Reports from before this measure carry none and are not judged on it.
        { ok: b.axisOpen === undefined || (num(b.axisOpen) && b.axisOpen > 0), why: `the head's axis ${fmt(b.axisOpen)} mm from the wire or pad: no opening at the centre` },
      ]);
    },
  },
  {
    id: "I17",
    title: "head metal (the base and joint, less the band) ≤ S3's for the same design (+1%)",
    requiredFrom: (spec) => (prongHead(spec) ? "S3" : null),
    evaluate: (r) => {
      const b = r.basket, ref = r.reference?.headMetalS3;
      if (!b) return r.prongs.some((p) => p.head === "centre") ? fail("not measured") : na("no prong head");
      if (!num(ref)) return fail("no S3 figure for this design");
      return b.headMetal <= ref * 1.01 ? pass(`${fmt(b.headMetal)} mm³ vs S3 ${fmt(ref)}`) : fail(`${fmt(b.headMetal)} mm³, S3 ${fmt(ref)}`);
    },
  },
  {
    id: "I8",
    title: "STL: every edge used twice, no zero-area triangle, one component",
    requiredFrom: () => "S7",
    evaluate: (r) => {
      if (!r.stl) return fail("no STL measured");
      return all([
        { ok: r.stl.edgesNot2 === 0, why: `${r.stl.edgesNot2} edges not used twice` },
        { ok: r.stl.zeroArea === 0, why: `${r.stl.zeroArea} zero-area triangles` },
        { ok: r.stl.components === 1, why: `${r.stl.components} components` },
      ]);
    },
  },
  // The prompt's I9 is "metal is 1 MANIFOLD_SOLID_BREP, 0 triangulated
  // entities", expected to hold from S0. Measured in S0, the one-solid half
  // cannot: it is I1 read back from the file, and a two-piece metal stays two
  // pieces until S2. Worse, it sometimes "passes" for the wrong reason:
  //   {"gemShape":"marquise","prongCount":4}  2 solids, STEP has 2  (honest, fails)
  //   {"gemShape":"marquise"}                 2 solids, STEP has 1  (a piece lost)
  // toSTEP wrote the six-prong marquise's 7.529 + 186.238 mm³ as one solid of
  // 179.504 when re-imported. So the rule is split, nothing dropped from it:
  // I9 (B-rep, nothing triangulated, named) binds from S0 as the prompt asks;
  // I9b (exactly one solid, and as many in the file as in the metal) binds
  // with I1. Logged as an open question in STRUCTURE-LOG.md.
  {
    id: "I9",
    title: "STEP is B-rep: metal written as MANIFOLD_SOLID_BREP, nothing triangulated, solids named",
    requiredFrom: () => "S0",
    evaluate: (r) => {
      if (!r.step) return fail("no STEP measured");
      const s = r.step;
      const stoneNames = r.stones.length === 1 ? ["stones"] : r.stones.map((_, i) => `stone_${i + 1}`);
      return all([
        { ok: s.metalSolidBreps >= 1, why: "metal-only STEP has no MANIFOLD_SOLID_BREP" },
        { ok: s.triangulated === 0, why: `${s.triangulated} triangulated entities` },
        { ok: s.names.includes("metal") && stoneNames.every((n) => s.names.includes(n)), why: `names ${s.names.join(",")}` },
      ]);
    },
  },
  {
    id: "I9b",
    title: "STEP: metal is exactly one MANIFOLD_SOLID_BREP, and the file holds every solid",
    requiredFrom: (spec) => (["halo", "bezel"].includes(setting(spec)) ? "S6" : "S2"),
    evaluate: (r) => {
      if (!r.step) return fail("no STEP measured");
      return all([
        { ok: r.step.metalSolidBreps === 1, why: `metal-only STEP has ${r.step.metalSolidBreps} MANIFOLD_SOLID_BREP` },
        { ok: r.step.metalSolidBreps === r.solidCount,
          why: `metal has ${r.solidCount} solids, its STEP ${r.step.metalSolidBreps}` },
        { ok: r.step.manifoldSolidBreps === r.solidCount + r.stones.length,
          why: `${r.step.manifoldSolidBreps} MANIFOLD_SOLID_BREP for ${r.solidCount} metal + ${r.stones.length} stones` },
      ]);
    },
  },
  {
    id: "I10a",
    title: "every centre prong has a seat bearingDepth% of its diameter deep (±0.02), leaving the rest",
    requiredFrom: (spec) => (prongHead(spec) ? "S1" : null),
    evaluate: (r) => {
      const bs = centreBearings(r);
      if (!bs.length) return na("no prongs");
      return all(bs.flatMap((b) => [
        { ok: num(b.notch) && Math.abs(b.notch - b.expected.notch) <= 0.02,
          why: `prong ${b.index} seat ${fmt(b.notch)} mm deep, wants ${fmt(b.expected.notch)} ± 0.02` },
        // The metal behind the seat, measured: the post's width less the seat.
        { ok: num(b.postWidth) && num(b.notch) && b.postWidth - b.notch >= b.expected.d - b.expected.notch - 0.02,
          why: `prong ${b.index} leaves ${fmt(b.postWidth - b.notch)} mm behind the seat, wants ≥ ${fmt(b.expected.d - b.expected.notch - 0.02)}` },
      ]));
    },
  },
  {
    id: "I10b",
    title: "every centre prong stands asCastProngHeight above the table (±0.05)",
    requiredFrom: (spec) => (prongHead(spec) ? "S1" : null),
    evaluate: (r) => {
      const bs = centreBearings(r);
      if (!bs.length) return na("no prongs");
      return all(bs.map((b) => ({
        ok: num(b.top) && Math.abs(b.top - b.expected.top) <= 0.05,
        why: `prong ${b.index} top ${fmt(b.top)} mm above the culet, wants ${fmt(b.expected.top)}`,
      })));
    },
  },
  {
    id: "I10c",
    title: "below girdle − d every centre prong keeps pavilionClearance (−0.02) from the stone",
    requiredFrom: (spec) => (prongHead(spec) ? "S1" : null),
    evaluate: (r) => {
      const bs = centreBearings(r);
      if (!bs.length) return na("no prongs");
      // Infinity: nothing of the prong is below girdle − d, so nothing there
      // can come near the pavilion (S3, logged).
      return all(bs.map((b) => ({
        ok: clearOrNone(b.pavilionClearance) && Number(b.pavilionClearance) >= b.expected.pavilionClearance - 0.02,
        why: `prong ${b.index} ${fmt(b.pavilionClearance)} mm from the pavilion, wants ≥ ${fmt(b.expected.pavilionClearance - 0.02)}`,
      })));
    },
  },
  {
    id: "I13",
    title: "every customised bench value shows up in the geometry",
    // Binds from the earliest prompt that wires one of the customised fields.
    requiredFrom: (spec, ctx) => {
      const stages = (ctx.customised ?? []).map((k) => ctx.wiredIn[k]).filter(Boolean);
      return stages.length ? stages.sort((a, b) => stageIndex(a) - stageIndex(b))[0] : null;
    },
    evaluate: (r, _spec, ctx) => {
      // Only fields the engine reads by this stage: before its prompt a field
      // does not reach the geometry and there is nothing to see.
      const keys = r.bench.customised.filter((k) =>
        !ctx?.wiredIn?.[k] || !ctx.stage || stageIndex(ctx.wiredIn[k]) <= stageIndex(ctx.stage));
      if (!keys.length) return na("nothing customised that is wired yet");
      const asked = r.requested ?? r.bench.values;
      const results = keys.map((k) => (BENCH_MEASURES[k]
        ? { k, ...BENCH_MEASURES[k](r, asked[k]) }
        : { k, ok: null, why: "no measurement defined yet" }));
      const bad = results.find((x) => x.ok === false);
      if (bad) return fail(`${bad.k}: ${bad.why}`);
      const missing = results.filter((x) => x.ok === null).map((x) => x.k);
      return missing.length ? todo(`no measurement yet for ${missing.join(", ")}`) : pass(keys.join(", "));
    },
  },
];

/**
 * When a rule binds for one design. A bench-corner design (a field at a
 * bound) binds no earlier than the prompt that wires that field: before then
 * the value does not reach the geometry and the row is the default ring under
 * another name. All-min and all-max bind from the first wired field.
 */
export function requiredStage(inv, design, ctx) {
  const own = inv.requiredFrom(design.spec, ctx);
  if (own == null) return null;
  const corner = design.corner?.stage;
  return corner && stageIndex(corner) > stageIndex(own) ? corner : own;
}

/** Every invariant for one audited design, with whether it binds at `stage`. */
export function evaluateDesign(design, result, stage, wiredIn) {
  const out = {};
  for (const inv of INVARIANTS) {
    let res;
    if (!result || result.crash) res = fail(`audit crashed: ${result?.crash ?? "no result"}`);
    else {
      try { res = inv.evaluate(result, design.spec, { stage, wiredIn }); } catch (e) { res = fail(`evaluate threw ${e?.message ?? e}`); }
    }
    const req = requiredStage(inv, design, { customised: result?.bench?.customised, wiredIn });
    const required = req != null && stageIndex(stage) >= stageIndex(req);
    out[inv.id] = { ...res, requiredFrom: req, required };
  }
  return out;
}
