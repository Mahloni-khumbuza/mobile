export interface AuditLogActor {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  actor: AuditLogActor | null;
  createdAt: string;
}

export interface AuditLogQuery {
  entity?: string;
  entityId?: string;
  actorId?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

export interface PaginatedAuditLogs {
  items: AuditLog[];
  total: number;
  limit: number;
  offset: number;
}
