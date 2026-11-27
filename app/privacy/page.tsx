import Link from "next/link";
import { InformationPage } from "../../components/information-page";
import { SupportContact } from "../../components/support-contact";
import { operatorName, informationOfficerName, operatorContactAddress } from "../../lib/site";
export const metadata = { title: "Privacy notice · Vela", robots: { index: false } };
const sections = [
  { id: "contact", title: "Who looks after your data" },
  { id: "information", title: "Information we use" },
  { id: "choices", title: "Your choices" },
  { id: "providers", title: "Service providers" },
  { id: "retention", title: "Keeping and deleting data" },
  { id: "device", title: "Cookies and your device" },
  { id: "rights", title: "Your rights and complaints" },
];
export default function Privacy() {
  return (
    <InformationPage
      title="Privacy, in plain sight."
      intro="What Vela uses, why it is needed, and how you stay in control of your learning data."
      eyebrow="VELA · PRIVACY"
      sections={sections}
    >
      <p>Last updated 27 November 2026. This notice describes the current Vela learning service.</p>
      <div className="policy-sections">
        <section id="contact" className="policy-section">
          <h2>Who looks after your data</h2>
          <p>{operatorName} is responsible for the personal information used to provide Vela.</p>
          <dl>
            <dt>Information Officer contact</dt>
            <dd>{informationOfficerName}</dd>
            <dt>Contact address</dt>
            <dd>{operatorContactAddress}</dd>
            <dt>Privacy and support requests</dt>
            <dd>
              <SupportContact />
            </dd>
          </dl>
          <p>
            You can use our contact form without signing in. We verify your identity separately
            before disclosing account information or acting on a data request.
          </p>
        </section>
        <section id="information" className="policy-section">
          <h2>Information we use</h2>
          <ul>
            <li>
              <strong>Your account:</strong> name, email, account identifier and sign-in/session
              information.
            </li>
            <li>
              <strong>Your learning:</strong> module enrollments, notes, saved passages, study
              position, completed sessions, practice and quiz records, recall ratings and learning
              estimates.
            </li>
            <li>
              <strong>Your preferences:</strong> study goals, availability, appearance, reminders
              and optional tutor personalisation.
            </li>
            <li>
              <strong>Requests you send:</strong> tutor questions, confirmed handwritten steps,
              teaching explanations, support reports and the reply address you provide.
            </li>
            <li>
              <strong>Service operation:</strong> focused-timer activity, delivery/consent records
              and error information needed to keep the service working.
            </li>
          </ul>
          <p>
            We use this information to run your account, show your own study records, provide the
            tools you choose, respond to requests and maintain the service. Learning estimates are
            guidance, not institutional marks.
          </p>
        </section>
        <section id="choices" className="policy-section">
          <h2>Your choices</h2>
          <ul>
            <li>
              Manage tutor context and cross-module summaries in{" "}
              <Link href="/profile#learning-preferences">Profile</Link>. These optional controls are
              off initially. Automatic tutor context excludes your private notes, identity and
              availability.
            </li>
            <li>
              Choose whether to receive recall reminders. Turn them off in Profile or through the
              unsubscribe link in a reminder.
            </li>
            <li>
              Join a study room or post a peer discussion only when you choose. Room presence shares
              an anonymous count; private notes and highlights are not posted automatically.
            </li>
            <li>
              Microphone and photo tools are optional. Review the crop and transcription before
              submitting your handwritten steps. Browser dictation may use your browser’s speech
              service.
            </li>
          </ul>
          <p>
            Questions and relevant lesson extracts are sent to the AI service used for your request.
            Avoid entering personal or sensitive information about yourself or another person.
            Submitted Teach-the-Tutor explanations and reviews are saved as learning records.
            Ordinary chat turns are not stored as conversation records in Vela’s database.
          </p>
        </section>
        <section id="providers" className="policy-section">
          <h2>Service providers</h2>
          <p>
            Vela uses the following types of services. Only the information needed for the selected
            feature is sent.
          </p>
          <div className="policy-table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Purpose</th>
                  <th>Service</th>
                  <th>Information involved</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Authentication</td>
                  <td>Neon Auth</td>
                  <td>Account and session information</td>
                </tr>
                <tr>
                  <td>Database</td>
                  <td>Neon</td>
                  <td>Saved learning records, settings and support requests</td>
                </tr>
                <tr>
                  <td>Hosting and delivery</td>
                  <td>Microsoft Azure and Cloudflare</td>
                  <td>Website requests and operational information</td>
                </tr>
                <tr>
                  <td>Optional AI features</td>
                  <td>
                    Enabled AI services, including Cloudflare, Groq, Google, OpenAI or OpenRouter;
                    local Ollama where configured
                  </td>
                  <td>
                    Your submitted question, selected lesson context, and any photo or audio you
                    choose to send
                  </td>
                </tr>
                <tr>
                  <td>Email</td>
                  <td>Resend or Brevo when delivery is enabled</td>
                  <td>
                    Recipient address, message and delivery events; no private notes or individual
                    scores in recall digests
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <h3>Processing outside South Africa</h3>
          <p>
            Cloud services may process information outside South Africa. Section 72 of POPIA
            restricts cross-border transfers and requires an applicable legal basis and safeguards.
            Contact the Information Officer for the processing locations and safeguards applicable
            to your use, including before using optional AI tools. Choosing a local AI model does
            not move your online account and saved learning records off cloud services.
          </p>
          <p>
            <a
              href="https://www.dffe.gov.za/sites/default/files/legislations/popia04of2013_vol581no37067.pdf"
              target="_blank"
              rel="noopener noreferrer"
            >
              Read the Protection of Personal Information Act
            </a>
            . Provider terms and their own retention practices also apply.
          </p>
        </section>
        <section id="retention" className="policy-section">
          <h2>Keeping and deleting data</h2>
          <p>
            Account and study records are kept while needed to provide your account. Withdrawing
            from a module removes access but preserves your saved work for re-enrollment. You can
            delete individual notes or saved items using their tools.
          </p>
          <p>
            Our target is to remove eligible live account data within 30 calendar days of a verified
            deletion request. We review identity, institutional record requirements and documented
            legal holds, and explain any restriction in our response.
          </p>
          <ul>
            <li>Closed support and moderation cases: 12 months after closure.</li>
            <li>
              Delivery troubleshooting and operational security logs: a 90-day target. Minimal
              delivery deduplication and consent records remain where needed to prevent repeat or
              unwanted messages.
            </li>
            <li>
              Inactive accounts: review after 24 months, with at least 30 days� notice before
              closure. Inactivity does not trigger automatic deletion.
            </li>
          </ul>
          <p>
            These are our approved retention targets; production cleanup scheduling and provider log
            settings are being rolled out. Managed backups follow provider expiry arrangements and
            are separate from removal in the live application. Contact us for the status of a
            specific request. Vela does not store raw handwriting photos or voice recordings as
            database records.
          </p>
          <p>
            Download your account data or request deletion from <Link href="/profile">Profile</Link>
            , or <SupportContact /> if you cannot sign in. A request through the public form does
            not itself delete or disclose an account.
          </p>
        </section>
        <section id="device" className="policy-section">
          <h2>Cookies and your device</h2>
          <p>
            Session cookies keep you signed in. Device storage remembers your chosen appearance and
            workspace preferences. Light mode is the default. Vela does not currently use
            advertising trackers.
          </p>
          <p>
            The offline service worker caches public application assets. Lessons you explicitly
            download are stored separately on your device; use the offline library to remove those
            copies. Server-side account changes do not remotely erase copies already downloaded to
            your device. Keep shared devices secure and sign out when finished.
          </p>
        </section>
        <section id="rights" className="policy-section">
          <h2>Your rights and complaints</h2>
          <p>
            You may request access, correction or deletion, object to processing where applicable,
            and withdraw optional consent. These requests can be subject to lawful record-keeping
            requirements and identity checks. <SupportContact /> to ask a question or exercise these
            rights.
          </p>
          <p>
            You may also lodge a complaint with the{" "}
            <a
              href="https://inforegulator.org.za/contact-us/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Information Regulator of South Africa
            </a>
            . Its website provides current complaint channels and forms. You do not need to send
            Vela a password, verification code or identity document in an ordinary support message.
          </p>
        </section>
      </div>
    </InformationPage>
  );
}
