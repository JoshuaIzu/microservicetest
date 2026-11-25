import { json, Router } from "express";
import type { SettlementRequestHandler } from "./settlement.auth";
import type { SettlementController } from "./settlement.controller";

export function createSettlementRoutes(
  controller: SettlementController,
  authenticate: SettlementRequestHandler,
): Router {
  const router = Router();

  router.post(
    "/",
    authenticate,
    json({ limit: "8kb" }),
    controller.reconcile,
  );

  return router;
}