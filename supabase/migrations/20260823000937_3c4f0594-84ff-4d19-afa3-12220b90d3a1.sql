CREATE SCHEMA IF NOT EXISTS private;

GRANT USAGE ON SCHEMA private TO authenticated, anon, service_role;

ALTER FUNCTION public.is_admin(uuid) SET SCHEMA private;
ALTER FUNCTION public.has_role(uuid, public.app_role) SET SCHEMA private;
ALTER FUNCTION public.is_group_member(uuid, uuid) SET SCHEMA private;
ALTER FUNCTION public.owns_document(uuid, uuid) SET SCHEMA private;
ALTER FUNCTION public.can_read_document(uuid, uuid) SET SCHEMA private;
ALTER FUNCTION public.can_download_document(uuid, uuid) SET SCHEMA private;
ALTER FUNCTION public.can_edit_document(uuid, uuid) SET SCHEMA private;
ALTER FUNCTION public.register_view(uuid, numeric) SET SCHEMA private;
ALTER FUNCTION public.handle_new_user() SET SCHEMA private;

-- Keep search_path pinned to public so unqualified table references still resolve.
ALTER FUNCTION private.is_admin(uuid) SET search_path = public;
ALTER FUNCTION private.has_role(uuid, public.app_role) SET search_path = public;
ALTER FUNCTION private.is_group_member(uuid, uuid) SET search_path = public;
ALTER FUNCTION private.owns_document(uuid, uuid) SET search_path = public;
ALTER FUNCTION private.can_read_document(uuid, uuid) SET search_path = public;
ALTER FUNCTION private.can_download_document(uuid, uuid) SET search_path = public;
ALTER FUNCTION private.can_edit_document(uuid, uuid) SET search_path = public;
ALTER FUNCTION private.register_view(uuid, numeric) SET search_path = public;
ALTER FUNCTION private.handle_new_user() SET search_path = public;

-- RLS policies evaluate as the querying role, so they still need EXECUTE.
GRANT EXECUTE ON FUNCTION private.is_admin(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION private.is_group_member(uuid, uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION private.owns_document(uuid, uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION private.can_read_document(uuid, uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION private.can_download_document(uuid, uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION private.can_edit_document(uuid, uuid) TO authenticated, anon;

-- Server-only gateway used by trusted server code (service role) for download checks.
CREATE OR REPLACE FUNCTION public.can_download_document(_doc_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = private, public
AS $$
  SELECT private.can_download_document(_doc_id, _user_id)
$$;

REVOKE ALL ON FUNCTION public.can_download_document(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.can_download_document(uuid, uuid) TO service_role;
