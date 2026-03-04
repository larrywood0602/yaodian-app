import { InfographicData, InfographicNode, InfographicSection, LogicType } from "../types";
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

type ReportKind = "visual" | "strategic";

const HEALTH_TIMEOUT_MS = 8000;
const ANALYZE_TIMEOUT_MS = 240000;
const REGENERATE_TIMEOUT_MS = 120000;

const DEFAULT_THEME = {
  primary: "#007AFF",
  secondary: "#86868B",
  background: "#F5F5F7",
  text: "#1D1D1F",
};

const CHART_LOGIC_TYPES = new Set<LogicType>([
  LogicType.BAR,
  LogicType.HORIZONTAL_BAR,
  LogicType.LINE,
  LogicType.AREA,
  LogicType.PIE,
  LogicType.DONUT,
  LogicType.COMBO_CHART,
  LogicType.RADAR_CHART,
  LogicType.SCATTER,
  LogicType.WATERFALL,
  LogicType.GAUGE,
  LogicType.STACKED_LINE,
  LogicType.STACKED_AREA,
  LogicType.NIGHTINGALE_ROSE,
  LogicType.RADIAL_BAR,
]);

const LOGIC_ALIASES: Record<string, LogicType> = {
  BARCHART: LogicType.BAR,
  BAR_CHART: LogicType.BAR,
  COLUMN: LogicType.BAR,
  COLUMN_CHART: LogicType.BAR,
  LINECHART: LogicType.LINE,
  LINE_CHART: LogicType.LINE,
  AREA_CHART: LogicType.AREA,
  PIECHART: LogicType.PIE,
  PIE_CHART: LogicType.PIE,
  DONUT_CHART: LogicType.DONUT,
  RADAR_CHARTS: LogicType.RADAR_CHART,
  RADARCHART: LogicType.RADAR_CHART,
  HBAR: LogicType.HORIZONTAL_BAR,
  HORIZONTALBAR: LogicType.HORIZONTAL_BAR,
  HORIZONTAL_BAR_CHART: LogicType.HORIZONTAL_BAR,
  BENTO_GRID_LAYOUT: LogicType.BENTO_GRID,
  ADAPTIVEGRID: LogicType.ADAPTIVE_GRID,
  ADAPTIVE_GRID_LAYOUT: LogicType.ADAPTIVE_GRID,
  SWOT_MATRIX: LogicType.SWOT,
  TIMELINE_CHART: LogicType.TIMELINE,
  ROAD_MAP: LogicType.ROADMAP,
  ROADMAP_CHART: LogicType.ROADMAP,
  INSIGHTS: LogicType.INSIGHT,
  COMPARE: LogicType.COMPARISON,
  COMPARATIVE: LogicType.COMPARISON,
};

