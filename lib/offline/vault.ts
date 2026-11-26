export type SavedLesson = {
  version: 1;
  id: string;
  title: string;
  moduleCode: string;
  markdown: string;
  revision: number;
  physics?: boolean;
};
export type EncryptedLesson = {
  id: string;
  owner: string;
  savedAt: string;
  salt: string;
  iv: string;
  cipher: string;
};
const encoder = new TextEncoder();
const encode = (bytes: Uint8Array) => {
  let result = "";
  for (const n of bytes) result += String.fromCharCode(n);
  return btoa(result);
};
const decode = (text: string) => Uint8Array.from(atob(text), (c) => c.charCodeAt(0));
const buffer = (bytes: Uint8Array) => Uint8Array.from(bytes).buffer;
async function key(passphrase: string, salt: Uint8Array) {
  const base = await crypto.subtle.importKey("raw", encoder.encode(passphrase), "PBKDF2", false, [
    "deriveKey",
  ]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: buffer(salt), iterations: 150000, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}
export async function encryptLesson(
  lesson: SavedLesson,
  passphrase: string,
  ownerId: string,
): Promise<EncryptedLesson> {
  if (passphrase.length < 10)
    throw Error("Choose a separate download passphrase of at least 10 characters.");
  if (!ownerId || lesson.markdown.length > 2_000_000)
    throw Error("This reading cannot be saved offline.");
  const salt = crypto.getRandomValues(new Uint8Array(16)),
    iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: buffer(iv) },
    await key(passphrase, salt),
    encoder.encode(JSON.stringify(lesson)),
  );
  const owner = encode(
    new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(ownerId))),
  );
  return {
    id: crypto.randomUUID(),
    owner,
    savedAt: new Date().toISOString(),
    salt: encode(salt),
    iv: encode(iv),
    cipher: encode(new Uint8Array(cipher)),
  };
}
export async function decryptLesson(
  record: EncryptedLesson,
  passphrase: string,
): Promise<SavedLesson> {
  if (record.cipher.length > 4_000_000 || record.iv.length > 40 || record.salt.length > 40)
    throw Error("Invalid offline package.");
  const decoded = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: buffer(decode(record.iv)) },
    await key(passphrase, decode(record.salt)),
    buffer(decode(record.cipher)),
  );
  const value = JSON.parse(new TextDecoder().decode(decoded));
  if (
    value.version !== 1 ||
    typeof value.markdown !== "string" ||
    value.markdown.length > 2_000_000 ||
    typeof value.title !== "string" ||
    typeof value.moduleCode !== "string" ||
    typeof value.id !== "string"
  )
    throw Error("Invalid offline lesson.");
  return value;
}
function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("vela-offline-vault", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("lessons", { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(Error("Offline storage is unavailable on this device."));
  });
}
export async function vault(
  action: "list" | "save" | "delete",
  value?: EncryptedLesson | string,
): Promise<EncryptedLesson[]> {
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction("lessons", action === "list" ? "readonly" : "readwrite"),
        store = transaction.objectStore("lessons");
      let records: EncryptedLesson[] = [];
      if (action === "save") store.put(value as EncryptedLesson);
      else if (action === "delete") store.delete(value as string);
      else {
        const request = store.getAll();
        request.onsuccess = () => {
          records = request.result;
        };
      }
      transaction.oncomplete = () => resolve(records);
      transaction.onerror = () =>
        reject(Error("Offline storage failed. Check available space and retry."));
      transaction.onabort = () => reject(Error("Offline storage was cancelled."));
    });
  } finally {
    db.close();
  }
}
export async function prepareOfflineReader() {
  if (!("serviceWorker" in navigator))
    throw Error("This browser cannot prepare the offline app. You can still download Markdown.");
  const registration = await navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" });
  await registration.update();
  const candidate = registration.installing ?? registration.waiting ?? registration.active;
  if (!candidate) throw Error("The offline worker is not ready. Retry in a moment.");
  if (candidate.state !== "activated")
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        candidate.removeEventListener("statechange", change);
        reject(Error("Offline setup timed out. Retry on a stable connection."));
      }, 20000);
      function change() {
        if (candidate!.state === "activated") {
          clearTimeout(timeout);
          candidate!.removeEventListener("statechange", change);
          resolve();
        }
      }
      candidate.addEventListener("statechange", change);
      change();
    });
  await new Promise<void>((resolve, reject) => {
    const channel = new MessageChannel();
    const timeout = setTimeout(() => {
      channel.port1.close();
      reject(Error("Offline assets could not finish downloading. Retry on Wi-Fi."));
    }, 60000);
    channel.port1.onmessage = (e) => {
      clearTimeout(timeout);
      channel.port1.close();
      e.data?.ok
        ? resolve()
        : reject(Error("Offline setup failed. Check your connection and storage, then retry."));
    };
    candidate.postMessage({ type: "PREPARE_OFFLINE" }, [channel.port2]);
  });
}
