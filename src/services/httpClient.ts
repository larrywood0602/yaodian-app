import { Capacitor, CapacitorHttp } from "@capacitor/core";

export interface JsonRequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  headers?: Record<string, string>;
  body?: unknown;
  timeoutMs?: number;
}

export interface JsonResponse<T = any> {
  ok: boolean;
  status: number;
  data: T;
}

const DEFAULT_TIMEOUT_MS = 30000;

function isTimeoutError(error: any) {
  const message = String(error?.message || error || "").toLowerCase();
  return (
    error?.name === "AbortError" ||
    message.includes("timeout") ||
    message.includes("timed out") ||
    message.includes("aborted")
  );
}

function formatError(error: any) {
  const code = error?.code ? `[${String(error.code)}] ` : "";
  return `${code}${String(error?.message || error)}`;
}

function parseMaybeJson(value: any) {
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
}

export async function requestJson<T = any>(
  url: string,
  options: JsonRequestOptions = {}
): Promise<JsonResponse<T>> {
  const method = options.method || "GET";
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
  const headers = options.headers || {};

  if (Capacitor.isNativePlatform()) {
    let response;
    try {
      response = await CapacitorHttp.request({
        url,
        method,
        headers,
        data: options.body,
        connectTimeout: timeoutMs,
        readTimeout: timeoutMs,
        // Keep text mode so non-JSON upstream errors (e.g. nginx 504 html)
        // are still returned with HTTP status instead of parsing exceptions.
        responseType: "text",
      });
    } catch (error: any) {
      if (isTimeoutError(error)) {
        throw new Error(`Native HTTP ${method} ${url} 超时（${timeoutMs}ms）`);
      }
      throw new Error(
        `Native HTTP ${method} ${url} 失败: ${formatError(error)}`
      );
    }

    return {
      ok: response.status >= 200 && response.status < 300,
      status: response.status,
      data: parseMaybeJson(response.data) as T,
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method,
      headers,
      body: options.body != null ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });
    const data = await response.json().catch(() => ({}));
    return {
      ok: response.ok,
      status: response.status,
      data: data as T,
    };
  } catch (error: any) {
    if (isTimeoutError(error)) {
      throw new Error(`HTTP ${method} ${url} 超时（${timeoutMs}ms）`);
    }
    throw new Error(`HTTP ${method} ${url} 失败: ${formatError(error)}`);
  } finally {
    clearTimeout(timer);
  }
}
