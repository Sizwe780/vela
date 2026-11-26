"use client";
import { useEffect, useRef, useState } from "react";
import { useModuleCapabilities } from "../module-capabilities";
import { authClient } from "../../lib/auth/client";
import { encryptLesson, prepareOfflineReader, vault } from "../../lib/offline/vault";
export function OfflineLessonButton({
  lesson,
}: {
  lesson: { id: string; title: string; markdown: string; moduleCode: string; version?: number };
}) {
  const capabilities = useModuleCapabilities();
  const { data } = authClient.useSession(),
    owner = data?.user?.id,
    ownerRef = useRef(owner),
    dialog = useRef<HTMLDialogElement>(null);
  ownerRef.current = owner;
  const [pass, setPass] = useState(""),
    [confirm, setConfirm] = useState(""),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [size, setSize] = useState("");
  useEffect(() => {
    dialog.current?.close();
    setPass("");
    setConfirm("");
    setNotice("");
  }, [owner, lesson.id]);
  async function save() {
    if (!owner || busy) return;
    if (pass.length < 10 || pass !== confirm) {
      setNotice(
        "Use matching download passphrases of at least 10 characters. This is not your account password.",
      );
      return;
    }
    setBusy(true);
    const current = owner;
    try {
      await prepareOfflineReader();
      const record = await encryptLesson(
        {
          version: 1,
          physics: capabilities.physics,
          id: lesson.id,
          title: lesson.title,
          moduleCode: lesson.moduleCode,
          markdown: lesson.markdown,
          revision: lesson.version ?? 1,
        },
        pass,
        current,
      );
      if (ownerRef.current !== current)
        throw Error("Your account changed. Open the lesson again before saving.");
      await vault("save", record);
      setPass("");
      setConfirm("");
      setNotice(
        "Encrypted lesson saved on this device. Open the Offline library and unlock it with your download passphrase.",
      );
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Offline save failed; retry when connected.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <button
        type="button"
        disabled={!owner}
        onClick={() => {
          dialog.current?.showModal();
          void fetch("/offline-assets/manifest.json")
            .then((r) => r.json())
            .then((d) => setSize(`${(d.bytes / 1_000_000).toFixed(1)} MB`))
            .catch(() => setSize("a small renderer download"));
        }}
      >
        Save lesson offline
      </button>
      <dialog
        ref={dialog}
        className="offline-save-dialog"
        aria-label="Save encrypted offline lesson"
      >
        <button
          type="button"
          onClick={() => {
            dialog.current?.close();
            setPass("");
            setConfirm("");
          }}
        >
          Close ×
        </button>
        <h2>Take this lesson with you</h2>
        <p>
          Save text, equations, gated exercises and the pendulum bench for offline use. Other
          interactive models, source photos, AI and live progress need a connection. First setup
          downloads {size || "the offline reader and maths fonts"}; saving more lessons reuses those
          public files.
        </p>
        <p>
          Your reading is encrypted on this device. Choose a separate download passphrase; Vela
          cannot recover it. Remove downloads when using a shared device.
        </p>
        <label>
          Download passphrase
          <input
            type="password"
            autoComplete="new-password"
            minLength={10}
            value={pass}
            onChange={(e) => setPass(e.target.value)}
          />
        </label>
        <label>
          Confirm download passphrase
          <input
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </label>
        <button type="button" disabled={busy} onClick={() => void save()}>
          {busy ? "Preparing offline reading…" : "Encrypt and save on this device"}
        </button>
        <p role="status">{notice}</p>
        <a href="/offline.html">Open offline library</a>
      </dialog>
    </>
  );
}
