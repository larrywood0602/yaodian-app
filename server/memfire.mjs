import { createClient } from "@supabase/supabase-js";

const TABLE_NAME_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;
const COLUMN_NAME_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;
const MAX_LIMIT = 500;
const DEFAULT_LIMIT = 50;

function makeError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function getMemfireConfig() {
  return {
    url: String(process.env.MEMFIRE_URL || "").trim(),
    anonKey: String(process.env.MEMFIRE_ANON_KEY || "").trim(),
    serviceRoleKey: String(process.env.MEMFIRE_SERVICE_ROLE_KEY || "").trim(),
    adminToken: String(process.env.MEMFIRE_ADMIN_TOKEN || "").trim(),
  };
}

function assertTableName(table) {
  if (!TABLE_NAME_RE.test(String(table || ""))) {
    throw makeError("Invalid table name", 400);
  }
}

function assertColumnName(column, label = "column") {
  if (!COLUMN_NAME_RE.test(String(column || ""))) {
    throw makeError(`Invalid ${label}`, 400);
  }
}

function normalizeLimit(limit) {
  if (limit == null) return DEFAULT_LIMIT;
  const num = Number(limit);
  if (!Number.isFinite(num) || num < 1) {
    throw makeError("limit must be a positive number", 400);
  }
  return Math.min(Math.floor(num), MAX_LIMIT);
}

function applyFilters(query, filters = []) {
  if (!Array.isArray(filters)) {
    throw makeError("filters must be an array", 400);
  }

  let next = query;
  for (const filter of filters) {
    const { column, op = "eq", value } = filter || {};
    assertColumnName(column);

    switch (op) {
      case "eq":
        next = next.eq(column, value);
        break;
      case "neq":
        next = next.neq(column, value);
        break;
      case "gt":
        next = next.gt(column, value);
        break;
      case "gte":
        next = next.gte(column, value);
        break;
      case "lt":
        next = next.lt(column, value);
        break;
      case "lte":
        next = next.lte(column, value);
        break;
      case "like":
        next = next.like(column, value);
        break;
      case "ilike":
        next = next.ilike(column, value);
        break;
      case "in":
        if (!Array.isArray(value)) {
          throw makeError(`filter '${column}' with op 'in' requires an array value`, 400);
        }
        next = next.in(column, value);
        break;
      case "is":
        next = next.is(column, value);
        break;
      case "contains":
        next = next.contains(column, value);
        break;
      default:
        throw makeError(`Unsupported filter op: ${op}`, 400);
    }
  }

  return next;
}

function requireAdminConfig() {
  const { url, serviceRoleKey } = getMemfireConfig();
  const missing = [];
  if (!url) missing.push("MEMFIRE_URL");
  if (!serviceRoleKey) missing.push("MEMFIRE_SERVICE_ROLE_KEY");
  if (missing.length) {
    throw makeError(`MemFire admin config missing: ${missing.join(", ")}`, 500);
  }
  return { url, serviceRoleKey };
}

function requireUserConfig() {
  const { url, anonKey } = getMemfireConfig();
  const missing = [];
  if (!url) missing.push("MEMFIRE_URL");
  if (!anonKey) missing.push("MEMFIRE_ANON_KEY");
  if (missing.length) {
    throw makeError(`MemFire user config missing: ${missing.join(", ")}`, 500);
  }
  return { url, anonKey };
}

export function requireAdminToken(req) {
  const { adminToken } = getMemfireConfig();
  if (!adminToken) return;

  const inputToken = String(req.headers["x-admin-token"] || "");
  if (inputToken !== adminToken) {
    throw makeError("Invalid x-admin-token", 401);
  }
}

export function getBearerToken(req) {
  const authHeader = String(req.headers.authorization || "");
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match?.[1]) {
    throw makeError("Missing Authorization: Bearer <token>", 401);
  }
  return match[1].trim();
}

