# A7-close — verify A7, merge it, execute the cleanup

**Status:** PARTIAL — the code half is done and merged; the cloud half is not,
because every remaining step needs `gcloud`, which neither the bridge VM nor
the cloud container can reach. Exact commands are under *Owed on the Mac*.
Nothing is blocked on judgement; it is blocked on egress.

**Branch / commit:**
- `main` @ `ad7c6e2`, a `--no-ff` merge of `A7-retire-dead-pipeline` (7 commits ahead of `origin/main`, **not pushed**)
- `A7-close-followups`, 2 commits on top: `eebe941`, `a391217` — **not merged, not pushed**

**Deployed:** **no.** Nothing was deployed, deleted or changed in production.
Firestore and Cloud Logging were read; nothing was written.

---

## What changed

### Merged to main (`ad7c6e2`)

The A7 branch as it stood, plus three commits added during this task.

`7b9b280` — six defects an adversarial pass found in A7's own change. Four
were regressions A7 introduced: the Studio ignored the prompt while the spec
was pending (it now seeds exactly as the card does, from the same three
sources in the same order); the Studio showed the wrong design when switching
between two that extracted to the same spec (the panel is keyed on the design
now); an arriving spec silently wiped Studio edits (it goes to `jobSpec` only
once a control has moved); and ids hoisted onto one `Date.now()` could collide
(every id carries a nonce). Two were aggravated rather than caused: the Studio
outlived the chat that owned it, and the `localStorage` write was unguarded
against a full store.

`d86fade` — the card now only claims work that is actually happening.
`ChatDesign` carries a status; `extracting` is only true inside the session
that made the call, a page load downgrades it to `stalled`, and migrated
pre-A7 designs are stamped `stalled` on sight.

`5f55dd7` — **"Castable as drawn"**, not "as specified". The checker verifies
the solid the kernel built and has no idea whether it is what the customer
asked for. Caught live: "18k rose gold…" produced a card reading **14k Rose
Gold** — the parser has no 18k rose entry — under the words "Castable as
specified".

The merge commit records why `4004539`, the B-rep runner fix, was kept rather
than rebased out.

### On `A7-close-followups`, not merged

`eebe941` — four defects left open after the merge:
- **`functions/index.js`**: `logger.error("…", { message: err?.message })`
  collided with firebase-functions' own message parameter, so the real Gemini
  error never reached Cloud Logging. Renamed to `error`, with `errorName` and
  `errorStatus`. This is why the live 500s are opaque.
- **`ring-spec.ts`**: `withDefaults` spread the URL override *last*, so
  `?carat=2` rewrote every extracted spec on a deployed page — and A7 made it
  worse by persisting the result to `localStorage`, where it outlived the query
  string. It reaches callers through `DEFAULT_SPEC` now, so it still decides
  unset fields (the harness matrix needs that) and never overrides a set one.
  Non-finite values ignored: `?carat=abc` used to put `NaN` into `gemSize`.
  **Not** gated behind `import.meta.env.DEV`, deliberately — the harnesses are
  *built* (`vite.harness.config.ts` → `dist-harness/`), where `DEV` is false
  and the gate would switch the matrix off.
- **`chat-shell.tsx`**: `reallyDelete` minted a chat and called
  `setActiveChatId` inside a `setChats` updater. StrictMode invokes updaters
  twice.
- **`run-brep-tests.mjs`**: the specifier rewrite only walked the top level,
  only matched `from "./x"`, and would have turned `./limits.json` into
  `./limits.json.js`. All latent.

`a391217` — deleted `deploy.sh`. It is what deployed `wireframe-worker`
(`--allow-unauthenticated`, `GEMINI_API_KEY` as a plaintext env var), and it
also answers A6's open question about the two worker services:
`wireframe-cad-worker` is the same `cad-worker/` directory deployed earlier
under gcloud's default name from `cad-worker/package.json`.

---

## What was verified, and exactly how

### In the browser, on the branch, signed in

