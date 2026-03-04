import { InfographicData } from "../types";
import { assertNativeApiBaseUrl, buildApiUrl, getApiBaseUrl } from "./apiBase";
import { requestJson } from "./httpClient";

export interface DualReport {
  visual: InfographicData;
  strategic: InfographicData;
}

export interface ConnectionDiagnostics {
  apiBaseUrl: string;
  apiReachable: boolean;
  apiMessage: string;
  qwenReachable: boolean;
  qwenMessage: string;
  memfireReachable: boolean;
  memfireMessage: string;
}

function normalizeTheme(theme: any) {
  return {
    primary: String(theme?.primary || "#007AFF"),
    secondary: String(theme?.secondary || "#86868B"),
    background: String(theme?.background || "#F5F5F7"),
    text: String(theme?.text || "#1D1D1F"),
  };
}

function validateInfographicData(payload: any, label: "visual" | "strategic"): InfographicData {
  const sections = Array.isArray(payload?.sections) ? payload.sections : null;
  if (!sections) {
    const keys = payload && typeof payload === "object" ? Object.keys(payload).slice(0, 10).join(", ") : String(payload);
    throw new Error(
      `后端返回的${label}数据结构不符合前端协议（缺少 sections 数组）。当前字段: ${keys}`
    );
  }

  return {
    title: String(payload?.title || (label === "visual" ? "可视化报告" : "战略洞察报告")),
    subtitle: payload?.subtitle ? String(payload.subtitle) : "",
    sections,
    suggested_theme: normalizeTheme(payload?.suggested_theme),
  };
}

export async function diagnoseConnection(): Promise<ConnectionDiagnostics> {
  const apiBaseUrl = getApiBaseUrl() || "(same-origin)";
  let apiReachable = false;
  let apiMessage = "";
  let qwenReachable = false;
  let qwenMessage = "";
  let memfireReachable = false;
  let memfireMessage = "";

  try {
    assertNativeApiBaseUrl();
  } catch (error: any) {
    return {
      apiBaseUrl,
      apiReachable: false,
      apiMessage: String(error?.message || error),
      qwenReachable: false,
      qwenMessage: "API 未连通，无法检查 Qwen",
      memfireReachable: false,
      memfireMessage: "API 未连通，无法检查 memfire",
    };
  }

  try {
    const apiRes = await requestJson(buildApiUrl("/api/health"), { timeoutMs: 5000 });
    const apiData = apiRes.data as any;
    apiReachable = apiRes.ok;
    apiMessage = apiRes.ok
      ? `API 正常（model: ${apiData?.model || "unknown"}）`
      : `API 异常（HTTP ${apiRes.status}）`;
  } catch (error: any) {
    apiMessage = `API 无法访问：${String(error?.message || error)}`;
  }

  if (!apiReachable) {
    return {
      apiBaseUrl,
      apiReachable,
      apiMessage,
      qwenReachable,
      qwenMessage: "API 未连通，无法检查 Qwen",
      memfireReachable,
      memfireMessage: "API 未连通，无法检查 memfire",
    };
  }

  try {
    const qwenRes = await requestJson(buildApiUrl("/api/qwen/health"), { timeoutMs: 5000 });
    const qwenData = qwenRes.data as any;
    qwenReachable = qwenRes.ok && Boolean(qwenData?.ok);
    qwenMessage = qwenReachable
      ? `Qwen 正常（model: ${qwenData?.model || "unknown"}）`
      : `Qwen 异常：${qwenData?.message || `HTTP ${qwenRes.status}`}`;
  } catch (error: any) {
    qwenMessage = `Qwen 无法访问：${String(error?.message || error)}`;
  }

  try {
    const memRes = await requestJson(buildApiUrl("/api/memfire/health"), { timeoutMs: 5000 });
    const memData = memRes.data as any;
    memfireReachable = memRes.ok && Boolean(memData?.ok);
    if (memfireReachable) {
      memfireMessage = `memfire 正常（latency: ${memData?.latencyMs ?? "?"}ms）`;
    } else if (Array.isArray(memData?.missing) && memData.missing.length > 0) {
      memfireMessage = `memfire 配置缺失：${memData.missing.join(", ")}`;
    } else {
      memfireMessage = `memfire 异常（HTTP ${memRes.status}）`;
    }
  } catch (error: any) {
    memfireMessage = `memfire 无法访问：${String(error?.message || error)}`;
  }

  return {
    apiBaseUrl,
    apiReachable,
    apiMessage,
    qwenReachable,
    qwenMessage,
    memfireReachable,
    memfireMessage,
  };
}

export async function analyzeText(
  text: string,
  analysisTarget: string,
  onVisualChunk?: (data: InfographicData) => void,
  onStrategicChunk?: (data: InfographicData) => void,
  onVisualComplete?: (data: InfographicData) => void,
  useWebSearch: boolean = false,
  onSearchComplete?: (searchData: string) => void
): Promise<DualReport> {
  assertNativeApiBaseUrl();

  const response = await requestJson(buildApiUrl("/api/analyze"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: {
      text,
      analysisTarget,
      useWebSearch,
    },
  });

  if (!response.ok) {
    const data = response.data as any;
    throw new Error(data?.error || `Analyze failed: ${response.status}`);
  }

  const result = response.data as any;
  const visual = validateInfographicData(result?.visual, "visual");
  const strategic = validateInfographicData(result?.strategic, "strategic");

  if (result.searchData && onSearchComplete) {
    onSearchComplete(result.searchData);
  }
  if (onVisualChunk && visual) onVisualChunk(visual);
  if (onVisualComplete && visual) onVisualComplete(visual);
  if (onStrategicChunk && strategic) onStrategicChunk(strategic);

  return { visual, strategic };
}

export async function regenerateSection(
  sectionTitle: string,
  nodes: any[]
): Promise<any> {
  assertNativeApiBaseUrl();

  const response = await requestJson(buildApiUrl("/api/regenerate"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: {
      sectionTitle,
      nodes,
    },
  });

  if (!response.ok) {
    const data = response.data as any;
    throw new Error(data?.error || `Regenerate failed: ${response.status}`);
  }

  return response.data;
}
