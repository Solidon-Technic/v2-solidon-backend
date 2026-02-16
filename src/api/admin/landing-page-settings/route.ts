import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";
import { updateStoresWorkflow } from "@medusajs/medusa/core-flows";

const METADATA_KEY_PRODUCTS = "landing_page_featured_product_ids";
const METADATA_KEY_CATEGORIES = "landing_page_featured_category_ids";

export async function GET(req: MedusaRequest, res: MedusaResponse) {
    try {
        const storeModuleService = req.scope.resolve(Modules.STORE);
        const [store] = await storeModuleService.listStores();

        if (!store) {
            return res.status(404).json({ error: "Store not found" });
        }

        const metadata = store.metadata || {};
        const featuredProductIds = (metadata[METADATA_KEY_PRODUCTS] as string[]) || [];
        const featuredCategoryIds = (metadata[METADATA_KEY_CATEGORIES] as string[]) || [];

        return res.json({
            featured_product_ids: featuredProductIds,
            featured_category_ids: featuredCategoryIds,
        });
    } catch (error) {
        console.error("Get landing page settings error:", error);
        return res.status(500).json({ error: "Failed to get landing page settings" });
    }
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
    try {
        const { featured_product_ids, featured_category_ids } = req.body as {
            featured_product_ids?: string[];
            featured_category_ids?: string[];
        };

        const storeModuleService = req.scope.resolve(Modules.STORE);
        const [store] = await storeModuleService.listStores();

        if (!store) {
            return res.status(404).json({ error: "Store not found" });
        }

        const metadata = { ...(store.metadata || {}) };
        metadata[METADATA_KEY_PRODUCTS] = Array.isArray(featured_product_ids) ? featured_product_ids : [];
        metadata[METADATA_KEY_CATEGORIES] = Array.isArray(featured_category_ids) ? featured_category_ids : [];

        await updateStoresWorkflow(req.scope).run({
            input: {
                selector: { id: store.id },
                update: { metadata },
            },
        });

        return res.json({
            featured_product_ids: metadata[METADATA_KEY_PRODUCTS],
            featured_category_ids: metadata[METADATA_KEY_CATEGORIES],
        });
    } catch (error) {
        console.error("Update landing page settings error:", error);
        return res.status(500).json({ error: "Failed to update landing page settings" });
    }
}
