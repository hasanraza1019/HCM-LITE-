import { AuditLog, getNextId } from '../database/models.js';

export interface AuditParams {
  actorId?: number | null;
  actorEmail?: string | null;
  actorRole?: string | null;
  action: string;
  entity: string;
  entityId?: string | number | null;
  before?: any;
  after?: any;
  ipAddress?: string | null;
}

function sanitizeSnapshot(data: any): string | null {
  if (!data) return null;
  if (typeof data === 'object' && !Array.isArray(data)) {
    const { _id, __v, ...rest } = data;
    return JSON.stringify(rest);
  }
  return JSON.stringify(data);
}

export async function logAudit(params: AuditParams): Promise<void> {
  try {
    const id = await getNextId('audit_logs');
    await AuditLog.create({
      id,
      actor_id: params.actorId || null,
      actor_email: params.actorEmail || null,
      actor_role: params.actorRole || null,
      action: params.action,
      entity: params.entity,
      entity_id: params.entityId !== undefined && params.entityId !== null ? String(params.entityId) : null,
      before_json: sanitizeSnapshot(params.before),
      after_json: sanitizeSnapshot(params.after),
      ip_address: params.ipAddress || null,
      created_at: new Date().toISOString()
    });
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}
