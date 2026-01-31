import OpenAI from "openai";

let openaiClient: OpenAI | null = null;

function getOpenAI(): OpenAI {
    if (openaiClient) {
        return openaiClient;
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error("Missing OPENAI_API_KEY environment variable");
    }

    openaiClient = new OpenAI({ apiKey });
    return openaiClient;
}

export async function createEmbedding(text: string): Promise<number[]> {
    const openai = getOpenAI();
    const response = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: text,
    });
    return response.data[0].embedding;
}

export async function createEmbeddings(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];

    const openai = getOpenAI();
    const response = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: texts,
    });

    return response.data
        .sort((a, b) => a.index - b.index)
        .map((item) => item.embedding);
}
