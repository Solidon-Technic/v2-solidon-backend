import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { getSupabaseClient, getStorageBucket } from "../../../../../lib/supabase";
import archiver from "archiver";

export async function GET(req: MedusaRequest, res: MedusaResponse) {
    try {
        const supabase = getSupabaseClient();
        const bucket = getStorageBucket();

        // Get all documents
        const { data: documents, error } = await supabase
            .from("rag_document")
            .select("id, filename, storage_key")
            .order("created_at", { ascending: false });

        if (error) {
            return res.status(500).json({
                error: `Failed to fetch documents: ${error.message}`,
            });
        }

        if (!documents || documents.length === 0) {
            return res.status(404).json({ error: "No documents to download" });
        }

        // Set response headers for ZIP download
        res.setHeader("Content-Type", "application/zip");
        res.setHeader(
            "Content-Disposition",
            `attachment; filename="knowledge-base-${new Date().toISOString().split("T")[0]}.zip"`
        );

        // Create ZIP archive
        const archive = archiver("zip", {
            zlib: { level: 6 },
        });

        // Handle archive errors
        archive.on("error", (err) => {
            console.error("Archive error:", err);
            if (!res.headersSent) {
                res.status(500).json({ error: "Failed to create archive" });
            }
        });

        // Pipe archive to response
        archive.pipe(res);

        // Add each document to the archive
        for (const doc of documents) {
            try {
                const { data: fileData, error: downloadError } = await supabase.storage
                    .from(bucket)
                    .download(doc.storage_key);

                if (downloadError || !fileData) {
                    console.warn(`Failed to download ${doc.filename}:`, downloadError);
                    continue;
                }

                const buffer = Buffer.from(await fileData.arrayBuffer());
                archive.append(buffer, { name: doc.filename });
            } catch (downloadError) {
                console.warn(`Error processing ${doc.filename}:`, downloadError);
            }
        }

        // Finalize the archive
        await archive.finalize();
    } catch (error) {
        console.error("Download all error:", error);
        if (!res.headersSent) {
            return res.status(500).json({ error: "Failed to create ZIP archive" });
        }
    }
}
