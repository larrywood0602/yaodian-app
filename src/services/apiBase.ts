import { Capacitor } from "@capacitor/core";

const ENV_API_BASE_URL = normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL || "");
const IS_NATIVE_APP = Capacitor.isNativePlatform();

function normalizeBaseUrl(input: string) {
  return String(input || "")
    .trim()
    .replace(/^['"]|['"]$/g, "")
    .replace(/\/+$/, "");
}

export function getApiBaseUrl() {
  return ENV_API_BASE_URL;
}

export function buildApiUrl(path: string): string {
  const API_BASE_URL = getApiBaseUrl();
  return API_BASE_URL ? `${API_BASE_URL}${path}` : path;
}

export function assertNativeApiBaseUrl() {
  if (IS_NATIVE_APP && !getApiBaseUrl()) {
    throw new Error(
      "iOS/Android 原生端未配置 VITE_API_BASE_URL。请在 .env 中设置后执行 npm run ios:sync。"
    );
  }
}
