/**
 * Storage helpers for chat attachments.
 *
 * This module used to own the `designJobs` collection: every chat message
 * created a document with `status: "queued"` for `cad-worker` to pick up, and
 * the extracted spec came back to the UI through an `onSnapshot` on that
 * document.
 *
 * That pipeline has no consumer. `cad-worker` runs on Cloud Run at minScale 0,
 * and its entire mechanism is a Firestore listener held open by a live
 * container (`cad-worker/index.js:207`) — a scale-to-zero service has no
 * container between requests, so the listener never exists and nothing ever
 * wakes it. Fifty documents accumulated; the last one a worker actually
 * touched errored in December 2025.
 *
 * Both consumers of that spec — `DesignJobCard` and `StudioWorkspace` — build
 * their geometry with the OCCT kernel in the browser and already fall back to
 * the schema defaults when there is no spec. So the round trip existed only to
 * carry a value between two components in the same tab. The chat now calls
 * `extractRingSpec` directly and keeps the result on the message (A7).
 *
 * B1 introduces the durable record — a `designs` collection with a `versions`
 * subcollection — and migrates the localStorage sessions into it. Nothing
 * should write `designJobs` again in the meantime.
 */
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "./firebase";

/**
 * Uploads one chat attachment and returns what the message needs to show it.
 *
 * NOTE for A2: this writes to `user-uploads/{uid}/...`, and the deployed
 * Storage rules only define `users/{uid}/...`, so every upload currently fails
 * with permission-denied. A7 deliberately does not change the path — the
 * canonical prefix and the rules that go with it are A2's decision.
 */
export async function uploadJobAttachment(file: File, uid: string) {
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
  const path = `user-uploads/${uid}/${timestamp}_${safeName}`;
  const storageRef = ref(storage, path);

  const snapshot = await uploadBytes(storageRef, file);
  const url = await getDownloadURL(snapshot.ref);

  return { name: file.name, path, url, type: file.type || "application/octet-stream" };
}
