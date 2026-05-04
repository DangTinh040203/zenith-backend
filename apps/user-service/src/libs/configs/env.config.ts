import Joi from 'joi';

export enum Env {
  NODE_ENV = 'NODE_ENV',
  TCP_PORT = 'TCP_PORT',
  HTTP_PORT = 'HTTP_PORT',
  DATABASE_URL = 'DATABASE_URL',
  CLERK_WEBHOOK_SECRET = 'CLERK_WEBHOOK_SECRET',
  CLERK_PUBLISHABLE_KEY = 'CLERK_PUBLISHABLE_KEY',
  CLERK_SECRET_KEY = 'CLERK_SECRET_KEY',
  JWT_SECRET = 'JWT_SECRET',
}

export const validationSchema = Joi.object({
  [Env.NODE_ENV]: Joi.string().optional(),
  [Env.TCP_PORT]: Joi.number().required(),
  [Env.HTTP_PORT]: Joi.number().default(4002),
  [Env.DATABASE_URL]: Joi.string().uri().required(),
  [Env.CLERK_WEBHOOK_SECRET]: Joi.string().required(),
  [Env.CLERK_PUBLISHABLE_KEY]: Joi.string().optional().allow(''),
  [Env.CLERK_SECRET_KEY]: Joi.string().optional().allow(''),
  [Env.JWT_SECRET]: Joi.string().optional().allow(''),
});
