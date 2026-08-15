CREATE OR REPLACE FUNCTION public.can_download_document(_doc_id uuid, _user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE d public.documents%ROWTYPE; u uuid;
BEGIN
  u := COALESCE(auth.uid(), _user_id);
  IF auth.uid() IS NOT NULL THEN u := auth.uid(); END IF;
  SELECT * INTO d FROM public.documents WHERE id = _doc_id;
  IF NOT FOUND THEN RETURN false; END IF;
  IF d.author_id = u OR public.is_admin(u) THEN RETURN true; END IF;
  IF NOT public.can_read_document(_doc_id, u) THEN RETURN false; END IF;
  IF d.allow_download THEN RETURN true; END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.document_permissions p
    WHERE p.document_id = _doc_id AND p.can_download
      AND (p.user_id = u OR (p.group_id IS NOT NULL AND public.is_group_member(p.group_id, u)))
  );
END;
$function$;