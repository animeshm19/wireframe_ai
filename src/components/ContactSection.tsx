/* Demo request: posts seven fields to the requestDemo callable (functions/index.js).
 * The form is captured before the await because React clears ev.currentTarget. */

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { useRise } from "./motion";
import { httpsCallable } from "firebase/functions";
import { functions } from "../lib/firebase";

interface DemoRequestPayload {
  fullName: string;
  email: string;
  company: string;
  website: string;
  teamSize: string;
  useCase: string;
  message: string;
}

type Errors = Partial<Record<keyof DemoRequestPayload, string>>;

const TEAM_SIZES = ["1–3 people", "4–10 people", "11–50 people", "50+ people"];
const USE_CASES = [
  { v: "ai-cad", l: "Design and CAD" },
  { v: "quoting", l: "Quoting custom work" },
  { v: "both", l: "Both" },
  { v: "other", l: "Something else" },
];

const STEPS = [
  "You tell us what you make and how the work reaches your caster today.",
  "We run one of your own pieces through the engine, live, on the call.",
  "You get the STEP and the STL from it, whether or not you go further.",
];

export function ContactSection() {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const formRef = useRef<HTMLFormElement>(null);
  const rise = useRise();

  const validate = (p: DemoRequestPayload): Errors => {
    const e: Errors = {};
    if (!p.fullName.trim()) e.fullName = "Required";
    if (!p.email.trim()) e.email = "Required";
    // Loose on purpose: stricter patterns turn away real addresses.
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email.trim()))
      e.email = "That does not look like an email address";
    if (!p.company.trim()) e.company = "Required";
    if (!p.teamSize) e.teamSize = "Pick one";
    return e;
  };

  const onSubmit = async (ev: React.FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    // Captured now, while the event is still live.
    const form = ev.currentTarget;
    const data = new FormData(form);

    const payload: DemoRequestPayload = {
      fullName: String(data.get("fullName") ?? ""),
      email: String(data.get("email") ?? ""),
      company: String(data.get("company") ?? ""),
      website: String(data.get("website") ?? ""),
      teamSize: String(data.get("teamSize") ?? ""),
      useCase: String(data.get("useCase") ?? ""),
      message: String(data.get("message") ?? ""),
    };

    const found = validate(payload);
    setErrors(found);
    if (Object.keys(found).length) {
      const first = form.querySelector<HTMLElement>(`[name="${Object.keys(found)[0]}"]`);
      first?.focus();
      return;
    }

    setFailed(null);
    setSending(true);
    try {
      const call = httpsCallable<DemoRequestPayload, { status: string }>(
        functions,
        "requestDemo"
      );
      const res = await call(payload);
      if (res.data?.status !== "success") throw new Error("Unexpected response");
      form.reset();
      setSent(true);
    } catch (err) {
      console.error("Demo request failed:", err);
      setFailed(
        "That did not go through. Try again, or email hello@wireframe.studio and we will pick it up from there."
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <section id="contact" className="relative scroll-mt-24 border-t border-white/5 bg-ink-900 py-16 md:py-28">
      <div className="shell grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-16">
        <div>
          <motion.p {...rise(0)} className="eyebrow">Book a demo</motion.p>
          <motion.h2 {...rise(0.04)} className="h-section mt-3 max-w-[16ch]">
            Bring us a piece you already make
          </motion.h2>

          <motion.ol {...rise(0.08)} className="mt-8 space-y-4">
            {STEPS.map((s, i) => (
              <li key={s} className="flex gap-4">
                <span className="measure mt-0.5 w-4 shrink-0 text-sm text-metal-300">{i + 1}</span>
                <span className="text-white/85">{s}</span>
              </li>
            ))}
          </motion.ol>

          <hr className="hairline my-8" />

          <dl className="grid gap-5 sm:grid-cols-2">
            <div>
              <dt className="label">Typical reply</dt>
              <dd className="mt-1 text-white">One business day</dd>
            </div>
            <div>
              <dt className="label">Or email</dt>
              <dd className="mt-1">
                <a href="mailto:hello@wireframe.studio" className="inline-flex min-h-11 items-center text-white underline decoration-white/30 underline-offset-4 hover:decoration-white md:min-h-0">
                  hello@wireframe.studio
                </a>
              </dd>
            </div>
          </dl>
        </div>

        <motion.div {...rise(0.06)} className="relative rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
          {sent ? (
            <div role="status" className="flex min-h-[24rem] flex-col items-start justify-center">
              <CheckCircle2 className="h-6 w-6 text-emerald-300" aria-hidden="true" />
              <h3 className="mt-4 text-[1.3rem] font-semibold text-white">Request sent</h3>
              <p className="mt-2 max-w-sm text-white/82">
                We will reply within one business day. If it is urgent, write to
                hello@wireframe.studio.
              </p>
              <button type="button" onClick={() => setSent(false)} className="btn-secondary mt-6">
                Send another
              </button>
            </div>
          ) : (
            <form ref={formRef} onSubmit={onSubmit} noValidate>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="fullName" label="Name" placeholder="Your name"
                       autoComplete="name" error={errors.fullName} />
                <Field id="email" label="Email" type="email" placeholder="you@studio.com"
                       autoComplete="email" error={errors.email} />
                <Field id="company" label="Studio" placeholder="Studio or workshop name"
                       autoComplete="organization" error={errors.company} />
                <Field id="website" label="Website" placeholder="yourstudio.com"
                       autoComplete="url" optional />

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="teamSize" text="Team size" error={errors.teamSize} />
                  <select id="teamSize" name="teamSize" defaultValue="" aria-invalid={!!errors.teamSize}
                          className="glassy-input glassy-select">
                    <option value="" disabled>Choose one</option>
                    {TEAM_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="useCase" text="Mainly for" optional />
                  <select id="useCase" name="useCase" defaultValue="ai-cad"
                          className="glassy-input glassy-select">
                    {USE_CASES.map((u) => <option key={u.v} value={u.v}>{u.l}</option>)}
                  </select>
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-1.5">
                <Label htmlFor="message" text="What would you bring to the call?" optional />
                <textarea
                  id="message" name="message" rows={4}
                  placeholder="A piece you make often, and where it slows you down."
                  className="glassy-input resize-none"
                />
              </div>

              <button type="submit" disabled={sending} className="btn-primary mt-6 w-full disabled:opacity-60">
                {sending ? "Sending…" : "Send request"}
              </button>

              <div aria-live="polite" className="min-h-[1.4rem]">
                {failed && <p className="mt-3 text-sm text-red-300">{failed}</p>}
                {!failed && Object.keys(errors).length > 0 && (
                  <p className="mt-3 text-sm text-red-300">Some fields still need filling in.</p>
                )}
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ parts -- */

function Label({
  htmlFor, text, optional, error,
}: { htmlFor: string; text: string; optional?: boolean; error?: string }) {
  return (
    <label htmlFor={htmlFor} className="label flex items-baseline gap-2 !text-white/85">
      <span>{text}</span>
      {optional && <span className="text-white/55">optional</span>}
      {error && <span className="text-red-300">{error}</span>}
    </label>
  );
}

function Field({
  id, label, error, optional, ...rest
}: {
  id: keyof DemoRequestPayload;
  label: string;
  error?: string;
  optional?: boolean;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} text={label} optional={optional} error={error} />
      <input
        id={id}
        name={id}
        aria-invalid={!!error}
        className={"glassy-input " + (error ? "!border-red-400/60" : "")}
        {...rest}
      />
    </div>
  );
}

export default ContactSection;
