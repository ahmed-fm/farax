import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Clock, Compass, FileStack, Sparkles, Upload } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { DocumentCard } from "@/components/DocumentCard";
import { Button } from "@/components/ui/button";
import { listDocuments, recentlyViewed } from "@/lib/documents";
import { CATEGORIES, LEVELS, SUBJECTS } from "@/lib/taxonomy";
import { useAuth, canUpload } from "@/hooks/useAuth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Studia — Gestion de documents pédagogiques" },
      {
        name: "description",
        content:
          "Classez, consultez et partagez cours, exercices, corrigés et annales du collège à l'université, avec des droits d'accès précis.",
      },
      { property: "og:title", content: "Studia — Gestion de documents pédagogiques" },
      {
        property: "og:description",
        content: "Une bibliothèque pédagogique moderne : classement, lecteur intégré et partage sécurisé.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { user, profile, role } = useAuth();

  const { data: recent } = useQuery({
    queryKey: ["recent-documents"],
    queryFn: () => listDocuments({ pageSize: 6 }),
  });

  const { data: history } = useQuery({
    queryKey: ["history", user?.id],
    queryFn: () => recentlyViewed(user!.id),
    enabled: Boolean(user),
  });

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-8">
        <section className="hero-gradient relative overflow-hidden rounded-2xl p-7 text-primary-foreground md:p-10">
          <Sparkles className="absolute -right-6 -top-6 size-40 opacity-10" />
          <h1 className="max-w-2xl font-display text-3xl font-semibold leading-tight md:text-4xl">
            {profile?.full_name ? `Bonjour ${profile.full_name.split(" ")[0]},` : "Bienvenue,"} votre
            bibliothèque pédagogique est prête.
          </h1>
          <p className="mt-3 max-w-xl text-primary-foreground/85">
            Retrouvez vos cours, exercices, corrigés et annales, classés par niveau et par matière —
            consultables directement dans le lecteur intégré.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild variant="secondary" size="lg">
              <Link to="/documents">
                Explorer les documents <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
            {canUpload(role) ? (
              <Button asChild variant="outline" size="lg" className="border-white/30 bg-white/10">
                <Link to="/upload">
                  <Upload className="mr-2 size-4" /> Importer
                </Link>
              </Button>
            ) : null}
          </div>
        </section>

        <section className="mt-8">
          <SectionTitle icon={Compass} title="Parcourir par niveau" />
          <div className="grid gap-3 sm:grid-cols-3">
            {LEVELS.map((level) => (
              <Link
                key={level.value}
                to="/documents"
                search={{ level: level.value }}
                className="surface-card p-5 transition-all hover:-translate-y-0.5 hover:shadow-float"
              >
                <p className="font-display text-lg font-semibold">{level.label}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Tous les documents du niveau {level.label.toLowerCase()}
                </p>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-8">
          <SectionTitle icon={FileStack} title="Types de contenu" />
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((category) => (
              <Link
                key={category.value}
                to="/documents"
                search={{ category: category.value }}
                className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
              >
                {category.label}
              </Link>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {SUBJECTS.slice(0, 8).map((subject) => (
              <Link
                key={subject.value}
                to="/documents"
                search={{ subject: subject.value }}
                className="rounded-full bg-secondary px-4 py-2 text-sm text-secondary-foreground transition-colors hover:bg-accent"
              >
                {subject.label}
              </Link>
            ))}
          </div>
        </section>

        {history && history.length > 0 ? (
          <section className="mt-10">
            <SectionTitle icon={Clock} title="Reprendre la consultation" />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {history.map((entry) => (
                <DocumentCard key={entry.doc.id} doc={entry.doc} />
              ))}
            </div>
          </section>
        ) : null}

        <section className="mt-10">
          <div className="flex items-end justify-between">
            <SectionTitle icon={Sparkles} title="Ajouts récents" />
            <Link to="/documents" className="mb-3 text-sm font-medium text-primary hover:underline">
              Tout voir
            </Link>
          </div>
          {recent && recent.rows.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {recent.rows.map((doc) => (
                <DocumentCard key={doc.id} doc={doc} />
              ))}
            </div>
          ) : (
            <div className="surface-card p-10 text-center">
              <p className="font-medium">Aucun document pour le moment</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Importez votre premier document pour lancer la bibliothèque.
              </p>
            </div>
          )}
        </section>
      </div>
    </AppLayout>
  );
}

function SectionTitle({ icon: Icon, title }: { icon: typeof Compass; title: string }) {
  return (
    <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold">
      <Icon className="size-4 text-primary" /> {title}
    </h2>
  );
}
