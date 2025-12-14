import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export const GET = async (
  req: MedusaRequest,
  res: MedusaResponse
) => {
  const query = req.scope.resolve("query")
  
  const { brand_ids, limit = 100, offset = 0, region_id, order, ...rest } = req.query

  try {
    let filters: any = {}

    // Filter by brand if brand_ids is provided
    if (brand_ids) {
      const brandIdsArray = typeof brand_ids === 'string' ? brand_ids.split(',') : brand_ids
      filters.brand = {
        id: brandIdsArray.length > 1 ? { $in: brandIdsArray } : brandIdsArray[0]
      }
    }

    const { data: products } = await query.index({
      entity: "product",
      fields: [
        "*",
        "variants.id",
        "variants.title",
        "variants.sku",
        "brand.*"
      ],
      filters,
      pagination: {
        skip: Number(offset),
        take: Number(limit),
      },
    })

    return res.json({ 
      products,
      count: products.length 
    })
  } catch (error) {
    console.error("Error fetching products with brands:", error)
    return res.status(500).json({
      error: error.message,
    })
  }
}

