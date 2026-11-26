"use client";
import { useEffect, useRef, type ReactNode } from "react";
export function CompanionDock({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    const media = matchMedia("(max-width: 760px)");
    function sync() {
      if (dialog.open) dialog.close();
      if (!open) return;
      if (media.matches) dialog.showModal();
      else dialog.show();
      requestAnimationFrame(() => dialog.querySelector<HTMLTextAreaElement>("textarea")?.focus());
    }
    sync();
    media.addEventListener("change", sync);
    return () => {
      media.removeEventListener("change", sync);
      if (dialog.open) dialog.close();
    };
  }, [open]);
  return (
    <dialog
      ref={ref}
      className="companion-dock"
      aria-label="Academic Master companion"
      onKeyDown={(event) => {
        if (event.key === "Escape" && !matchMedia("(max-width: 760px)").matches) {
          event.preventDefault();
          onClose();
        }
      }}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <button
        type="button"
        className="companion-close"
        onClick={onClose}
        title="Close companion; your conversation stays here"
        aria-label="Close companion"
      >
        Close companion ×
      </button>
      {children}
    </dialog>
  );
}
