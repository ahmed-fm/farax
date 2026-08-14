import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Users } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { levelLabel } from "@/lib/taxonomy";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/groups")({
  head: () => ({
    meta: [
      { title: "Mes classes — Studia" },
      {
        name: "description",
        content: "Consultez les classes et groupes auxquels vous appartenez et les documents partagés.",
      },
      { property: "og:title", content: "Mes classes — Studia" },
      { property: "og:description", content: "Classes, groupes et partages de documents pédagogiques." },
    ],
  }),
  component: GroupsPage,
});

function GroupsPage() {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ["groups", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("groups").select("*").order("name");
      if (error) throw error;
      return data ?? [];
    },
    enabled: Boolean(user),
  });

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-8">
        <h1 className="flex items-center gap-2 font-display text-2xl font-semibold">
          <Users className="size-5 text-primary" /> Classes et groupes
        </h1>
        {data && data.length > 0 ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {data.map((group) => (
              <div key={group.id} className="surface-card p-5">
                <p className="font-display text-lg font-semibold">{group.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {group.level ? levelLabel(group.level) : "Tous niveaux"}
                </p>
                {group.description ? (
                  <p className="mt-2 text-sm text-muted-foreground">{group.description}</p>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <div className="surface-card mt-6 p-12 text-center">
            <p className="font-medium">Aucune classe pour l'instant</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Les classes créées par les enseignants apparaîtront ici.
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
