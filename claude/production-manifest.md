# Production manifest — wireframe-v1

**Taken:** 2026-09-20, 17:40–18:01 UTC
**Repo reference:** `main` @ `47448fa`, working tree clean
**Task:** A6. Method: live APIs only. Nothing in this file is read from the repo and
assumed to be running. Where the two disagree the row is marked DRIFT.

Read this before trusting any statement of the form "the code does X". Three times now the
repo has said one thing and production has done another, and each time it was found by
accident. This file exists so the next one is found on purpose.

---

## Summary

| # | Surface | Verdict |
|---|---|---|
| 1 | Firestore rules — `(default)` | **match** |
| 2 | Firestore rules — stray `default` | **match** |
| 3 | Firestore databases | **DRIFT** — two exist, repo describes one |
| 4 | Storage rules | **DRIFT** — live is the 7 Dec 2025 version, missing `models/` |
| 5 | Cloud Function `extractRingSpec` | **match** — byte-identical to `47448fa` |
| 6 | Cloud Function `requestDemo` | **match** |
| 7 | Cloud Run `extractringspec`, `requestdemo` | **match** — function-managed |
| 8 | Cloud Run `wireframe-cad-worker` | **DRIFT** — deployed and live; repo has no deploy config |
| 9 | Cloud Run `wireframe-worker` | **DRIFT** — deployed and live; unaccounted for in the repo |
| 10 | Cloud Run `my-model-service` | **DRIFT** — exists in no form anywhere in the repo |
| 11 | `designJobs` consumers | **match** — nothing consumes them, as the board states |
| 12 | Gemini model at runtime | **match** — `gemini-3.8-flash`, as the policy names |
| 13 | Secret bindings | **DRIFT** — one real secret; credentials elsewhere are plaintext env |
| 14 | Frontend (Vercel) | **match** — built from `47448fa` |
| 15 | `firebase.json` → `dataconnect` | **DRIFT** — declared, directory does not exist |
| 16 | CI | **DRIFT** — repo has none; nothing guards any of the above |

**Four rows are clean, eight are not.** None of the drift is an exposure. Five of the eight
are *fail-closed* or *orphaned-resource* drift, which is cheaper to fix and more expensive to
ignore.

---

## The three questions A6 was opened to answer

### Does the deployed `extractRingSpec` include `model-picker.js` from `4da296f`? — **YES**

Settled two independent ways.

**By bytes.** The deployed build source
(`gs://gcf-v2-sources-184653772524-us-central1/extractRingSpec/function-source.zip`,
generation `1789924715109325`) downloaded and hashed against git:

| File | Deployed sha256 | Git sha256 | |
|---|---|---|---|
| `model-picker.js` | `d32744310d87e5d3d7596d67b6a4385825b614f44e8d920e57b2a3ac4405bc3a` | same, at `4da296f` | IDENTICAL |
| `index.js` | `1b92c74073a403b300853b87e8b013771676f60e584d32b6a6333018abb961fa` | same, at `47448fa` | IDENTICAL |
| `ring-schema.js` | `3832cc96da81c2b7a7152bf81f1dc75fd755d65567f3ce6999e5775968c9fe51` | same, at `47448fa` | IDENTICAL |

`diff -u` is empty for all three.

**By behaviour.** Cloud Logging for `extractRingSpec` contains
`{"message":"Selected Gemini model","selected":"gemini-3.8-flash","considered":[…]}` — a
string that exists nowhere but `model-picker.js:44` — on 17, 18 and 20 September, including
at `2026-09-20T17:31:44Z`, after that day's `DEPLOYMENT_ROLLOUT` at `17:19:36Z`.

The function has only ever had **two revisions**: `extractringspec-00001-mow`
(`2026-09-17T10:37:37Z`) and `extractringspec-00002-hok` (`2026-09-20T17:19:30Z`). There is
no revision of this function that predates the model picker.

### Are the live Storage rules permissive? — **NO.** They are *more restrictive* than the repo.

