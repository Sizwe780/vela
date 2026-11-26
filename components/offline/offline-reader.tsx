import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Markdown } from "../markdown";
import { PendulumBench } from "../sandboxes/physics-workshop";
import { InlinePractice } from "../inline-practice";
import { parseLearningBlocks } from "../../lib/content/exercises";
import { parseWidgetBlocks } from "../../lib/content/widget-registry";
import {
  decryptLesson,
  vault,
  type SavedLesson,
  type EncryptedLesson,
} from "../../lib/offline/vault";
import "katex/dist/katex.min.css";
import "./offline-reader.css";
function Prose({ text, physics }: { text: string; physics: boolean }) {
  const parsed = parseWidgetBlocks(text);
  return (
    <>
      {parsed.blocks.map((b, i) =>
        b.type === "text" ? (
          <Markdown key={i} text={b.text} />
        ) : physics &&
          b.widget.type === "physics_workshop" &&
          b.widget.config.model === "pendulum-bench" ? (
          <PendulumBench key={i} />
        ) : (
          <p className="offline-model" key={i}>
            This interactive model needs the online lesson. The surrounding explanation remains
            available.
          </p>
        ),
      )}
    </>
  );
}
function Question({
  title,
  question,
  answer,
}: {
  title: string;
  question: string;
  answer: string;
}) {
  const [shown, setShown] = useState(false);
  return (
    <section className="try-example">
      <h3>{title}</h3>
      <Markdown text={question} />
      <InlinePractice practiceId={title + question} question={question} />
      <button type="button" onClick={() => setShown((v) => !v)}>
        {shown ? "Hide answer" : "Show answer"}
      </button>
      {shown && <Markdown text={answer} />}
    </section>
  );
}
function App() {
  const [records, setRecords] = useState<EncryptedLesson[]>([]),
    [pass, setPass] = useState(""),
    [lesson, setLesson] = useState<SavedLesson | null>(null),
    [notice, setNotice] = useState("");
  const load = () => {
    void vault("list")
      .then(setRecords)
      .catch(() => setNotice("This browser cannot open offline storage."));
  };
  useEffect(load, []);
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const change = () => {
      clearTimeout(timeout);
      if (document.hidden)
        timeout = setTimeout(() => {
          setLesson(null);
          setPass("");
        }, 300000);
    };
    document.addEventListener("visibilitychange", change);
    return () => {
      clearTimeout(timeout);
      document.removeEventListener("visibilitychange", change);
    };
  }, []);
  async function unlock(record: EncryptedLesson) {
    try {
      setLesson(await decryptLesson(record, pass));
      setPass("");
      setNotice("");
    } catch {
      setNotice(
        "Could not unlock this lesson. Check the download passphrase. No account password is used here.",
      );
    }
  }
  return (
    <main>
      <header>
        <strong>vela. / Offline library</strong>
        <a href="/">Go online</a>
      </header>
      {lesson ? (
        <>
          <button type="button" onClick={() => setLesson(null)}>
            Lock and return to library
          </button>
          <small>
            {lesson.moduleCode} · saved revision {lesson.revision}
          </small>
          <h1>{lesson.title}</h1>
          <p>
            Private offline reading · checks are practice only. Live notes, AI and assessed progress
            require a connection.
          </p>
          {parseLearningBlocks(lesson.markdown).errors.length ? (
            <p>This lesson package needs review. Questions and solutions are withheld.</p>
          ) : (
            parseLearningBlocks(lesson.markdown).blocks.map((b, i) =>
              b.type === "text" ? (
                <Prose key={i} text={b.text} physics={lesson.physics === true} />
              ) : (
                <Question key={i} {...b} />
              ),
            )
          )}
        </>
      ) : (
        <>
          <h1>Your learning, even offline.</h1>
          <p>
            Save a lesson from its Lesson tools menu while connected. Its text stays encrypted here
            until you unlock it. Public app files contain no student data.
          </p>
          <label>
            Download passphrase
            <input
              type="password"
              autoComplete="off"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
            />
          </label>
          {records.length === 0 ? (
            <p>No lessons saved on this device yet.</p>
          ) : (
            records.map((r, i) => (
              <section key={r.id}>
                <strong>Encrypted lesson {i + 1}</strong>
                <small>Saved {new Date(r.savedAt).toLocaleDateString()}</small>
                <button type="button" onClick={() => void unlock(r)}>
                  Unlock lesson {i + 1}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void vault("delete", r.id).then(load);
                  }}
                >
                  Remove download {i + 1}
                </button>
              </section>
            ))
          )}
          <p>
            Downloads remain on this device until you remove them. Forgetting the passphrase
            requires saving a new copy while online. After five minutes in the background this
            reader locks.
          </p>
        </>
      )}
      <p role="status">{notice}</p>
    </main>
  );
}
createRoot(document.getElementById("offline-root")!).render(<App />);
