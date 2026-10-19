# Ring-structure series — standing rules

Applies to every prompt S0–S8. Read this and STRUCTURE-LOG.md before doing anything.

0. Run only in Claude Code on the Mac (`pwd` starts with `/Users/`). If you find yourself in a
   `/sessions/...` VM, stop: git cannot clean up its own lock files there.
1. Work only in the worktree `~/Downloads/wireframe-structure`, on branch `structure/ring-head`.
   Never touch `~/Downloads/wireframe` (Animesh's uncommitted work lives there). Never commit to
   `main`, never merge, never force-push, never rewrite pushed history. Push the branch at the
   end of every prompt.
2. Never delete or weaken an existing test or assertion to make it pass. If an assertion encodes
   the old defective geometry (e.g. the B-rep vs mesh *volume* bound once heads change), change
   it only in its own commit, with a comment stating what changed, why the old number is no
   longer the right answer, and the measured new numbers — exactly the way the existing halo/
   bezel exemption in `B-rep and mesh engines agree on every supported design` is written.
   Record every such change in STRUCTURE-LOG.md under "Assertions changed".
3. Verify by measuring, never by reading code. The structure audit (`scripts/structure-audit.mjs`)
   is the source of truth. Every number in a commit message, log entry or report is pasted from a
   run, with the command that produced it.
4. OCCT booleans can fail by returning the wrong shape without throwing (see `fuseMetal`,
   `cutAll`). Every new boolean must be checked: a fuse never loses volume, a cut never gains it
   and never empties the shape, and solid count is checked where it matters. A failed check is
   an error to fix, never something to swallow.
5. Kernel work runs one design per Node process (WASM heap leak). Never loop over designs in one
   process except in small unit tests.
6. Every dimension that a standard or a bench setting covers comes from
   `src/lib/setting-standards.ts`. Geometry code reads bench values ONLY through
   `resolveBench(spec.bench, ctx)` — never a raw default — so a user's override always reaches
   the geometry. No magic numbers for those in geometry code. A value marked provisional is a
   default, not a verified fact; never present it as one.
6a. Bench settings are editable by users within hard bounds. Every invariant is checked against
   the EFFECTIVE (resolved) values of the design being audited, not the defaults. Whatever value
   a user picks inside the bounds, the ring must still assemble into one valid castable solid:
   the audit's "bench corner" designs (each field at its min and at its max, plus all-min and
   all-max) must pass every required invariant from the prompt that wires that field onwards.
   If a field cannot stitch at a bound, narrow the bound with measured evidence and log it under
   "Bench bounds changed" — never leave a reachable value that breaks the ring.
7. Do not change: the ring-size formula, band geometry, stone geometry or proportions, the
   carat-to-size mapping, `gemOutline`, `gemDims`, `brilliantTopology`, `girdleRadiusFor`. They
   are verified correct. The mesh engine `src/lib/cad-engine.ts` is the frozen differential
   reference — do not change its geometry.
8. Performance budgets (baseline recorded in S0, default ring, median of 5 runs, Node):
   preview (`buildRingParts` + `previewMesh` + `previewEdges`) at most 1.5x baseline;
   resolve (`buildRingParts({seats:true})` + `fuseMetal` + `ringMetrics`) at most 2.0x baseline.
   Exceeding a budget is a failure to fix, not to note.
9. User-facing copy uses British spelling and passes `scripts/audit.mjs` rules (no em dashes in
   rendered text, no words on its hype list). Code comments explain *why*, in the repo's style.
10. Lint: no new lint errors or warnings versus the S0 baseline count.
11. Commits: small, conventional (`fix(head): …`, `feat(audit): …`, `test(head): …`), each one
    builds. Push at the end of the prompt.
12. Do not stop until every acceptance criterion of the current prompt passes. If a criterion
    looks impossible, do not weaken it: investigate, measure, and try alternatives. Only if it is
    physically contradictory, record the evidence in the log, choose the most conservative
    option, finish everything else, and report it as an open question. If something needs
    Animesh (credentials, a physical measurement, a decision only he can make), finish all other
    work first, then record exactly what is owed.
13. Never claim a check passed that was not run to completion. Quote the command and its summary
    output.
14. Before ending any prompt: re-run the fast audit and the full kernel suite, review your own
    full diff for this prompt (`git diff <prompt-start-sha>..HEAD`), and — if you can spawn a
    subagent — have one review the diff adversarially against the prompt's acceptance criteria
    without seeing your reasoning. Fix every real finding. Record the review in the report.
15. End every prompt by writing `claude/tasks/S<n>.md` (status, commits, before/after numbers,
    how each criterion was verified, what was not done, open questions), appending to
    STRUCTURE-LOG.md, updating the PR description's checklist, and pushing.
