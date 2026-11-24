"use client";
import { useEffect, useRef, type ReactNode } from "react";
export function SourceDrawer({
  children,
  onClose,
  label = "Source preview",
  id,
}: {
  children: ReactNode;
  onClose: () => void;
  label?: string;
  id?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    d?.showModal();
    return () => {
      d?.close();
    };
  }, []);
  return (
    <dialog
      id={id}
      className="source-dialog"
      ref={ref}
      aria-label={label}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {children}
    </dialog>
  );
}
