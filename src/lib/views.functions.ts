import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const schema = z.object({
  documentId: z.string().uuid(),
  position: z.number().finite().nonnegative().optional(),
});

/**
 * Registers a document view server-side. The internal `register_view` SQL
 * function is no longer executable by signed-in users, so the permission check
 * and the write happen here with verified identity.
 */
export const registerViewFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data, context }) => {
    const userId = context.userId;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: canRead, error: permError } = await supabaseAdmin.rpc("can_read_document", {
      _doc_id: data.documentId,
      _user_id: userId,
    });
    if (permError || !canRead) return { ok: false };

    const { data: doc } = await supabaseAdmin
      .from("documents")
      .select("view_count")
      .eq("id", data.documentId)
      .maybeSingle();

    await supabaseAdmin
      .from("documents")
      .update({ view_count: (doc?.view_count ?? 0) + 1 })
      .eq("id", data.documentId);

    await supabaseAdmin.from("view_history").upsert(
      {
        user_id: userId,
        document_id: data.documentId,
        viewed_at: new Date().toISOString(),
        ...(data.position === undefined ? {} : { position: data.position }),
      },
      { onConflict: "user_id,document_id" },
    );

    await supabaseAdmin.from("access_logs").insert({
      user_id: userId,
      document_id: data.documentId,
      action: "view",
    });

    return { ok: true };
  });
