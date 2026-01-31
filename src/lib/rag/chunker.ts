export type TextChunk = {
    content: string;
    index: number;
    metadata?: Record<string, unknown>;
};

const DEFAULT_CHUNK_SIZE = 1000;
const DEFAULT_CHUNK_OVERLAP = 200;

export function chunkText(
    text: string,
    chunkSize: number = DEFAULT_CHUNK_SIZE,
    overlap: number = DEFAULT_CHUNK_OVERLAP
): TextChunk[] {
    const chunks: TextChunk[] = [];
    const cleanedText = text.replace(/\s+/g, " ").trim();

    if (cleanedText.length <= chunkSize) {
        return [{ content: cleanedText, index: 0 }];
    }

    let start = 0;
    let index = 0;

    while (start < cleanedText.length) {
        let end = start + chunkSize;

        if (end < cleanedText.length) {
            const lastPeriod = cleanedText.lastIndexOf(".", end);
            const lastNewline = cleanedText.lastIndexOf("\n", end);
            const lastSpace = cleanedText.lastIndexOf(" ", end);

            const breakPoint = Math.max(lastPeriod, lastNewline, lastSpace);
            if (breakPoint > start + chunkSize / 2) {
                end = breakPoint + 1;
            }
        } else {
            end = cleanedText.length;
        }

        const content = cleanedText.slice(start, end).trim();
        if (content.length > 0) {
            chunks.push({ content, index });
            index++;
        }

        start = end - overlap;
        if (start >= cleanedText.length) break;
    }

    return chunks;
}
