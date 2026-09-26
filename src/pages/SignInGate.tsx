import { useState } from "react";
import { PageHeader, PageShell } from "../components/PageHeader";
import { AuthDialog } from "../components/wireframe/auth-dialog";
import { useAuth } from "../auth/auth-context";
import { useTitle } from "../components/useTitle";

/** Shown at /chat to visitors who are not signed in. Signing in re-renders the route into the Studio. */
export function SignInGate() {
  useTitle("Sign in");
  const { signInWithGoogle } = useAuth();
  const [emailOpen, setEmailOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const google = async () => {
    setError(null);
    setBusy(true);
    try {
      await signInWithGoogle();
    } catch (e) {
      const code = (e as { code?: string })?.code ?? "";
      if (code !== "auth/popup-closed-by-user" && code !== "auth/cancelled-popup-request") {
        setError("Google sign-in did not complete. Try again, or use your email instead.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageShell>
      <PageHeader
        title="Sign in to open the Studio"
        lede="Describe a ring, adjust it in 3D and export STEP and STL files for your caster."
        action={
          <div>
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={google} disabled={busy} className="btn-primary disabled:opacity-60">
                {busy ? "Opening Google…" : "Continue with Google"}
              </button>
              <button type="button" onClick={() => setEmailOpen(true)} className="btn-secondary">
                Use email
              </button>
            </div>
            <p aria-live="polite" className="mt-4 min-h-[1.5rem] text-sm text-red-300">
              {error}
            </p>
          </div>
        }
      />
      <AuthDialog open={emailOpen} onClose={() => setEmailOpen(false)} />
    </PageShell>
  );
}

export default SignInGate;
