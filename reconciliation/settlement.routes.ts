import { json, Router } from "express";
import type { AuthRequestHandler } from "../auth/auth.middleware";
import type { SettlementController } from "./settlement.controller";

export function createSettlementRoutes(
  controller: SettlementController,
  authenticate: AuthRequestHandler,
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