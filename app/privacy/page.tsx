import { LearningShell } from "../../components/learning-shell";
import { operatorName, supportEmail, policiesApproved } from "../../lib/site";
import styles from "../../components/student-pages.module.css";
export const metadata = { title: "Privacy notice · Vela", robots: { index: false } };
export default function Privacy() {
  return (
    <LearningShell publicPage title="Privacy notice">
      <p className={styles.note}>
        Updated 19 November 2026 ·{" "}
        {policiesApproved
          ? "Operator-approved notice"
          : "Development draft — business address, retention schedule and production processing arrangements still require operator review."}
      </p>
      <section className={styles.card}>
        <h2>Operator and contact</h2>
        <p>
          {operatorName} operates Vela. For privacy, support, access, correction or deletion
          requests, contact{" "}
          <a className={styles.link} href={`mailto:${supportEmail}`}>
            {supportEmail}
          </a>
          . This is the current contact address and will be replaced when a company address is
          available.
        </p>
        <h2>Manage your account data</h2>
        <p>
          From your profile, you can download a JSON copy of your Vela profile, learning records,
          and settings or request account deletion. You can cancel a deletion request while it is
          open. Support reviews requests, checks institutional retention obligations, and updates
          the request status.
        </p>
        <p>
          Signed-in issue reports are private to the person who submits them and authorised support
          staff. Please leave passwords, verification codes, and other people’s personal information
          out of reports.
        </p>
        <h2>Information used by Vela</h2>
        <p>
          Vela uses your account identifier, name and email, qualification/module enrollments,
          personal notes, saved passages, latest study position, quiz attempts, session completion,
          recall ratings, mastery records, concept practice checks/provisional estimates, study
          availability and profile preferences. Authentication is provided by Neon Auth. Operational
          error identifiers may be logged to diagnose service failures.
        </p>
        <h2>Why it is used</h2>
        <p>
          Study-room presence is off until you join. Vela stores a short-lived module lease tied to
          your account and shares only an anonymous count with enrolled peers. Leases expire after
          90 seconds without renewal; visible expiry counts can lag until the next 25-second
          refresh. Leaving or hiding the room ends presence. Shared Pomodoro clocks do not award
          activity time or mastery.
        </p>
        <p>
          Peer discussions are separately opt-in. When you post, your question or reply is visible
          to enrolled module peers under a source-scoped pseudonym, and is attached to that source
          revision and paragraph. Do not include personal details. Private notes and highlights are
          not published automatically. Authors can remove their own posts; enrolled,
          qualification-scoped staff can review reports and remove posts. Removal redacts the post
          body; moderation/report records and replies may remain under the development retention
          policy. Peer messages are not used as textbook evidence by the AI tutor.
        </p>
        <p>
          Saving to the practice notebook stores your chosen mathematical inputs, declared row
          operations, exercise context and reflection with your account. This is optional and does
          not save or award grades. Reopening rechecks steps locally. You can export or delete saved
          copies in the notebook.
        </p>
        <p>
          Focused concept checks store a server-owned question, its result and a provisional
          knowledge-tracing estimate for the concept directly assessed. These estimates are practice
          guidance, not institutional marks. Reading, answer reveals and chat participation do not
          create concept correctness observations. You can reset concept checks and estimates in the
          Academic Master controls while keeping ordinary grades, notes and completion.
        </p>
        <p>
          Tutor use of practice summaries and cross-module summaries are separate controls, both off
          initially. When enabled, Vela sends only relevant assessed concept summaries and recent
          current-unit quiz outcome summaries to your chosen AI provider. Notes, raw answers,
          identity, community posts and availability are excluded from this automatic context.
          Cross-module context uses only currently enrolled modules; active-session scope narrows it
          further. A readable preview is available in the Academic Master settings.
        </p>
        <p>
          Entered availability is private and used for suggested study blocks within those dated
          periods. It is not sent as tutor context. You can edit or remove it in your learning
          preferences. The concept graph and recommendations do not infer exam dates or diagnose
          untested prerequisite failures.
        </p>
        <p>
          If you choose Snap &amp; Diagnose, the crop you prepare is forwarded to Cloudflare for
          transcription. Vela does not store the photo. Review the transcription before sending
          confirmed steps for AI feedback. Submitted teach-the-tutor explanations, feedback and
          capped conceptual points are saved with your account and session for learning progress and
          assessment audit. These are AI-assisted practice estimates, separate from institutional
          marks. Microphone capture is off by default. Browser dictation may use your browser
          provider's speech service; choosing Cloudflare recording sends that short recording for
          transcription. Voice capture stops when the page is hidden or the session changes.
          Device/browser voice services have their own processing arrangements.
        </p>
        <p>
          If you start the optional study timer, Vela records focused study-time estimates per
          module and day, plus a short-lived active-tab lease. The timer pauses when hidden,
          unfocused or idle. It does not send or store the keys you type, pointer coordinates or
          screen recordings. Activity is separate from assessed mastery and institutional
          attendance; you can stop the timer at any time.
        </p>
        <p>
          This information enables sign-in, enrollment checks, your learning workspace, saved work,
          feedback, progress and review scheduling. Authorized staff see qualification-scoped cohort
          aggregates. Providing account information is necessary for private learning features;
          optional notes and saved selections are your choice.
        </p>
        <h2>AI, voice and service providers</h2>
        <p>
          The tutor sends your question, relevant lesson/source context and bounded conversation
          history to the selected AI provider. Cloudflare Workers AI is currently the default;
          Ollama calls the configured local server. Local inference does not make Neon-hosted
          authentication and database processing local. Voice transcription sends the recording to
          Cloudflare when you use the microphone. The application does not persist chat transcripts
          or recordings as database records in its current implementation.
        </p>
        <p>
          Hosting, authentication, database and AI providers can process information outside South
          Africa. Provider terms and retention practices also apply. Production processing
          locations, contracts and retention arrangements must be confirmed before wider release.
        </p>
        <h2>Cookies and device storage</h2>
        <p>
          Session cookies support authentication. The browser stores an explicit appearance choice;
          light mode is the default. Vela does not currently include advertising trackers. The
          offline fallback caches only public shell assets, not authenticated course pages, notes or
          API responses.
        </p>
        <h2>Retention and control</h2>
        <p>
          Withdrawing from a module removes learning access but preserves your personal work for
          re-enrollment. Records are retained to provide the service until deleted under an
          applicable retention decision or a verified request. A fixed production retention schedule
          has not yet been approved. Contact the operator to request access, correction, an export,
          deletion or to raise an objection. Identity checks may be needed to protect your account;
          never send passwords.
        </p>
        <p>
          Vela queues a welcome email for a verified account and offers optional active recall
          reminders. Reminder consent is off by default and can be changed in your profile or
          through a signed unsubscribe link. Resend currently provides development-only delivery to
          an approved inbox; a Brevo adapter is also available. The selected email provider
          processes the recipient address, message and delivery events. Messages contain no personal
          notes, study answers or individual scores. The app retains delivery state and consent
          records for operation and troubleshooting. Review prompts remain available in Vela without
          email.
        </p>
        <h2>Questions or complaints</h2>
        <p>
          Contact the operator first for help with your information. You may also consult South
          Africa's{" "}
          <a
            className={styles.link}
            href="https://inforegulator.org.za/privacy-notice/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Information Regulator
          </a>{" "}
          and its{" "}
          <a
            className={styles.link}
            href="https://inforegulator.org.za/contact-us/"
            target="_blank"
            rel="noopener noreferrer"
          >
            complaints contact information
          </a>
          . This notice is not a certification of POPIA compliance.
        </p>
      </section>
    </LearningShell>
  );
}
