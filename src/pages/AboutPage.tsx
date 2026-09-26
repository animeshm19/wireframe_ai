import { PageHeader, PageShell } from "../components/PageHeader";
import { useTitle } from "../components/useTitle";

export function AboutPage() {
  useTitle("About");
  return (
    <PageShell narrow>
      <PageHeader title="About Wireframe" />
      <div className="prose-site mt-10">
        <p>
          Wireframe turns a written description of a ring into a solid model you can
          measure, adjust and export for casting. You write what you want. The
          engine builds it, weighs it and checks it against the minimums for your
          alloy before you export.
        </p>
        <p>
          It is made for independent jewellers, setters, casters and small CAD
          studios: people who already know how a ring is made and want a file
          without drawing every ring from scratch.
        </p>
        <p>
          Wireframe is built and run in Canada. To talk about your work, write to{" "}
          <a href="mailto:hello@wireframe.studio">hello@wireframe.studio</a>.
        </p>
      </div>
    </PageShell>
  );
}

export default AboutPage;
