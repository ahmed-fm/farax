import { supabase } from "@/integrations/supabase/client";

export type DocumentRow = {
  id: string;
  name: string;
  filename: string;
  mime_type: string;
  size: number;
  storage_path: string;
  thumbnail_path: string | null;
  description: string | null;
  level: string;
  subject: string;
  category: string;
  tags: string[];
  author_id: string;
  author_name: string | null;
  school_year: string | null;
  visibility: string;
  allow_download: boolean;
  view_count: number;
  created_at: string;
  updated_at: string;
};

export type DocFilters = {
  level?: string;
  subject?: string;
  category?: string;
  q?: string;
  format?: string;
  author?: string;
  since?: string;
  mine?: boolean;
  page?: number;
  pageSize?: number;
};

const FORMAT_PREFIX: Record<string, string> = {
  pdf: "application/pdf",
  image: "image/",
  video: "video/",
  text: "text/plain",
};

export async function listDocuments(filters: DocFilters, userId?: string | null) {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 24;
  let query = supabase
    .from("documents")
    .select("*", { count: "exact" })
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (filters.level) query = query.eq("level", filters.level as "college");
  if (filters.subject) query = query.eq("subject", filters.subject);
  if (filters.category) query = query.eq("category", filters.category);
  if (filters.author) query = query.ilike("author_name", `%${filters.author}%`);
  if (filters.since) query = query.gte("created_at", filters.since);
  if (filters.mine && userId) query = query.eq("author_id", userId);
  if (filters.format) {
    const prefix = FORMAT_PREFIX[filters.format];
    if (prefix) query = query.like("mime_type", `${prefix}%`);
    else query = query.not("mime_type", "in", '("application/pdf")');
  }
  if (filters.q) {
    const term = filters.q.replace(/[%,()]/g, " ").trim();
    if (term) {
      query = query.or(
        [
          `name.ilike.%${term}%`,
          `description.ilike.%${term}%`,
          `author_name.ilike.%${term}%`,
          `subject.ilike.%${term}%`,
          `category.ilike.%${term}%`,
          `tags.cs.{${term}}`,
        ].join(","),
      );
    }
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return { rows: (data ?? []) as DocumentRow[], count: count ?? 0 };
}

export async function getDocument(id: string) {
  const { data, error } = await supabase.from("documents").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as DocumentRow) ?? null;
}

export async function signedUrl(path: string, expiresIn = 3600, download = false) {
  const { data, error } = await supabase.storage
    .from("documents")
    .createSignedUrl(path, expiresIn, download ? { download: true } : undefined);
  if (error) throw error;
  return data.signedUrl;
}

export async function registerView(documentId: string, position?: number) {
  await supabase.rpc("register_view", {
    _doc_id: documentId,
    ...(position === undefined ? {} : { _position: position }),
  });
}

export async function logAccess(documentId: string, action: string, userId: string) {
  await supabase.from("access_logs").insert({ document_id: documentId, action, user_id: userId });
}

export async function listFavorites(userId: string) {
  const { data, error } = await supabase
    .from("favorites")
    .select("document_id, documents(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? [])
    .map((row) => row.documents as unknown as DocumentRow)
    .filter(Boolean) as DocumentRow[];
}

export async function isFavorite(documentId: string, userId: string) {
  const { data } = await supabase
    .from("favorites")
    .select("id")
    .eq("document_id", documentId)
    .eq("user_id", userId)
    .maybeSingle();
  return Boolean(data);
}

export async function toggleFavorite(documentId: string, userId: string, current: boolean) {
  if (current) {
    await supabase.from("favorites").delete().eq("document_id", documentId).eq("user_id", userId);
    return false;
  }
  await supabase.from("favorites").insert({ document_id: documentId, user_id: userId });
  return true;
}

export async function recentlyViewed(userId: string, limit = 6) {
  const { data, error } = await supabase
    .from("view_history")
    .select("position, viewed_at, documents(*)")
    .eq("user_id", userId)
    .order("viewed_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? [])
    .map((row) => ({
      position: row.position as number | null,
      viewedAt: row.viewed_at as string,
      doc: row.documents as unknown as DocumentRow,
    }))
    .filter((row) => row.doc);
}

export async function similarDocuments(doc: DocumentRow, limit = 6) {
  const { data } = await supabase
    .from("documents")
    .select("*")
    .is("deleted_at", null)
    .eq("subject", doc.subject)
    .eq("level", doc.level as "college")
    .neq("id", doc.id)
    .limit(limit);
  return (data ?? []) as DocumentRow[];
}

export async function canDownload(documentId: string) {
  const { data } = await supabase.rpc("can_download_document", {
    _doc_id: documentId,
    _user_id: (await supabase.auth.getUser()).data.user?.id ?? "",
  });
  return Boolean(data);
}
