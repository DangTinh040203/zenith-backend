import Joi from 'joi';

export enum Env {
  NODE_ENV = 'NODE_ENV',
  TCP_PORT = 'TCP_PORT',
  HTTP_PORT = 'HTTP_PORT',
  DATABASE_URL = 'DATABASE_URL',
  REDIS_URL = 'REDIS_URL',
  USER_CACHE_TTL_SECONDS = 'USER_CACHE_TTL_SECONDS',
}

export const validationSchema = Joi.object({
  [Env.NODE_ENV]: Joi.string().optional(),
  [Env.TCP_PORT]: Joi.number().required(),
  [Env.HTTP_PORT]: Joi.number().default(4002),
  [Env.DATABASE_URL]: Joi.string().uri().required(),
  [Env.REDIS_URL]: Joi.string().uri().required(),
  [Env.USER_CACHE_TTL_SECONDS]: Joi.number()
    .integer()
    .positive()
    .default(86400),
});
