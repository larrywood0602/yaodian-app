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

const DEFAULT_TIMEOUT_MS = 10000;

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
        responseType: "json",
      });
    } catch (error: any) {
      throw new Error(
        `Native HTTP ${method} ${url} 失败: ${String(error?.message || error)}`
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
    throw new Error(`HTTP ${method} ${url} 失败: ${String(error?.message || error)}`);
  } finally {
    clearTimeout(timer);
  }
}