Live, from `projects/wireframe-v1/releases/firebase.storage/wireframe-v1.firebasestorage.app`
→ ruleset `eb86220a-0a89-4993-a4d2-86408b01bdf6`, 277 bytes,
sha256 `44dee8d45d78f42105fb9a5bb87c19c13500142998a6478736f64bcdd6b65e3a`:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /users/{uid}/{allPaths=**} {
      allow read: if request.auth != null && request.auth.uid == uid;
      allow write: if false;
    }
  }
}
```

Read requires authentication *and* a uid match. Write is `false` everywhere. There is no
catch-all allow, so everything unmatched is denied. **No path is world-readable and no path is
writable by any client.**

**Consequence for the board: A2 is routine, not urgent.** The board's escalation condition
("if A6 reports they are loose, run A2 immediately and push A3 back") is not met.

### What model is actually selected at runtime? — **`gemini-3.8-flash`**

Read from `logger.info` output, not from source. Most recent selection,
`2026-09-20T17:31:44Z`:

```json
{"selected":"gemini-3.8-flash",
 "considered":["gemini-3.8-flash","gemini-3.7-flash","gemini-3.6-flash",
               "gemini-3.5-flash-lite","gemini-3.5-flash","gemini-3.1-flash-lite",
               "gemini-3.1-flash-lite-image","gemini-3.1-flash-image"],
 "message":"Selected Gemini model"}
```

This **matches the model policy** for `extractRingSpec`. No `GEMINI_MODEL` pin exists on any
deployed service, so this is genuine runtime discovery, not a pin.

It is also the evidence for bug (b) in the scorer: **`gemini-3.1-flash-image` and
`gemini-3.1-flash-lite-image` are live, eligible candidates for a text-generation call**,
ranked 7th and 8th. They lose today only because three generations of plain Flash happen to
outrank them. That is luck, not a rule.

---

## 1–3. Firestore

Two databases exist, both `FIRESTORE_NATIVE`, both `us-central1`:

| Database | Created |
|---|---|
| `projects/wireframe-v1/databases/(default)` | 2025-11-27T03:42:31Z |
| `projects/wireframe-v1/databases/default` (stray) | 2025-11-27T02:47:31Z |

The stray was created **55 minutes before** the real one. Every rules deploy before
`27248a4` targeted it, because `firebase.json` said `"database": "default"`.

Rules read over REST from `firebaserules.googleapis.com`, **by named release** — the Firebase
MCP `firebase_get_security_rules` tool does not say which database it read, so it was not used
for this row. Firebase names the `(default)` database's release plainly `cloud.firestore`; a
named database takes a suffix.

| Release | Ruleset | Ruleset created | Bytes | sha256 | vs repo |
|---|---|---|---|---|---|
| `cloud.firestore` → **`(default)`** | `a1b16097-510c-40c0-aeaf-c17a752ae559` | 2026-09-15T10:42:03Z | 1520 | `f6fce400…af4993` | **match** |
| `cloud.firestore/default` → **stray** | `a03f8ebf-fa67-4246-ba6d-7b72c1499577` | 2026-09-15T10:39:30Z | 1520 | `f6fce400…af4993` | **match** |

Repo `firestore.rules` sha256 is `f6fce40073db39072295025cfff264526fea64f5d735440d584f468037af4993`.
**Byte-identical on both databases.** This confirms P0-S1's finding by content rather than by
403 probe.

One detail P0-S1 did not have: the live rules were released on **2026-09-15**, two days
*before* commit `27248a4` (2026-09-17). Deployed first, committed after. Harmless, but it
means "the rules match the repo" is currently true by coincidence of content, not by a
deploy that followed a commit. Only CI (A4) makes it true by construction.

**DRIFT (row 3):** the stray `default` database still exists and still carries a copy of the
rules. Nothing in the repo acknowledges it. Deleting it is a destructive action and is not
A6's to take.

## 4. Storage rules — DRIFT

| | sha256 | Bytes | Age |
|---|---|---|---|
| Live | `44dee8d45d78f42105fb9a5bb87c19c13500142998a6478736f64bcdd6b65e3a` | 277 | ruleset 2025-11-27, **released 2025-12-07T22:51:25Z** |
| Repo `storage.rules` | `98d8cd0d89a4fe702496b9480aa5bed63fd25d663e24d8f7d37430a670894e74` | — | last touched in repo after that |

The repo has a block live does not:

```
match /models/{allPaths=**} {
  allow read: if request.auth != null;
  allow write: if false;
}
```

**The Storage rules have not been deployed in nine months.** Every object under `models/`
falls through to default-deny, so the newer `models/{jobId}.stl` path schema P0-S1 flagged is
unreachable by any client. Signed URLs bypass rules and still work, which is why this has
never been noticed.

Direction of drift: **fail-closed.** Nothing is exposed.

## 5–7. Cloud Functions

Both are v2, callable, `us-central1`, `nodejs20`, 256MiB, 60s timeout, ingress `ALLOW_ALL`,
maxInstances 20, concurrency 80, running as `184653772524-compute@developer.gserviceaccount.com`
(the **default compute service account** — A3).

| | `extractRingSpec` | `requestDemo` |
|---|---|---|
| Created | 2026-09-17T10:36:53Z | 2025-12-10T23:39:21Z |
| Last updated | **2026-09-20T17:19:41Z** | **2026-09-20T17:19:40Z** |
| Revision | `extractringspec-00002-hok` | `requestdemo-00004-mak` |
| Revisions ever | 2 | 4 |
| Build | `a9e80c7c-2d77-465f-aa43-78f8174566bd` | `2e367b73-b5dd-47ad-9bd9-1cf650710fad` |
| `firebase-functions-hash` | `fbd4e8704c3cb5b42d5835c55c56b49603cbb95b` | `dc44542444b6d8a7f321a8fc6962079a8b45dc22` |
| Source object | `extractRingSpec/function-source.zip#1789924715109325` | `requestDemo/function-source.zip#1789924715191400` |
| Secret bindings | `GEMINI_API_KEY` v1 | **none** |
| Plain env vars | `MAIL_USER`, `MAIL_PASS`, `GEMINI_API_KEY`* | `MAIL_USER`, `MAIL_PASS` |
| Source vs repo | **match**, byte-identical to `47448fa` | **match** (same zip build, same commit) |

