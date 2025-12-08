// src/lib/design-jobs.ts
import { httpsCallable } from "firebase/functions";
import { doc, onSnapshot } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
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

// Updated to accept attachment URLs
export async function createDesignJob(prompt: string, chatId?: string, attachmentUrls?: string[]) {
  const fn = httpsCallable(functions, "createDesignJob");
  // Pass attachments to the Cloud Function
  const res = await fn({ prompt, chatId, attachments: attachmentUrls });
  const data = res.data as any;
  return { jobId: String(data.jobId) };
}

// --- NEW: Function to delete chat history from backend ---
export async function deleteChatFromBackend(chatId: string) {
  const fn = httpsCallable(functions, "deleteChatHistory");
  await fn({ chatId });
}
// ---------------------------------------------------------

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

// Helper: Uploads file to Firebase Storage
export async function uploadJobAttachment(file: File, uid: string) {
  const timestamp = Date.now();
  // Sanitize filename to prevent issues
  const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
  const path = `user-uploads/${uid}/${timestamp}_${safeName}`;
  const storageRef = ref(storage, path);
  
  const snapshot = await uploadBytes(storageRef, file);
  const url = await getDownloadURL(snapshot.ref);
  
  return { 
    name: file.name,
    path,
    url, // The public download URL
    type: file.type || 'application/octet-stream'
  };
}