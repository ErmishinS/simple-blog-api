import Joi from 'joi';

export const registerSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required()
});

export const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
});

export const postSchema = Joi.object({
    title: Joi.string().required(),
    content: Joi.string().allow('')
  });
  
export const updatePostSchema = Joi.object({
    title: Joi.string(),
    content: Joi.string().allow('')
  }).min(1);