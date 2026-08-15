import { useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CloudUpload, Loader2, X, CheckCircle2, AlertCircle, Ban } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, canUpload } from "@/hooks/useAuth";
import { CATEGORIES, LEVELS, SUBJECTS, VISIBILITIES, formatSize } from "@/lib/taxonomy";
import {
  ACCEPT_ATTRIBUTE,
  ACCEPTED,
  DEFAULT_MAX_SIZE,
  guessMime,
  removeUploadedFile,
  safeStorageName,
  uploadToStorage,
  verifySignature,
  type UploadHandle,
} from "@/lib/uploader";

export const Route = createFileRoute("/upload")({
  head: () => ({
    meta: [
      { title: "Importer des documents — Studia" },
      {
        name: "description",
        content:
          "Importez plusieurs PDF, images, vidéos et fichiers bureautiques à la fois : progression réelle, annulation, validation du format et droits d'accès.",
      },
      { property: "og:title", content: "Importer des documents — Studia" },
      {
        property: "og:description",
        content: "Import multiple par glisser-déposer avec métadonnées pédagogiques et permissions.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: UploadPage,
});

type QueueStatus = "pending" | "uploading" | "done" | "error" | "canceled";

type QueueItem = {
  id: string;
  file: File;
  mime: string;
  title: string;
  progress: number;
  status: QueueStatus;
  error?: string | undefined;
  documentId?: string | undefined;
  handle?: UploadHandle | undefined;
};

function UploadPage() {
  const navigate = useNavigate();
  const { user, profile, role, loading } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);

  const [items, setItems] = useState<QueueItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [maxSizeMb, setMaxSizeMb] = useState(Math.round(DEFAULT_MAX_SIZE / (1024 * 1024)));

  const [description, setDescription] = useState("");
  const [level, setLevel] = useState<string>("lycee");
  const [subject, setSubject] = useState<string>("mathematiques");
  const [category, setCategory] = useState<string>("cours");
  const [schoolYear, setSchoolYear] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [visibility, setVisibility] = useState<string>("users");
  const [allowDownload, setAllowDownload] = useState(true);

  const patch = (id: string, next: Partial<QueueItem>) =>
    setItems((list) => list.map((item) => (item.id === id ? { ...item, ...next } : item)));

  const addFiles = async (files: FileList | File[]) => {
    const maxSize = maxSizeMb * 1024 * 1024;
    const accepted: QueueItem[] = [];

    for (const file of Array.from(files)) {
      const mime = guessMime(file);
      if (!mime) {
        toast.error(`${file.name} : format non pris en charge.`);
        continue;
      }
      if (file.size > maxSize) {
        toast.error(`${file.name} : dépasse ${maxSizeMb} Mo.`);
        continue;
      }
      const valid = await verifySignature(file, mime);
      if (!valid) {
        toast.error(`${file.name} : le contenu ne correspond pas au format ${ACCEPTED[mime]?.label}.`);
        continue;
      }
      accepted.push({
        id: crypto.randomUUID(),
        file,
        mime,
        title: file.name.replace(/\.[^.]+$/, ""),
        progress: 0,
        status: "pending",
      });
    }

    if (accepted.length) setItems((list) => [...list, ...accepted]);
  };

  const removeItem = (id: string) => {
    setItems((list) => {
      const target = list.find((item) => item.id === id);
      target?.handle?.cancel();
      return list.filter((item) => item.id !== id);
    });
  };

  const cancelItem = (id: string) => {
    const target = items.find((item) => item.id === id);
    target?.handle?.cancel();
    patch(id, { status: "canceled" });
  };

  const submit = async () => {
    if (!user) return;
    const queue = items.filter((item) => item.status === "pending" || item.status === "error");
    if (!queue.length) {
      toast.error("Ajoutez au moins un fichier.");
      return;
    }

    setBusy(true);
    const tags = tagsInput
      .split(",")
      .map((tag) => tag.trim().toLowerCase())
      .filter(Boolean);

    let lastId: string | null = null;
    let failures = 0;

    for (const item of queue) {
      const storagePath = `${user.id}/${crypto.randomUUID()}-${safeStorageName(item.file.name)}`;
      patch(item.id, { status: "uploading", progress: 0, error: undefined });

      const handle = uploadToStorage({
        path: storagePath,
        file: item.file,
        mime: item.mime,
        onProgress: (percent) => patch(item.id, { progress: percent }),
      });
      patch(item.id, { handle });

      try {
        await handle.promise;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Envoi impossible";
        if (message === "ABORTED") {
          patch(item.id, { status: "canceled" });
        } else {
          failures += 1;
          patch(item.id, { status: "error", error: message });
        }
        continue;
      }

      const { data, error } = await supabase
        .from("documents")
        .insert({
          name: item.title.trim() || item.file.name,
          filename: item.file.name,
          mime_type: item.mime,
          size: item.file.size,
          storage_path: storagePath,
          description: description.trim() || null,
          level: level as "college",
          subject,
          category,
          tags,
          author_id: user.id,
          author_name: profile?.full_name ?? user.email ?? null,
          school_year: schoolYear || null,
          visibility: visibility as "private",
          allow_download: allowDownload,
        })
        .select("id")
        .single();

      if (error || !data) {
        failures += 1;
        await removeUploadedFile(storagePath);
        patch(item.id, { status: "error", error: error?.message ?? "Enregistrement impossible" });
        continue;
      }

      lastId = data.id;
      patch(item.id, { status: "done", progress: 100, documentId: data.id });
    }

    setBusy(false);

    if (failures) toast.error(`${failures} fichier(s) en échec. Vous pouvez réessayer.`);
    if (lastId) {
      toast.success("Import terminé");
      if (!failures) void navigate({ to: "/documents/$id", params: { id: lastId } });
    }
  };

  if (!loading && user && !canUpload(role)) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-md px-4 py-24 text-center">
          <h1 className="font-display text-xl font-semibold">Accès réservé</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Seuls les enseignants et administrateurs peuvent importer des documents.
          </p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl px-4 py-6 md:px-8">
        <h1 className="font-display text-2xl font-semibold">Importer des documents</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Glissez plusieurs fichiers, suivez la progression réelle et annulez à tout moment.
        </p>

        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") inputRef.current?.click();
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            void addFiles(event.dataTransfer.files);
          }}
          className={`mt-6 flex min-h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
            dragging ? "border-primary bg-primary/5" : "border-border bg-card"
          }`}
        >
          <CloudUpload className="size-8 text-muted-foreground" />
          <p className="text-sm font-medium">Déposez vos fichiers ou touchez pour parcourir</p>
          <p className="text-xs text-muted-foreground">
            PDF, JPG, PNG, WEBP, MP4, WEBM, DOC(X), PPT(X), XLS(X), TXT — {maxSizeMb} Mo max par
            fichier
          </p>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ACCEPT_ATTRIBUTE}
            className="hidden"
            onChange={(event) => {
              if (event.target.files) void addFiles(event.target.files);
              event.target.value = "";
            }}
          />
        </div>

        {items.length ? (
          <ul className="mt-4 space-y-2">
            {items.map((item) => (
              <li key={item.id} className="surface-card p-3">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <Input
                      value={item.title}
                      onChange={(event) => patch(item.id, { title: event.target.value })}
                      className="h-8 text-sm"
                      aria-label={`Titre de ${item.file.name}`}
                    />
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {item.file.name} · {formatSize(item.file.size)} ·{" "}
                      {ACCEPTED[item.mime]?.label ?? item.mime}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {item.status === "done" ? (
                      <CheckCircle2 className="size-4 text-primary" aria-label="Importé" />
                    ) : null}
                    {item.status === "error" ? (
                      <AlertCircle className="size-4 text-destructive" aria-label="Erreur" />
                    ) : null}
                    {item.status === "canceled" ? (
                      <Ban className="size-4 text-muted-foreground" aria-label="Annulé" />
                    ) : null}
                    {item.status === "uploading" ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => cancelItem(item.id)}
                        className="h-8"
                      >
                        Annuler
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() => removeItem(item.id)}
                        aria-label={`Retirer ${item.file.name}`}
                      >
                        <X className="size-4" />
                      </Button>
                    )}
                  </div>
                </div>
                {item.status === "uploading" || item.status === "done" ? (
                  <Progress value={item.progress} className="mt-2 h-1.5" />
                ) : null}
                {item.error ? (
                  <p className="mt-2 text-xs text-destructive">{item.error}</p>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}

        <div className="mt-6 grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Résumé, chapitre concerné, consignes…"
              rows={3}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Niveau">
              <Select value={level} onValueChange={setLevel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEVELS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Matière">
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUBJECTS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Type de contenu">
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Année scolaire">
              <Input
                value={schoolYear}
                onChange={(event) => setSchoolYear(event.target.value)}
                placeholder="2025-2026"
              />
            </Field>
            <Field label="Mots-clés (séparés par des virgules)">
              <Input
                value={tagsInput}
                onChange={(event) => setTagsInput(event.target.value)}
                placeholder="dérivées, révision, bac"
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Visibilité">
              <Select value={visibility} onValueChange={setVisibility}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VISIBILITIES.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Taille maximale (Mo)">
              <Input
                type="number"
                min={1}
                max={2048}
                value={maxSizeMb}
                onChange={(event) => setMaxSizeMb(Number(event.target.value) || 1)}
              />
            </Field>
          </div>

          <div className="surface-card flex items-center justify-between gap-4 p-4">
            <div>
              <p className="text-sm font-medium">Autoriser le téléchargement</p>
              <p className="text-xs text-muted-foreground">
                Sinon, la consultation reste possible en ligne uniquement.
              </p>
            </div>
            <Switch checked={allowDownload} onCheckedChange={setAllowDownload} />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={() => void submit()} disabled={busy || !items.length} size="lg">
              {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Importer {items.length ? `(${items.length})` : ""}
            </Button>
            {items.some((item) => item.status === "done") ? (
              <Badge variant="secondary">
                {items.filter((item) => item.status === "done").length} importé(s)
              </Badge>
            ) : null}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