| Check | Result |
|---|---|
| Card appears immediately from the local parser | **Design ready · 100%**, preview mesh, Platinum / Round · 1.5 Ct / US 6.5 / **Comfort · 2.5mm** (2.5mm = schema default) |
| Studio matches the card | *Round · Prong · Platinum*; parameters panel **ring size 6.5, carat 1.5**, band 2.5mm, 6 prongs |
| Studio seeded from the prompt, not defaults | defaults are **6.0 / 1.0**; panel read **6.5 / 1.5** — this is the D3 fix, visible |
| Kernel output is real | inner Ø 16.91mm, outer Ø 20.01mm, band 2.5 × 1.55mm, stone Ø 7.43mm, 1.50 ct, 196.5 mm³ |
| No duplicate ids | `localStorage` held exactly one user + one assistant message per send, sharing a nonce |
| **`designJobs` queued unchanged** | **eleven before, eleven after two sends** — re-queried, not asserted |

### The one acceptance criterion that is UNMET

**The card never flipped to the model's spec, because `extractRingSpec` is not
answering.** Not redefined — unmet. Two sends, two different failures:

- **22:31:49Z** — cold start, container healthy at 22:31:51Z, then *nothing*.
  No model-selection log, no error, no response. No "Callable request
  verification passed" line at all, so the request never reached the handler.
  The promise had not settled at **419 seconds**.
- **22:38:03Z** — warm instance, auth VALID, App Check MISSING, picker selected
  `gemini-3.8-flash` with `matchesPolicy: true`, then at `durationMs: 2006`
  `Error: Ring spec extraction failed` at `index.js:128` → HTTP 500 /
  `functions/internal`. The client fell back correctly: `source: "parser"`,
  `status: "ready"`, spec populated (`14k_rose`, 2.4mm, `half_eternity`).

This is **A6 open item 5**, and it is not a timeout in either case. It also
explains the ten `spec: null` documents exactly: on `main`, `refineJobSpec`'s
`if (result.source !== "ai") return` discarded every parser fallback, so each
failure left a document empty forever.

### Suites, on main after the merge

```
npm run build                 ✓ built in 5.57s   brep-worker 448.36 kB (still code-split)
npm run lint                  130 errors + 4 warnings   (main's prior baseline: 137 + 4)
npm run test:cad              14 pass, 0 fail
npm --prefix functions test   25 pass, 0 fail
npm run test:brep             6 + 6 + 6 + 6 = 24 pass, 0 fail   (four filtered groups)
```

On `A7-close-followups`: build clean, lint 130, functions 25/25, and
`.brepcheck` deleted and rebuilt from empty then 6/6, with the emitted
specifier confirmed as `from "./ring-spec.js"`.

### Console, in full

- `Failed to load resource: the server responded with a status of 500 ()`
- `AI extraction unavailable, using local parser: {code: functions/internal, … FirebaseError: Could not interpret that description.}`
- `Canvas2D: Multiple readback operations using getImageData are faster with the willReadFrequently attribute set to true.` — on every page load
- `Cross-Origin-Opener-Policy policy would block the window.closed call.` ×2 — the Firebase sign-in popup
- routine `[vite] connecting/connected/hot updated` and the React DevTools notice
- `Uncaught TypeError: Cannot read properties of undefined (reading 'prompt')` + *"An error occurred in the `<DesignJobCard>` component"* — **not a live defect.** Console ordering was established empirically with a marker log (oldest first), which places this before the sign-in, i.e. in the previous session on the same origin, when HMR re-rendered `DesignJobCard` with its old `jobId` prop mid-edit.

---

## What was deliberately NOT done

- **No push.** `main` is 7 ahead of `origin/main`; `A7-close-followups` is
  unmerged. Both await a read of the diff.
- **`A7.md` left at PARTIAL.** Its remaining owed items are the cloud ones,
  and none of them have run. Flipping it now would be exactly the kind of
  false claim this task spent its time removing.
- **D4, the self-healing re-extract, still not added** — and the live failures
  are now a second reason, not just the first. An effect that re-calls
  `extractRingSpec` whenever `design.spec` is undefined would, today, fire on
  every mount of every spec-less design against an endpoint returning 500s,
  billing a Gemini call each time. Add it *after* extraction works, with a
  backoff and a once-per-design guard.
