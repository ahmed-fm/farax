import { supabase } from "@/integrations/supabase/client";

export const BUCKET = "documents";

/** Configurable client-side limit (bytes). */
export const DEFAULT_MAX_SIZE = 200 * 1024 * 1024;

export const ACCEPTED: Record<string, { ext: string[]; label: string }> = {
  "application/pdf": { ext: ["pdf"], label: "PDF" },
  "image/jpeg": { ext: ["jpg", "jpeg"], label: "JPEG" },
  "image/png": { ext: ["png"], label: "PNG" },
  "image/webp": { ext: ["webp"], label: "WEBP" },
  "video/mp4": { ext: ["mp4"], label: "MP4" },
  "video/webm": { ext: ["webm"], label: "WEBM" },
  "application/msword": { ext: ["doc"], label: "DOC" },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
    ext: ["docx"],
    label: "DOCX",
  },
  "application/vnd.ms-powerpoint": { ext: ["ppt"], label: "PPT" },
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": {
    ext: ["pptx"],
    label: "PPTX",
  },
  "application/vnd.ms-excel": { ext: ["xls"], label: "XLS" },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
    ext: ["xlsx"],
    label: "XLSX",
  },
  "text/plain": { ext: ["txt"], label: "TXT" },
};

export const ACCEPT_ATTRIBUTE = Object.entries(ACCEPTED)
  .flatMap(([mime, def]) => [mime, ...def.ext.map((e) => `.${e}`)])
  .join(",");

const extensionOf = (name: string) => name.split(".").pop()?.toLowerCase() ?? "";

export function guessMime(file: File): string | null {
  if (file.type && ACCEPTED[file.type]) return file.type;
  const ext = extensionOf(file.name);
  const entry = Object.entries(ACCEPTED).find(([, def]) => def.ext.includes(ext));
  return entry?.[0] ?? null;
}

const startsWith = (bytes: Uint8Array, signature: number[], offset = 0) =>
  signature.every((byte, index) => bytes[offset + index] === byte);

/**
 * Reads the first bytes of the file and confirms they match the declared type.
 * Blocks e.g. an executable renamed to .pdf. Office 97 (.doc/.xls/.ppt) share the
 * OLE2 signature, modern Office files are ZIP containers.
 */
export async function verifySignature(file: File, mime: string): Promise<boolean> {
  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());

  const isZip = startsWith(head, [0x50, 0x4b, 0x03, 0x04]) || startsWith(head, [0x50, 0x4b, 0x05, 0x06]);
  const isOle = startsWith(head, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);

  switch (mime) {
    case "application/pdf":
      return startsWith(head, [0x25, 0x50, 0x44, 0x46]);
    case "image/jpeg":
      return startsWith(head, [0xff, 0xd8, 0xff]);
    case "image/png":
      return startsWith(head, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    case "image/webp":
      return startsWith(head, [0x52, 0x49, 0x46, 0x46]) && startsWith(head, [0x57, 0x45, 0x42, 0x50], 8);
    case "video/mp4":
      return startsWith(head, [0x66, 0x74, 0x79, 0x70], 4);
    case "video/webm":
      return startsWith(head, [0x1a, 0x45, 0xdf, 0xa3]);
    case "application/msword":
    case "application/vnd.ms-excel":
    case "application/vnd.ms-powerpoint":
      return isOle;
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    case "application/vnd.openxmlformats-officedocument.presentationml.presentation":
    case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
      return isZip;
    case "text/plain":
      return !isZip && !isOle;
    default:
      return false;
  }
}

export function safeStorageName(name: string) {
  const ext = extensionOf(name);
  const base = name
    .replace(/\.[^.]+$/, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60)
    .replace(/^-|-$/g, "");
  return `${base || "document"}${ext ? `.${ext}` : ""}`;
}

export type UploadHandle = {
  promise: Promise<void>;
  cancel: () => void;
};

/**
 * Uploads directly to object storage with real progress reporting and
 * cancellation (the Supabase JS client cannot report progress).
 */
export function uploadToStorage(options: {
  path: string;
  file: File;
  mime: string;
  onProgress: (percent: number) => void;
}): UploadHandle {
  const xhr = new XMLHttpRequest();

  const promise = new Promise<void>((resolve, reject) => {
    void (async () => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        reject(new Error("Session expirée, reconnectez-vous."));
        return;
      }

      const baseUrl = import.meta.env["VITE_SUPABASE_URL"] as string;
      const apiKey = import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] as string;

      xhr.open("POST", `${baseUrl}/storage/v1/object/${BUCKET}/${options.path}`, true);
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      xhr.setRequestHeader("apikey", apiKey);
      xhr.setRequestHeader("x-upsert", "false");
      xhr.setRequestHeader("cache-control", "3600");
      xhr.setRequestHeader("content-type", options.mime);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          options.onProgress(Math.round((event.loaded / event.total) * 100));
        }
      };
      xhr.onerror = () => reject(new Error("Erreur réseau pendant l'envoi."));
      xhr.onabort = () => reject(new Error("ABORTED"));
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          options.onProgress(100);
          resolve();
          return;
        }
        let message = `Envoi refusé (${xhr.status})`;
        try {
          const parsed = JSON.parse(xhr.responseText) as { message?: string; error?: string };
          message = parsed.message ?? parsed.error ?? message;
        } catch {
          /* keep default message */
        }
        reject(new Error(message));
      };

      xhr.send(options.file);
    })();
  });

  return { promise, cancel: () => xhr.abort() };
}

export async function removeUploadedFile(path: string) {
  await supabase.storage.from(BUCKET).remove([path]);
}
