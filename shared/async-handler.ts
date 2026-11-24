import type {
  NextFunction,
  Request,
  RequestHandler,
  Response,
} from "express";

export function asyncHandler<H extends RequestHandler>(handler: H): H {
  const wrapped = (req: Request, res: Response, next: NextFunction): void => {
    void Promise.resolve(
      handler(req as never, res as never, next as never),
    ).catch(next);
  };

  return wrapped as H;
}
