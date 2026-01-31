import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { getSupabaseClient } from "../../../../lib/supabase";
import { ingestDocument } from "../../../../lib/rag";

type CreateDocumentBody = {
    filename: string;
    storage_key: string;
    mime_type: string;
};

export async function GET(req: MedusaRequest, res: MedusaResponse) {
    try {
        const supabase = getSupabaseClient();

        const { data, error } = await supabase
            .from("rag_document")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) {
            return res.status(500).json({
                error: `Failed to fetch documents: ${error.message}`,
            });
        }

        return res.json({ documents: data || [] });
    } catch (error) {
        console.error("List documents error:", error);
        return res.status(500).json({ error: "Failed to list documents" });
    }
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
    try {
        const { filename, storage_key, mime_type } =
            req.body as CreateDocumentBody;

        if (!filename || !storage_key || !mime_type) {
            return res.status(400).json({
                error: "filename, storage_key, and mime_type are required",
            });
        }

        const supabase = getSupabaseClient();
        const adminId = (req as any).auth_context?.actor_id || null;

        // Create document record
        const { data: document, error: insertError } = await supabase
            .from("rag_document")
            .insert({
                filename,
                storage_key,
                mime_type,
                status: "processing",
                uploaded_by: adminId,
            })
            .select()
            .single();

        if (insertError || !document) {
            return res.status(500).json({
                error: `Failed to create document: ${insertError?.message}`,
            });
        }

        // Trigger ingestion (async, but we await for immediate feedback)
        const result = await ingestDocument(
            document.id,
            storage_key,
            mime_type,
            filename
        );

        // Update document status
        const newStatus = result.success ? "completed" : "failed";
        await supabase
            .from("rag_document")
            .update({
                status: newStatus,
                error_message: result.error || null,
                updated_at: new Date().toISOString(),
            })
            .eq("id", document.id);

        return res.json({
            document: {
                ...document,
                status: newStatus,
                error_message: result.error || null,
            },
            ingestion: result,
        });
    } catch (error) {
        console.error("Create document error:", error);
        return res.status(500).json({ error: "Failed to create document" });
    }
}
