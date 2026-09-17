/**
 * Chooses a Gemini model at runtime instead of hardcoding one.
 *
 * This project has already been broken once by a hardcoded model name
 * (gemini-1.5-flash) being retired by Google, with nothing surfacing the
 * failure. Discovering a supported model at cold start and caching it means a
 * future retirement degrades to picking the next model rather than 404ing every
 * request forever.
 *
 * Set GEMINI_MODEL to pin a specific model and skip discovery.
 */
let cached = null;

/** Prefer fast, cheap, current models; higher score wins. */
function score(name) {
  const n = name.toLowerCase();
  let s = 0;
  const ver = n.match(/gemini-(\d+)(?:\.(\d+))?/);
  if (ver) s += parseInt(ver[1], 10) * 100 + (parseInt(ver[2] || "0", 10) * 10);
  if (n.includes("flash")) s += 40;         // cheapest suitable tier
  if (n.includes("lite")) s += 5;
  if (n.includes("pro")) s += 20;
  if (/preview|exp|experimental/.test(n)) s -= 60;  // avoid unstable endpoints
  if (/vision|embedding|aqa|imagen|veo|tts|live|native-audio/.test(n)) s -= 1000;
  return s;
}

async function pickModel(ai, logger) {
  if (process.env.GEMINI_MODEL) return process.env.GEMINI_MODEL;
  if (cached) return cached;

  const usable = [];
  for await (const m of await ai.models.list()) {
    const actions = m.supportedActions || m.supportedGenerationMethods || [];
    const name = (m.name || "").replace(/^models\//, "");
    if (!name.startsWith("gemini")) continue;
    if (actions.length && !actions.includes("generateContent")) continue;
    usable.push(name);
  }
  if (!usable.length) throw new Error("No Gemini model supporting generateContent is available to this API key.");

  usable.sort((a, b) => score(b) - score(a));
  cached = usable[0];
  logger?.info("Selected Gemini model", { selected: cached, considered: usable.slice(0, 8) });
  return cached;
}

module.exports = { pickModel, _score: score };
