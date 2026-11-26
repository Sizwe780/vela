"use client";
import { useId, useRef } from "react";
import { Icon } from "../icons";

export function NewChatControl({
  disabled,
  onConfirm,
}: {
  disabled: boolean;
  onConfirm: () => void;
}) {
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  function close() {
    dialog.current?.close();
    trigger.current?.focus();
  }
  return (
    <>
      <button
        ref={trigger}
        type="button"
        className="reset-chat"
        title="New chat"
        aria-label="Start a new conversation"
        aria-haspopup="dialog"
        aria-controls={id}
        disabled={disabled}
        onClick={() => {
          dialog.current?.showModal();
          cancel.current?.focus();
        }}
      >
        <Icon name="reset" size={19} />
      </button>
      <dialog
        ref={dialog}
        id={id}
        role="alertdialog"
        className="new-chat-confirmation"
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-description`}
        onKeyDown={(event) => {
          if (event.key === "Escape") event.stopPropagation();
        }}
        onCancel={(event) => {
          event.preventDefault();
          event.stopPropagation();
          close();
        }}
      >
        <h2 id={`${id}-title`}>Start a new chat?</h2>
        <p id={`${id}-description`}>
          Your current conversation and unsent message will be cleared.
        </p>
        <div className="new-chat-confirmation-actions">
          <button ref={cancel} type="button" onClick={close}>
            Cancel
          </button>
          <button
            type="button"
            className="new-chat-confirm"
            disabled={disabled}
            onClick={() => {
              if (disabled) return;
              close();
              onConfirm();
            }}
          >
            Start new chat
          </button>
        </div>
      </dialog>
    </>
  );
}
