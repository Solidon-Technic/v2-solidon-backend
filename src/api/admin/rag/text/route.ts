import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { getSupabaseClient, getStorageBucket } from "../../../../lib/supabase";
import { ingestDocument } from "../../../../lib/rag";
import { v4 as uuidv4 } from "uuid";

type TextUploadBody = {
    title: string;
    content: string;
};

export async function POST(req: MedusaRequest, res: MedusaResponse) {
    try {
        const { title, content } = req.body as TextUploadBody;

        if (!title || !content) {
            return res.status(400).json({
                error: "title and content are required",
            });
        }

        if (content.trim().length === 0) {
            return res.status(400).json({
                error: "content cannot be empty",
            });
        }

        const supabase = getSupabaseClient();
        const bucket = getStorageBucket();
        const adminId = (req as any).auth_context?.actor_id || null;

        // Generate storage key and filename
        const sanitizedTitle = title.replace(/[^a-zA-Z0-9-_]/g, "_").slice(0, 50);
        const storageKey = `${uuidv4()}-${sanitizedTitle}.txt`;
        const filename = `${title}.txt`;

        // Upload text content to Supabase Storage
        const { error: uploadError } = await supabase.storage
            .from(bucket)
            .upload(storageKey, content, {
                contentType: "text/plain",
                upsert: false,
            });

        if (uploadError) {
            return res.status(500).json({
                error: `Failed to upload text: ${uploadError.message}`,
            });
        }

        // Create document record
        const { data: document, error: insertError } = await supabase
            .from("rag_document")
            .insert({
                filename,
                storage_key: storageKey,
                mime_type: "text/plain",
                status: "processing",
                uploaded_by: adminId,
            })
            .select()
            .single();

        if (insertError || !document) {
            // Clean up uploaded file if DB insert fails
            await supabase.storage.from(bucket).remove([storageKey]);
            return res.status(500).json({
                error: `Failed to create document: ${insertError?.message}`,
            });
        }

        // Trigger ingestion
        const result = await ingestDocument(
            document.id,
            storageKey,
            "text/plain",
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
        console.error("Text upload error:", error);
        return res.status(500).json({ error: "Failed to upload text" });
    }
}
