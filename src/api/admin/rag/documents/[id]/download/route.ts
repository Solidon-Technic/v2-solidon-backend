import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { getSupabaseClient, getSignedDownloadUrl } from "../../../../../../lib/supabase";

export async function GET(req: MedusaRequest, res: MedusaResponse) {
    try {
        const { id } = req.params;
        const supabase = getSupabaseClient();

        // Get document
        const { data: document, error } = await supabase
            .from("rag_document")
            .select("storage_key, filename")
            .eq("id", id)
            .single();

        if (error || !document) {
            return res.status(404).json({ error: "Document not found" });
        }

        // Generate signed download URL (valid for 1 hour)
        const signedUrl = await getSignedDownloadUrl(document.storage_key, 3600);

        if (!signedUrl) {
            return res.status(500).json({ error: "Failed to generate download URL" });
        }

        return res.json({
            download_url: signedUrl,
            filename: document.filename,
        });
    } catch (error) {
        console.error("Download URL error:", error);
        return res.status(500).json({ error: "Failed to generate download URL" });
    }
}
