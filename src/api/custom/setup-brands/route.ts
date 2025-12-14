import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"
import BrandModuleService from "../../../modules/brand/service"
import { BRAND_MODULE } from "../../../modules/brand"

export const POST = async (
  req: MedusaRequest,
  res: MedusaResponse
) => {
  const brandModuleService: BrandModuleService = req.scope.resolve(BRAND_MODULE)
  const productModuleService = req.scope.resolve(Modules.PRODUCT)
  const remoteLink = req.scope.resolve(ContainerRegistrationKeys.REMOTE_LINK)

  try {
    // 1. Create or get "Solidon" brand
    const existingBrands = await brandModuleService.listBrands({
      name: "Solidon"
    })

    let brand
    if (existingBrands.length > 0) {
      brand = existingBrands[0]
      console.log("Brand Solidon already exists:", brand.id)
    } else {
      brand = await brandModuleService.createBrands({
        name: "Solidon",
      })
      console.log("Created brand Solidon:", brand.id)
    }

    // 2. Get all products
    const products = await productModuleService.listProducts({}, {
      select: ["id", "title"],
    })

    console.log(`Found ${products.length} products`)

    if (products.length === 0) {
      return res.json({
        message: "No products found in the database.",
        brand,
      })
    }

    // 3. Link all products to the Solidon brand
    for (const product of products) {
      await remoteLink.create({
        [Modules.PRODUCT]: {
          product_id: product.id,
        },
        [BRAND_MODULE]: {
          brand_id: brand.id,
        },
      })
      console.log(`Linked product ${product.title} to brand Solidon`)
    }

    return res.json({
      message: `Successfully created brand "Solidon" and linked ${products.length} products`,
      brand,
      productsLinked: products.length,
    })
  } catch (error) {
    console.error("Error setting up brands:", error)
    return res.status(500).json({
      error: error.message,
    })
  }
}

