ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS chapter text;

CREATE INDEX IF NOT EXISTS documents_chapter_idx ON public.documents (chapter);

CREATE OR REPLACE FUNCTION public.documents_search_vector()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('french'::regconfig, coalesce(NEW.name,'')), 'A') ||
    setweight(to_tsvector('french'::regconfig, coalesce(array_to_string(NEW.tags,' '),'')), 'B') ||
    setweight(to_tsvector('french'::regconfig, coalesce(NEW.chapter,'')), 'B') ||
    setweight(to_tsvector('french'::regconfig, coalesce(NEW.description,'')), 'C') ||
    setweight(to_tsvector('french'::regconfig, coalesce(NEW.author_name,'')), 'D');
  RETURN NEW;
END;
$function$;

DROP POLICY IF EXISTS "teachers admins insert documents" ON public.documents;
CREATE POLICY "authenticated insert own documents"
ON public.documents FOR INSERT TO authenticated
WITH CHECK (author_id = auth.uid());