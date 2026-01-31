export type RagDocumentStatus = "pending" | "processing" | "completed" | "failed";

export type CreateRagDocumentInput = {
    filename: string;
    storage_key: string;
    mime_type: string;
    status?: RagDocumentStatus;
    uploaded_by?: string;
    metadata?: Record<string, unknown>;
};

export type CreateRagChunkInput = {
    document_id: string;
    content: string;
    scope?: string;
    chunk_index: number;
    embedding?: number[];
    metadata?: Record<string, unknown>;
};

export type RagSearchResult = {
    id: string;
    content: string;
    document_id: string;
    similarity: number;
    metadata?: Record<string, unknown>;
};
