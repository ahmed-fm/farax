import { useEffect, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CloudUpload, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, canUpload } from "@/hooks/useAuth";
import {
  ACCEPTED_MIME,
  CATEGORIES,
  LEVELS,
  MAX_FILE_SIZE,
  SUBJECTS,
  VISIBILITIES,
  formatSize,
} from "@/lib/taxonomy";

export const Route = createFileRoute("/upload")({
  head: () => ({
    meta: [
      { title: "Importer un document — Studia" },
      {
        name: "description",
        content:
          "Déposez vos PDF, images, vidéos et documents bureautiques, renseignez les métadonnées et définissez les droits d'accès.",
      },
      { property: "og:title", content: "Importer un document — Studia" },
      {
        property: "og:description",
        content: "Import par glisser-déposer avec métadonnées pédagogiques et permissions.",
      },
    ],
  }),
  component: UploadPage,
});

function UploadPage() {
  const navigate = useNavigate();
  const { user, profile, role, loading } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [level, setLevel] = useState("lycee");
  const [subject, setSubject] = useState("mathematiques");
  const [category, setCategory] = useState("cours");
  const [schoolYear, setSchoolYear] = useState("");
  const [visibility, setVisibility] = useState("private");
  const [allowDownload, setAllowDownload] = useState(true);
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  useEffect(() => {
    if (!loading && !user) void navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  const pick = (selected: File | null | undefined) => {
    if (!selected) return;
    if (selected.size > MAX_FILE_SIZE) {
      toast.error(`Fichier trop volumineux (max ${formatSize(MAX_FILE_SIZE)}).`);
      return;
    }
    if (selected.type && !ACCEPTED_MIME.includes(selected.type)) {
      toast.error("Format de fichier non pris en charge.");
      return;
    }
    setFile(selected);
    if (!name) setName(selected.name.replace(/\.[^.]+$/, ""));
  };

  const addTag = () => {
    const value = tagInput.trim().toLowerCase();
    if (value && !tags.includes(value)) setTags([...tags, value]);
    setTagInput("");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !user) {
      toast.error("Sélectionnez un fichier.");
      return;
    }
    setBusy(true);
    setProgress(20);
    const ext = file.name.split(".").pop() ?? "bin";
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from("documents")
      .upload(path, file, { contentType: file.type || "application/octet-stream" });
    if (upErr) {
      setBusy(false);
      setProgress(0);
      toast.error(`Envoi impossible : ${upErr.message}`);
      return;
    }
    setProgress(70);

    const { data, error } = await supabase
      .from("documents")
      .insert({
        name,
        filename: file.name,
        mime_type: file.type || "application/octet-stream",
        size: file.size,
        storage_path: path,
        description: description || null,
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

    setBusy(false);
    setProgress(100);
    if (error) {
      toast.error(`Enregistrement impossible : ${error.message}`);
      return;
    }
    toast.success("Document importé");
    void navigate({ to: "/documents/$id", params: { id: data.id as string } });
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
        <h1 className="font-display text-2xl font-semibold">Importer un document</h1>
        <p className="text-sm text-muted-foreground">
          PDF, images, vidéos, documents bureautiques et archives — jusqu'à {formatSize(MAX_FILE_SIZE)}.
        </p>

        <form onSubmit={submit} className="mt-6 space-y-6">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              pick(e.dataTransfer.files[0]);
            }}
            onClick={() => inputRef.current?.click()}
            className={`surface-card flex cursor-pointer flex-col items-center justify-center gap-3 border-2 border-dashed p-10 text-center transition-colors ${
              dragging ? "border-primary bg-accent" : "border-border"
            }`}
          >
            <CloudUpload className="size-8 text-primary" />
            {file ? (
              <div className="flex items-center gap-2">
                <span className="font-medium">{file.name}</span>
                <Badge variant="secondary">{formatSize(file.size)}</Badge>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                  }}
                >
                  <X className="size-4" />
                </Button>
              </div>
            ) : (
              <>
                <p className="font-medium">Glissez un fichier ici</p>
                <p className="text-sm text-muted-foreground">ou cliquez pour parcourir</p>
              </>
            )}
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              onChange={(e) => pick(e.target.files?.[0])}
            />
          </div>

          {busy ? <Progress value={progress} /> : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="title">Titre</Label>
              <Input id="title" required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="desc">Description</Label>
              <Textarea
                id="desc"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <Field label="Niveau" value={level} onChange={setLevel} options={LEVELS} />
            <Field label="Matière" value={subject} onChange={setSubject} options={SUBJECTS} />
            <Field label="Type de contenu" value={category} onChange={setCategory} options={CATEGORIES} />
            <div className="space-y-2">
              <Label htmlFor="year">Année scolaire</Label>
              <Input
                id="year"
                placeholder="2025-2026"
                value={schoolYear}
                onChange={(e) => setSchoolYear(e.target.value)}
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="tags">Mots-clés</Label>
              <div className="flex gap-2">
                <Input
                  id="tags"
                  value={tagInput}
                  placeholder="ex. dérivées, bac"
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                />
                <Button type="button" variant="outline" onClick={addTag}>
                  Ajouter
                </Button>
              </div>
              {tags.length ? (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => setTags(tags.filter((t) => t !== tag))}
                    >
                      #{tag} ✕
                    </Badge>
                  ))}
                </div>
              ) : null}
            </div>

            <Field
              label="Visibilité"
              value={visibility}
              onChange={setVisibility}
              options={VISIBILITIES}
            />
            <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3 sm:mt-6">
              <div>
                <p className="text-sm font-medium">Téléchargement autorisé</p>
                <p className="text-xs text-muted-foreground">Sinon, consultation en ligne seulement</p>
              </div>
              <Switch checked={allowDownload} onCheckedChange={setAllowDownload} />
            </div>
          </div>

          <Button type="submit" size="lg" className="w-full" disabled={busy || !file}>
            {busy ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            Importer le document
          </Button>
        </form>
      </div>
    </AppLayout>
  );
}

function Field({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
