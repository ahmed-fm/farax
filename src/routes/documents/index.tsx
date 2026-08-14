import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Filter, Loader2, SlidersHorizontal } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { DocumentCard } from "@/components/DocumentCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listDocuments } from "@/lib/documents";
import { CATEGORIES, LEVELS, SUBJECTS, categoryLabel, levelLabel, subjectLabel } from "@/lib/taxonomy";
import { useAuth } from "@/hooks/useAuth";

type Search = {
  q?: string;
  level?: string;
  subject?: string;
  category?: string;
  format?: string;
  author?: string;
  since?: string;
  mine?: boolean;
  page?: number;
};

export const Route = createFileRoute("/documents/")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    q: typeof search.q === "string" && search.q ? search.q : undefined,
    level: typeof search.level === "string" ? search.level : undefined,
    subject: typeof search.subject === "string" ? search.subject : undefined,
    category: typeof search.category === "string" ? search.category : undefined,
    format: typeof search.format === "string" ? search.format : undefined,
    author: typeof search.author === "string" ? search.author : undefined,
    since: typeof search.since === "string" ? search.since : undefined,
    mine: search.mine === true || search.mine === "true" ? true : undefined,
    page: Number(search.page) > 1 ? Number(search.page) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Documents pédagogiques — Studia" },
      {
        name: "description",
        content:
          "Parcourez, filtrez et recherchez les cours, exercices, corrigés et annales par niveau, matière et type de contenu.",
      },
      { property: "og:title", content: "Documents pédagogiques — Studia" },
      {
        property: "og:description",
        content: "Recherche et filtres avancés sur toute la bibliothèque pédagogique.",
      },
    ],
  }),
  component: DocumentsPage,
});

const PAGE_SIZE = 24;

function DocumentsPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/documents" });
  const { user } = useAuth();

  const setParam = (key: keyof Search, value?: string | boolean) =>
    navigate({
      search: (prev) => ({ ...prev, [key]: value || undefined, page: undefined }),
    });

  const page = search.page ?? 1;
  const { data, isLoading } = useQuery({
    queryKey: ["documents", search, user?.id],
    queryFn: () => listDocuments({ ...search, page, pageSize: PAGE_SIZE }, user?.id),
  });

  const total = data?.count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-8">
        <Breadcrumb className="mb-4">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Accueil</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>Documents</BreadcrumbItem>
            {search.level ? (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>{levelLabel(search.level)}</BreadcrumbItem>
              </>
            ) : null}
            {search.subject ? (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>{subjectLabel(search.subject)}</BreadcrumbItem>
              </>
            ) : null}
            {search.category ? (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>{categoryLabel(search.category)}</BreadcrumbItem>
              </>
            ) : null}
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-semibold">
              {search.q ? `Résultats pour « ${search.q} »` : "Documents"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isLoading ? "Chargement…" : `${total} document${total > 1 ? "s" : ""}`}
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <SlidersHorizontal className="size-4" /> Filtres
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-5">
          <FilterSelect
            label="Niveau"
            value={search.level}
            options={LEVELS}
            onChange={(v) => void setParam("level", v)}
          />
          <FilterSelect
            label="Matière"
            value={search.subject}
            options={SUBJECTS}
            onChange={(v) => void setParam("subject", v)}
          />
          <FilterSelect
            label="Type"
            value={search.category}
            options={CATEGORIES}
            onChange={(v) => void setParam("category", v)}
          />
          <FilterSelect
            label="Format"
            value={search.format}
            options={[
              { value: "pdf", label: "PDF" },
              { value: "image", label: "Image" },
              { value: "video", label: "Vidéo" },
              { value: "text", label: "Texte" },
            ]}
            onChange={(v) => void setParam("format", v)}
          />
          <FilterSelect
            label="Ajouté"
            value={search.since}
            options={[
              { value: sinceDays(7), label: "7 derniers jours" },
              { value: sinceDays(30), label: "30 derniers jours" },
              { value: sinceDays(365), label: "Cette année" },
            ]}
            onChange={(v) => void setParam("since", v)}
          />
        </div>

        {user ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={search.mine ? "default" : "outline"}
              onClick={() => void setParam("mine", !search.mine)}
            >
              <Filter className="mr-2 size-3.5" /> Mes documents
            </Button>
            {(["level", "subject", "category", "format", "since", "q"] as const)
              .filter((key) => search[key])
              .map((key) => (
                <Badge
                  key={key}
                  variant="secondary"
                  className="cursor-pointer"
                  onClick={() => void setParam(key, undefined)}
                >
                  {String(search[key])} ✕
                </Badge>
              ))}
          </div>
        ) : null}

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : data && data.rows.length > 0 ? (
          <>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {data.rows.map((doc) => (
                <DocumentCard key={doc.id} doc={doc} />
              ))}
            </div>
            {pages > 1 ? (
              <div className="mt-8 flex items-center justify-center gap-3">
                <Button
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() =>
                    void navigate({ search: (prev) => ({ ...prev, page: page - 1 || undefined }) })
                  }
                >
                  Précédent
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {page} / {pages}
                </span>
                <Button
                  variant="outline"
                  disabled={page >= pages}
                  onClick={() => void navigate({ search: (prev) => ({ ...prev, page: page + 1 }) })}
                >
                  Suivant
                </Button>
              </div>
            ) : null}
          </>
        ) : (
          <div className="surface-card mt-6 p-12 text-center">
            <p className="font-medium">Aucun document trouvé</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Ajustez vos filtres ou importez un nouveau document.
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function sinceDays(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value?: string | undefined;
  options: { value: string; label: string }[];
  onChange: (value?: string) => void;
}) {
  return (
    <Select
      value={value ?? "all"}
      onValueChange={(v) => onChange(v === "all" ? undefined : v)}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{label} : tous</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
