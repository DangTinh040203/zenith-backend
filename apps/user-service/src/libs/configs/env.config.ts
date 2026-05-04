import Joi from 'joi';

export enum Env {
  NODE_ENV = 'NODE_ENV',

  PORT = 'PORT',
  FRONTEND_ORIGIN = 'FRONTEND_ORIGIN',

  API_PREFIX = 'API_PREFIX',
  API_VERSION = 'API_VERSION',

  DATABASE_URL = 'DATABASE_URL',
}

export const validationSchema = Joi.object({
  [Env.NODE_ENV]: Joi.string().optional(),
  [Env.PORT]: Joi.number().required(),
  [Env.FRONTEND_ORIGIN]: Joi.string().required(),
  [Env.API_PREFIX]: Joi.string().default('api'),
  [Env.API_VERSION]: Joi.string().default('1'),
  [Env.DATABASE_URL]: Joi.string().optional(),
});
