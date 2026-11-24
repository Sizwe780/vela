"use client";
import { useState, type FormEvent } from "react";
import { studentRequest, useStudentResource } from "../lib/student/client";
import styles from "./student-pages.module.css";

type Ticket = {
  id: string;
  category: string;
  subject: string;
  body: string;
  status: string;
  response?: string;
  updatedAt: string;
};
type Report = { ownerId: string; operator: boolean; requests: Ticket[] };
export function SupportCenter({ deletionOnly = false }: { deletionOnly?: boolean }) {
  const [view, setView] = useState<"mine" | "inbox">("mine");
  const resource = useStudentResource<Report>(
    view === "inbox" ? "/api/support?view=inbox" : "/api/support",
  );
  const data = resource.data?.ownerId === resource.userId ? resource.data : null;
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function send(input: Record<string, unknown>, success: string) {
    if (!data || busy) return false;
    setBusy(true);
    setNotice("");
    setError("");
    try {
      await studentRequest("/api/support", "POST", input);
      setNotice(success);
      resource.reload();
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function report(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    if (
      await send(
        {
          action: "report",
          category: values.get("category"),
          subject: values.get("subject"),
          body: values.get("body"),
        },
        "Report submitted. Check here for a reply.",
      )
    )
      form.reset();
  }
  return (
    <section className={styles.card}>
      <h2>{deletionOnly ? "Account deletion" : "Report an issue"}</h2>
      {resource.error && <p role="alert">{resource.error}</p>}
      {notice && <p role="status">{notice}</p>}
      {error && <p role="alert">{error}</p>}
      {data?.operator && !deletionOnly && (
        <div className="vela-switcher" aria-label="Support views">
          <button type="button" aria-pressed={view === "mine"} onClick={() => setView("mine")}>
            My requests
          </button>
          <button type="button" aria-pressed={view === "inbox"} onClick={() => setView("inbox")}>
            Support inbox
          </button>
        </div>
      )}
      {!deletionOnly && view === "mine" && (
        <form className={styles.form} onSubmit={report}>
          <label>
            Category
            <select required name="category">
              <option value="technical">Technical issue</option>
              <option value="learning">Lesson or learning tool</option>
              <option value="account">Account or access</option>
              <option value="accessibility">Accessibility</option>
            </select>
          </label>
          <label>
            Subject
            <input name="subject" required minLength={4} maxLength={120} />
          </label>
          <label>
            What happened?
            <textarea
              name="body"
              minLength={10}
              maxLength={3000}
              required
              placeholder="Include the module or page name and the steps that led to the issue."
            />
          </label>
          <p className={styles.note}>
            Leave out passwords, verification codes and other people’s personal information.
          </p>
          <button className="primary-button" disabled={busy || !data}>
            Send report
          </button>
        </form>
      )}
      {deletionOnly &&
        !data?.requests.some(
          (item) => item.category === "deletion" && ["open", "in_review"].includes(item.status),
        ) && (
          <details>
            <summary>Request deletion</summary>
            <p>
              Support will review this request and confirm any institutional records that must be
              retained. You can download your data first.
            </p>
            <form
              className={styles.form}
              onSubmit={(event) => {
                event.preventDefault();
                const confirmation = new FormData(event.currentTarget).get("confirmation");
                void send(
                  { action: "deletion", confirmation },
                  "Deletion request submitted. Check here for updates.",
                );
              }}
            >
              <label>
                Type DELETE MY ACCOUNT to confirm
                <input
                  name="confirmation"
                  autoComplete="off"
                  required
                  pattern="DELETE MY ACCOUNT"
                />
              </label>
              <button className={styles.button} disabled={busy || !data}>
                Submit deletion request
              </button>
            </form>
          </details>
        )}
      {data?.requests
        .filter((item) => !deletionOnly || item.category === "deletion")
        .map((item) => (
          <details key={item.id} className={styles.card}>
            <summary>
              {item.subject} · {item.status.replaceAll("_", " ")}
            </summary>
            <p>{item.body}</p>
            <p className={styles.note}>
              Reference <code>{item.id}</code>
            </p>
            {item.response && (
              <p>
                <strong>Support reply</strong> {item.response}
              </p>
            )}
            {view === "mine" && item.category === "deletion" && item.status === "open" && (
              <button
                type="button"
                className={styles.button}
                disabled={busy}
                onClick={() =>
                  void send(
                    { action: "cancelDeletion", id: item.id },
                    "Deletion request cancelled.",
                  )
                }
              >
                Cancel request
              </button>
            )}
            {view === "inbox" && (
              <form
                className={styles.form}
                onSubmit={(event) => {
                  event.preventDefault();
                  const values = new FormData(event.currentTarget);
                  void send(
                    {
                      action: "respond",
                      id: item.id,
                      status: values.get("status"),
                      response: values.get("response"),
                    },
                    "Reply saved.",
                  );
                }}
              >
                <label>
                  Status
                  <select name="status">
                    <option value="in_review">In review</option>
                    {item.category !== "deletion" && <option value="resolved">Resolved</option>}
                  </select>
                </label>
                <label>
                  Reply
                  <textarea
                    name="response"
                    defaultValue={item.response}
                    required
                    maxLength={2000}
                  />
                </label>
                <button className={styles.button} disabled={busy}>
                  Save reply
                </button>
              </form>
            )}
          </details>
        ))}
    </section>
  );
}
