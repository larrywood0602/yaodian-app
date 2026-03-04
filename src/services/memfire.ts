import { assertNativeApiBaseUrl, buildApiUrl } from "./apiBase";
import { requestJson } from "./httpClient";

export type MemfireFilterOp =
  | "eq"
  | "neq"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "like"
  | "ilike"
  | "in"
  | "is"
  | "contains";

export interface MemfireFilter {
  column: string;
  op?: MemfireFilterOp;
  value: unknown;
}

export interface MemfireSelectPayload {
  table: string;
  columns?: string;
  filters?: MemfireFilter[];
  limit?: number;
  orderBy?: string;
  ascending?: boolean;
}

export interface MemfireInsertPayload<T = Record<string, unknown>> {
  table: string;
  data: T | T[];
  returning?: "representation" | "minimal";
}

export interface MemfireUpsertPayload<T = Record<string, unknown>>
  extends MemfireInsertPayload<T> {
  onConflict?: string;
  ignoreDuplicates?: boolean;
}

export interface MemfireUpdatePayload<T = Record<string, unknown>> {
  table: string;
  data: T;
  filters: MemfireFilter[];
  returning?: "representation" | "minimal";
}

export interface MemfireDeletePayload {
  table: string;
  filters: MemfireFilter[];
  returning?: "representation" | "minimal";
}

export interface MemfireHealthResponse {
  ok: boolean;
  configured: boolean;
  missing?: string[];
  latencyMs?: number;
  adminTokenEnabled?: boolean;
}

export interface MemfireRowsResponse<T> {
  rows: T[];
}

interface RequestAuthOptions {
  adminToken?: string;
  accessToken?: string;
}

export interface MemfireApiServiceOptions {
  adminToken?: string;
  getAccessToken?: () => string | null | undefined | Promise<string | null | undefined>;
}

export class MemfireApiService {
  private readonly options: MemfireApiServiceOptions;

  constructor(options: MemfireApiServiceOptions = {}) {
    this.options = options;
  }

  async health(): Promise<MemfireHealthResponse> {
    return this.request<MemfireHealthResponse>("/api/memfire/health", {
      method: "GET",
    });
  }

  async adminSelect<T = Record<string, unknown>>(
    payload: MemfireSelectPayload,
    adminToken?: string
  ): Promise<T[]> {
    const result = await this.request<MemfireRowsResponse<T>>(
      "/api/memfire/admin/select",
      this.postJson(payload),
      { adminToken }
    );
    return result.rows;
  }

  async adminInsert<T = Record<string, unknown>>(
    payload: MemfireInsertPayload<T>,
    adminToken?: string
  ): Promise<T[]> {
    const result = await this.request<MemfireRowsResponse<T>>(
      "/api/memfire/admin/insert",
      this.postJson(payload),
      { adminToken }
    );
    return result.rows;
  }

  async adminUpsert<T = Record<string, unknown>>(
    payload: MemfireUpsertPayload<T>,
    adminToken?: string
  ): Promise<T[]> {
    const result = await this.request<MemfireRowsResponse<T>>(
      "/api/memfire/admin/upsert",
      this.postJson(payload),
      { adminToken }
    );
    return result.rows;
  }

  async adminUpdate<T = Record<string, unknown>>(
    payload: MemfireUpdatePayload<T>,
    adminToken?: string
  ): Promise<T[]> {
    const result = await this.request<MemfireRowsResponse<T>>(
      "/api/memfire/admin/update",
      this.postJson(payload),
      { adminToken }
    );
    return result.rows;
  }

  async adminDelete<T = Record<string, unknown>>(
    payload: MemfireDeletePayload,
    adminToken?: string
  ): Promise<T[]> {
    const result = await this.request<MemfireRowsResponse<T>>(
      "/api/memfire/admin/delete",
      this.postJson(payload),
      { adminToken }
    );
    return result.rows;
  }

  async userSelect<T = Record<string, unknown>>(
    payload: MemfireSelectPayload,
    accessToken?: string
  ): Promise<T[]> {
    const result = await this.request<MemfireRowsResponse<T>>(
      "/api/memfire/user/select",
      this.postJson(payload),
      { accessToken: await this.resolveAccessToken(accessToken) }
    );
    return result.rows;
  }

  async userInsert<T = Record<string, unknown>>(
    payload: MemfireInsertPayload<T>,
    accessToken?: string
  ): Promise<T[]> {
    const result = await this.request<MemfireRowsResponse<T>>(
      "/api/memfire/user/insert",
      this.postJson(payload),
      { accessToken: await this.resolveAccessToken(accessToken) }
    );
    return result.rows;
  }

  async userUpsert<T = Record<string, unknown>>(
    payload: MemfireUpsertPayload<T>,
    accessToken?: string
  ): Promise<T[]> {
    const result = await this.request<MemfireRowsResponse<T>>(
      "/api/memfire/user/upsert",
      this.postJson(payload),
      { accessToken: await this.resolveAccessToken(accessToken) }
    );
    return result.rows;
  }

  async userUpdate<T = Record<string, unknown>>(
    payload: MemfireUpdatePayload<T>,
    accessToken?: string
  ): Promise<T[]> {
    const result = await this.request<MemfireRowsResponse<T>>(
      "/api/memfire/user/update",
      this.postJson(payload),
      { accessToken: await this.resolveAccessToken(accessToken) }
    );
    return result.rows;
  }

  async userDelete<T = Record<string, unknown>>(
    payload: MemfireDeletePayload,
    accessToken?: string
  ): Promise<T[]> {
    const result = await this.request<MemfireRowsResponse<T>>(
      "/api/memfire/user/delete",
      this.postJson(payload),
      { accessToken: await this.resolveAccessToken(accessToken) }
    );
    return result.rows;
  }

  private postJson(body: unknown): RequestInit {
    return {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    };
  }

  private async resolveAccessToken(accessToken?: string) {
    if (accessToken) return accessToken;
    if (this.options.getAccessToken) {
      const token = await this.options.getAccessToken();
      if (token) return token;
    }
    throw new Error("Missing MemFire user access token");
  }

  private async request<T>(
    path: string,
    init: RequestInit,
    auth: RequestAuthOptions = {}
  ): Promise<T> {
    assertNativeApiBaseUrl();

    const headers = new Headers(init.headers || {});
    const token = auth.accessToken || undefined;
    const adminToken = auth.adminToken || this.options.adminToken;

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    if (adminToken) {
      headers.set("x-admin-token", adminToken);
    }

    const method = (init.method || "GET").toUpperCase() as "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    const body = typeof init.body === "string" && init.body.length > 0
      ? JSON.parse(init.body)
      : init.body ?? undefined;

    const response = await requestJson(buildApiUrl(path), {
      method,
      headers: Object.fromEntries(headers.entries()),
      body,
    });

    const data = response.data as any;
    if (!response.ok) {
      const message = typeof data?.error === "string" ? data.error : `Request failed: ${response.status}`;
      throw new Error(message);
    }
    return data as T;
  }
}

export const memfireApi = new MemfireApiService();