- **D9, the two-tab `localStorage` clobber, not fixed.** Last write wins, and
  nothing listens for `storage`. A partial merge here risks losing a user's
  in-flight chat state, and B1 replaces this storage entirely with `designs` +
  `versions`. It belongs to B1, not to a half-measure now.
- **Per-field provenance not added.** Nothing tells the customer that 18k
  became 14k. That is the confidence UI the strategy doc schedules for month 3
  and it belongs beside each value, not in a footer. **On a tool sold to
  jewellers, a silent metal substitution is the kind of thing that ends a
  customer relationship** — worth raising as its own task.
- **`cad-worker/` directory kept.** It is the only record of what the service
  did, and `cad-worker/service-account.json` inside it is A3's.
- **`extractRingSpec`'s failure not diagnosed.** Explicitly out of scope. What
  was tripped over is written down above, and `eebe941` makes the next failure
  legible.

---

## What the next task needs to know

**A3 (secrets).** Deleting `wireframe-worker` removes one of four plaintext
copies of the Gemini key — it holds `GEMINI_API_KEY` as a plain env var, not a
Secret Manager reference, so rotating the secret would never have rotated it.
`deploy.sh` is gone, so nothing will put it back. `cad-worker/.env` and
`cad-worker/service-account.json` are still live on disk. **Also: A6's
`firebase-functions-hash` for `extractRingSpec` was `fbd4e870…`; it is now
`7ece4353…`, so the function has been redeployed since the manifest — manifest
row 5 is stale.**

**A5 (GCP cleanup).** Two build-source buckets are accumulating zips, not one:
`gs://wireframe-v1_cloudbuild` *and* `gs://run-sources-wireframe-v1-us-central1`.
`my-model-service` has `maxScale: 20` on the service annotation but `10` on the
revision template, at 4 GiB each.

**A4 (CI).** Two assertions this task earns: `designJobs` is empty after the
sweep (non-zero means something started writing it again), and the Cloud Run
service list equals exactly `extractringspec` + `requestdemo`. Note also that
`npm run test:brep` was red on `main` and nobody knew.

**B1 (design records).** `designJobs` is dead — nothing writes it, nothing
reads it. Migrate `localStorage` `wireframe-chat-v1` instead, where the design
already sits on the message as `ChatDesign` (`id`, `prompt`, `spec?`, `source?`,
`model?`, `interpretation?`, `status?`). That maps onto a `designs` doc plus its
first `versions` entry nearly one-to-one. D9 above is yours.

---

## Unsure about / open

1. **`my-model-service` — still not identified, and I could not close it.**
   The container is unmistakably heavy single-request compute: `concurrency 1`,
   `cpu 2`, `memory 4Gi`, a 240s startup probe, 300s timeout, port 8080, no env
   vars. Its source zip is **423.9 MiB**, which is not application source —
   model weights baked in, or an un-ignored `node_modules`/`.venv`. Six
   revisions: one 2026-03-31, four inside twenty minutes on 2026-04-06, one at
   17:49 that day, nothing since. Consistent with A6's abandoned-experiment
   guess. **Confidence: medium — not enough for a live public endpoint.** The
   deciding read is the request-log command below. Cost: two minutes.
2. **The MCP log tool cannot see it.** `functions_get_logs` hard-codes
   `labels."goog-managed-by"="cloudfunctions"` into its filter, so a
   non-function Cloud Run service can never match and an empty result is not
   evidence of no traffic. Worth knowing before anyone else tries to use it
   that way.
3. **`extractRingSpec` is failing in production**, two distinct ways (above).
   A6 open item 5. `eebe941` makes the reason visible; until it is deployed,
   nobody can see it. Guess: the request that hangs never reaches the handler,
   which smells like a cold-start problem distinct from whatever makes the warm
   path throw in 2s. Cost to run down: one deploy plus one prompt.
