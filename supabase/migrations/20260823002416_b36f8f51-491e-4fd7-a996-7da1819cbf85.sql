CREATE POLICY "authors read own documents"
ON public.documents FOR SELECT TO authenticated
USING (author_id = auth.uid());

CREATE OR REPLACE FUNCTION private.can_read_document(_doc_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, private AS $$
DECLARE d public.documents%ROWTYPE;
BEGIN
  SELECT * INTO d FROM public.documents WHERE id = _doc_id;
  IF NOT FOUND OR d.deleted_at IS NOT NULL THEN RETURN false; END IF;
  IF d.visibility = 'public' THEN RETURN true; END IF;
  IF _user_id IS NULL THEN RETURN false; END IF;
  IF d.author_id = _user_id OR private.is_admin(_user_id) THEN RETURN true; END IF;
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
      AND (p.user_id = _user_id OR (p.group_id IS NOT NULL AND private.is_group_member(p.group_id, _user_id)))
  );
END;
$$;

CREATE OR REPLACE FUNCTION private.can_edit_document(_doc_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, private AS $$
DECLARE d public.documents%ROWTYPE;
BEGIN
  IF _user_id IS NULL THEN RETURN false; END IF;
  SELECT * INTO d FROM public.documents WHERE id = _doc_id;
  IF NOT FOUND THEN RETURN false; END IF;
  IF d.author_id = _user_id OR private.is_admin(_user_id) THEN RETURN true; END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.document_permissions p
    WHERE p.document_id = _doc_id AND p.can_edit
      AND (p.user_id = _user_id OR (p.group_id IS NOT NULL AND private.is_group_member(p.group_id, _user_id)))
  );
END;
$$;

CREATE OR REPLACE FUNCTION private.can_download_document(_doc_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, private AS $$
DECLARE d public.documents%ROWTYPE;
BEGIN
  SELECT * INTO d FROM public.documents WHERE id = _doc_id;
  IF NOT FOUND OR d.deleted_at IS NOT NULL THEN RETURN false; END IF;
  IF _user_id IS NOT NULL AND (d.author_id = _user_id OR private.is_admin(_user_id)) THEN RETURN true; END IF;
  IF NOT private.can_read_document(_doc_id, _user_id) THEN RETURN false; END IF;
  IF d.allow_download THEN RETURN true; END IF;
  IF _user_id IS NULL THEN RETURN false; END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.document_permissions p
    WHERE p.document_id = _doc_id AND p.can_download
      AND (p.user_id = _user_id OR (p.group_id IS NOT NULL AND private.is_group_member(p.group_id, _user_id)))
  );
END;
$$;