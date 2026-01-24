import RagModuleService from "./service";
import { Module } from "@medusajs/framework/utils";

export const RAG_MODULE = "rag";

export default Module(RAG_MODULE, {
    service: RagModuleService,
});
