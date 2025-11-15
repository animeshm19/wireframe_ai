import React from "react";

export function PrivacyPage() {
  return (
    <main className="relative border-y border-white/10 bg-black/95 py-20 sm:py-24">
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div className="mesh-bg h-full w-full" />
      </div>

      <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 max-w-3xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/60 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white/60">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--gold-500)]" />
            <span>Privacy policy</span>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            How wireframe handles your data.
          </h1>
          <p className="mt-3 text-sm text-white/65">
            This Privacy Policy explains how wireframe (&quot;we&quot;, &quot;us&quot;,
            &quot;our&quot;) collects, uses, and protects information when you use our
            AI-powered jewelry CAD tools, websites, and related services
            (collectively, the &quot;Service&quot;).
          </p>
          <p className="mt-2 text-xs text-white/45">
            This text is a general template and does not constitute legal
            advice. Please have it reviewed by a qualified lawyer before relying
            on it.
          </p>
          <p className="mt-2 text-xs text-white/45">
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[260px,minmax(0,1fr)]">
          {/* TOC */}
          <div className="space-y-2 text-xs text-white/55">
            <p className="font-semibold uppercase tracking-[0.18em] text-white/60">
              Overview
            </p>
            <ol className="space-y-1 list-decimal list-inside">
              <li>Information we collect</li>
              <li>How we use information</li>
              <li>AI &amp; design data</li>
              <li>Sharing &amp; processors</li>
              <li>Data retention</li>
              <li>Security</li>
              <li>Your rights</li>
              <li>International use</li>
              <li>Children&apos;s privacy</li>
              <li>Changes to this policy</li>
              <li>Contact</li>
            </ol>
          </div>

          {/* Content */}
          <div className="space-y-6 rounded-2xl border border-white/10 bg-black/70 p-5 text-sm text-white/75 sm:p-6">
            {/* sections – same as we wrote before */}
            {/* 1. Information we collect */}
            <section>
              <h2 className="text-sm font-semibold text-white">
                1. Information we collect
              </h2>
              <p className="mt-2">
                We collect information that you provide directly to us and
                information that is generated when you use the Service:
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>
                  <span className="font-medium">Account data</span> – name,
                  email address, password or authentication details, studio or
                  company name, and role.
                </li>
                <li>
                  <span className="font-medium">Billing data</span> – payment
                  method details (processed by our payment provider), billing
                  address, and tax information.
                </li>
                <li>
                  <span className="font-medium">Usage data</span> – actions
                  taken inside the product, device and browser information, and
                  basic analytics events.
                </li>
                <li>
                  <span className="font-medium">Design data</span> – 3D models,
                  meshes, parameters, reference images, and metadata you upload
                  or create in the Service.
                </li>
                <li>
                  <span className="font-medium">Support data</span> – messages
                  you send us, feedback, and any materials you voluntarily share
                  when requesting help.
                </li>
              </ul>
            </section>

            {/* 2. How we use information */}
            <section>
              <h2 className="text-sm font-semibold text-white">
                2. How we use information
              </h2>
              <p className="mt-2">
                We use the information we collect for the following purposes:
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>To provide, maintain, and improve the Service.</li>
                <li>
                  To personalize your experience, such as remembering your
                  settings and recently used collections.
                </li>
                <li>
                  To develop new features and understand how jewelry studios use
                  wireframe.
                </li>
                <li>
                  To communicate with you about updates, security alerts, and
                  administrative messages.
                </li>
                <li>
                  To send you product news or marketing emails (you can opt out
                  at any time).
                </li>
                <li>
                  To prevent abuse, fraud, or misuse of the Service and to
                  enforce our terms.
                </li>
              </ul>
            </section>

            {/* 3. AI & design data */}
            <section>
              <h2 className="text-sm font-semibold text-white">
                3. AI processing &amp; design data
              </h2>
              <p className="mt-2">
                wireframe uses AI models to help you generate and manipulate
                jewelry designs. We treat your design data as highly sensitive:
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>
                  We process your design data only to provide the Service (for
                  example, generating parametric variants or previews).
                </li>
                <li>
                  We do not claim ownership over your designs. You remain
                  responsible for any IP, rights, and permissions related to
                  assets you upload or create.
                </li>
                <li>
                  We may aggregate and anonymize usage patterns to improve the
                  product, but this aggregated data cannot reasonably be linked
                  back to you or a specific design.
                </li>
                <li>
                  You are responsible for reviewing AI outputs before using them
                  for manufacturing or client delivery.
                </li>
              </ul>
            </section>

            <section>
              <h3 className="text-sm font-semibold text-white">
                4. Sharing & service providers
              </h3>
              <p className="mt-2">
                We do not sell your personal data. We may share information with:
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>
                  <span className="font-medium">Service providers</span> – such
                  as cloud hosting, analytics, payment processing, email, and
                  customer support tools that process data on our behalf.
                </li>
                <li>
                  <span className="font-medium">Professional advisors</span> –
                  lawyers, accountants, and similar professionals when reasonably
                  necessary.
                </li>
                <li>
                  <span className="font-medium">Compliance & safety</span> – if
                  required by law, legal process, or to protect our rights,
                  users, or the public.
                </li>
                <li>
                  <span className="font-medium">Business transfers</span> – in
                  connection with a merger, acquisition, financing, or sale of
                  all or a portion of our business, subject to appropriate
                  safeguards.
                </li>
              </ul>
              <p className="mt-2 text-xs text-white/55">
                Service providers are only allowed to use your data as needed to
                perform services for us and must handle it consistently with
                this policy.
              </p>
            </section>

            <section>
              <h3 className="text-sm font-semibold text-white">
                5. Data retention
              </h3>
              <p className="mt-2">
                We keep personal data only for as long as it is reasonably
                necessary for the purposes described above, or as required by
                law. For example:
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>Account data is retained while your account is active.</li>
                <li>
                  Billing records are kept for the periods required by tax and
                  accounting laws.
                </li>
                <li>
                  Design data is retained while your workspace or collections
                  remain in the product, unless you delete it or request
                  deletion.
                </li>
              </ul>
            </section>

            <section>
              <h3 className="text-sm font-semibold text-white">
                6. Security
              </h3>
              <p className="mt-2">
                We use reasonable technical and organizational measures to
                protect your data, such as encrypted connections, access
                controls, and monitoring. However, no online service can
                guarantee absolute security. You are responsible for choosing a
                strong password, keeping login details confidential, and
                promptly notifying us of any suspected unauthorized access.
              </p>
            </section>

            <section>
              <h3 className="text-sm font-semibold text-white">
                7. Your rights & choices
              </h3>
              <p className="mt-2">
                Depending on your location, you may have rights such as:
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>Accessing the personal data we hold about you.</li>
                <li>Requesting corrections to inaccurate information.</li>
                <li>Requesting deletion of certain data.</li>
                <li>
                  Objecting to or restricting certain types of processing.
                </li>
                <li>Exporting your data in a portable format, where feasible.</li>
              </ul>
              <p className="mt-2">
                To exercise these rights, contact us using the details below. We
                may need to verify your identity before responding.
              </p>
            </section>

            <section>
              <h3 className="text-sm font-semibold text-white">
                8. International use
              </h3>
              <p className="mt-2">
                Our infrastructure and providers may be located in different
                countries. By using the Service, you understand that your
                information may be transferred to and processed in jurisdictions
                that may have different data protection laws than your country.
                Where required, we use appropriate safeguards for these
                transfers.
              </p>
            </section>

            <section>
              <h3 className="text-sm font-semibold text-white">
                9. Children&apos;s privacy
              </h3>
              <p className="mt-2">
                The Service is not directed to children and is intended for
                professional or business use. We do not knowingly collect
                personal data from children. If you believe a child has provided
                us with personal data, please contact us so we can delete it.
              </p>
            </section>

            <section>
              <h3 className="text-sm font-semibold text-white">
                10. Changes to this policy
              </h3>
              <p className="mt-2">
                We may update this Privacy Policy from time to time. If we make
                material changes, we will notify you through the Service or by
                email. Your continued use of wireframe after changes become
                effective means you accept the updated policy.
              </p>
            </section>

            <section>
              <h3 className="text-sm font-semibold text-white">
                11. Contact
              </h3>
              <p className="mt-2">
                If you have questions about this Privacy Policy or how we handle
                data, you can reach us at:
              </p>
              <p className="mt-2 text-sm text-white/80">
                <span className="block font-medium">wireframe</span>
                <span className="block">Email: hello@wireframe.studio</span>
              </p>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
