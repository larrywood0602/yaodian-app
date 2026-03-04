import { InfographicData, LogicType } from "../types";
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

const HEALTH_TIMEOUT_MS = 8000;
const ANALYZE_TIMEOUT_MS = 240000;
const REGENERATE_TIMEOUT_MS = 120000;

function normalizeTheme(theme: any) {
  return {
    primary: String(theme?.primary || "#007AFF"),
    secondary: String(theme?.secondary || "#86868B"),
    background: String(theme?.background || "#F5F5F7"),
    text: String(theme?.text || "#1D1D1F"),
  };
}

function validateInfographicData(payload: any, label: "visual" | "strategic"): InfographicData {
  const asText = (value: any) => {
    if (value == null) return "";
    if (typeof value === "string") return value.trim();
    if (typeof value === "number" || typeof value === "boolean") return String(value);
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  };

  const normalizeNodes = (nodes: any[]) => {
    if (!Array.isArray(nodes) || nodes.length === 0) {
      return [{ title: "提示", content: "暂无可渲染内容，请重试。"}];
    }
    return nodes.map((node: any, index: number) => {
      if (node && typeof node === "object") {
        return {
          title: asText(node.title || node.name || `要点 ${index + 1}`) || `要点 ${index + 1}`,
          content: asText(node.content || node.description || node.text || "暂无详细内容") || "暂无详细内容",
          ...(node.value != null ? { value: asText(node.value) } : {}),
          ...(node.icon ? { icon: asText(node.icon) } : {}),
          ...(node.color ? { color: asText(node.color) } : {}),
          ...(Array.isArray(node.cells) ? { cells: node.cells.map((cell: any) => asText(cell)) } : {}),
        };
      }
      return {
        title: `要点 ${index + 1}`,
        content: asText(node) || "暂无详细内容",
      };
    });
  };

  const rawSections = Array.isArray(payload?.sections)
    ? payload.sections
    : Array.isArray(payload?.blocks)
      ? payload.blocks
      : Array.isArray(payload?.modules)
        ? payload.modules
        : [];

  const sections = rawSections
    .map((section: any, index: number) => {
      if (!section || typeof section !== "object") {
        return {
          logic_type: LogicType.PARALLEL,
          template_id: `fallback_${index + 1}`,
          section_title: `模块 ${index + 1}`,
          visual_intent: "summary",
          density: "medium" as const,
          nodes: normalizeNodes([section]),
        };
      }
      return {
        logic_type: (section.logic_type || LogicType.PARALLEL) as LogicType,
        template_id: asText(section.template_id || section.template || `section_${index + 1}`),
        section_title: asText(section.section_title || section.title || `模块 ${index + 1}`),
        visual_intent: asText(section.visual_intent || section.intent || "summary"),
        density:
          section.density === "low" || section.density === "high" || section.density === "medium"
            ? section.density
            : ("medium" as const),
        nodes: normalizeNodes(section.nodes || section.items || section.points || []),
      };
    })
    .filter((section) => Array.isArray(section.nodes) && section.nodes.length > 0);

  const safeSections = sections.length
    ? sections
    : [
        {
          logic_type: LogicType.HERO,
          template_id: "empty_fallback",
          section_title: "结果摘要",
          visual_intent: "summary",
          density: "medium" as const,
          nodes: normalizeNodes([
            {
              title: "提示",
              content: asText(payload?.summary || payload?.report_meta?.summary || payload) || "返回结果为空，请重试。",
            },
          ]),
        },
      ];

  return {
    title: String(payload?.title || (label === "visual" ? "可视化报告" : "战略洞察报告")),
    subtitle: payload?.subtitle ? String(payload.subtitle) : "",
    sections: safeSections as any,
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
    const apiRes = await requestJson(buildApiUrl("/api/health"), { timeoutMs: HEALTH_TIMEOUT_MS });
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
    const qwenRes = await requestJson(buildApiUrl("/api/qwen/health"), { timeoutMs: HEALTH_TIMEOUT_MS });
    const qwenData = qwenRes.data as any;
    qwenReachable = qwenRes.ok && Boolean(qwenData?.ok);
    qwenMessage = qwenReachable
      ? `Qwen 正常（model: ${qwenData?.model || "unknown"}）`
      : `Qwen 异常：${qwenData?.message || `HTTP ${qwenRes.status}`}`;
  } catch (error: any) {
    qwenMessage = `Qwen 无法访问：${String(error?.message || error)}`;
  }

  try {
    const memRes = await requestJson(buildApiUrl("/api/memfire/health"), { timeoutMs: HEALTH_TIMEOUT_MS });
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
    timeoutMs: ANALYZE_TIMEOUT_MS,
    body: {
      text,
      analysisTarget,
      useWebSearch,
    },
  });

  if (!response.ok) {
    const data = response.data as any;
    if (response.status === 504) {
      throw new Error("服务器处理超时（504），请稍后重试或减少输入内容。");
    }
    if (typeof data === "string" && data.trim()) {
      throw new Error(`Analyze failed: ${response.status} ${data.slice(0, 180)}`);
    }
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
    timeoutMs: REGENERATE_TIMEOUT_MS,
    body: {
      sectionTitle,
      nodes,
    },
  });

  if (!response.ok) {
    const data = response.data as any;
    if (response.status === 504) {
      throw new Error("重生成超时（504），请重试。");
    }
    if (typeof data === "string" && data.trim()) {
      throw new Error(`Regenerate failed: ${response.status} ${data.slice(0, 180)}`);
    }
    throw new Error(data?.error || `Regenerate failed: ${response.status}`);
  }

  return response.data;
}
