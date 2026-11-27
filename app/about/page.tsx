import Link from "next/link";
import { InformationPage } from "../../components/information-page";
import styles from "../../components/student-pages.module.css";
export const metadata = {
  title: "Learn deeply. Teach confidently. · Vela",
  description:
    "A focused learning companion for higher education and teacher training: original lessons, mathematical visuals and active recall.",
};
export default function About() {
  return (
    <InformationPage
      title="Where understanding takes shape."
      intro="A calmer space to learn deeply, practise deliberately and grow into a confident teacher."
      eyebrow="THE IDEA BEHIND VELA"
    >
      <p>
        Vela brings your lessons, practice and learning companion into one focused workspace. It is
        being built for higher education, beginning with UNISA B.Ed mathematics and teacher
        training.
      </p>
      <div className={styles.row}>
        <Link className="primary-button" href="/auth/sign-up">
          Start your learning journey
        </Link>
        <Link className={styles.link} href="/study/demo">
          Explore the free preview
        </Link>
      </div>
      <div className="information-features">
        <article className="information-feature">
          <h2>Understanding before answers</h2>
          <p>
            Follow conceptual sessions, explore interactive mathematical models, and try examples
            before revealing worked solutions.
          </p>
        </article>
        <article className="information-feature">
          <h2>A companion with context</h2>
          <p>
            Ask about your current session. Explore academic explanations or how to teach the idea,
            with sources you can inspect.
          </p>
        </article>
        <article className="information-feature">
          <h2>Keep what you learn</h2>
          <p>
            Use personal notes, saved passages, recall ratings and a review queue. Continue from the
            session you last visited.
          </p>
        </article>
      </div>
      <p>
        Available modules are shown when you{" "}
        <Link className={styles.link} href="/onboarding">
          choose your modules
        </Link>
        . Source conversion and lesson publication are tracked separately. AI explanations and
        personal completion are learning aids, not institutional results.
      </p>
      <p>
        Vela is independently operated and is not an official UNISA service.{" "}
        <Link className={styles.link} href="/terms">
          Terms
        </Link>{" "}
        ·{" "}
        <Link className={styles.link} href="/privacy">
          Privacy
        </Link>
      </p>
    </InformationPage>
  );
}
