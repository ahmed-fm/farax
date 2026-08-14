export type SchoolLevel = "college" | "lycee" | "universite";

export const LEVELS: { value: SchoolLevel; label: string }[] = [
  { value: "college", label: "Collège" },
  { value: "lycee", label: "Lycée" },
  { value: "universite", label: "Université" },
];

export const SUBJECTS = [
  { value: "mathematiques", label: "Mathématiques" },
  { value: "physique", label: "Physique" },
  { value: "chimie", label: "Chimie" },
  { value: "francais", label: "Français" },
  { value: "anglais", label: "Anglais" },
  { value: "histoire", label: "Histoire" },
  { value: "geographie", label: "Géographie" },
  { value: "informatique", label: "Informatique" },
  { value: "svt", label: "SVT" },
  { value: "philosophie", label: "Philosophie" },
  { value: "economie", label: "Économie" },
  { value: "autres", label: "Autres" },
];

export const CATEGORIES = [
  { value: "cours", label: "Cours" },
  { value: "exercices", label: "Exercices" },
  { value: "corriges", label: "Corrigés" },
  { value: "examens", label: "Examens" },
  { value: "fiches", label: "Fiches de révision" },
  { value: "annales", label: "Annales" },
  { value: "autres", label: "Autres" },
];

export const VISIBILITIES = [
  { value: "private", label: "Privé (moi seul)" },
  { value: "public", label: "Public (tout le monde)" },
  { value: "level", label: "Tous les membres connectés" },
  { value: "users", label: "Utilisateurs / classes spécifiques" },
];

export const labelOf = (list: { value: string; label: string }[], value?: string | null) =>
  list.find((item) => item.value === value)?.label ?? value ?? "—";

export const levelLabel = (value?: string | null) => labelOf(LEVELS, value);
export const subjectLabel = (value?: string | null) => labelOf(SUBJECTS, value);
export const categoryLabel = (value?: string | null) => labelOf(CATEGORIES, value);

export const ACCEPTED_MIME = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/webm",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "application/zip",
  "application/x-zip-compressed",
];

export const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200 Mo

export type FileKind = "pdf" | "image" | "video" | "office" | "text" | "archive" | "other";

export function fileKind(mime: string): FileKind {
  if (mime === "application/pdf") return "pdf";
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime === "text/plain") return "text";
  if (mime.includes("zip")) return "archive";
  if (
    mime.includes("word") ||
    mime.includes("presentation") ||
    mime.includes("powerpoint") ||
    mime.includes("excel") ||
    mime.includes("sheet")
  )
    return "office";
  return "other";
}

export function formatSize(bytes: number) {
  if (!bytes) return "0 o";
  const units = ["o", "Ko", "Mo", "Go"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