4. **`14k_rose` for "18k rose gold".** `parseSpecFromPrompt` has no 18k rose
   entry, and `MetalType` has no `18k_rose` member — the union is
   `18k_gold | 14k_rose | white_gold | platinum | silver`. So the app cannot
   represent 18k rose gold at all. Kernel territory; not touched.
5. **`parseSpecFromPrompt` has a duplicated shank/setting block**
   (`ring-spec.ts:240-249` and `:257-263`). Harmless, now on a hotter path.
6. **The `functions` schema omits `regions`**, so the model can never return a
   region edit. Relevant to D2 and to lasso work.
7. **Enter did not submit via browser automation.** The composer's `onKeyDown`
   handles it, and the send button worked; this is most likely the automation's
   synthetic key event rather than an app defect, but it was not run down.

---

## Owed on the Mac

Egress blocks `*.googleapis.com` from both the bridge VM and the cloud
container. Nothing below has been run.

### 1. Identify `my-model-service` — the deciding read

```
gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="my-model-service"' \
  --project wireframe-v1 --limit 10 --freshness=90d \
  --format='table(timestamp,severity,httpRequest.requestUrl)'
```

Zero rows = nothing has invoked it and no container has started in ninety
days, which settles deletability on evidence. Optional, to name its contents
without re-downloading 424 MB (`cat` streams and does no hash check, so the
Python 3.9 CRC bug cannot bite):

```
gcloud storage cat --range=-2000000 gs://run-sources-wireframe-v1-us-central1/services/my-model-service/1775497242.326818-d5871166d1364e5b92f78e930c2f15f1.zip > ~/Downloads/a7-mms-tail.bin
```

Leave it in Downloads and the zip's central directory can be parsed from here.

### 2. The three services — capture, then delete

```
for S in wireframe-cad-worker wireframe-worker my-model-service; do
  gcloud run services describe $S --region us-central1 --project wireframe-v1 \
    --format=export > ~/Downloads/a7-$S.yaml
done
```

| Service | Deleting it breaks | Confidence |
|---|---|---|
| `wireframe-cad-worker` | Nothing. Listener-only, cannot exist at minScale 0; no `run.app` URL anywhere in `src/`, `functions/` or `vercel.json`; nothing writes its queue as of `ad7c6e2`. | **High** |
| `wireframe-worker` | Nothing, same reasons. Also removes a plaintext Gemini key copy. | **High** |
| `my-model-service` | Unknown — run step 1 first. | **Medium** |

```
gcloud run services delete wireframe-cad-worker --region us-central1 --project wireframe-v1 --quiet
gcloud run services delete wireframe-worker     --region us-central1 --project wireframe-v1 --quiet
# ONLY after step 1:
gcloud run services delete my-model-service     --region us-central1 --project wireframe-v1 --quiet

gcloud run services list --project wireframe-v1 \
  --format='table(metadata.name,status.url,metadata.creationTimestamp)'
```

Expected afterwards: exactly `extractringspec` and `requestdemo`.

### 3. Export, then empty `designJobs`

Decision taken: empty the whole collection, not just the twelve.

```
gcloud storage buckets create gs://wireframe-v1-a7-backup \
  --location us-central1 --project wireframe-v1

gcloud firestore export gs://wireframe-v1-a7-backup \
  --collection-ids=designJobs --database='(default)' --project wireframe-v1

firebase firestore:delete designJobs --recursive \
  --database '(default)' --project wireframe-v1 --force
```

Then say so and the count will be re-read from here — it should be **0**,
against **11 queued / 1 running / 24 done / 15 error** going in.

### 4. Deploy the logging fix, so the next failure is legible

Only after `A7-close-followups` is reviewed and merged:

```
npm --prefix functions test     # expect 25 pass
firebase deploy --only functions:extractRingSpec --project wireframe-v1
```

Scoped deliberately: `firebase.json` declares a `dataconnect` directory that
does not exist, so a bare deploy fails.

### 5. The branches

```
git --no-pager diff origin/main..main
git --no-pager diff main..A7-close-followups
git push origin main
```
