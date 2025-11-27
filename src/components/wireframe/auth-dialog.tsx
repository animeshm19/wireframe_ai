import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../auth/auth-context";

function initials(nameOrEmail?: string | null) {
  const s = (nameOrEmail ?? "").trim();
  if (!s) return "WF";
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return s.slice(0, 2).toUpperCase();
}

function prettyErr(e: unknown) {
  const m = String((e as any)?.message ?? "");
  const low = m.toLowerCase();
  if (low.includes("auth/invalid-credential")) return "Invalid email or password.";
  if (low.includes("auth/email-already-in-use")) return "That email is already in use.";
  if (low.includes("auth/weak-password")) return "Password is too weak (try 8+ characters).";
  if (low.includes("auth/popup-closed-by-user")) return "Popup closed. Try again.";
  return "Could not authenticate. Try again.";
}

export function AuthDialog({
  open,
  onClose,
  onAuthed,
}: {
  open: boolean;
  onClose: () => void;
  onAuthed?: () => void;
}) {
  const { user, signIn, signUp, signInWithGoogle } = useAuth();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");

  const canSubmit = useMemo(() => {
    if (!email.trim() || !pw.trim()) return false;
    if (mode === "signup" && !name.trim()) return false;
    return true;
  }, [mode, email, pw, name]);

  const run = async (fn: () => Promise<void>) => {
    setErr(null);
    setBusy(true);
    try {
      await fn();
      onClose();
      onAuthed?.();
    } catch (e) {
      setErr(prettyErr(e));
    } finally {
      setBusy(false);
    }
  };

  if (user && open) {
    // If they’re already authed but modal is open, close it and continue.
    onClose();
    onAuthed?.();
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/65 backdrop-blur-sm px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="w-full max-w-4xl overflow-hidden rounded-3xl border border-white/12 bg-[#12010B] shadow-[0_30px_120px_rgba(0,0,0,0.55)]"
          >
            <div className="grid grid-cols-1 md:grid-cols-2">
              {/* Left art */}
              <div className="relative hidden md:block">
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-[#731E47]/20 to-emerald-500/10" />
                <div className="absolute inset-0">
                  <div className="absolute -top-24 -left-24 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
                  <div className="absolute -bottom-28 -right-28 h-96 w-96 rounded-full bg-[#731E47]/25 blur-3xl" />
                </div>

                <div className="relative h-full p-10">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/25 px-3 py-1 text-xs text-white/80">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    Wireframe Access
                  </div>

                  <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white">
                    Sign in to unlock your answer.
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-white/70">
                    We only gate the moment you request an output. After you’re in, your prompt sends instantly.
                  </p>

                  <div className="mt-8 rounded-2xl border border-white/12 bg-black/20 p-5">
                    <div className="text-xs text-white/60">You get</div>
                    <ul className="mt-3 space-y-2 text-sm text-white/80">
                      <li className="flex items-start gap-2">
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-white/70" />
                        Saved chats per account
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-300/80" />
                        Cleaner abuse protection with minimal friction
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[#B57A93]" />
                        Ready for subscriptions later
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Right form */}
              <div className="relative p-6 sm:p-8">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-lg font-semibold text-white">Continue</div>
                    <div className="mt-1 text-sm text-white/60">
                      Sign in or create an account to view results.
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="rounded-full border border-white/12 bg-black/35 px-3 py-1 text-xs text-white/70 hover:bg-black/55"
                  >
                    Close
                  </button>
                </div>

                <div className="mt-5 flex items-center gap-2">
                  <div className="h-9 w-9 rounded-full bg-white/12 flex items-center justify-center text-[11px] font-semibold text-white">
                    {initials(email || "Wireframe")}
                  </div>

                  <div className="flex rounded-2xl border border-white/12 bg-black/25 p-1">
                    <button
                      type="button"
                      onClick={() => setMode("signin")}
                      className={[
                        "px-3 py-1.5 text-xs rounded-xl transition",
                        mode === "signin" ? "bg-white/12 text-white" : "text-white/60 hover:text-white",
                      ].join(" ")}
                    >
                      Sign in
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode("signup")}
                      className={[
                        "px-3 py-1.5 text-xs rounded-xl transition",
                        mode === "signup" ? "bg-white/12 text-white" : "text-white/60 hover:text-white",
                      ].join(" ")}
                    >
                      Sign up
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={busy}
                  onClick={() => run(() => signInWithGoogle())}
                  className="mt-5 w-full rounded-2xl border border-white/15 bg-black/25 px-4 py-3 text-sm text-white hover:bg-black/35 disabled:opacity-60"
                >
                  Continue with Google
                </button>

                <div className="my-5 flex items-center gap-3">
                  <div className="h-px flex-1 bg-white/10" />
                  <span className="text-xs text-white/40">or</span>
                  <div className="h-px flex-1 bg-white/10" />
                </div>

                <form
                  className="space-y-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!canSubmit || busy) return;
                    run(() =>
                      mode === "signin"
                        ? signIn(email.trim(), pw)
                        : signUp(name.trim(), email.trim(), pw)
                    );
                  }}
                >
                  {mode === "signup" && (
                    <div className="space-y-2">
                      <label className="text-xs text-white/70">Name</label>
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full rounded-2xl border border-white/12 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/25"
                        placeholder="Animesh"
                        autoComplete="name"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-xs text-white/70">Email</label>
                    <input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-2xl border border-white/12 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/25"
                      placeholder="you@wireframe.studio"
                      autoComplete="email"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs text-white/70">Password</label>
                    <input
                      value={pw}
                      onChange={(e) => setPw(e.target.value)}
                      className="w-full rounded-2xl border border-white/12 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/25"
                      placeholder={mode === "signup" ? "8+ characters" : "••••••••"}
                      type="password"
                      autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    />
                  </div>

                  {err && (
                    <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                      {err}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={!canSubmit || busy}
                    className="w-full rounded-2xl bg-white/90 px-4 py-3 text-sm font-medium text-black hover:bg-white disabled:opacity-60"
                  >
                    {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
                  </button>

                  <div className="text-[11px] text-white/45">
                    By continuing, you agree to Wireframe’s terms and privacy policy.
                  </div>
                </form>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
