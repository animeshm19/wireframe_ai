import { PageHeader, PageShell } from "../components/PageHeader";
import { useTitle } from "../components/useTitle";

const UPDATED = "26 September 2026";

export function PrivacyPage() {
  useTitle("Privacy");

  return (
    <PageShell narrow>
      <PageHeader
        title="Privacy"
        lede={`What Wireframe collects, why, and who else handles it. Last updated ${UPDATED}.`}
      />

      <div className="prose-site mt-14">
        <h2>Who we are</h2>
        <p>
          Wireframe is a design tool for rings, built and run in Canada. For
          anything in this policy, write to{" "}
          <a href="mailto:hello@wireframe.studio">hello@wireframe.studio</a>.
        </p>

        <h2>What we collect and why</h2>

        <h3>Your account</h3>
        <p>
          You sign in with an email address and password, or with Google. Firebase
          Authentication (a Google service) stores your email address, the name you
          give us and a user ID. If you use Google sign-in, Google also passes on the
          name and profile picture on your Google account. We use this to keep you
          signed in and to tie your work to you.
        </p>

        <h3>Ring descriptions</h3>
        <p>
          When you describe a ring in the Studio, the text goes to our server
          function, which sends it to Google&apos;s Gemini API to turn it into a ring
          specification (metal, cut, carat, setting, size and band). We do not store
          the text on our servers. Our server logs record your user ID, which model
          answered, how long it took and the stone cut and setting that came back.
          They do not record the text itself.
        </p>

        <h3>Your chats and designs</h3>
        <p>
          Your conversations and the designs in them are saved in your
          browser&apos;s local storage, on the device you used. They are not stored on
          our servers. Clearing your browser data deletes them.
        </p>
        <p>
          Earlier versions of the app saved design requests in Google Cloud
          Firestore under your user ID. The current version no longer writes there.
          Those older records stay until you ask us to delete them.
        </p>

        <h3>Files you attach</h3>
        <p>
          If you attach an image to a message, it is uploaded to Firebase Storage in
          a folder tied to your user ID. Attachments are not sent to the language
          model.
        </p>

        <h3>Demo requests</h3>
        <p>
          The demo form on the home page sends your name, email address, studio
          name, website, team size, what you would use Wireframe for and your
          message to our server function, which emails them to our inbox. We use
          them to reply to you and to prepare the call.
        </p>

        <h3>Visiting the site</h3>
        <p>
          The site is hosted by Vercel, which keeps standard request logs such as IP
          address and browser type. We do not use advertising or analytics cookies.
          Your browser stores a sign-in token so you stay signed in.
        </p>

        <h2>What we do not do</h2>
        <p>
          We do not sell your data, share it with advertisers or use your designs
          to train models.
        </p>

        <h2>Who else handles your data</h2>
        <ul>
          <li>
            <strong>Google</strong>: Firebase Authentication, Cloud Functions, Cloud
            Firestore, Cloud Storage, Cloud Logging, the Gemini API and Gmail (for
            demo request emails).
          </li>
          <li>
            <strong>Vercel</strong>: hosting for this website.
          </li>
        </ul>
        <p>
          These providers may process data in the United States and other countries
          outside Canada.
        </p>

        <h2>How long we keep it</h2>
        <ul>
          <li>Account details: until you ask us to delete your account.</li>
          <li>Demo request emails: as long as we are in touch with you, and deleted on request.</li>
          <li>Server logs: for Google Cloud Logging&apos;s default period of 30 days.</li>
          <li>Chats and designs in your browser: until you clear them.</li>
        </ul>

        <h2>Seeing, correcting or deleting your data</h2>
        <p>
          Email <a href="mailto:hello@wireframe.studio">hello@wireframe.studio</a>{" "}
          from the address on your account and tell us what you want: a copy of
          what we hold, a correction, or deletion of your account and anything
          stored under it. We reply within 30 days.
        </p>

        <h2>Law that applies</h2>
        <p>
          Wireframe is operated from Canada, and this policy is governed by
          Canadian privacy law, including the Personal Information Protection and
          Electronic Documents Act (PIPEDA). If you are not satisfied with our
          answer, you can complain to the Office of the Privacy Commissioner of
          Canada.
        </p>

        <h2>Changes</h2>
        <p>
          When this policy changes, the date at the top changes with it.
        </p>
      </div>
    </PageShell>
  );
}

export default PrivacyPage;
