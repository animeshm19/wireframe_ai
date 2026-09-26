import { Link } from "react-router-dom";
import { PageHeader, PageShell } from "../components/PageHeader";
import { useTitle } from "../components/useTitle";

export function NotFoundPage() {
  useTitle("Page not found");

  return (
    <PageShell>
      <PageHeader
        title="Page not found"
        lede="This address does not match any page on the site. It may have moved, or the link may be mistyped."
        action={
          <div className="flex flex-wrap gap-3">
            <Link to="/" className="btn-primary">Home</Link>
            <Link to="/chat" className="btn-secondary">Open the Studio</Link>
          </div>
        }
      />
    </PageShell>
  );
}

export default NotFoundPage;
