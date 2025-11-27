// src/lib/design-jobs.ts
import { httpsCallable } from "firebase/functions";
import { doc, onSnapshot } from "firebase/firestore";
import { getDownloadURL, ref } from "firebase/storage";
import { db, functions, storage } from "./firebase";

export type DesignJob = {
  ownerUid: string;
  chatId?: string | null;
  prompt: string;
  status: "queued" | "running" | "done" | "error";
  progress: number;
  error?: string;
  spec?: any;
  outputs?: { stlPath?: string; stepPath?: string };
};

export async function createDesignJob(prompt: string, chatId?: string) {
  const fn = httpsCallable(functions, "createDesignJob");
  const res = await fn({ prompt, chatId });
  const data = res.data as any;
  return { jobId: String(data.jobId) };
}

export function subscribeDesignJob(
  jobId: string,
  onJob: (job: any) => void,
  onError?: (err: any) => void
) {
  const ref = doc(db, "designJobs", jobId);
  return onSnapshot(
    ref,
    (snap) => onJob(snap.exists() ? ({ id: snap.id, ...snap.data() } as any) : null),
    (err) => onError?.(err)
  );
}

export async function jobFileUrl(path?: string) {
  if (!path) return null;
  return await getDownloadURL(ref(storage, path));
}
