-- Restore EXECUTE on security helper functions so RLS policies can evaluate them.
-- These functions are SECURITY DEFINER and are referenced inside RLS policies.
-- Without EXECUTE, policies fail with "permission denied for function ...".

GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_group_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.owns_document(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_read_document(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_read_document(uuid, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.can_download_document(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_download_document(uuid, uuid) TO anon;