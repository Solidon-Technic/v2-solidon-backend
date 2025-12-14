import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import BrandModuleService from "../../../modules/brand/service"
import { BRAND_MODULE } from "../../../modules/brand"

export const GET = async (
  req: MedusaRequest,
  res: MedusaResponse
) => {
  const brandModuleService: BrandModuleService = req.scope.resolve(BRAND_MODULE)

  try {
    const brands = await brandModuleService.listBrands({}, {
      select: ["id", "name"],
    })

    return res.json({ brands })
  } catch (error) {
    console.error("Error fetching brands:", error)
    return res.status(500).json({
      error: error.message,
    })
  }
}


