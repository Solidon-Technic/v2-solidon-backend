import pdf from "pdf-parse";

export async function extractTextFromBuffer(
    buffer: Buffer,
    mimeType: string
): Promise<string> {
    if (mimeType === "application/pdf") {
        return extractFromPdf(buffer);
    }

    if (mimeType === "text/plain" || mimeType.startsWith("text/")) {
        return buffer.toString("utf-8");
    }

    throw new Error(`Unsupported MIME type: ${mimeType}`);
}

async function extractFromPdf(buffer: Buffer): Promise<string> {
    const data = await pdf(buffer);
    return data.text;
}
