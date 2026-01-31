import { createClient, SupabaseClient } from "@supabase/supabase-js";

let supabaseClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
    if (supabaseClient) {
        return supabaseClient;
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        throw new Error(
            "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables"
        );
    }

    supabaseClient = createClient(supabaseUrl, supabaseKey);
    return supabaseClient;
}

export function getStorageBucket(): string {
    const bucket = process.env.SUPABASE_STORAGE_BUCKET_RAG;
    if (!bucket) {
        throw new Error("Missing SUPABASE_STORAGE_BUCKET_RAG environment variable");
    }
    return bucket;
}

export async function getSignedDownloadUrl(
    storageKey: string,
    expiresIn: number = 3600
): Promise<string | null> {
    const supabase = getSupabaseClient();
    const bucket = getStorageBucket();

    const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(storageKey, expiresIn);

    if (error || !data?.signedUrl) {
        console.error("Failed to create signed download URL:", error);
        return null;
    }

    return data.signedUrl;
}
