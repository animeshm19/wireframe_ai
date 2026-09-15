/**
 * Firestore security rules tests (P0-S1).
 *
 * Runs the COMMITTED firestore.rules file against the Firestore emulator.
 * Never point this at a real project.
 *
 *   npm run test:rules
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import test, { before, after, beforeEach } from "node:test";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import {
  doc,
  collection,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
} from "firebase/firestore";

const HERE = dirname(fileURLToPath(import.meta.url));

const ALICE = "alice-uid";
const BOB = "bob-uid";
const JOB_ID = "job-owned-by-alice";
const CHAT_ID = "chat-1";

/** Mirrors the document shape written by createDesignJob(). */
function jobDoc(ownerUid, overrides = {}) {
  return {
    ownerUid,
    chatId: CHAT_ID,
    prompt: "a platinum solitaire ring",
    status: "queued",
    progress: 0,
    spec: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

let testEnv;

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "demo-wireframe-rules",
    firestore: {
      rules: readFileSync(join(HERE, "firestore.rules"), "utf8"),
    },
  });
});

after(async () => {
  await testEnv?.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  // Seed one job owned by Alice, bypassing rules.
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), "designJobs", JOB_ID), jobDoc(ALICE));
    await setDoc(doc(ctx.firestore(), "secrets", "admin-only"), { v: 1 });
  });
});

const anon = () => testEnv.unauthenticatedContext().firestore();
const as = (uid) => testEnv.authenticatedContext(uid).firestore();

// --- Unauthenticated access is denied everywhere -------------------------

test("unauthenticated: cannot read a job by id", async () => {
  await assertFails(getDoc(doc(anon(), "designJobs", JOB_ID)));
});

test("unauthenticated: cannot list designJobs", async () => {
  await assertFails(getDocs(collection(anon(), "designJobs")));
});

test("unauthenticated: cannot create a job", async () => {
  await assertFails(addDoc(collection(anon(), "designJobs"), jobDoc(ALICE)));
});

test("unauthenticated: cannot update a job", async () => {
  await assertFails(
    updateDoc(doc(anon(), "designJobs", JOB_ID), { status: "done" })
  );
});

test("unauthenticated: cannot delete a job", async () => {
  await assertFails(deleteDoc(doc(anon(), "designJobs", JOB_ID)));
});

// --- Owner can do what the app needs ------------------------------------

test("owner: can create a job with their own ownerUid", async () => {
  await assertSucceeds(
    addDoc(collection(as(ALICE), "designJobs"), jobDoc(ALICE))
  );
});

test("owner: can read their own job by id (DesignJobCard subscription)", async () => {
  await assertSucceeds(getDoc(doc(as(ALICE), "designJobs", JOB_ID)));
});

test("owner: can list their own jobs when the query is scoped to ownerUid", async () => {
  await assertSucceeds(
    getDocs(
      query(
        collection(as(ALICE), "designJobs"),
        where("ownerUid", "==", ALICE)
      )
    )
  );
});

test("owner: can run the delete-chat query (ownerUid + chatId)", async () => {
  await assertSucceeds(
    getDocs(
      query(
        collection(as(ALICE), "designJobs"),
        where("ownerUid", "==", ALICE),
        where("chatId", "==", CHAT_ID)
      )
    )
  );
});

test("owner: can update their own job", async () => {
  await assertSucceeds(
    updateDoc(doc(as(ALICE), "designJobs", JOB_ID), { status: "done" })
  );
});

test("owner: can delete their own job", async () => {
  await assertSucceeds(deleteDoc(doc(as(ALICE), "designJobs", JOB_ID)));
});

// --- Cross-user access is denied ----------------------------------------

test("other user: cannot read another user's job", async () => {
  await assertFails(getDoc(doc(as(BOB), "designJobs", JOB_ID)));
});

test("other user: cannot list another user's jobs", async () => {
  await assertFails(
    getDocs(
      query(collection(as(BOB), "designJobs"), where("ownerUid", "==", ALICE))
    )
  );
});

test("other user: cannot update another user's job", async () => {
  await assertFails(
    updateDoc(doc(as(BOB), "designJobs", JOB_ID), { status: "done" })
  );
});

test("other user: cannot delete another user's job", async () => {
  await assertFails(deleteDoc(doc(as(BOB), "designJobs", JOB_ID)));
});

// --- Malformed / abusive writes -----------------------------------------

test("malformed create: ownerUid belonging to someone else is denied", async () => {
  await assertFails(
    addDoc(collection(as(ALICE), "designJobs"), jobDoc(BOB))
  );
});

test("malformed create: missing ownerUid is denied", async () => {
  const { ownerUid, ...withoutOwner } = jobDoc(ALICE);
  void ownerUid;
  await assertFails(
    addDoc(collection(as(ALICE), "designJobs"), withoutOwner)
  );
});

test("update cannot transfer ownership to another user", async () => {
  await assertFails(
    updateDoc(doc(as(ALICE), "designJobs", JOB_ID), { ownerUid: BOB })
  );
});

test("signed-in user cannot list designJobs without an ownerUid constraint", async () => {
  await assertFails(getDocs(collection(as(ALICE), "designJobs")));
});

// --- Catch-all denies everything else -----------------------------------

test("catch-all: signed-in user cannot read an unmatched collection", async () => {
  await assertFails(getDoc(doc(as(ALICE), "secrets", "admin-only")));
});

test("catch-all: signed-in user cannot write an unmatched collection", async () => {
  await assertFails(
    setDoc(doc(as(ALICE), "secrets", "admin-only"), { v: 2 })
  );
});

test("catch-all: unauthenticated user cannot read an unmatched collection", async () => {
  await assertFails(getDoc(doc(anon(), "secrets", "admin-only")));
});
