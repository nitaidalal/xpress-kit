import type { NextFunction, Request, Response } from 'express';
import type { ParamsDictionary, Query, RequestHandler } from 'express-serve-static-core';

type AsyncRouteHandler<
  Params extends ParamsDictionary,
  ResBody,
  ReqBody,
  ReqQuery extends Query,
  Locals extends Record<string, unknown>,
> = (
  req: Request<Params, ResBody, ReqBody, ReqQuery, Locals>,
  res: Response<ResBody, Locals>,
  next: NextFunction,
) => Promise<unknown>;

export function asyncHandler<
  Params extends ParamsDictionary = ParamsDictionary,
  ResBody = unknown,
  ReqBody = unknown,
  ReqQuery extends Query = Query,
  Locals extends Record<string, unknown> = Record<string, unknown>,
>(
  handler: AsyncRouteHandler<Params, ResBody, ReqBody, ReqQuery, Locals>,
): RequestHandler<Params, ResBody, ReqBody, ReqQuery, Locals> {
  return (req, res, next) => {
    void handler(req, res, next).catch(next);
  };
}
