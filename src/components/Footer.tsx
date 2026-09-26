import { Link, useNavigate } from "react-router-dom";

const logoUrl = "/icons/Wireframe.png";

type Item = { label: string } & ({ to: string } | { anchor: string } | { href: string });

const COLUMNS: Array<{ heading: string; items: Item[] }> = [
  {
    heading: "Product",
    items: [
      { label: "How it works", anchor: "how" },
      { label: "On the bench", anchor: "bench" },
      { label: "Pricing", anchor: "pricing" },
      { label: "Technology", to: "/technology" },
      { label: "Studio guide", to: "/docs" },
      { label: "Changelog", to: "/changelog" },
    ],
  },
  {
    heading: "Company",
    items: [
      { label: "About", to: "/about" },
      { label: "Journal", to: "/journal" },
    ],
  },
  {
    heading: "Support",
    items: [
      { label: "Help", to: "/support" },
      { label: "Privacy", to: "/privacy" },
      { label: "Book a demo", anchor: "contact" },
      { label: "hello@wireframe.studio", href: "mailto:hello@wireframe.studio" },
    ],
  },
];

const linkCls =
  "inline-flex min-h-11 items-center text-left text-[0.92rem] text-white/78 transition-colors hover:text-white md:min-h-0 md:py-1";

export function Footer() {
  const navigate = useNavigate();
  const year = new Date().getFullYear();

  const goTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    else navigate(`/#${id}`);
  };

  return (
    <footer className="relative border-t border-white/8 bg-ink-950">
      <div className="shell py-14 sm:py-20">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] lg:gap-20">
          <div>
            <Link to="/" className="inline-flex min-h-11 items-center gap-2.5" aria-label="wireframe, home">
              <img src={logoUrl} alt="" className="h-7 w-auto" />
              <span className="text-[0.95rem] font-semibold tracking-tight text-white">wireframe</span>
            </Link>
            <p className="mt-4 max-w-sm text-[0.92rem] text-white/78">
              Describe a ring in plain language and get a solid model, measured and
              checked against casting limits, ready to export as STEP or STL.
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-3">
            {COLUMNS.map((col) => (
              <nav key={col.heading} aria-label={col.heading}>
                <h2 className="text-sm font-semibold text-white">{col.heading}</h2>
                <ul className="mt-3 md:space-y-1.5">
                  {col.items.map((item) => (
                    <li key={item.label}>
                      {"to" in item ? (
                        <Link to={item.to} className={linkCls}>{item.label}</Link>
                      ) : "anchor" in item ? (
                        <button type="button" onClick={() => goTo(item.anchor)} className={linkCls}>
                          {item.label}
                        </button>
                      ) : (
                        <a href={item.href} className={linkCls}>{item.label}</a>
                      )}
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <p className="mt-14 border-t border-white/8 pt-6 text-sm text-white/65">
          © {year} Wireframe · Made in Canada
        </p>
      </div>
    </footer>
  );
}

export default Footer;
