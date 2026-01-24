import { model } from "@medusajs/framework/utils";

const RagChunk = model.define("rag_chunk", {
    id: model.id().primaryKey(),
    document_id: model.text(),
    content: model.text(),
    scope: model.text().default("org"),
    chunk_index: model.number(),
    metadata: model.json().nullable(),
});

export default RagChunk;
