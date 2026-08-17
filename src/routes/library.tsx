import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, FileText, FolderTree, Loader2, Upload } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { listMyDocuments, type DocumentRow } from "@/lib/documents";
import { categoryLabel, levelLabel, subjectLabel, formatSize } from "@/lib/taxonomy";
import { useAuth, canUpload } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/library")({
  head: () => ({
    meta: [
      { title: "Ma bibliothèque classée — Studia" },
      {
        name: "description",
        content:
          "Retrouvez vos documents rangés automatiquement par niveau, matière puis chapitre, avec accès direct au lecteur.",
      },
      { property: "og:title", content: "Ma bibliothèque classée — Studia" },
      {
        property: "og:description",
        content: "Rangement personnel par niveau, matière et chapitre.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LibraryPage,
});

type Tree = Record<string, Record<string, Record<string, DocumentRow[]>>>;

function LibraryPage() {
  const { user, profile, role, loading } = useAuth();
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["my-documents", user?.id],
    queryFn: () => listMyDocuments(user!.id),
    enabled: Boolean(user?.id),
  });

  const tree = useMemo<Tree>(() => {
    const out: Tree = {};
    for (const doc of data ?? []) {
      const level = doc.level;
      const subject = doc.subject;
      const chapter = doc.chapter?.trim() || "Sans chapitre";
      out[level] ??= {};
      out[level][subject] ??= {};
      out[level][subject][chapter] ??= [];
      out[level][subject][chapter].push(doc);
    }
    return out;
  }, [data]);

  const toggle = (key: string) => setOpen((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <AppLayout>
      <div className="mx-auto max-w-5xl px-4 py-6 md:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-semibold">Ma bibliothèque</h1>
            <p className="text-sm text-muted-foreground">
              {profile?.full_name ?? user?.email ?? "Mes documents"} · rangement niveau → matière →
              chapitre
            </p>
          </div>
          {canUpload(role) ? (
            <Button asChild>
              <Link to="/upload">
                <Upload className="mr-2 size-4" /> Importer
              </Link>
            </Button>
          ) : null}
        </div>

        {loading || isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : !user ? (
          <div className="surface-card mt-6 p-12 text-center">
            <p className="font-medium">Connectez-vous pour voir vos documents</p>
            <Button asChild className="mt-4">
              <Link to="/auth">Se connecter</Link>
            </Button>
          </div>
        ) : Object.keys(tree).length === 0 ? (
          <div className="surface-card mt-6 p-12 text-center">
            <FolderTree className="mx-auto size-8 text-muted-foreground" />
            <p className="mt-3 font-medium">Aucun document importé</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Importez un fichier : il sera rangé automatiquement par niveau, matière et chapitre.
            </p>
            <Button asChild className="mt-4">
              <Link to="/upload">
                <Upload className="mr-2 size-4" /> Importer un document
              </Link>
            </Button>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {Object.entries(tree).map(([level, subjects]) => {
              const levelKey = `l:${level}`;
              const levelOpen = open[levelKey] ?? true;
              return (
                <div key={level} className="surface-card overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggle(levelKey)}
                    className="flex min-h-12 w-full items-center gap-2 px-4 py-3 text-left font-medium"
                  >
                    <ChevronRight
                      className={cn("size-4 transition-transform", levelOpen && "rotate-90")}
                    />
                    {levelLabel(level)}
                    <Badge variant="secondary" className="ml-auto">
                      {Object.values(subjects).reduce(
                        (n, chapters) =>
                          n + Object.values(chapters).reduce((m, docs) => m + docs.length, 0),
                        0,
                      )}
                    </Badge>
                  </button>

                  {levelOpen
                    ? Object.entries(subjects).map(([subject, chapters]) => {
                        const subjectKey = `${levelKey}/s:${subject}`;
                        const subjectOpen = open[subjectKey] ?? true;
                        return (
                          <div key={subject} className="border-t border-border">
                            <button
                              type="button"
                              onClick={() => toggle(subjectKey)}
                              className="flex min-h-11 w-full items-center gap-2 px-4 py-2.5 pl-8 text-left text-sm font-medium"
                            >
                              <ChevronRight
                                className={cn(
                                  "size-3.5 transition-transform",
                                  subjectOpen && "rotate-90",
                                )}
                              />
                              {subjectLabel(subject)}
                            </button>

                            {subjectOpen
                              ? Object.entries(chapters).map(([chapter, docs]) => (
                                  <div key={chapter} className="border-t border-border/60">
                                    <p className="px-4 py-2 pl-14 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                      {chapter}
                                    </p>
                                    <ul>
                                      {docs.map((doc) => (
                                        <li key={doc.id}>
                                          <Link
                                            to="/documents/$id"
                                            params={{ id: doc.id }}
                                            className="flex min-h-12 items-center gap-3 px-4 py-2.5 pl-14 text-sm hover:bg-accent"
                                          >
                                            <FileText className="size-4 shrink-0 text-primary" />
                                            <span className="truncate">{doc.name}</span>
                                            <span className="ml-auto hidden shrink-0 text-xs text-muted-foreground sm:block">
                                              {categoryLabel(doc.category)} · {formatSize(doc.size)}
                                            </span>
                                          </Link>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                ))
                              : null}
                          </div>
                        );
                      })
                    : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