export function createAdminMemfireClient() {
  const { url, serviceRoleKey } = requireAdminConfig();
  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export function createUserMemfireClient(accessToken) {
  if (!accessToken) {
    throw makeError("Missing user access token", 401);
  }
  const { url, anonKey } = requireUserConfig();
  return createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}

export async function checkMemfireHealth() {
  const { url, serviceRoleKey, anonKey, adminToken } = getMemfireConfig();
  const missing = [];
  if (!url) missing.push("MEMFIRE_URL");
  if (!serviceRoleKey) missing.push("MEMFIRE_SERVICE_ROLE_KEY");
  if (!anonKey) missing.push("MEMFIRE_ANON_KEY");

  if (missing.length) {
    return {
      ok: false,
      configured: false,
      missing,
    };
  }

  const start = Date.now();
  const response = await fetch(`${url.replace(/\/+$/, "")}/rest/v1/`, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
  });

  if (!response.ok) {
    throw makeError(`MemFire REST health check failed: HTTP ${response.status}`, 502);
  }

  return {
    ok: true,
    configured: true,
    latencyMs: Date.now() - start,
    adminTokenEnabled: Boolean(adminToken),
  };
}

export async function memfireSelect(client, payload = {}) {
  const {
    table,
    columns = "*",
    filters = [],
    limit = DEFAULT_LIMIT,
    orderBy,
    ascending = true,
  } = payload;

  assertTableName(table);
  if (typeof columns !== "string" || !columns.trim()) {
    throw makeError("columns must be a non-empty string", 400);
  }

  let query = client.from(table).select(columns);
  query = applyFilters(query, filters);

  if (orderBy != null) {
    assertColumnName(orderBy, "orderBy");
    query = query.order(orderBy, { ascending: ascending !== false });
  }

  query = query.limit(normalizeLimit(limit));

  const { data, error } = await query;
  if (error) {
    throw makeError(error.message, 400);
  }
  return data;
}

export async function memfireInsert(client, payload = {}) {
  const { table, data, returning = "representation" } = payload;
  assertTableName(table);

  if (data == null || (Array.isArray(data) && data.length === 0)) {
    throw makeError("data is required for insert", 400);
  }

  let query = client.from(table).insert(data);
  if (returning !== "minimal") {
    query = query.select("*");
  }

  const { data: result, error } = await query;
  if (error) {
    throw makeError(error.message, 400);
  }
  return result ?? [];
}

export async function memfireUpsert(client, payload = {}) {
  const {
    table,
    data,
    onConflict,
    ignoreDuplicates = false,
    returning = "representation",
  } = payload;
  assertTableName(table);

  if (data == null || (Array.isArray(data) && data.length === 0)) {
    throw makeError("data is required for upsert", 400);
  }

  let query = client.from(table).upsert(data, {
    onConflict,
    ignoreDuplicates: Boolean(ignoreDuplicates),
  });

  if (returning !== "minimal") {
    query = query.select("*");
  }

  const { data: result, error } = await query;
  if (error) {
    throw makeError(error.message, 400);
  }
  return result ?? [];
}

export async function memfireUpdate(client, payload = {}) {
  const { table, data, filters = [], returning = "representation" } = payload;
  assertTableName(table);

  if (data == null || typeof data !== "object" || Array.isArray(data)) {
    throw makeError("data must be an object for update", 400);
  }

  if (!Array.isArray(filters) || filters.length === 0) {
    throw makeError("update requires at least one filter", 400);
  }

  let query = client.from(table).update(data);
  query = applyFilters(query, filters);

  if (returning !== "minimal") {
    query = query.select("*");
  }

  const { data: result, error } = await query;
  if (error) {
    throw makeError(error.message, 400);
  }
  return result ?? [];
}

export async function memfireDelete(client, payload = {}) {
  const { table, filters = [], returning = "representation" } = payload;
  assertTableName(table);

  if (!Array.isArray(filters) || filters.length === 0) {
    throw makeError("delete requires at least one filter", 400);
  }

  let query = client.from(table).delete();
  query = applyFilters(query, filters);

  if (returning !== "minimal") {
    query = query.select("*");
  }

  const { data: result, error } = await query;
  if (error) {
    throw makeError(error.message, 400);
  }
  return result ?? [];
}
