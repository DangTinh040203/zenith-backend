import Joi from 'joi';

export enum Env {
  NODE_ENV = 'NODE_ENV',

  PORT = 'PORT',
  FRONTEND_ORIGIN = 'FRONTEND_ORIGIN',

  API_PREFIX = 'API_PREFIX',
  API_VERSION = 'API_VERSION',
  CLERK_WEBHOOK_SECRET = 'CLERK_WEBHOOK_SECRET',

  /** Nest TCP host for `user-service` (not browser-facing). */
  USER_SERVICE_HOST = 'USER_SERVICE_HOST',
  USER_SERVICE_TCP_PORT = 'USER_SERVICE_TCP_PORT',
}

export const validationSchema = Joi.object({
  [Env.NODE_ENV]: Joi.string().optional(),
  [Env.PORT]: Joi.number().required(),
  [Env.FRONTEND_ORIGIN]: Joi.string().required(),
  [Env.API_PREFIX]: Joi.string().default('api'),
  [Env.API_VERSION]: Joi.string().default('1'),
  [Env.CLERK_WEBHOOK_SECRET]: Joi.string().required(),
  [Env.USER_SERVICE_HOST]: Joi.string().required(),
  [Env.USER_SERVICE_TCP_PORT]: Joi.number().required(),
});
