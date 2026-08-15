import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const BUCKET = "documents";

/**
 * Emits a short-lived signed URL for a document, but only after the caller's
 * read (and, for downloads, download) permission has been checked server-side.
 * Works for anonymous callers on public documents.
 */
export const getFileUrl = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({ documentId: z.string().uuid(), download: z.boolean().optional() })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { callerClient, callerUserId } = await import("@/lib/supabase.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { client } = callerClient();
    // RLS decides whether the caller may read this document at all.
    const { data: doc } = await client
      .from("documents")
      .select("id, storage_path, filename, mime_type, allow_download")
      .eq("id", data.documentId)
      .is("deleted_at", null)
      .maybeSingle();

    if (!doc) throw new Error("FORBIDDEN");

    const userId = await callerUserId();

    if (data.download) {
      const { data: allowed } = await supabaseAdmin.rpc("can_download_document", {
        _doc_id: data.documentId,
        _user_id: userId ?? "00000000-0000-0000-0000-000000000000",
      });
      if (!allowed) throw new Error("FORBIDDEN");
    }

    const { data: signed, error } = await supabaseAdmin.storage
      .from(BUCKET)
      .createSignedUrl(
        doc.storage_path,
        data.download ? 120 : 900,
        data.download ? { download: doc.filename } : undefined,
      );
    if (error || !signed) throw new Error("SIGNING_FAILED");

    if (userId) {
      await supabaseAdmin
        .from("access_logs")
        .insert({ user_id: userId, document_id: doc.id, action: data.download ? "download" : "view" });
    }

    return { url: signed.signedUrl, mime: doc.mime_type, filename: doc.filename };
  });

/** Deletes a document (row + stored file) after checking ownership/admin rights. */
export const deleteDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ documentId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // RLS: only author or admin may delete.
    const { data: removed, error } = await context.supabase
      .from("documents")
      .delete()
      .eq("id", data.documentId)
      .select("storage_path")
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!removed) throw new Error("FORBIDDEN");

    await supabaseAdmin.storage.from(BUCKET).remove([removed.storage_path]);
    return { ok: true };
  });

const metadataSchema = z.object({
  documentId: z.string().uuid(),
  name: z.string().min(2).max(200),
  description: z.string().max(2000).nullable(),
  level: z.enum(["college", "lycee", "universite"]),
  subject: z.string().min(1).max(60),
  category: z.string().min(1).max(60),
  tags: z.array(z.string().min(1).max(40)).max(20),
  school_year: z.string().max(20).nullable(),
  visibility: z.enum(["public", "private", "users", "group", "level", "subject"]),
  allow_download: z.boolean(),
});

/** Updates document metadata; RLS restricts this to the author or an admin. */
export const updateDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => metadataSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { documentId, ...fields } = data;
    const { data: row, error } = await context.supabase
      .from("documents")
      .update(fields)
      .eq("id", documentId)
      .select("id")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("FORBIDDEN");
    return { ok: true };
  });

/** Replaces the classes a document is shared with. */
export const shareWithGroups = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        documentId: z.string().uuid(),
        groupIds: z.array(z.string().uuid()).max(50),
        canDownload: z.boolean().default(true),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { error: delError } = await context.supabase
      .from("document_groups")
      .delete()
      .eq("document_id", data.documentId);
    if (delError) throw new Error(delError.message);

    if (data.groupIds.length) {
      const { error } = await context.supabase.from("document_groups").insert(
        data.groupIds.map((groupId) => ({
          document_id: data.documentId,
          group_id: groupId,
          can_download: data.canDownload,
        })),
      );
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

/** Grants or revokes fine-grained rights for one user on one document. */
export const setUserPermission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        documentId: z.string().uuid(),
        userId: z.string().uuid(),
        can_read: z.boolean(),
        can_download: z.boolean(),
        can_edit: z.boolean(),
        can_delete: z.boolean(),
        can_share: z.boolean(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { documentId, userId, ...rights } = data;
    const none = !Object.values(rights).some(Boolean);

    if (none) {
      const { error } = await context.supabase
        .from("document_permissions")
        .delete()
        .eq("document_id", documentId)
        .eq("user_id", userId);
      if (error) throw new Error(error.message);
      return { ok: true };
    }

    const { error } = await context.supabase
      .from("document_permissions")
      .upsert({ document_id: documentId, user_id: userId, ...rights }, { onConflict: "id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Aggregated statistics for the admin dashboard (admin only). */
export const adminStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: roles } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (!(roles ?? []).some((r) => r.role === "admin")) throw new Error("FORBIDDEN");


    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [users, docs, logs, storage] = await Promise.all([
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("documents").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("access_logs").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("documents").select("size"),
    ]);

    const totalSize = (storage.data ?? []).reduce((sum, row) => sum + (row.size ?? 0), 0);
    return {
      users: users.count ?? 0,
      documents: docs.count ?? 0,
      accesses: logs.count ?? 0,
      totalSize,
    };
  });
