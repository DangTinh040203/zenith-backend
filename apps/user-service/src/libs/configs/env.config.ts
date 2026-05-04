import Joi from 'joi';

export enum Env {
  NODE_ENV = 'NODE_ENV',
  TCP_PORT = 'TCP_PORT',
  DATABASE_URL = 'DATABASE_URL',
}

export const validationSchema = Joi.object({
  [Env.NODE_ENV]: Joi.string().optional(),
  [Env.TCP_PORT]: Joi.number().required(),
  [Env.DATABASE_URL]: Joi.string().uri().required(),
});
