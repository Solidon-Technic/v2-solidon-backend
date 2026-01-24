import { getSupabaseClient, getStorageBucket } from "../supabase";
import { extractTextFromBuffer } from "./text-extractor";
import { chunkText } from "./chunker";
import { createEmbeddings } from "./embeddings";
import {
    insertChunkWithEmbedding,
    deleteChunksByDocumentId,
} from "./vector-store";

export type IngestionResult = {
    success: boolean;
    chunksCreated: number;
    error?: string;
};

export async function ingestDocument(
    documentId: string,
    storageKey: string,
    mimeType: string,
    filename: string,
): Promise<IngestionResult> {
    const supabase = getSupabaseClient();
    const bucket = getStorageBucket();

    try {
        // Download file from Supabase Storage
        const { data: fileData, error: downloadError } = await supabase.storage
            .from(bucket)
            .download(storageKey);

        if (downloadError || !fileData) {
            throw new Error(
                `Failed to download file: ${downloadError?.message}`,
            );
        }

        // Convert to buffer
        const buffer = Buffer.from(await fileData.arrayBuffer());

        // Extract text
        const text = await extractTextFromBuffer(buffer, mimeType);

        if (!text || text.trim().length === 0) {
            throw new Error("No text content extracted from document");
        }

        // Chunk the text
        const chunks = chunkText(text);

        // Delete existing chunks for this document (for re-ingestion)
        await deleteChunksByDocumentId(documentId);

        // Create embeddings in batches
        const batchSize = 20;
        let chunksCreated = 0;

        for (let i = 0; i < chunks.length; i += batchSize) {
            const batch = chunks.slice(i, i + batchSize);
            const texts = batch.map((c) => c.content);
            const embeddings = await createEmbeddings(texts);

            for (let j = 0; j < batch.length; j++) {
                await insertChunkWithEmbedding(
                    documentId,
                    batch[j].content,
                    embeddings[j],
                    batch[j].index,
                    "org",
                    { filename, source_document: documentId },
                );
                chunksCreated++;
            }
        }

        return { success: true, chunksCreated };
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Unknown error";
        return { success: false, chunksCreated: 0, error: message };
    }
}
