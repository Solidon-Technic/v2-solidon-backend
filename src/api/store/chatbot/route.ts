import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import OpenAI from "openai";
import { CHATBOT_SYSTEM_PROMPT } from "../../../constants";

type ChatMessage = {
    role: "user" | "assistant";
    content: string;
};

type ChatRequestBody = {
    messages: ChatMessage[];
};

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// GET: Returns initial greeting based on auth status
export async function GET(req: MedusaRequest, res: MedusaResponse) {
    const isLoggedIn = Boolean((req as any).auth_context?.actor_id);
    const greeting = isLoggedIn
        ? "You are logged in."
        : "You are an anonymous user.";

    return res.json({
        message: {
            role: "assistant",
            content: greeting,
        },
        isLoggedIn,
    });
}

// POST: Handles chat messages
export async function POST(req: MedusaRequest, res: MedusaResponse) {
    try {
        const { messages } = req.body as ChatRequestBody;

        if (!process.env.OPENAI_API_KEY) {
            return res
                .status(500)
                .json({ error: "OpenAI API key not configured" });
        }

        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return res
                .status(400)
                .json({ error: "Messages array is required" });
        }

        const openaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
            { role: "system", content: CHATBOT_SYSTEM_PROMPT },
            ...messages.map((msg) => ({
                role: msg.role as "user" | "assistant",
                content: msg.content,
            })),
        ];

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: openaiMessages,
            max_tokens: 500,
        });

        const assistantMessage = completion.choices[0]?.message?.content || "";

        return res.json({
            message: {
                role: "assistant",
                content: assistantMessage,
            },
        });
    } catch (error) {
        console.error("Chatbot error:", error);
        return res
            .status(500)
            .json({ error: "Failed to process chat message" });
    }
}
