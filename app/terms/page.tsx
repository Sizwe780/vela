import { SupportContact } from "../../components/support-contact";
import { InformationPage } from "../../components/information-page";
import { operatorName } from "../../lib/site";
import styles from "../../components/student-pages.module.css";
export const metadata = { title: "Terms of use · Vela", robots: { index: false } };
const policySections = [
  { id: "the-learning-service", title: "The learning service" },
  { id: "your-account-and-work", title: "Your account and work" },
  { id: "learning-responsibly", title: "Learning responsibly" },
  { id: "development-availability", title: "Service availability" },
  { id: "access-and-retention", title: "Access and retention" },
  { id: "contact-and-review", title: "Contact and review" },
];
export default function Terms() {
  return (
    <InformationPage
      title="A clear foundation for learning."
      intro="How Vela works, what to expect, and how to use your learning workspace responsibly."
      eyebrow="VELA · TERMS"
      sections={policySections}
    >
      <p>
        Last updated 27 November 2026. These terms describe using the current Vela learning service.
      </p>
      <div className="policy-sections">
        <section id="the-learning-service" className="policy-section">
          <h2>The learning service</h2>
          <p>
            Vela is operated by {operatorName}. It is an independent learning aid for higher
            education and teacher training. Enrollment on Vela does not register you at a
            university, confer academic credit, certify competence or guarantee an examination
            result. Vela is not an official UNISA service.
          </p>
        </section>
        <section id="your-account-and-work" className="policy-section">
          <h2>Your account and work</h2>
          <p>
            Keep your sign-in details private and use an account you are authorized to control.
            Personal notes and saved selections remain your work. Vela processes them to provide the
            requested service. Use only study materials you are entitled to access, and respect the
            rights attached to original textbooks and other sources.
          </p>
        </section>
        <section id="learning-responsibly" className="policy-section">
          <h2>Learning responsibly</h2>
          <p>
            AI responses can be inaccurate. Check important claims, calculations and assessment
            guidance against appropriate sources and your institution's current instructions. Use
            tutoring and practice to develop your understanding; follow your institution's
            assessment and academic-integrity rules. Personal completion and recall ratings are
            distinct from assessed mastery and official marks.
          </p>
        </section>
        <section id="development-availability" className="policy-section">
          <h2>Service availability</h2>
          <p>
            Vela is currently under development. Features, module coverage and provider availability
            can change. No subscription payment is collected by this implementation. Any future paid
            offer must present its terms and price before an affirmative purchase. Mandatory
            consumer and privacy rights are not waived by these draft terms.
          </p>
        </section>
        <section id="access-and-retention" className="policy-section">
          <h2>Access and retention</h2>
          <p>
            Private learning materials require an active or completed enrollment. Withdrawal
            preserves personal work but removes course access. The operator may restrict access to
            investigate misuse or protect other learners. Privacy requests and record retention are
            described in the{" "}
            <a className={styles.link} href="/privacy">
              privacy notice
            </a>
            .
          </p>
        </section>
        <section id="contact-and-review" className="policy-section">
          <h2>Contact and review</h2>
          <p>
            For support, access concerns or a privacy request, <SupportContact />. We may ask you to
            verify ownership before changing an account. Never include passwords or verification
            codes in a support message.
          </p>
        </section>
      </div>
    </InformationPage>
  );
}
