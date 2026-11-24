"use client";
export function notifyProgress() {
  window.dispatchEvent(new Event("vela-progress"));
  try {
    const channel = new BroadcastChannel("vela-progress");
    channel.postMessage("refresh");
    channel.close();
  } catch {}
}
export function watchProgress(load: () => void) {
  window.addEventListener("vela-progress", load);
  window.addEventListener("focus", load);
  let channel: BroadcastChannel | undefined;
  try {
    channel = new BroadcastChannel("vela-progress");
    channel.onmessage = load;
  } catch {}
  return () => {
    window.removeEventListener("vela-progress", load);
    window.removeEventListener("focus", load);
    channel?.close();
  };
}
