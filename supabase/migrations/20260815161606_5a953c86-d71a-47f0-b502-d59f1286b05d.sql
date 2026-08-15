-- 1. Fix can_read_document level/subject bypass
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
  RETURN EXISTS (
    SELECT 1 FROM public.document_permissions p
    WHERE p.document_id = _doc_id AND p.can_read
      AND (p.user_id = _user_id OR (p.group_id IS NOT NULL AND public.is_group_member(p.group_id, _user_id)))
  );
END;
$function$;

-- 2. Restrict profiles reads
DROP POLICY IF EXISTS "profiles readable by authenticated" ON public.profiles;
CREATE POLICY "profiles self or admin read" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_admin(auth.uid()));

-- 3. Restrict user_roles reads
DROP POLICY IF EXISTS "roles readable by authenticated" ON public.user_roles;
CREATE POLICY "roles self or admin read" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

-- 4. Restrict group_members reads
DROP POLICY IF EXISTS "members readable" ON public.group_members;
CREATE POLICY "members readable by group" ON public.group_members
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_admin(auth.uid())
    OR public.is_group_member(group_id, auth.uid())
    OR EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_id AND g.created_by = auth.uid())
  );

-- 5. Revoke direct EXECUTE on internal SECURITY DEFINER helpers
REVOKE EXECUTE ON FUNCTION public.can_read_document(uuid, uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_group_member(uuid, uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.owns_document(uuid, uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.can_download_document(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.register_view(uuid, numeric) FROM anon;