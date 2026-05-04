import Joi from 'joi';

export enum Env {
  NODE_ENV = 'NODE_ENV',

  PORT = 'PORT',
  TCP_PORT = 'TCP_PORT',

  API_PREFIX = 'API_PREFIX',
  API_VERSION = 'API_VERSION',

  DATABASE_URL = 'DATABASE_URL',
}

export const validationSchema = Joi.object({
  [Env.NODE_ENV]: Joi.string().optional(),
  [Env.PORT]: Joi.number().required(),
  [Env.TCP_PORT]: Joi.number().required(),
  [Env.API_PREFIX]: Joi.string().default('api'),
  [Env.API_VERSION]: Joi.string().default('1'),
  [Env.DATABASE_URL]: Joi.string().uri().required(),
});
