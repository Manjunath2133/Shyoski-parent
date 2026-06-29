// src/validators/batch.validator.js
import { z } from 'zod'

// 1. Create Batch Schema
export const createBatchSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  batchCode: z.string()
    .min(3, 'Batch Code must be at least 3 characters')
    .max(30, 'Batch Code must be at most 30 characters')
    .transform(val => val.toUpperCase())
    .refine(val => /^[A-Z0-9-]{3,30}$/.test(val), {
      message: 'Batch Code must contain only uppercase alphanumeric characters and dashes, between 3 and 30 characters long'
    }),
  status: z.enum(['draft', 'active', 'inactive', 'archived']).optional().default('draft'),
  description: z.string().max(500).optional().or(z.literal('')),
  domain: z.string().optional().or(z.literal('')),
  startDate: z.string().optional().or(z.literal('')),
  certificateFee: z.number().optional().default(0),
  googleFormLink: z.string().url('Google Form Link must be a valid URL').optional().or(z.literal(''))
})

// 2. Update Batch Schema
export const updateBatchSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100).optional(),
  batchCode: z.string()
    .min(3, 'Batch Code must be at least 3 characters')
    .max(30, 'Batch Code must be at most 30 characters')
    .transform(val => val.toUpperCase())
    .refine(val => /^[A-Z0-9-]{3,30}$/.test(val), {
      message: 'Batch Code must contain only uppercase alphanumeric characters and dashes, between 3 and 30 characters long'
    })
    .optional(),
  status: z.enum(['draft', 'active', 'inactive', 'archived']).optional(),
  description: z.string().max(500).optional().or(z.literal('')).optional(),
  domain: z.string().optional().or(z.literal('')).optional(),
  startDate: z.string().optional().or(z.literal('')).optional(),
  certificateFee: z.number().optional().optional(),
  googleFormLink: z.string().url('Google Form Link must be a valid URL').optional().or(z.literal('')).optional()
})
