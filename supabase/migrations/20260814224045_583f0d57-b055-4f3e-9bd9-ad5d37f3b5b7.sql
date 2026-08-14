-- ENUMS
CREATE TYPE public.app_role AS ENUM ('admin','teacher','student','guest');
CREATE TYPE public.school_level AS ENUM ('college','lycee','universite');
CREATE TYPE public.doc_visibility AS ENUM ('public','private','users','group','level','subject');

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  storage_used BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- USER ROLES
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin')
$$;

-- new user trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)))
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'student'))
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE POLICY "profiles readable by authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles self update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "profiles self insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "roles readable by authenticated" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- SUBJECTS / CATEGORIES
CREATE TABLE public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  icon TEXT,
  sort_order INT NOT NULL DEFAULT 0
);
GRANT SELECT ON public.subjects TO authenticated, anon;
GRANT ALL ON public.subjects TO service_role;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subjects public read" ON public.subjects FOR SELECT USING (true);
CREATE POLICY "admins manage subjects" ON public.subjects FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0
);
GRANT SELECT ON public.categories TO authenticated, anon;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories public read" ON public.categories FOR SELECT USING (true);
CREATE POLICY "admins manage categories" ON public.categories FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

INSERT INTO public.subjects (slug,name,sort_order) VALUES
 ('mathematiques','Mathématiques',1),('physique','Physique',2),('chimie','Chimie',3),
 ('francais','Français',4),('anglais','Anglais',5),('histoire','Histoire',6),
 ('geographie','Géographie',7),('informatique','Informatique',8),('svt','SVT',9),
 ('philosophie','Philosophie',10),('economie','Économie',11),('autres','Autres',12);

INSERT INTO public.categories (slug,name,sort_order) VALUES
 ('cours','Cours',1),('exercices','Exercices',2),('corriges','Corrigés',3),
 ('examens','Examens',4),('fiches','Fiches de révision',5),('annales','Annales',6),('autres','Autres',7);

-- GROUPS
CREATE TABLE public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  level public.school_level NOT NULL,
  description TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.groups TO authenticated;
GRANT ALL ON public.groups TO service_role;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "groups readable" ON public.groups FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins teachers create groups" ON public.groups FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'teacher'));
CREATE POLICY "owner admin update groups" ON public.groups FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "owner admin delete groups" ON public.groups FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.is_admin(auth.uid()));

CREATE TABLE public.group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (group_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.group_members TO authenticated;
GRANT ALL ON public.group_members TO service_role;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_group_member(_group_id UUID, _user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.group_members WHERE group_id = _group_id AND user_id = _user_id)
$$;

CREATE POLICY "members readable" ON public.group_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins teachers manage members" ON public.group_members FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'teacher') OR user_id = auth.uid());
CREATE POLICY "admins teachers delete members" ON public.group_members FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'teacher') OR user_id = auth.uid());

-- DOCUMENTS
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size BIGINT NOT NULL DEFAULT 0,
  storage_path TEXT NOT NULL UNIQUE,
  thumbnail_path TEXT,
  description TEXT,
  level public.school_level NOT NULL,
  subject TEXT NOT NULL,
  category TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name TEXT,
  school_year TEXT,
  visibility public.doc_visibility NOT NULL DEFAULT 'private',
  allow_download BOOLEAN NOT NULL DEFAULT true,
  view_count INT NOT NULL DEFAULT 0,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_documents_level_subject_cat ON public.documents(level, subject, category);
