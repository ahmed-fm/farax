import { Link } from "@tanstack/react-router";
import { Eye, FileArchive, FileImage, FileText, FileVideo, FileType2, Lock, Globe } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  categoryLabel,
  fileKind,
  formatDate,
  formatSize,
  levelLabel,
  subjectLabel,
} from "@/lib/taxonomy";
import type { DocumentRow } from "@/lib/documents";

const ICONS = {
  pdf: FileText,
  image: FileImage,
  video: FileVideo,
  office: FileType2,
  text: FileText,
  archive: FileArchive,
  other: FileText,
} as const;

export function DocumentCard({ doc }: { doc: DocumentRow }) {
  const kind = fileKind(doc.mime_type);
  const Icon = ICONS[kind];

  return (
    <Link
      to="/documents/$id"
      params={{ id: doc.id }}
      className="surface-card group flex flex-col gap-3 p-4 transition-all hover:-translate-y-0.5 hover:shadow-float"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
          <Icon className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium leading-tight">{doc.name}</p>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {levelLabel(doc.level)} · {subjectLabel(doc.subject)} · {categoryLabel(doc.category)}
          </p>
        </div>
        {doc.visibility === "public" ? (
          <Globe className="size-4 shrink-0 text-muted-foreground" />
        ) : (
          <Lock className="size-4 shrink-0 text-muted-foreground" />
        )}
      </div>

      {doc.description ? (
        <p className="line-clamp-2 text-sm text-muted-foreground">{doc.description}</p>
      ) : null}

      <div className="mt-auto flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="secondary" className="font-normal uppercase">
          {kind}
        </Badge>
        <span>{formatSize(doc.size)}</span>
        <span>·</span>
        <span>{formatDate(doc.created_at)}</span>
        <span className="ml-auto inline-flex items-center gap-1">
          <Eye className="size-3.5" />
          {doc.view_count}
        </span>
      </div>
    </Link>
  );
}
