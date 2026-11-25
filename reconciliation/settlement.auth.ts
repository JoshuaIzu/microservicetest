import type { Request, RequestHandler } from "express";
import type { ParamsDictionary } from "express-serve-static-core";
import { z } from "zod";
import { asyncHandler } from "../shared/async-handler";

export type SettlementRequestHandler = RequestHandler<
  ParamsDictionary,
  unknown,
  unknown,
  Request["query"],
  { userId?: string }
>;

const identitySchema = z.object({ id: z.string().uuid() });

export function createSettlementAuth(authBaseUrl: string): SettlementRequestHandler {
  const meUrl = new URL("/auth/me", authBaseUrl);

  return asyncHandler(async (req, res, next) => {
    const authorization = req.get("Authorization");

    if (!authorization?.match(/^Bearer \S+$/i)) {
      res.sendStatus(401);
      return;
    }

    try {
      const response = await fetch(meUrl, {
        headers: { Authorization: authorization },
        signal: AbortSignal.timeout(3000),
        redirect: "error",
      });

      if (response.status === 401 || response.status === 404) {
        res.sendStatus(401);
        return;
      }

      if (!response.ok) throw new Error("Identity check failed");

      const user = identitySchema.parse(await response.json());
      res.locals.userId = user.id;
      next();
    } catch {
      res.status(503).json({ error: "IDENTITY_UNAVAILABLE" });
    }
  });
}
