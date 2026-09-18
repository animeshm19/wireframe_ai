/**
 * Book a walkthrough.
 *
 * The form still posts the same seven fields to the same callable —
 * requestDemo, in functions/index.js — so nothing downstream changes.
 *
 * What changed, apart from the design:
 *
 *   A successful request used to report failure. The submit handler awaited
 *   the call and then did e.currentTarget.reset(). React nulls currentTarget
 *   once the handler returns, so by the time the await resolved that was
 *   null.reset(), which threw, which the catch below turned into "There was
 *   an issue submitting your request" — after the request had gone through.
 *   Anyone who filled this in was told it failed and, reasonably, sent it
 *   again. The form element is captured synchronously now.
 *
 *   The labels were floating text next to inputs rather than attached to
 *   them, so a screen reader announced unlabelled fields and clicking a label
 *   did nothing. They are real labels with ids.
 *
 *   Nothing was validated before being sent, and the status messages were not
 *   announced. Both fixed.
 */

import { useRef, useState } from "react";
import { motion } from "framer-motion";
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

  const validate = (p: DemoRequestPayload): Errors => {
    const e: Errors = {};
    if (!p.fullName.trim()) e.fullName = "Required";
    if (!p.email.trim()) e.email = "Required";
    // Deliberately loose: the only thing worth rejecting here is an address
    // that cannot possibly be one. Anything stricter turns away real people.
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
    <section
      id="contact"
      className="relative scroll-mt-24 overflow-hidden border-t border-white/5 bg-ink-900 py-24 sm:py-32"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(55% 45% at 18% 8%, rgba(225,40,130,0.06), transparent 62%)," +
            "radial-gradient(45% 40% at 88% 90%, rgba(198,155,178,0.06), transparent 62%)",
        }}
      />

      <div className="shell relative z-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-16">
        {/* Left: what the call actually is */}
        <div>
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center gap-3"
          >
            <span className="mono-label !text-metal-400">04</span>
            <span className="h-px w-8 bg-white/15" />
            <span className="mono-label">Talk to us</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.75, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}
            className="mt-5 max-w-[15ch] text-[clamp(1.9rem,1.2rem+2.4vw,3.1rem)] font-semibold leading-[1.04] tracking-[-0.035em] text-white"
          >
            Bring us a piece you already make.
          </motion.h2>

          <ol className="mt-8 space-y-5">
            {STEPS.map((s, i) => (
              <motion.li
                key={s}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.6, delay: 0.1 + i * 0.07, ease: [0.16, 1, 0.3, 1] }}
                className="flex gap-4"
              >
                <span className="mono-label mt-1 !text-[0.5rem] !text-metal-400">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-[0.9rem] leading-relaxed text-white/60">{s}</span>
              </motion.li>
            ))}
          </ol>

          <hr className="hairline my-8" />

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <div className="mono-label !text-[0.5rem]">Typical reply</div>
              <div className="mt-1 text-[0.9rem] text-white/75">
                One business day
              </div>
            </div>
            <div>
              <div className="mono-label !text-[0.5rem]">Or just email</div>
              <a
                href="mailto:hello@wireframe.studio"
                className="underline-fancy mt-1 inline-block text-[0.9rem] text-white/75 hover:text-white"
              >
                hello@wireframe.studio
              </a>
            </div>
          </div>
        </div>

        {/* Right: the form */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.8, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
          className="card-edge relative overflow-hidden rounded-2xl border border-white/8 bg-gradient-to-b from-white/[0.045] to-white/[0.012] p-6 sm:p-8"
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/22 to-transparent"
          />

          {sent ? (
            <div role="status" className="flex min-h-[26rem] flex-col items-start justify-center">
              <span className="grid h-11 w-11 place-items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
                ✓
              </span>
              <h3 className="mt-5 text-[1.3rem] font-medium tracking-tight text-white">
                That's with us.
              </h3>
              <p className="mt-2 max-w-sm text-[0.9rem] leading-relaxed text-white/55">
                We'll come back within one business day. If it's urgent, reply
                straight to the confirmation or write to
                hello@wireframe.studio.
              </p>
              <button
                onClick={() => setSent(false)}
                className="mono-label mt-6 !text-[0.52rem] underline decoration-white/25 underline-offset-4 hover:!text-white"
              >
                Send another
              </button>
            </div>
          ) : (
            <form ref={formRef} onSubmit={onSubmit} noValidate className="relative">
              <div className="mono-label mb-5 flex items-center gap-2 !text-[0.5rem]">
                <span>Request a walkthrough</span>
                <span className="h-px flex-1 bg-white/10" />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="fullName" label="Name" placeholder="Animesh Mittal"
                       autoComplete="name" error={errors.fullName} />
                <Field id="email" label="Email" type="email" placeholder="you@studio.com"
                       autoComplete="email" error={errors.email} />
                <Field id="company" label="Studio" placeholder="EAJ Concepts"
                       autoComplete="organization" error={errors.company} />
                <Field id="website" label="Website" placeholder="yourstudio.com"
                       autoComplete="url" optional />

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="teamSize" text="Bench size" error={errors.teamSize} />
                  <select id="teamSize" name="teamSize" defaultValue=""
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
                  placeholder="A piece you make often, and where it slows down."
                  className="glassy-input resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={sending}
                className="group mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-medium text-ink-900 transition-opacity duration-300 disabled:opacity-55"
              >
                {sending ? "Sending…" : "Request a walkthrough"}
                {!sending && (
                  <span className="transition-transform duration-500 group-hover:translate-x-1">→</span>
                )}
              </button>

              {/* Announced, so a screen reader hears the outcome. */}
              <div aria-live="polite" className="min-h-[1.4rem]">
                {failed && (
                  <p className="mt-3 text-[0.8rem] leading-relaxed text-red-300/90">{failed}</p>
                )}
                {!failed && Object.keys(errors).length > 0 && (
                  <p className="mt-3 text-[0.8rem] text-red-300/90">
                    A couple of fields still need filling in.
                  </p>
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
    <label htmlFor={htmlFor} className="mono-label flex items-baseline gap-2 !text-[0.5rem]">
      <span>{text}</span>
      {optional && <span className="!text-white/25">optional</span>}
      {error && <span className="normal-case tracking-normal text-red-300/90">{error}</span>}
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
