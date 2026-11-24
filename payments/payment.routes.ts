import { json, raw, Router } from "express";
import type { AuthRequestHandler } from "../auth/auth.middleware";
import type { PaymentController } from "./payment.controller";

export function createPaymentRoutes(
  controller: PaymentController,
  authenticate: AuthRequestHandler,
): Router {
  const router = Router();

  router.post(
    "/webhooks/:provider",
    raw({ type: "application/json", limit: "8kb", inflate: false }),
    controller.handleWebhook,
  );

  router.post(
    "/",
    authenticate,
    json({ limit: "8kb" }),
    controller.createPayment,
  );

  router.get("/", authenticate, controller.listPayments);

  router.get("/:id", authenticate, controller.getPaymentById);

  return router;
}