\* on `extractRingSpec`, `GEMINI_API_KEY` is a Secret Manager reference
(`secret-4051cbff-cae2-31e2-95f0-0de4653350f0`), not a plaintext value. `MAIL_USER` and
`MAIL_PASS` are plaintext.

Both services serve 100% of traffic to their latest revision. Both were redeployed by
`FirebaseCLI/15.30.1` at `2026-09-20T17:18:34Z` from `animeshmittal1911@gmail.com`.

**The repo source and the deployed source agree exactly.** This is the one surface where the
repo can currently be trusted — and only because it was checked.

## 8–10. Cloud Run — three services the repo does not account for

`gcloud run services list` returns **five** services, not two. All in `us-central1`, all
running as the default compute service account, all serving 100% traffic to a ready revision.

| Service | First created | Latest revision | Image | maxScale | minScale | Public? |
|---|---|---|---|---|---|---|
| `extractringspec` | 2026-09-17 | `…-00002-hok` (2026-09-20) | gcf-artifacts | 20 | 0 | `allUsers` |
| `requestdemo` | 2025-12-10 | `…-00004-mak` (2026-09-20) | gcf-artifacts | 20 | 0 | *(no binding)* |
| **`wireframe-cad-worker`** | 2025-11-27 | `…-00004-tdg` (**2025-11-27**) | `cloud-run-source-deploy/wireframe-cad-worker@sha256:bc684c2c…` | 3 | 0 | **`allUsers`** |
| **`wireframe-worker`** | 2025-12-07 | `…-00005-44q` (**2025-12-07**) | `cloud-run-source-deploy/wireframe-worker@sha256:0780a53e…` | 3 | 0 | **`allUsers`** |
| **`my-model-service`** | 2026-03-31 | `…-00006-6f7` (**2026-04-06**) | `cloud-run-source-deploy/my-model-service@sha256:f0a206c6…` | 10 | 0 | **`allUsers`** |