CREATE INDEX idx_documents_created ON public.documents(created_at DESC);
CREATE INDEX idx_documents_author ON public.documents(author_id);
CREATE INDEX idx_documents_tags ON public.documents USING GIN (tags);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;
GRANT SELECT ON public.documents TO anon;
GRANT ALL ON public.documents TO service_role;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.document_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  can_read BOOLEAN NOT NULL DEFAULT true,
  can_download BOOLEAN NOT NULL DEFAULT false,
  can_edit BOOLEAN NOT NULL DEFAULT false,
  can_delete BOOLEAN NOT NULL DEFAULT false,
  can_share BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (user_id IS NOT NULL OR group_id IS NOT NULL)
);
CREATE INDEX idx_docperm_doc ON public.document_permissions(document_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_permissions TO authenticated;
GRANT ALL ON public.document_permissions TO service_role;
ALTER TABLE public.document_permissions ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_read_document(_doc_id UUID, _user_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE d public.documents%ROWTYPE;
BEGIN
  SELECT * INTO d FROM public.documents WHERE id = _doc_id;
  IF NOT FOUND OR d.deleted_at IS NOT NULL THEN RETURN false; END IF;
  IF d.visibility = 'public' THEN RETURN true; END IF;
  IF _user_id IS NULL THEN RETURN false; END IF;
  IF d.author_id = _user_id OR public.is_admin(_user_id) THEN RETURN true; END IF;
  IF d.visibility IN ('level','subject') THEN RETURN true; END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.document_permissions p
    WHERE p.document_id = _doc_id AND p.can_read
      AND (p.user_id = _user_id OR (p.group_id IS NOT NULL AND public.is_group_member(p.group_id, _user_id)))
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.can_download_document(_doc_id UUID, _user_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE d public.documents%ROWTYPE;
BEGIN
  SELECT * INTO d FROM public.documents WHERE id = _doc_id;
  IF NOT FOUND THEN RETURN false; END IF;
  IF d.author_id = _user_id OR public.is_admin(_user_id) THEN RETURN true; END IF;
  IF NOT public.can_read_document(_doc_id, _user_id) THEN RETURN false; END IF;
  IF d.allow_download THEN RETURN true; END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.document_permissions p
    WHERE p.document_id = _doc_id AND p.can_download
      AND (p.user_id = _user_id OR (p.group_id IS NOT NULL AND public.is_group_member(p.group_id, _user_id)))
  );
END;
$$;

CREATE POLICY "documents readable when allowed" ON public.documents FOR SELECT
  USING (deleted_at IS NULL AND (visibility = 'public' OR public.can_read_document(id, auth.uid())));
CREATE POLICY "teachers admins insert documents" ON public.documents FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid() AND (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'teacher')));
CREATE POLICY "author admin update documents" ON public.documents FOR UPDATE TO authenticated
  USING (author_id = auth.uid() OR public.is_admin(auth.uid()))
  WITH CHECK (author_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "author admin delete documents" ON public.documents FOR DELETE TO authenticated
  USING (author_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.owns_document(_doc_id UUID, _user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.documents WHERE id = _doc_id AND author_id = _user_id)
$$;

CREATE POLICY "perms readable" ON public.document_permissions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.owns_document(document_id, auth.uid()) OR public.is_admin(auth.uid()));
CREATE POLICY "owner admin manage perms" ON public.document_permissions FOR ALL TO authenticated
  USING (public.owns_document(document_id, auth.uid()) OR public.is_admin(auth.uid()))
  WITH CHECK (public.owns_document(document_id, auth.uid()) OR public.is_admin(auth.uid()));

-- FAVORITES / HISTORY / LOGS
CREATE TABLE public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, document_id)
);
GRANT SELECT, INSERT, DELETE ON public.favorites TO authenticated;
GRANT ALL ON public.favorites TO service_role;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own favorites" ON public.favorites FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.view_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  position NUMERIC,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, document_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.view_history TO authenticated;
GRANT ALL ON public.view_history TO service_role;
ALTER TABLE public.view_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own history" ON public.view_history FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.access_logs TO authenticated;
GRANT ALL ON public.access_logs TO service_role;
ALTER TABLE public.access_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "insert own logs" ON public.access_logs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "read own or admin logs" ON public.access_logs FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER documents_updated_at BEFORE UPDATE ON public.documents
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- view count increment
CREATE OR REPLACE FUNCTION public.register_view(_doc_id UUID, _position NUMERIC DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.can_read_document(_doc_id, auth.uid()) THEN RETURN; END IF;
  UPDATE public.documents SET view_count = view_count + 1 WHERE id = _doc_id;
  INSERT INTO public.view_history (user_id, document_id, position, viewed_at)
  VALUES (auth.uid(), _doc_id, _position, now())
  ON CONFLICT (user_id, document_id) DO UPDATE SET viewed_at = now(),
    position = COALESCE(EXCLUDED.position, public.view_history.position);
  INSERT INTO public.access_logs (user_id, document_id, action) VALUES (auth.uid(), _doc_id, 'view');
END;
$$;
GRANT EXECUTE ON FUNCTION public.register_view(UUID, NUMERIC) TO authenticated;