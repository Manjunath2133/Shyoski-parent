// src/lib/rbac.js

// Tenant-scoped capabilities mapping
export const ROLE_CAPABILITIES = {
  org_admin: [
    'org:update',
    'member:invite',
    'member:list',
    'member:remove',
    'batch:create',
    'batch:update',
    'batch:archive',
    'batch:staff',
    'batch:unstaff',
    'student:list',
    'student:extend',
    'job:create',
    'job:update',
    'job:archive',
    'analytics:view'
  ],
  mentor: [
    'member:list',
    'batch:view',
    'student:list',
    'group:view',
    'group:chat:read',
    'group:chat:write'
  ],
  evaluator: [
    'member:list',
    'batch:view',
    'student:list',
    'submission:view',
    'submission:evaluate'
  ],
  student: [
    'batch:view',
    'batch:enroll',
    'submission:create',
    'submission:view',
    'group:create',
    'group:join',
    'group:leave',
    'group:view',
    'group:chat:read',
    'group:chat:write',
    'certificate:generate',
    'certificate:view',
    'payment:create',
    'payment:history',
    'job:apply'
  ]
}

/**
 * Checks if a specific role is authorized for a capability.
 * @param {string} role The tenant role
 * @param {string} capability The target capability string
 * @returns {boolean}
 */
export function hasCapability(role, capability) {
  if (!role) return false
  const capabilities = ROLE_CAPABILITIES[role]
  return Array.isArray(capabilities) && capabilities.includes(capability)
}
