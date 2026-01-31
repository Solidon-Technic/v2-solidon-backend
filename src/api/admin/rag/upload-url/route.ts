import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { getSupabaseClient, getStorageBucket } from "../../../../lib/supabase";
import { v4 as uuidv4 } from "uuid";

type UploadUrlRequestBody = {
    filename: string;
    mime_type: string;
};

export async function POST(req: MedusaRequest, res: MedusaResponse) {
    try {
        const { filename, mime_type } = req.body as UploadUrlRequestBody;

        if (!filename || !mime_type) {
            return res.status(400).json({
                error: "filename and mime_type are required",
            });
        }

        const allowedTypes = [
            "application/pdf",
            "text/plain",
            "text/markdown",
            "text/csv",
        ];

        if (!allowedTypes.includes(mime_type)) {
            return res.status(400).json({
                error: `Unsupported file type. Allowed: ${allowedTypes.join(", ")}`,
            });
        }

        const supabase = getSupabaseClient();
        const bucket = getStorageBucket();

        const fileExtension = filename.split(".").pop() || "";
        const storageKey = `${uuidv4()}.${fileExtension}`;

        const { data, error } = await supabase.storage
            .from(bucket)
            .createSignedUploadUrl(storageKey);

        if (error || !data) {
            return res.status(500).json({
                error: `Failed to create upload URL: ${error?.message}`,
            });
        }

        return res.json({
            signed_url: data.signedUrl,
            storage_key: storageKey,
            token: data.token,
        });
    } catch (error) {
        console.error("Upload URL error:", error);
        return res.status(500).json({
            error: "Failed to generate upload URL",
        });
    }
}
