"use client";
import { useEffect, useRef, useState } from "react";
type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};
export function InstallVela() {
  const install = useRef<InstallEvent | null>(null),
    [notice, setNotice] = useState("");
  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      install.current = event as InstallEvent;
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);
  return (
    <div className="install-vela">
      <button
        type="button"
        onClick={async () => {
          if (install.current) {
            await install.current.prompt();
            await install.current.userChoice;
            install.current = null;
          } else
            setNotice(
              "Use your browser’s Install app or Add to Home Screen menu. Save lessons separately for offline reading.",
            );
        }}
      >
        Install Vela
      </button>
      {notice && <small role="status">{notice}</small>}
    </div>
  );
}
