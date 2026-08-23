import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Records a document view (counter, history, audit log) after an RLS read check. */
export const registerViewFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ documentId: z.string().uuid(), position: z.number().optional() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    // RLS decides whether this user may read the document at all.
    const { data: doc } = await context.supabase
      .from("documents")
      .select("id, view_count")
      .eq("id", data.documentId)
      .is("deleted_at", null)
      .maybeSingle();
    if (!doc) return { ok: false };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("documents")
      .update({ view_count: (doc.view_count ?? 0) + 1 })
      .eq("id", doc.id);

    await supabaseAdmin.from("view_history").upsert(
      {
        user_id: context.userId,
        document_id: doc.id,
        viewed_at: new Date().toISOString(),
        ...(data.position === undefined ? {} : { position: data.position }),
      },
      { onConflict: "user_id,document_id" },
    );

    await supabaseAdmin
      .from("access_logs")
      .insert({ user_id: context.userId, document_id: doc.id, action: "view" });

    return { ok: true };
  });

/** Tells the client whether the signed-in user may download a document. */
export const canDownloadFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ documentId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: allowed } = await supabaseAdmin.rpc("can_download_document", {
      _doc_id: data.documentId,
      _user_id: context.userId,
    });
    return { allowed: Boolean(allowed) };
  });