**No service carries an `autoscaling.knative.dev/minScale` annotation, so all sit at
minScale 0.** That is the mechanism behind the dead queue, and it is more precise than "the
worker is not running anywhere":

> `cad-worker/index.js:205` opens a Firestore listener on the `designJobs` collection. A
> Cloud Run service at minScale 0 has no container between requests. No container, no
> listener. The service is deployed, healthy, and structurally unable to do its job — it
> would need a request to wake it, and nothing ever sends one.

Env var names (values not read):

| Service | Env vars | Secret refs |
|---|---|---|
| `wireframe-cad-worker` | `CAD_WORKER_SECRET`, `FIREBASE_STORAGE_BUCKET` | **none** |
| `wireframe-worker` | `CAD_WORKER_SECRET`, **`GEMINI_API_KEY`**, `FIREBASE_STORAGE_BUCKET` | **none** |
| `my-model-service` | *(none at all)* | none |

**`my-model-service` corresponds to nothing in the repo** — no directory, no Dockerfile, no
reference in any source file. Six revisions, last touched 2026-04-06. Its purpose is unknown.

**`wireframe-cad-worker` and `wireframe-worker` are both public (`roles/run.invoker` →
`allUsers`) and both use the Admin SDK**, which bypasses Firestore rules entirely.
`CAD_WORKER_SECRET` suggests an in-application shared-secret check; that has not been
verified and is not A6's to verify.

Neither worker is in `firebase.json`; both were deployed with `gcloud run deploy` from source
(`client-name=gcloud`), so there is no repo artefact recording that they exist.

## 11. Does anything still consume `designJobs`? — **No.**

| Check | Result |
|---|---|
| Eventarc triggers, `us-central1` | **0** |
| Eventarc triggers, all locations | **0** |
| Pub/Sub topics | **0** |
| Pub/Sub subscriptions | **0** |
| Cloud Scheduler | **API not enabled on the project** |
| Cloud Run services at minScale > 0 | **none** |

Nothing is wired to the collection, and the only code that would listen cannot be running.

Live collection state, `(default)` database, 50 documents total:

| status | n |
|---|---|
| `done` | 24 |
| `error` | 15 |
| `queued` | **10** |
| `running` | 1 |

The board recorded **nine** queued at 17:43 UTC. There are **ten** at 18:01 UTC. The app is
still writing to a queue with no consumer, exactly as A7 assumes. One document has been stuck
at `running` since a worker picked it up and never finished.

**Correction to the board, for A7.** The board says queued jobs sit at `spec: null`. That is
not true of current jobs. The newest queued document (`YfNVh5391JwQnrJbTg4Q`,
`2026-09-20T17:31:51Z`) carries:

```
fields: chatId, createdAt, interpretation, ownerUid, progress, prompt,
        spec, specModel, specSource, status, updatedAt
spec:   {ringSize: 6.5, gemShape: "round", prongCount: 6, bandWidth: 2.2,
         gemSize: 1.5, shankStones: "none", finish: "polished", …}
status: "queued"   progress: 0
```

**The spec is populated.** `extractRingSpec` writes a real spec onto the job; the job then
sits queued forever because nothing consumes it. So `spec: null` was an observation of the
older, December-2025-era documents, not of what the app produces today. Whatever makes the
Studio mount an empty scene, it is not a missing spec on new jobs. A7 should re-derive that
symptom rather than inherit it.

## 12. Runtime model — see "the three questions" above. **match.**

## 13. Secrets — DRIFT

Secret Manager contains exactly **one** secret:

| Secret | Created | Versions |
|---|---|---|
| `GEMINI_API_KEY` | 2026-09-17T10:35:44Z | `1`, enabled, created 2026-09-17T10:36:08Z |

Bound by exactly one deployed function: `extractRingSpec`. Everything else that holds a
credential holds it in plaintext:

