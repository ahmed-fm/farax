-- 1. Groups hierarchy
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.groups(id) ON DELETE CASCADE;
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS slug text;
CREATE INDEX IF NOT EXISTS groups_parent_idx ON public.groups(parent_id);

-- 2. Member role
DO $$ BEGIN
  CREATE TYPE public.group_member_role AS ENUM ('student','teacher');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE public.group_members ADD COLUMN IF NOT EXISTS member_role public.group_member_role NOT NULL DEFAULT 'student';

-- 3. Document <-> group sharing
CREATE TABLE IF NOT EXISTS public.document_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  can_download boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (document_id, group_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_groups TO authenticated;
GRANT ALL ON public.document_groups TO service_role;

ALTER TABLE public.document_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "document groups readable"
ON public.document_groups FOR SELECT TO authenticated
USING (
  public.owns_document(document_id, auth.uid())
  OR public.is_admin(auth.uid())
  OR public.is_group_member(group_id, auth.uid())
);

CREATE POLICY "owner admin manage document groups"
ON public.document_groups FOR ALL TO authenticated
USING (public.owns_document(document_id, auth.uid()) OR public.is_admin(auth.uid()))
WITH CHECK (public.owns_document(document_id, auth.uid()) OR public.is_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS document_groups_doc_idx ON public.document_groups(document_id);
CREATE INDEX IF NOT EXISTS document_groups_group_idx ON public.document_groups(group_id);

-- 4. Full text search
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE OR REPLACE FUNCTION public.documents_search_vector()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('french'::regconfig, coalesce(NEW.name,'')), 'A') ||
    setweight(to_tsvector('french'::regconfig, coalesce(array_to_string(NEW.tags,' '),'')), 'B') ||
    setweight(to_tsvector('french'::regconfig, coalesce(NEW.description,'')), 'C') ||
    setweight(to_tsvector('french'::regconfig, coalesce(NEW.author_name,'')), 'D');
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS documents_search_vector_trg ON public.documents;
CREATE TRIGGER documents_search_vector_trg
BEFORE INSERT OR UPDATE ON public.documents
FOR EACH ROW EXECUTE FUNCTION public.documents_search_vector();

UPDATE public.documents SET name = name;
CREATE INDEX IF NOT EXISTS documents_search_idx ON public.documents USING GIN (search_vector);

-- 5. Permission functions take group sharing into account
CREATE OR REPLACE FUNCTION public.can_read_document(_doc_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE d public.documents%ROWTYPE;
BEGIN
  SELECT * INTO d FROM public.documents WHERE id = _doc_id;
  IF NOT FOUND OR d.deleted_at IS NOT NULL THEN RETURN false; END IF;
  IF d.visibility = 'public' THEN RETURN true; END IF;
  IF _user_id IS NULL THEN RETURN false; END IF;
  IF d.author_id = _user_id OR public.is_admin(_user_id) THEN RETURN true; END IF;
  IF d.visibility = 'users' THEN RETURN true; END IF;
  IF d.visibility = 'level' THEN
    IF EXISTS (
      SELECT 1 FROM public.group_members gm
      JOIN public.groups g ON g.id = gm.group_id
      WHERE gm.user_id = _user_id AND g.level = d.level
    ) THEN RETURN true; END IF;
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.document_groups dg
    JOIN public.group_members gm ON gm.group_id = dg.group_id
    WHERE dg.document_id = _doc_id AND gm.user_id = _user_id
  ) THEN RETURN true; END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.document_permissions p
    WHERE p.document_id = _doc_id AND p.can_read
      AND (p.user_id = _user_id OR (p.group_id IS NOT NULL AND public.is_group_member(p.group_id, _user_id)))
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.can_download_document(_doc_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE d public.documents%ROWTYPE; u uuid;
BEGIN
  u := auth.uid();
  IF u IS NULL THEN u := NULL; END IF;
  SELECT * INTO d FROM public.documents WHERE id = _doc_id;
  IF NOT FOUND THEN RETURN false; END IF;
  IF u IS NOT NULL AND (d.author_id = u OR public.is_admin(u)) THEN RETURN true; END IF;
  IF NOT public.can_read_document(_doc_id, u) THEN RETURN false; END IF;
  IF d.allow_download THEN RETURN true; END IF;
  IF u IS NULL THEN RETURN false; END IF;
  IF EXISTS (
    SELECT 1 FROM public.document_groups dg
    JOIN public.group_members gm ON gm.group_id = dg.group_id
    WHERE dg.document_id = _doc_id AND gm.user_id = u AND dg.can_download
  ) THEN RETURN true; END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.document_permissions p
    WHERE p.document_id = _doc_id AND p.can_download
      AND (p.user_id = u OR (p.group_id IS NOT NULL AND public.is_group_member(p.group_id, u)))
  );
END;
$function$;

-- 6. Edit / delete permission helper
CREATE OR REPLACE FUNCTION public.can_edit_document(_doc_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.documents d WHERE d.id = _doc_id AND (d.author_id = _user_id)
  ) OR public.is_admin(_user_id) OR EXISTS (
    SELECT 1 FROM public.document_permissions p
    WHERE p.document_id = _doc_id AND p.can_edit
      AND (p.user_id = _user_id OR (p.group_id IS NOT NULL AND public.is_group_member(p.group_id, _user_id)))
  )
$function$;

REVOKE ALL ON FUNCTION public.can_edit_document(uuid, uuid) FROM PUBLIC, anon, authenticated;

-- 7. Demo class hierarchy
INSERT INTO public.groups (name, level, slug, description, parent_id)
SELECT 'Collège', 'college', 'college', 'Toutes les classes du collège', NULL
WHERE NOT EXISTS (SELECT 1 FROM public.groups WHERE slug = 'college');
INSERT INTO public.groups (name, level, slug, description, parent_id)
SELECT 'Lycée', 'lycee', 'lycee', 'Toutes les classes du lycée', NULL
WHERE NOT EXISTS (SELECT 1 FROM public.groups WHERE slug = 'lycee');
INSERT INTO public.groups (name, level, slug, description, parent_id)
SELECT 'Université', 'universite', 'universite', 'Toutes les promotions', NULL
WHERE NOT EXISTS (SELECT 1 FROM public.groups WHERE slug = 'universite');

INSERT INTO public.groups (name, level, slug, description, parent_id)
SELECT v.name, v.level::public.school_level, v.slug, v.description, (SELECT id FROM public.groups WHERE slug = v.parent)
FROM (VALUES
  ('Sixième','college','6eme','Niveau 6e','college'),
  ('Cinquième','college','5eme','Niveau 5e','college'),
  ('Quatrième','college','4eme','Niveau 4e','college'),
  ('Troisième','college','3eme','Niveau 3e','college'),
  ('Seconde','lycee','seconde','Niveau seconde','lycee'),
  ('Première','lycee','premiere','Niveau première','lycee'),
  ('Terminale','lycee','terminale','Niveau terminale','lycee'),
  ('Licence 1','universite','l1','Première année','universite'),
  ('Licence 2','universite','l2','Deuxième année','universite'),
  ('Licence 3','universite','l3','Troisième année','universite')
) AS v(name, level, slug, description, parent)
WHERE NOT EXISTS (SELECT 1 FROM public.groups g WHERE g.slug = v.slug);

INSERT INTO public.groups (name, level, slug, description, parent_id)
SELECT v.name, 'lycee'::public.school_level, v.slug, v.description, (SELECT id FROM public.groups WHERE slug = v.parent)
FROM (VALUES
  ('Terminale A','terminale-a','Classe Terminale A','terminale'),
  ('Terminale B','terminale-b','Classe Terminale B','terminale'),
  ('Terminale C','terminale-c','Classe Terminale C','terminale'),
  ('Seconde A','seconde-a','Classe Seconde A','seconde')
) AS v(name, slug, description, parent)
WHERE NOT EXISTS (SELECT 1 FROM public.groups g WHERE g.slug = v.slug);