function toText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function compact(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function normalizeTheme(theme: any): InfographicData["suggested_theme"] {
  return {
    primary: toText(theme?.primary) || DEFAULT_THEME.primary,
    secondary: toText(theme?.secondary) || DEFAULT_THEME.secondary,
    background: toText(theme?.background) || DEFAULT_THEME.background,
    text: toText(theme?.text) || DEFAULT_THEME.text,
  };
}

function parseNumericValue(input: unknown): number | null {
  const raw = toText(input);
  if (!raw) return null;
  const cleaned = raw.replace(/,/g, "").replace(/[^\d.+-]/g, "");
  if (!cleaned) return null;
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function isPercentValue(input: unknown): boolean {
  const raw = toText(input);
  return /%|百分比|占比|增速|增长率|转化率|率/.test(raw);
}

function isTimeLikeLabel(label: string): boolean {
  return /\d{4}年|\d{1,2}月|Q[1-4]|季度|周|星期|年度|月度|日|Day|Week|Month|Year/i.test(label);
}

function normalizeLogicType(input: unknown): LogicType | null {
  const raw = toText(input)
    .toUpperCase()
    .replace(/[\s-]+/g, "_");

  if (!raw) return null;
  if ((Object.values(LogicType) as string[]).includes(raw)) {
    return raw as LogicType;
  }
  return LOGIC_ALIASES[raw] || null;
}

function nodeFromUnknown(node: any, index: number): InfographicNode {
  if (node && typeof node === "object") {
    const title =
      toText(node.title || node.name || node.label || node.metric || `要点 ${index + 1}`) ||
      `要点 ${index + 1}`;
    const content =
      toText(node.content || node.description || node.desc || node.text || node.summary) ||
      "暂无详细内容";

    let value = toText(node.value);
    if (!value) {
      const matched = content.match(/[-+]?\d[\d,.]*\s*%?/);
      value = matched?.[0] || "";
    }

    const cells = Array.isArray(node.cells)
      ? node.cells.map((cell: unknown) => toText(cell)).filter(Boolean)
      : undefined;

    return {
      title,
      content,
      ...(value ? { value } : {}),
      ...(toText(node.icon) ? { icon: toText(node.icon) } : {}),
      ...(toText(node.color) ? { color: toText(node.color) } : {}),
      ...(cells && cells.length ? { cells } : {}),
    };
  }

  return {
    title: `要点 ${index + 1}`,
    content: toText(node) || "暂无详细内容",
  };
}

function inferLogicType(
  candidate: LogicType | null,
  sectionLike: any,
  nodes: InfographicNode[],
  index: number,
  reportKind: ReportKind
): LogicType {
  const sectionText = compact(
    [
      toText(sectionLike?.section_title || sectionLike?.title),
      toText(sectionLike?.visual_intent || sectionLike?.intent),
      toText(sectionLike?.layout_strategy),
    ]
      .filter(Boolean)
      .join(" ")
  );

  const numericCount = nodes.filter((node) => parseNumericValue(node.value) != null).length;
  const hasCells = nodes.some((node) => Array.isArray(node.cells) && node.cells.length > 0);
  const hasPercent = nodes.some((node) => isPercentValue(node.value) || isPercentValue(node.content));
  const hasAbsolute = nodes.some((node) => {
    const num = parseNumericValue(node.value);
    return num != null && !isPercentValue(node.value);
  });
  const timeLike =
    nodes.filter((node) => isTimeLikeLabel(node.title)).length >=
    Math.max(2, Math.floor(nodes.length / 2));
  const longCategory = nodes.some((node) => node.title.length >= 10);

  if (reportKind === "strategic") {
    if (/SWOT/i.test(sectionText)) return LogicType.SWOT;
    if (/路线图|Roadmap|里程碑|计划/i.test(sectionText)) return LogicType.ROADMAP;
    if (/对比|竞品|比较|vs/i.test(sectionText)) return LogicType.COMPARISON;
    if (/洞察|Insight|结论|建议|策略/i.test(sectionText)) return LogicType.INSIGHT;
    if (candidate && !CHART_LOGIC_TYPES.has(candidate)) return candidate;
    return index === 0 ? LogicType.INSIGHT : LogicType.PARALLEL;
  }

  if (hasCells || nodes.length > 8) return LogicType.TABLE;
  if (timeLike && numericCount >= 2) return nodes.length >= 6 ? LogicType.AREA : LogicType.LINE;
  if (numericCount >= 2 && hasPercent && hasAbsolute) return LogicType.COMBO_CHART;

  if (numericCount >= 2) {
    if (hasPercent && nodes.length <= 6) {
      return nodes.length <= 4 ? LogicType.DONUT : LogicType.PIE;
    }
    return longCategory ? LogicType.HORIZONTAL_BAR : LogicType.BAR;
  }

  if (/矩阵|matrix/i.test(sectionText)) return LogicType.MATRIX;
  if (/时间线|timeline/i.test(sectionText)) return LogicType.TIMELINE;

  if (candidate && !CHART_LOGIC_TYPES.has(candidate)) return candidate;
  if (index === 0) return LogicType.HERO;
  if (nodes.length >= 4) return LogicType.BENTO_GRID;
  return LogicType.PARALLEL;
}

function inferColumnType(value: string): "text" | "number" | "percentage" | "status" {
  const text = toText(value);
  if (!text) return "text";
  if (/完成|达成|正常|异常|高|中|低|风险|稳定/.test(text)) return "status";
  if (isPercentValue(text)) return "percentage";
  if (parseNumericValue(text) != null) return "number";
  return "text";
}

function normalizeSection(sectionLike: any, index: number, reportKind: ReportKind): InfographicSection {
  const rawNodes = Array.isArray(sectionLike?.nodes)
    ? sectionLike.nodes
    : Array.isArray(sectionLike?.items)
      ? sectionLike.items
      : Array.isArray(sectionLike?.points)
        ? sectionLike.points
        : [];

  const nodes = rawNodes.length
    ? rawNodes.map((node: any, idx: number) => nodeFromUnknown(node, idx)).slice(0, 12)
    : [
        {
          title: toText(sectionLike?.section_title || sectionLike?.title || `模块 ${index + 1}`),
          content:
            toText(sectionLike?.summary || sectionLike?.content || sectionLike?.description) ||
            "暂无详细内容",
        },
      ];

  const candidateLogic = normalizeLogicType(
    sectionLike?.logic_type ||
      sectionLike?.template_id ||
      sectionLike?.visual_intent ||
      sectionLike?.type
  );

  const logicType = inferLogicType(candidateLogic, sectionLike, nodes, index, reportKind);
  const sectionTitle =
    toText(sectionLike?.section_title || sectionLike?.title || sectionLike?.name) ||
    `模块 ${index + 1}`;

  const normalized: InfographicSection = {
    logic_type: logicType,
    template_id:
      toText(sectionLike?.template_id || sectionLike?.template || `section_${index + 1}`).toLowerCase() ||
      `section_${index + 1}`,
    section_title: sectionTitle,
    visual_intent: toText(sectionLike?.visual_intent || sectionLike?.intent || "summary") || "summary",
    layout_strategy: toText(sectionLike?.layout_strategy),
    density:
      sectionLike?.density === "low" ||
      sectionLike?.density === "high" ||
      sectionLike?.density === "medium"
        ? sectionLike.density
        : "medium",
    nodes,
  };

  if (logicType === LogicType.TABLE) {
    const rowCellLen = Math.max(...nodes.map((node) => (Array.isArray(node.cells) ? node.cells.length : 0)), 0);
    const columnCount = rowCellLen > 0 ? rowCellLen : 3;

    const headers = Array.isArray(sectionLike?.axis_labels)
      ? sectionLike.axis_labels.map((item: unknown) => toText(item)).filter(Boolean)
      : [];

    while (headers.length < columnCount) {
      headers.push(headers.length === 0 ? "项目" : `字段${headers.length + 1}`);
    }

    const sampleRow =
      nodes.find((node) => Array.isArray(node.cells) && node.cells.length > 0)?.cells || [];
    const columnTypes = headers.map((_, colIndex) => inferColumnType(toText(sampleRow[colIndex] || "")));

    normalized.axis_labels = headers;
    normalized.column_types = columnTypes;
  }

  if (logicType === LogicType.COMBO_CHART) {
    const axisLabels = Array.isArray(sectionLike?.axis_labels)
      ? sectionLike.axis_labels.map((item: unknown) => toText(item)).filter(Boolean)
      : [];
    normalized.axis_labels = axisLabels.length >= 2 ? axisLabels.slice(0, 2) : ["绝对值", "比率"];
  }

  return normalized;
}

function extractSectionCandidates(payload: any): any[] {
  if (!payload || typeof payload !== "object") return [];
  const keys = ["sections", "blocks", "modules", "cards", "slides", "items"];
  for (const key of keys) {
    if (Array.isArray(payload[key])) {
      return payload[key];
    }
  }
  return [];
}

function buildFallbackSections(payload: any, reportKind: ReportKind): InfographicSection[] {
  const summary =
    toText(payload?.subtitle || payload?.summary || payload?.report_meta?.summary || payload?.message) ||
    "模型返回内容不完整，建议重试或缩短输入文本。";

  if (reportKind === "strategic") {
    return [
      {
        logic_type: LogicType.INSIGHT,
        template_id: "strategic_fallback_insight",
        section_title: "关键洞察",
        visual_intent: "insight",
        density: "medium",
        nodes: [{ title: "核心判断", content: summary }],
      },
      {
        logic_type: LogicType.ROADMAP,
        template_id: "strategic_fallback_roadmap",
        section_title: "行动建议",
        visual_intent: "roadmap",
        density: "medium",
        nodes: [
          { title: "短期", content: "快速复盘核心指标波动并定位驱动因子。" },
          { title: "中期", content: "按业务线制定分层优化目标并跟踪执行。" },
        ],
      },
    ];
  }

  return [
    {
      logic_type: LogicType.HERO,
      template_id: "visual_fallback_hero",
      section_title: "执行摘要",
      visual_intent: "summary",
      density: "medium",
      nodes: [{ title: "核心摘要", content: summary }],
    },
  ];
}

function ensureVisualCoverage(sections: InfographicSection[]): InfographicSection[] {
  const next = [...sections];

  if (next.length > 0 && next[0].logic_type !== LogicType.HERO) {
    const heroNodes = next
      .flatMap((section) => section.nodes)
      .slice(0, 4)
      .map((node, idx) => ({
        title: node.title || `要点 ${idx + 1}`,
        content: node.content || "",
        ...(node.value ? { value: node.value } : {}),
      }));

    next.unshift({
      logic_type: LogicType.HERO,
      template_id: "auto_hero",
      section_title: "执行摘要",
      visual_intent: "summary",
      density: "medium",
      nodes: heroNodes.length ? heroNodes : [{ title: "核心摘要", content: "请查看下方详细分析。" }],
    });
  }

  const hasChart = next.some(
    (section) => CHART_LOGIC_TYPES.has(section.logic_type) || section.logic_type === LogicType.TABLE
  );
  if (!hasChart) {
    const candidateIndex = next.findIndex((section) =>
      section.nodes.some((node) => parseNumericValue(node.value) != null)
    );
    if (candidateIndex >= 0) {
      const section = next[candidateIndex];
      const hasTime = section.nodes.filter((node) => isTimeLikeLabel(node.title)).length >= 2;
      next[candidateIndex] = {
        ...section,
        logic_type: hasTime ? LogicType.LINE : LogicType.BAR,
        template_id: hasTime ? "auto_line" : "auto_bar",
      };
    }
  }

  return next;
}

function ensureStrategicCoverage(sections: InfographicSection[]): InfographicSection[] {
  const next = [...sections];
  const hasInsight = next.some((section) => section.logic_type === LogicType.INSIGHT);
  const hasRoadmap = next.some((section) => section.logic_type === LogicType.ROADMAP);

  if (!hasInsight) {
    const source = next[0]?.nodes?.[0];
    next.unshift({
      logic_type: LogicType.INSIGHT,
      template_id: "auto_insight",
      section_title: "关键洞察",
      visual_intent: "insight",
      density: "medium",
      nodes: [
        {
          title: source?.title || "核心洞察",
          content: source?.content || "建议优先处理关键指标波动及其业务驱动因素。",
        },
      ],
    });
  }

  if (!hasRoadmap) {
    next.push({
      logic_type: LogicType.ROADMAP,
      template_id: "auto_roadmap",
      section_title: "行动路线图",
      visual_intent: "roadmap",
      density: "medium",
      nodes: [
        { title: "短期（1-2周）", content: "确认关键问题、设定量化目标并明确责任人。" },
        { title: "中期（1-2月）", content: "实施优化动作，按周追踪转化与成本指标。" },
        { title: "长期（1季度）", content: "固化数据机制，形成持续复盘与迭代闭环。" },
      ],
    });
  }

  return next;
}

function strategicFromVisual(visual: InfographicData): InfographicData {
  const insightNodes = (visual.sections || []).slice(0, 3).map((section, idx) => ({
    title: section.section_title || `洞察 ${idx + 1}`,
    content: toText(section.nodes?.[0]?.content || section.nodes?.[0]?.title || "关注关键指标变化"),
  }));

  return normalizeInfographicData(
    {
      title: `${visual.title} - 战略洞察`,
      subtitle: "基于可视化结果自动提炼",
      suggested_theme: visual.suggested_theme,
      sections: [
        {
          logic_type: "INSIGHT",
          template_id: "strategic_insight",
          section_title: "关键洞察",
          visual_intent: "insight",
          density: "medium",
          nodes: insightNodes.length
            ? insightNodes
            : [{ title: "核心洞察", content: "建议从营收、利润与区域结构三维度复盘。" }],
        },
        {
          logic_type: "ROADMAP",
          template_id: "strategic_roadmap",
          section_title: "行动路线图",
          visual_intent: "roadmap",
          density: "medium",
          nodes: [
            { title: "短期（1-2周）", content: "聚焦核心指标异常点，完成业务归因。" },
            { title: "中期（1-2月）", content: "围绕高增长区域优化资源投入与转化效率。" },
            { title: "长期（1个季度）", content: "建立可复用的数据看板与策略复盘机制。" },
          ],
        },
      ],
    },
    "strategic"
  );
}

export function normalizeInfographicData(payload: any, reportKind: ReportKind): InfographicData {
  const base = payload && typeof payload === "object" ? payload : {};
  const theme = normalizeTheme(base.suggested_theme || base.theme);

  const candidates = extractSectionCandidates(base);
  let sections = candidates
    .map((section: any, index: number) => normalizeSection(section, index, reportKind))
    .filter((section) => Array.isArray(section.nodes) && section.nodes.length > 0)
    .slice(0, reportKind === "visual" ? 8 : 6);

  if (!sections.length) {
    sections = buildFallbackSections(base, reportKind);
  }

  sections = reportKind === "visual" ? ensureVisualCoverage(sections) : ensureStrategicCoverage(sections);

  const title =
    toText(base.title || base.report_meta?.title) ||
    (reportKind === "visual" ? "数据可视化报告" : "战略洞察报告");
  const subtitle =
    toText(base.subtitle || base.report_meta?.subtitle || base.report_meta?.summary) || undefined;

  return {
    title,
    ...(subtitle ? { subtitle } : {}),
    sections,
    suggested_theme: theme,
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
  const visual = normalizeInfographicData(result?.visual, "visual");
  const strategic = result?.strategic
    ? normalizeInfographicData(result?.strategic, "strategic")
    : strategicFromVisual(visual);

  if (result.searchData && onSearchComplete) {
    onSearchComplete(result.searchData);
  }
  if (onVisualChunk) onVisualChunk(visual);
  if (onVisualComplete) onVisualComplete(visual);
  if (onStrategicChunk) onStrategicChunk(strategic);

  return { visual, strategic };
}

export async function regenerateSection(sectionTitle: string, nodes: any[]): Promise<InfographicSection> {
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

  const payload = response.data as any;
  if (payload && Array.isArray(payload.sections) && payload.sections.length > 0) {
    return normalizeSection(payload.sections[0], 0, "strategic");
  }

  return normalizeSection(payload, 0, "strategic");
}
