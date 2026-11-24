import type { Request, RequestHandler } from "express";
import type { ParamsDictionary } from "express-serve-static-core";
import type { AuthService } from "./auth.service";
import type { IJwtPayload } from "./auth.types";

export type AuthLocals = {
  auth?: IJwtPayload;
};

export type AuthRequestHandler = RequestHandler<
  ParamsDictionary,
  unknown,
  unknown,
  Request["query"],
  AuthLocals
>;

export class AuthMiddleware {
  constructor(private readonly authService: AuthService) {}

  public authenticate: AuthRequestHandler = async (req, res, next) => {
    const token = req.get("Authorization")?.match(/^Bearer (\S+)$/i)?.[1];
    const payload = token ? await this.authService.authenticate(token) : null;

    if (!payload) {
      res.set("WWW-Authenticate", "Bearer");
      res.status(401).json({ error: "UNAUTHENTICATED" });
      return;
    }

    res.locals.auth = payload;
    next();
  };
}