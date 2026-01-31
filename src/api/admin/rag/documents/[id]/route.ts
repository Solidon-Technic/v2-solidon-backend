import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { getSupabaseClient, getStorageBucket } from "../../../../../lib/supabase";
import { deleteChunksByDocumentId, ingestDocument } from "../../../../../lib/rag";

export async function GET(req: MedusaRequest, res: MedusaResponse) {
    try {
        const { id } = req.params;
        const supabase = getSupabaseClient();

        const { data: document, error } = await supabase
            .from("rag_document")
            .select("*")
            .eq("id", id)
            .single();

        if (error || !document) {
            return res.status(404).json({ error: "Document not found" });
        }

        // Get chunk count
        const { count } = await supabase
            .from("rag_chunk")
            .select("*", { count: "exact", head: true })
            .eq("document_id", id);

        return res.json({
            document,
            chunk_count: count || 0,
        });
    } catch (error) {
        console.error("Get document error:", error);
        return res.status(500).json({ error: "Failed to get document" });
    }
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
    try {
        const { id } = req.params;
        const supabase = getSupabaseClient();
        const bucket = getStorageBucket();

        // Get document first
        const { data: document, error: fetchError } = await supabase
            .from("rag_document")
            .select("*")
            .eq("id", id)
            .single();

        if (fetchError || !document) {
            return res.status(404).json({ error: "Document not found" });
        }

        // Delete chunks from vector store
        await deleteChunksByDocumentId(id);

        // Delete file from storage
        await supabase.storage.from(bucket).remove([document.storage_key]);

        // Delete document record
        const { error: deleteError } = await supabase
            .from("rag_document")
            .delete()
            .eq("id", id);

        if (deleteError) {
            return res.status(500).json({
                error: `Failed to delete document: ${deleteError.message}`,
            });
        }

        return res.json({ success: true, deleted_id: id });
    } catch (error) {
        console.error("Delete document error:", error);
        return res.status(500).json({ error: "Failed to delete document" });
    }
}

// Re-ingest a document
export async function POST(req: MedusaRequest, res: MedusaResponse) {
    try {
        const { id } = req.params;
        const supabase = getSupabaseClient();

        // Get document
        const { data: document, error: fetchError } = await supabase
            .from("rag_document")
            .select("*")
            .eq("id", id)
            .single();

        if (fetchError || !document) {
            return res.status(404).json({ error: "Document not found" });
        }

        // Update status to processing
        await supabase
            .from("rag_document")
            .update({ status: "processing", updated_at: new Date().toISOString() })
            .eq("id", id);

        // Re-run ingestion
        const result = await ingestDocument(
            document.id,
            document.storage_key,
            document.mime_type,
            document.filename
        );

        // Update status
        const newStatus = result.success ? "completed" : "failed";
        await supabase
            .from("rag_document")
            .update({
                status: newStatus,
                error_message: result.error || null,
                updated_at: new Date().toISOString(),
            })
            .eq("id", id);

        return res.json({
            document: { ...document, status: newStatus },
            ingestion: result,
        });
    } catch (error) {
        console.error("Re-ingest error:", error);
        return res.status(500).json({ error: "Failed to re-ingest document" });
    }
}
