import { MedusaService } from "@medusajs/framework/utils";
import { RagDocument, RagChunk } from "./models";

class RagModuleService extends MedusaService({
    RagDocument,
    RagChunk,
}) {}

export default RagModuleService;
