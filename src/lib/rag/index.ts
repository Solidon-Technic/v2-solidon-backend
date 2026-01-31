export { extractTextFromBuffer } from "./text-extractor";
export { chunkText, type TextChunk } from "./chunker";
export { createEmbedding, createEmbeddings } from "./embeddings";
export {
    searchVectors,
    insertChunkWithEmbedding,
    deleteChunksByDocumentId,
    type VectorSearchResult,
} from "./vector-store";
export { ingestDocument, type IngestionResult } from "./ingestion";
export {
    fetchUserFacts,
    needsUserFacts,
    formatUserFactsForPrompt,
    type UserFacts,
} from "./user-facts";