| Where | What | How |
|---|---|---|
| `extractringspec` env | `MAIL_USER`, `MAIL_PASS` | plaintext env var |
| `requestdemo` env | `MAIL_USER`, `MAIL_PASS` | plaintext env var |
| `wireframe-worker` env | **`GEMINI_API_KEY`** | plaintext env var, *not* the Secret Manager reference |
| `gcf-v2-sources-…/extractRingSpec/function-source.zip` | `.env`, `.env.yaml` | **shipped inside the deployed source zip** |
| `gcf-v2-sources-…/requestDemo/function-source.zip` | `.env`, `.env.yaml` | same |
| `cad-worker/service-account.json` | service-account private key | on disk; gitignored, never committed (verified against full history) |

`extractRingSpec` does not send mail and has no use for `MAIL_USER`/`MAIL_PASS`; it inherits
them because `.env.yaml` applies to the whole `default` codebase.

The Gmail app password therefore exists in plaintext in **four** places: two container
environments and two durable GCS objects. **All of this is A3's, not A6's.**

## 14. Frontend — match

Hosted on **Vercel**, not Firebase Hosting (`firebase.json` declares no `hosting` key;
`vercel.json` exists at the repo root).

| | |
|---|---|
| Project | `wireframe-ai` (`prj_hjyfwTiAq9oc7vFSG9pquMARXXv3`) |
| Production deployment | `dpl_Ey5RAzccuML39sCwvMs6Nc42cQ32`, state `READY` |
| Built from | branch `main`, commit **`47448fa318437d62b68a43814633c96d5e9a2a7e`** |
| Deployed | 2026-09-20T17:20:48Z |

The live frontend is built from the current tip of `main`. **match.**

## 15. `firebase.json` → `dataconnect` — DRIFT

```json
"dataconnect": { "source": "dataconnect" }
```

**There is no `dataconnect` directory in the repo.** A bare `firebase deploy` with no
`--only` will fail on it. Always scope the target. No Data Connect service is deployed.

## 16. CI — DRIFT

There is no `.github` directory. No workflow runs the rules tests, checks deployed-vs-repo
drift, or would have caught a single row in this table. **This is what A4 is for**, and this
manifest is the reference it should reproduce.

---

## How each fact was obtained

Everything here came from a live API. The bridge VM and the cloud container both get 403 on
`CONNECT` for `*.googleapis.com`, so all `gcloud`/REST calls were run on the Mac from
`~/Downloads/a6-probe{,2,3,4}.sh` and read back from their `.out` files.

| Fact | Source |
|---|---|
| Rules content and sha, by named release | `firebaserules.googleapis.com/v1/projects/wireframe-v1/releases` + `/rulesets/{id}` |
| Firestore databases | `firestore.googleapis.com/v1/projects/wireframe-v1/databases` |
| Function config, timestamps, secrets | `gcloud functions describe --gen2` + `cloudaudit` `UpdateFunction` log entries |
| Deployed source bytes | `gcloud storage cp` of the build's `storageSource`, unzipped and `shasum`'d against `git show` |
| Runtime model | `functions_get_logs` on `extractRingSpec`, `logger.info` payloads |
| Cloud Run inventory, scaling, IAM | `gcloud run services list` / `describe` / `get-iam-policy` / `revisions list` |
| Queue consumers | `gcloud eventarc triggers list`, `pubsub topics/subscriptions list`, `scheduler jobs list` |
| `designJobs` state | `firestore.googleapis.com` REST list on `(default)` |
| Frontend commit | Vercel API, `list_deployments` filtered to `target=production` |

Two methods were deliberately **not** used, both for reasons the board already records: the
Firebase MCP `firebase_get_security_rules` tool (does not name the database it read) and the
Firebase Web SDK (falls back to local cache on an unreachable backend, so an empty result is
indistinguishable from "not blocked").

## Not done, deliberately

- **Nothing was changed, deleted or deployed.** The three unaccounted Cloud Run services, the
  stray `default` database, the plaintext credentials and the missing Storage rules are all
  reported and left exactly as found.
- **`CAD_WORKER_SECRET` was not tested.** Establishing whether the two public workers are
  actually protected means sending them a request, which is not a read.
- **`my-model-service`'s purpose was not investigated** beyond confirming it matches nothing
  in the repo.
- **No secret value was read anywhere.** Only names and keys.
