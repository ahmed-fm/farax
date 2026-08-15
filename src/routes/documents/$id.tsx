import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Download, Eye, Heart, Loader2, Share2 } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { DocumentCard } from "@/components/DocumentCard";
import { DocumentViewer } from "@/components/viewers/DocumentViewer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  getDocument,
  isFavorite,
  logAccess,
  registerView,
  signedUrl,
  similarDocuments,
  toggleFavorite,
} from "@/lib/documents";
import { categoryLabel, formatDate, formatSize, levelLabel, subjectLabel } from "@/lib/taxonomy";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/documents/$id")({
  head: () => ({
    meta: [
      { title: "Consulter un document — Studia" },
      {
        name: "description",
        content:
          "Lisez, annotez et téléchargez le document pédagogique directement depuis le lecteur intégré.",
      },
      { property: "og:title", content: "Consulter un document — Studia" },
      {
        property: "og:description",
        content: "Lecteur intégré multi-formats : PDF, images, vidéos et textes.",
      },
    ],
  }),
  component: DocumentPage,
});

function DocumentPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [fav, setFav] = useState(false);

  const fetchUrl = useServerFn(getFileUrl);
  const removeDocument = useServerFn(deleteDocument);

  const { data: doc, isLoading } = useQuery({
    queryKey: ["document", id],
    queryFn: () => getDocument(id),
  });

  // The signed URL is issued by the server only after a permission check.
  const { data: url } = useQuery({
    queryKey: ["document-url", id],
    queryFn: async () => (await fetchUrl({ data: { documentId: id } })).url,
    enabled: Boolean(doc),
    staleTime: 10 * 60 * 1000,
  });

  const { data: similar } = useQuery({
    queryKey: ["similar", doc?.id],
    queryFn: () => similarDocuments(doc!),
    enabled: Boolean(doc),
  });

  useEffect(() => {
    if (doc && user) {
      void registerView(doc.id);
      void isFavorite(doc.id, user.id).then(setFav);
    }
  }, [doc, user]);

  const download = async () => {
    if (!doc) return;
    try {
      const result = await fetchUrl({ data: { documentId: doc.id, download: true } });
      window.open(result.url, "_blank");
    } catch {
      toast.error("Téléchargement refusé : droits insuffisants.");
    }
  };

  const destroy = async () => {
    if (!doc) return;
    if (!window.confirm("Supprimer définitivement ce document et son fichier ?")) return;
    try {
      await removeDocument({ data: { documentId: doc.id } });
      toast.success("Document supprimé");
      void navigate({ to: "/documents" });
    } catch {
      toast.error("Suppression refusée : droits insuffisants.");
    }
  };

  const canManage = Boolean(user && doc && doc.author_id === user.id);


  const share = async () => {
    await navigator.clipboard.writeText(window.location.href);
    toast.success("Lien copié dans le presse-papiers");
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex justify-center py-24">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (!doc) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-md px-4 py-24 text-center">
          <h1 className="font-display text-xl font-semibold">Document introuvable</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Il a peut-être été supprimé ou vous n'avez pas les droits pour le consulter.
          </p>
          <Button asChild className="mt-6">
            <Link to="/documents">Retour aux documents</Link>
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-8">
        <Link
          to="/documents"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Documents
        </Link>

        <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_320px]">
          <div>
            {url ? (
              <DocumentViewer
                url={url}
                mime={doc.mime_type}
                name={doc.name}
                allowDownload={doc.allow_download}
                onProgress={(position) => void registerView(doc.id, position)}
              />
            ) : (
              <div className="surface-card flex h-96 items-center justify-center">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>

          <aside className="space-y-4">
            <div className="surface-card p-5">
              <h1 className="font-display text-xl font-semibold leading-snug">{doc.name}</h1>
              {doc.description ? (
                <p className="mt-2 text-sm text-muted-foreground">{doc.description}</p>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-2">
                <Badge variant="secondary">{levelLabel(doc.level)}</Badge>
                <Badge variant="secondary">{subjectLabel(doc.subject)}</Badge>
                <Badge variant="secondary">{categoryLabel(doc.category)}</Badge>
              </div>

              <dl className="mt-5 space-y-2 text-sm">
                <Row label="Auteur" value={doc.author_name ?? "—"} />
                <Row label="Année scolaire" value={doc.school_year ?? "—"} />
                <Row label="Taille" value={formatSize(doc.size)} />
                <Row label="Ajouté le" value={formatDate(doc.created_at)} />
                <Row label="Consultations" value={String(doc.view_count)} />
              </dl>

              {doc.tags.length ? (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {doc.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="font-normal">
                      #{tag}
                    </Badge>
                  ))}
                </div>
              ) : null}

              <div className="mt-5 grid gap-2">
                <Button onClick={() => void download()} disabled={!doc.allow_download}>
                  <Download className="mr-2 size-4" /> Télécharger
                </Button>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" onClick={() => void share()}>
                    <Share2 className="mr-2 size-4" /> Partager
                  </Button>
                  <Button
                    variant={fav ? "default" : "outline"}
                    disabled={!user}
                    onClick={async () => {
                      if (!user) return;
                      setFav(await toggleFavorite(doc.id, user.id, fav));
                    }}
                  >
                    <Heart className="mr-2 size-4" /> Favori
                  </Button>
                </div>
              </div>
            </div>

            {similar && similar.length > 0 ? (
              <div>
                <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  <Eye className="size-4 text-muted-foreground" /> Documents similaires
                </h2>
                <div className="grid gap-3">
                  {similar.slice(0, 3).map((item) => (
                    <DocumentCard key={item.id} doc={item} />
                  ))}
                </div>
              </div>
            ) : null}
          </aside>
        </div>
      </div>
    </AppLayout>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}
