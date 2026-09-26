import { Link } from "react-router-dom";
import { PageHeader, PageShell } from "../components/PageHeader";
import { useTitle } from "../components/useTitle";

/** Shown to signed-in visitors when CHAT_LIVE is false (src/config/flags.ts). */
export function ChatComingSoonPage() {
  useTitle("Studio");
  return (
    <PageShell>
      <PageHeader
        title="The Studio is closed for now"
        lede="You are signed in and your account is ready. To see the Studio before it opens, book a demo and we will walk you through it."
        action={<Link to="/#contact" className="btn-primary">Book a demo</Link>}
      />
    </PageShell>
  );
}

export default ChatComingSoonPage;
