import { LearningShell } from "../../components/learning-shell";
import { operatorName, supportEmail, policiesApproved } from "../../lib/site";
import styles from "../../components/student-pages.module.css";
export const metadata = { title: "Terms of use · Vela", robots: { index: false } };
export default function Terms() {
  return (
    <LearningShell publicPage title="Terms of use">
      <p className={styles.note}>
        Updated 17 November 2026 ·{" "}
        {policiesApproved
          ? "Operator-approved terms"
          : "Development draft for operator/legal review before public student onboarding."}
      </p>
      <section className={styles.card}>
        <h2>The learning service</h2>
        <p>
          Vela is operated by {operatorName}. It is an independent learning aid for higher education
          and teacher training. Enrollment on Vela does not register you at a university, confer
          academic credit, certify competence or guarantee an examination result. Vela is not an
          official UNISA service.
        </p>
        <h2>Your account and work</h2>
        <p>
          Keep your sign-in details private and use an account you are authorized to control.
          Personal notes and saved selections remain your work. Vela processes them to provide the
          requested service. Use only study materials you are entitled to access, and respect the
          rights attached to original textbooks and other sources.
        </p>
        <h2>Learning responsibly</h2>
        <p>
          AI responses can be inaccurate. Check important claims, calculations and assessment
          guidance against appropriate sources and your institution's current instructions. Use
          tutoring and practice to develop your understanding; follow your institution's assessment
          and academic-integrity rules. Personal completion and recall ratings are distinct from
          assessed mastery and official marks.
        </p>
        <h2>Development availability</h2>
        <p>
          Vela is currently under development. Features, module coverage and provider availability
          can change. No subscription payment is collected by this implementation. Any future paid
          offer must present its terms and price before an affirmative purchase. Mandatory consumer
          and privacy rights are not waived by these draft terms.
        </p>
        <h2>Access and retention</h2>
        <p>
          Private learning materials require an active or completed enrollment. Withdrawal preserves
          personal work but removes course access. The operator may restrict access to investigate
          misuse or protect other learners. Privacy requests and record retention are described in
          the{" "}
          <a className={styles.link} href="/privacy">
            privacy notice
          </a>
          .
        </p>
        <h2>Contact and review</h2>
        <p>
          Contact{" "}
          <a className={styles.link} href={`mailto:${supportEmail}`}>
            {supportEmail}
          </a>{" "}
          for support or concerns. Business address, source-publication permissions, production
          retention arrangements and final contractual terms must be reviewed before a general
          public release. These draft terms are not legal advice or a representation that all launch
          requirements have been satisfied.
        </p>
      </section>
    </LearningShell>
  );
}
