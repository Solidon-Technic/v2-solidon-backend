import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import OpenAI from "openai";
import { CHATBOT_SYSTEM_PROMPT } from "../../../constants";
import {
    createEmbedding,
    searchVectors,
    needsUserFacts,
    fetchUserFacts,
    formatUserFactsForPrompt,
} from "../../../lib/rag";

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
        ? "Bună! Sunt asistentul tău Solidon. Te pot ajuta cu comenzile tale, informații despre livrare și orice întrebări despre produsele noastre. Cu ce te pot ajuta astăzi?"
        : "Bună! Sunt asistentul Solidon. Te pot ajuta să găsești produse și să răspund la întrebări. Cu ce te pot ajuta astăzi?";

    return res.json({
        message: {
            role: "assistant",
            content: greeting,
        },
        isLoggedIn,
    });
}

// POST: Handles chat messages with RAG
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

        const customerId = (req as any).auth_context?.actor_id;
        const isLoggedIn = Boolean(customerId);
        const lastUserMessage = messages.filter((m) => m.role === "user").pop();
        const userQuery = lastUserMessage?.content || "";

        // Build context from RAG
        let orgContext = "";
        let userContext = "";

        // Always retrieve org knowledge
        try {
            const queryEmbedding = await createEmbedding(userQuery);
            const results = await searchVectors(queryEmbedding, "org", 3, 0.65);

            if (results.length > 0) {
                const chunks = results.map((r) => r.content).join("\n\n---\n\n");
                orgContext = `Relevant information from our knowledge base:\n${chunks}`;
            }
        } catch (ragError) {
            console.warn("RAG retrieval failed, continuing without:", ragError);
        }

        // Fetch user facts if logged in and query indicates need to use RAG for personal 
        if (isLoggedIn && needsUserFacts(userQuery)) {
            try {
                const facts = await fetchUserFacts(req.scope, customerId);
                const formatted = formatUserFactsForPrompt(facts);
                if (formatted) {
                    userContext = `Customer information:\n${formatted}`;
                }
            } catch (userError) {
                console.warn("User facts retrieval failed:", userError);
            }
        }

        // Build the enhanced system prompt
        const contextParts = [CHATBOT_SYSTEM_PROMPT];

        if (orgContext) {
            contextParts.push(
                "\n\n## Knowledge Base Context\nUse the following information to help answer the user's question. If the information doesn't help, rely on your general knowledge.\n\n" +
                    orgContext
            );
        }

        if (userContext) {
            contextParts.push(
                "\n\n## Customer Context\nThe user is logged in. Here is their account information:\n\n" +
                    userContext
            );
        }

        const enhancedSystemPrompt = contextParts.join("");

        const openaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
            { role: "system", content: enhancedSystemPrompt },
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
