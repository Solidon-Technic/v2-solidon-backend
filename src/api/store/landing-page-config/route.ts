import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";

const METADATA_KEY_PRODUCTS = "landing_page_featured_product_ids";
const METADATA_KEY_CATEGORIES = "landing_page_featured_category_ids";

export async function GET(req: MedusaRequest, res: MedusaResponse) {
    try {
        const storeModuleService = req.scope.resolve(Modules.STORE);
        const [store] = await storeModuleService.listStores();

        if (!store) {
            return res.json({
                featured_product_ids: [],
                featured_category_ids: [],
            });
        }

        const metadata = store.metadata || {};
        const featuredProductIds = (metadata[METADATA_KEY_PRODUCTS] as string[]) || [];
        const featuredCategoryIds = (metadata[METADATA_KEY_CATEGORIES] as string[]) || [];

        return res.json({
            featured_product_ids: featuredProductIds,
            featured_category_ids: featuredCategoryIds,
        });
    } catch (error) {
        console.error("Get landing page config error:", error);
        return res.status(500).json({
            featured_product_ids: [],
            featured_category_ids: [],
        });
    }
}
