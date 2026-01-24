import { model } from "@medusajs/framework/utils";

const RagDocument = model.define("rag_document", {
    id: model.id().primaryKey(),
    filename: model.text(),
    storage_key: model.text(),
    mime_type: model.text(),
    status: model.enum(["pending", "processing", "completed", "failed"]),
    error_message: model.text().nullable(),
    uploaded_by: model.text().nullable(),
    metadata: model.json().nullable(),
});

export default RagDocument;
