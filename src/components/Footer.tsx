/**
 * The footer.
 *
 * Three of its links went nowhere. /features, /pricing and /terms are not
 * routes — the router has no match for any of them, so all three fell through
 * to the catch-all and landed on the "coming soon" page. Features and pricing
 * are sections on this page and are now anchors to them; there is no terms
 * page to link to, so it is not linked to.
 *
 * The two social links pointed at x.com and linkedin.com — the sites, not any
 * account. A link to a social network's front door is worse than no link, so
 * they are out until there are real handles to put there.
 */

import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const logoUrl = "/icons/Wireframe.png";

type Item = { label: string } & ({ to: string } | { anchor: string } | { href: string });

const COLUMNS: Array<{ heading: string; items: Item[] }> = [
  {
    heading: "Product",
    items: [
      { label: "Capabilities", anchor: "features" },
      { label: "On the bench", anchor: "capabilities" },
      { label: "Plans", anchor: "pricing" },
      { label: "Technology", to: "/technology" },
      { label: "Changelog", to: "/changelog" },
      { label: "Docs", to: "/docs" },
    ],
  },
  {
    heading: "Company",
    items: [
      { label: "About", to: "/about" },
      { label: "Blog", to: "/blog" },
      { label: "Careers", to: "/careers" },
      { label: "Partners", to: "/partners" },
    ],
  },
  {
    heading: "Support",
    items: [
      { label: "Help", to: "/support" },
      { label: "Privacy", to: "/privacy" },
      { label: "Book a walkthrough", anchor: "contact" },
      { label: "hello@wireframe.studio", href: "mailto:hello@wireframe.studio" },
    ],
  },
];

const goTo = (id: string) =>
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative overflow-hidden border-t border-white/8 bg-ink-950">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(70% 60% at 50% 120%, rgba(198,155,178,0.09), transparent 62%)",
        }}
      />

      <div className="shell relative z-10 py-16 sm:py-20">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] lg:gap-20">
          <div>
            <Link to="/" className="inline-flex items-center gap-2.5">
              <img src={logoUrl} alt="" className="h-7 w-auto" />
              <span className="text-[0.95rem] font-semibold tracking-tight text-white">
                wireframe
              </span>
            </Link>

            <p className="mt-5 max-w-sm text-[0.92rem] leading-relaxed text-white/85">
              Describe a piece in plain language and get a parametric B-rep
              solid — measured, checked against real casting limits, and
              exported as STEP or STL.
            </p>

            <div className="mt-6 inline-flex items-center gap-2.5 rounded-full border border-white/12 bg-white/[0.05] px-3.5 py-1.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </span>
              <span className="mono-label !text-[0.55rem] !text-white/85">
                Onboarding select studios
              </span>
            </div>
          </div>

          <div className="grid gap-8 sm:grid-cols-3">
            {COLUMNS.map((col) => (
              <nav key={col.heading} aria-label={col.heading}>
                <h3 className="mono-label !text-[0.55rem] !text-white/90 font-semibold">{col.heading}</h3>
                <ul className="mt-4 space-y-2.5">
                  {col.items.map((item) => (
                    <li key={item.label}>
                      {"to" in item ? (
                        <Link
                          to={item.to}
                          className="text-[0.88rem] font-medium text-white/80 transition-colors duration-300 hover:text-white"
                        >
                          {item.label}
                        </Link>
                      ) : "anchor" in item ? (
                        <button
                          onClick={() => goTo(item.anchor)}
                          className="text-left text-[0.88rem] font-medium text-white/80 transition-colors duration-300 hover:text-white"
                        >
                          {item.label}
                        </button>
                      ) : (
                        <a
                          href={item.href}
                          className="text-[0.88rem] font-medium text-white/80 transition-colors duration-300 hover:text-white"
                        >
                          {item.label}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        {/* The wordmark, set large enough to be a graphic rather than a label.
            It is the one place on the page the name gets to be the picture. */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          aria-hidden="true"
          className="pointer-events-none mt-16 select-none text-center"
        >
          <span className="text-metal block bg-clip-text text-[clamp(3.2rem,1.2rem+11vw,10rem)] font-semibold leading-[0.8] tracking-[-0.06em]">
            wireframe
          </span>
        </motion.div>

        <div className="mt-12 flex flex-col gap-4 border-t border-white/8 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="mono-label !text-[0.52rem] !text-white/75">
            © {year} wireframe · Built in Canada
          </p>
          <p className="mono-label !text-[0.52rem] !text-white/75">
            B-rep kernel · OCCT · STEP AP214 &amp; binary STL
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
