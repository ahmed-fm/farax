import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Shield } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/taxonomy";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Administration — Studia" },
      {
        name: "description",
        content: "Supervisez les utilisateurs, les documents et les accès de la plateforme pédagogique.",
      },
      { property: "og:title", content: "Administration — Studia" },
      { property: "og:description", content: "Tableau d'administration de la bibliothèque pédagogique." },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { role } = useAuth();

  const { data } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: async () => {
      const [profiles, documents, logs] = await Promise.all([
        supabase.from("profiles").select("id, full_name, email, created_at").limit(50),
        supabase.from("documents").select("id", { count: "exact", head: true }),
        supabase
          .from("access_logs")
          .select("id, action, created_at")
          .order("created_at", { ascending: false })
          .limit(20),
      ]);
      return {
        profiles: profiles.data ?? [],
        documentCount: documents.count ?? 0,
        logs: logs.data ?? [],
      };
    },
    enabled: role === "admin",
  });

  if (role !== "admin") {
    return (
      <AppLayout>
        <div className="mx-auto max-w-md px-4 py-24 text-center">
          <h1 className="font-display text-xl font-semibold">Accès réservé aux administrateurs</h1>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-8">
        <h1 className="flex items-center gap-2 font-display text-2xl font-semibold">
          <Shield className="size-5 text-primary" /> Administration
        </h1>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <Stat label="Utilisateurs" value={String(data?.profiles.length ?? 0)} />
          <Stat label="Documents" value={String(data?.documentCount ?? 0)} />
          <Stat label="Accès récents" value={String(data?.logs.length ?? 0)} />
        </div>

        <h2 className="mt-8 font-display text-lg font-semibold">Utilisateurs</h2>
        <div className="surface-card mt-3 divide-y divide-border">
          {(data?.profiles ?? []).map((profile) => (
            <div key={profile.id} className="flex items-center justify-between gap-3 p-4 text-sm">
              <div>
                <p className="font-medium">{profile.full_name ?? "Sans nom"}</p>
                <p className="text-muted-foreground">{profile.email}</p>
              </div>
              <span className="text-muted-foreground">{formatDate(profile.created_at)}</span>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface-card p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-3xl font-semibold">{value}</p>
    </div>
  );
}
