import { getSupabaseClient } from "../supabase";

export type VectorSearchResult = {
    id: string;
    document_id: string;
    content: string;
    similarity: number;
    metadata: Record<string, unknown> | null;
};

export async function searchVectors(
    queryEmbedding: number[],
    scope: string = "org",
    topK: number = 5,
    similarityThreshold: number = 0.7
): Promise<VectorSearchResult[]> {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase.rpc("match_rag_chunks", {
        query_embedding: queryEmbedding,
        match_threshold: similarityThreshold,
        match_count: topK,
        filter_scope: scope,
    });

    if (error) {
        throw new Error(`Vector search failed: ${error.message}`);
    }

    return data || [];
}

export async function insertChunkWithEmbedding(
    documentId: string,
    content: string,
    embedding: number[],
    chunkIndex: number,
    scope: string = "org",
    metadata: Record<string, unknown> | null = null
): Promise<void> {
    const supabase = getSupabaseClient();

    const { error } = await supabase.from("rag_chunk").insert({
        document_id: documentId,
        content,
        embedding,
        chunk_index: chunkIndex,
        scope,
        metadata,
        created_at: new Date().toISOString(),
    });

    if (error) {
        throw new Error(`Failed to insert chunk: ${error.message}`);
    }
}

export async function deleteChunksByDocumentId(
    documentId: string
): Promise<void> {
    const supabase = getSupabaseClient();

    const { error } = await supabase
        .from("rag_chunk")
        .delete()
        .eq("document_id", documentId);

    if (error) {
        throw new Error(`Failed to delete chunks: ${error.message}`);
    }
}
