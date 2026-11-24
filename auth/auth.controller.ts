import type { RequestHandler } from "express";
import { asyncHandler } from "../shared/async-handler";
import type { AuthService } from "./auth.service";
import type { AuthRequestHandler } from "./auth.middleware";
import { loginSchema, signupSchema } from "./auth.types";

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  public signUp: RequestHandler = asyncHandler(async (req, res) => {
    res.set("Cache-Control", "no-store");
    const input = signupSchema.safeParse(req.body);

    if (!input.success) {
      res.status(400).json({ error: "INVALID_SIGNUP_INPUT" });
      return;
    }

    const result = await this.authService.signUp(input.data);
    if (!result) {
      res.status(409).json({ error: "EMAIL_ALREADY_IN_USE" });
      return;
    }

    res.status(201).json(result);
  });

  public login: RequestHandler = asyncHandler(async (req, res) => {
    res.set("Cache-Control", "no-store");
    const input = loginSchema.safeParse(req.body);

    if (!input.success) {
      res.status(400).json({ error: "INVALID_LOGIN_INPUT" });
      return;
    }

    const result = await this.authService.login(input.data);
    if (!result) {
      res.status(401).json({ error: "INVALID_CREDENTIALS" });
      return;
    }

    res.status(200).json(result);
  });

  public getMe: AuthRequestHandler = asyncHandler(async (_req, res) => {
    res.set("Cache-Control", "no-store");
    const auth = res.locals.auth;

    if (!auth) {
      res.status(401).json({ error: "UNAUTHENTICATED" });
      return;
    }

    const user = await this.authService.getMe(auth.sub);
    if (!user) {
      res.status(404).json({ error: "USER_NOT_FOUND" });
      return;
    }

    res.status(200).json(user);
  });

  public logout: AuthRequestHandler = asyncHandler(async (_req, res) => {
    const auth = res.locals.auth;

    if (!auth) {
      res.status(401).json({ error: "UNAUTHENTICATED" });
      return;
    }

    await this.authService.logout(auth);
    res.status(204).end();
  });
}
