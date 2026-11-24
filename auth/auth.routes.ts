import { Router, type RequestHandler } from "express";
import type { AuthController } from "./auth.controller";
import type { AuthMiddleware } from "./auth.middleware";

export function createAuthRoutes(
  controller: AuthController,
  middleware: AuthMiddleware,
  signUpLimiter: RequestHandler,
  loginLimiter: RequestHandler,
): Router {
  const router = Router();

  router.post("/signup", signUpLimiter, controller.signUp);
  router.post("/login", loginLimiter, controller.login);
  router.get("/me", middleware.authenticate, controller.getMe);
  router.delete("/logout", middleware.authenticate, controller.logout);

  return router;
}