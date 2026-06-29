// src/validators/organization.validator.js
import { z } from 'zod'

// 1. Organization Creation Schema
export const createOrganizationSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  slug: z.string()
    .min(2, 'Slug must be at least 2 characters')
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and dashes'),
  organizationCode: z.string()
    .min(3, 'Organization Code must be at least 3 characters')
    .max(5)
    .regex(/^[A-Za-z0-9]{3,5}$/, 'Organization Code must contain only 3-5 alphanumeric characters')
    .transform(val => val.toUpperCase()),
  logoUrl: z.string().url('Logo URL must be valid').optional().or(z.literal('')),
  website: z.string().url('Website must be valid').optional().or(z.literal('')),
  email: z.string().email('Contact email must be valid'),
  adminEmail: z.string().email('Admin email must be valid')
})

// 2. Organization Update Schema
export const updateOrganizationSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/).optional(),
  logoUrl: z.string().url().optional().or(z.literal('')),
  website: z.string().url().optional().or(z.literal('')),
  contactEmail: z.string().email().optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
  plan: z.enum(['free', 'startup', 'business', 'enterprise']).optional(),
  subscriptionStatus: z.enum(['active', 'past_due', 'canceled', 'unpaid']).optional()
})

// 3. Organization Invitation Schema
export const inviteMemberSchema = z.object({
  email: z.string().email('Email must be valid'),
  role: z.enum(['org_admin', 'mentor', 'evaluator', 'student'], {
    errorMap: () => ({ message: 'Role must be org_admin, mentor, evaluator, or student' })
  })
})

// 4. Accept Invitation Schema
export const acceptInvitationSchema = z.object({
  token: z.string().min(10, 'Invitation token is required')
})

// 5. Pagination Query Schema
export const paginationQuerySchema = z.object({
  page: z.string().optional().default('1').transform(val => Math.max(1, parseInt(val) || 1)),
  limit: z.string().optional().default('20').transform(val => {
    const parsed = parseInt(val) || 20
    return Math.min(100, Math.max(1, parsed)) // enforce min 1, max 100
  }),
  cursor: z.string().optional()
})

// 6. Organization Settings Schema
export const updateSettingsSchema = z.object({
  branding: z.object({
    logoUrl: z.string().url('Logo URL must be valid').optional().or(z.literal('')),
    primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Primary color must be a valid hex color code').optional().or(z.literal('')),
    website: z.string().url('Website must be valid').optional().or(z.literal(''))
  }).optional(),
  contact: z.object({
    email: z.string().email('Contact email must be valid').optional().or(z.literal('')),
    phone: z.string().optional().or(z.literal(''))
  }).optional()
})

// 7. Member PATCH Schema
export const patchMemberSchema = z.object({
  role: z.enum(['org_admin', 'mentor', 'evaluator', 'student']).optional(),
  status: z.enum(['active', 'suspended']).optional()
}).refine(data => data.role !== undefined || data.status !== undefined, {
  message: "Either role or status must be provided"
})
