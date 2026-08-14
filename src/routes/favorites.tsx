import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { DocumentCard } from "@/components/DocumentCard";
import { listFavorites } from "@/lib/documents";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/favorites")({
  head: () => ({
    meta: [
      { title: "Mes favoris — Studia" },
      {
        name: "description",
        content: "Retrouvez en un clin d'œil les documents pédagogiques que vous avez mis en favori.",
      },
      { property: "og:title", content: "Mes favoris — Studia" },
      { property: "og:description", content: "Vos documents pédagogiques favoris, réunis au même endroit." },
    ],
  }),
  component: FavoritesPage,
});

function FavoritesPage() {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ["favorites", user?.id],
    queryFn: () => listFavorites(user!.id),
    enabled: Boolean(user),
  });

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-8">
        <h1 className="flex items-center gap-2 font-display text-2xl font-semibold">
          <Star className="size-5 text-primary" /> Mes favoris
        </h1>
        {data && data.length > 0 ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {data.map((doc) => (
              <DocumentCard key={doc.id} doc={doc} />
            ))}
          </div>
        ) : (
          <div className="surface-card mt-6 p-12 text-center">
            <p className="font-medium">Aucun favori</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Ajoutez des documents en favori depuis leur page de consultation.
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
