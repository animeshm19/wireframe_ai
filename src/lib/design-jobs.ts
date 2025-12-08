import { 
  doc, 
  onSnapshot, 
  updateDoc, 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  writeBatch 
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage, auth } from "./firebase"; 

export type DesignJob = {
  id?: string;
  ownerUid: string;
  chatId?: string | null;
  prompt: string;
  status: "queued" | "running" | "done" | "error";
  progress: number;
  error?: string;
  spec?: any;
  outputs?: { stlPath?: string; stepPath?: string };
  updatedAt?: number;
  createdAt?: number;
};

// --- MODIFIED: Create Job directly in Firestore (No Cloud Function needed) ---
export async function createDesignJob(prompt: string, chatId?: string, attachmentUrls?: string[]) {
  // Ensure user is logged in
  if (!auth.currentUser) throw new Error("User must be logged in");

  const jobsRef = collection(db, "designJobs");
  const newJob: Omit<DesignJob, 'id'> = {
    ownerUid: auth.currentUser.uid,
    chatId: chatId || null,
    prompt,
    status: "queued",
    progress: 0,
    spec: null,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  const docRef = await addDoc(jobsRef, newJob);
  console.log("Job created with ID:", docRef.id);
  return { jobId: docRef.id };
}

// --- MODIFIED: Delete history directly in Firestore ---
export async function deleteChatFromBackend(chatId: string) {
  console.log("Deleting jobs for chat:", chatId);
  
  const jobsRef = collection(db, "designJobs");
  const q = query(jobsRef, where("chatId", "==", chatId));
  const snapshot = await getDocs(q);

  if (snapshot.empty) return;

  const batch = writeBatch(db);
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });

  await batch.commit();
  console.log("Cleanup complete");
}

// --- Updates a job (Save functionality) ---
export async function updateDesignJob(jobId: string, data: Partial<DesignJob>) {
  const ref = doc(db, "designJobs", jobId);
  await updateDoc(ref, data);
}

// --- Subscribe to job updates ---
export function subscribeDesignJob(
  jobId: string,
  onJob: (job: DesignJob) => void,
  onError?: (err: any) => void
) {
  if (!jobId) return () => {};
  
  const ref = doc(db, "designJobs", jobId);
  return onSnapshot(
    ref,
    (snap) => {
      if (snap.exists()) {
        onJob({ id: snap.id, ...snap.data() } as DesignJob);
      }
    },
    (err) => {
      console.error("Firestore Subscribe Error:", err);
      onError?.(err);
    }
  );
}

export async function jobFileUrl(path?: string) {
  if (!path) return null;
  return await getDownloadURL(ref(storage, path));
}

// Helper: Uploads file to Firebase Storage
export async function uploadJobAttachment(file: File, uid: string) {
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
  const path = `user-uploads/${uid}/${timestamp}_${safeName}`;
  const storageRef = ref(storage, path);
  
  const snapshot = await uploadBytes(storageRef, file);
  const url = await getDownloadURL(snapshot.ref);
  
  return { 
    name: file.name,
    path,
    url,
    type: file.type || 'application/octet-stream'
  };
}