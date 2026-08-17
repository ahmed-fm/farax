import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  BookOpen,
  Compass,
  FolderTree,
  GraduationCap,
  Home,
  LogOut,
  Menu,
  Moon,
  Search,
  Shield,
  Star,
  Sun,
  Upload,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LEVELS, SUBJECTS } from "@/lib/taxonomy";
import { useAuth, canUpload } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

function useTheme() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const prefers = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = stored ? stored === "dark" : prefers;
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);
  const toggle = () => {
    setDark((prev) => {
      const next = !prev;
      document.documentElement.classList.toggle("dark", next);
      localStorage.setItem("theme", next ? "dark" : "light");
      return next;
    });
  };
  return { dark, toggle };
}

function NavContent({ onNavigate }: { onNavigate?: () => void }) {
  const { role } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const item = (to: string, label: string, Icon: typeof Home, search?: Record<string, string>) => (
    <Link
      key={label + to + JSON.stringify(search ?? {})}
      to={to}
      search={search as never}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
        pathname === to
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
      )}
    >
      <Icon className="size-4 shrink-0" />
      {label}
    </Link>
  );

  return (
    <nav className="flex h-full flex-col gap-6 overflow-y-auto p-3">
      <div className="space-y-1">
        {item("/", "Tableau de bord", Home)}
        {item("/documents", "Tous les documents", BookOpen)}
        {item("/library", "Ma bibliothèque", FolderTree)}
        {item("/favorites", "Favoris", Star)}
        {canUpload(role) ? item("/upload", "Importer", Upload) : null}
        {item("/groups", "Classes", Users)}
        {role === "admin" ? item("/admin", "Administration", Shield) : null}
      </div>

      <div className="space-y-1">
        <p className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Niveaux
        </p>
        {LEVELS.map((level) =>
          item(`/documents`, level.label, GraduationCap, { level: level.value }),
        )}
      </div>

      <div className="space-y-1">
        <p className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Matières
        </p>
        {SUBJECTS.slice(0, 8).map((subject) =>
          item(`/documents`, subject.label, Compass, { subject: subject.value }),
        )}
      </div>
    </nav>
  );
}

export function AppLayout({ children }: { children: ReactNode }) {
  const { user, profile, role, signOut } = useAuth();
  const { dark, toggle } = useTheme();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [mobileNav, setMobileNav] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    void navigate({ to: "/documents", search: { q: query || undefined } as never });
  };

  const initials = (profile?.full_name ?? user?.email ?? "?").slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
        <div className="flex h-16 items-center gap-3 px-4">
          <Sheet open={mobileNav} onOpenChange={setMobileNav}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Menu">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SheetTitle className="px-5 pt-5 font-display text-lg">Navigation</SheetTitle>
              <NavContent onNavigate={() => setMobileNav(false)} />
            </SheetContent>
          </Sheet>

          <Link to="/" className="flex items-center gap-2">
            <span className="hero-gradient flex size-9 items-center justify-center rounded-xl text-primary-foreground">
              <GraduationCap className="size-5" />
            </span>
            <span className="hidden font-display text-lg font-semibold sm:inline">Studia</span>
          </Link>

          <form onSubmit={submitSearch} className="relative mx-auto w-full max-w-xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un cours, un exercice, un auteur…"
              className="h-10 rounded-full pl-9"
              aria-label="Recherche globale"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                aria-label="Effacer"
              >
                <X className="size-4" />
              </button>
            ) : null}
          </form>

          {user && canUpload(role) ? (
            <Button asChild size="sm" className="hidden sm:inline-flex">
              <Link to="/upload">
                <Upload className="mr-2 size-4" /> Importer
              </Link>
            </Button>
          ) : null}

          <Button variant="ghost" size="icon" onClick={toggle} aria-label="Thème">
            {dark ? <Sun className="size-5" /> : <Moon className="size-5" />}
          </Button>


          {user ? (
            <div className="flex items-center gap-2">
              <Avatar className="size-9">
                <AvatarFallback className="bg-secondary text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden leading-tight md:block">
                <p className="text-sm font-medium">{profile?.full_name ?? "Utilisateur"}</p>
                <p className="text-xs capitalize text-muted-foreground">{role}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => void signOut()} aria-label="Se déconnecter">
                <LogOut className="size-4" />
              </Button>
            </div>
          ) : (
            <Button asChild size="sm">
              <Link to="/auth">Se connecter</Link>
            </Button>
          )}
        </div>
      </header>

      <div className="flex">
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-64 shrink-0 border-r border-sidebar-border bg-sidebar lg:block">
          <NavContent />
        </aside>
        <main className="min-h-[calc(100vh-4rem)] w-full pb-24 lg:pb-10">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur lg:hidden">
        <div className="grid grid-cols-4">
          {[
            { to: "/", label: "Accueil", Icon: Home },
            { to: "/documents", label: "Documents", Icon: BookOpen },
            { to: canUpload(role) ? "/upload" : "/favorites", label: canUpload(role) ? "Importer" : "Favoris", Icon: canUpload(role) ? Upload : Star },
            { to: "/groups", label: "Classes", Icon: Users },
          ].map(({ to, label, Icon }) => (
            <Link
              key={label}
              to={to}
              className={cn(
                "flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] font-medium",
                pathname === to ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className="size-5" />
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
