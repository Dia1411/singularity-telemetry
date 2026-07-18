// scripts/refresh.mjs
// Regenerates data.json by asking Claude (with web search) to re-run the
// capability research against METR / Epoch AI / Stanford AI Index.
// Usage: ANTHROPIC_API_KEY=sk-... node scripts/refresh.mjs
// Node 20+ (native fetch). No dependencies.

import { readFileSync, writeFileSync } from "node:fs";

const KEY = process.env.ANTHROPIC_API_KEY;
if (!KEY) { console.error("Missing ANTHROPIC_API_KEY"); process.exit(1); }

const current = readFileSync(new URL("../data.json", import.meta.url), "utf8");
const today = new Date().toISOString().slice(0, 10);

const prompt = `You are the research engine behind "Singularity Telemetry", a public dashboard
tracking AI capability growth. Below is the current data.json. Your job: use web search to check
the latest published numbers and return an UPDATED data.json.

Authoritative sources, in priority order:
1. METR (metr.org/time-horizons) — time-horizon results per model (50% success horizon).
   ALWAYS check METR's changelog for newly added models (e.g. GPT-5.4, Gemini 3.1 Pro,
   Claude Mythos/Fable family and successors) and append them to "horizon" with a decimal-year
   date and seconds. Respect METR corrections: if METR revises past values, revise them here too,
   adding a short "note". Mark values above METR's stated reliability ceiling with "flagged": true. Update the "horizon"
   array with any new frontier models and their horizons, and "horizonTrends" if METR publishes
   a new doubling-time estimate.
2. Epoch AI (epoch.ai) — training compute of new frontier models ("compute" array), compute
   growth rate, inference price trends ("price" array + "priceLabel").
3. Stanford HAI AI Index & benchmark authors — for the "domains" array (jagged frontier):
   update "h" values (1.0 = average human, 1.6 = domain expert; >1.6 superhuman) and "note"
   strings when new benchmark results change the picture. Keep x/z/s layout coordinates stable
   unless a new domain must be added.
4. Update meta.headline stats and meta.updatedAt ("${today}") and meta.updatedBy ("automated Claude research pass").

Rules:
- Dates are decimal years (e.g. March 2026 = 2026.2).
- Only include numbers you actually found in sources; if nothing changed for a series, keep it as is.
- Do not invent models or scores. Prefer official METR/Epoch numbers over secondary reporting.
- Return ONLY the complete updated JSON object. No markdown fences, no commentary.

CURRENT data.json:
${current}`;

const res = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "x-api-key": KEY,
    "anthropic-version": "2023-06-01",
  },
  body: JSON.stringify({
    model: "claude-sonnet-4-6",
    max_tokens: 8000,
    messages: [{ role: "user", content: prompt }],
    tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 10 }],
  }),
});

if (!res.ok) { console.error("API error", res.status, await res.text()); process.exit(1); }
const data = await res.json();

// Concatenate text blocks (tool_use / tool_result blocks are interleaved)
const text = data.content.filter(b => b.type === "text").map(b => b.text).join("\n");
const jsonStart = text.indexOf("{");
const jsonEnd = text.lastIndexOf("}");
if (jsonStart === -1 || jsonEnd === -1) { console.error("No JSON found in response:\n", text); process.exit(1); }

let next;
try { next = JSON.parse(text.slice(jsonStart, jsonEnd + 1)); }
catch (e) { console.error("JSON parse failed:", e.message); process.exit(1); }

// Sanity checks before overwriting — never let a bad research pass nuke the dashboard
const prev = JSON.parse(current);
const ok =
  next.meta && next.horizon?.length >= prev.horizon.length - 1 &&
  next.compute?.length >= prev.compute.length - 1 &&
  next.domains?.length >= 8 &&
  next.horizon.every(h => typeof h.seconds === "number" && h.seconds > 0) &&
  next.compute.every(c => typeof c.flop === "number" && c.flop > 1e15);

if (!ok) { console.error("Sanity check failed — keeping existing data.json"); process.exit(1); }

next.meta.updatedAt = today;
writeFileSync(new URL("../data.json", import.meta.url), JSON.stringify(next, null, 2) + "\n");
console.log(`data.json updated for ${today}: ${next.horizon.length} horizon pts, ${next.compute.length} compute pts, ${next.domains.length} domains.`);
