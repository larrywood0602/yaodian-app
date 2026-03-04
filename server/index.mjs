import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import {
  checkMemfireHealth,
  createAdminMemfireClient,
  createUserMemfireClient,
  getBearerToken,
  memfireDelete,
  memfireInsert,
  memfireSelect,
  memfireUpdate,
  memfireUpsert,
  requireAdminToken,
} from "./memfire.mjs";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || "0.0.0.0";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, "..", "dist");

app.use(express.json({ limit: "8mb" }));
app.use((_, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Admin-Token");
  res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  next();
});
app.options("*", (_req, res) => res.sendStatus(204));

const QWEN_API_KEY = process.env.QWEN_API_KEY || "";
const QWEN_BASE_URL =
  process.env.QWEN_BASE_URL || "https://dashscope.aliyuncs.com/compatible-mode/v1";
const QWEN_MODEL = process.env.QWEN_MODEL || "qwen3.5-plus";
const QWEN_REQUEST_TIMEOUT_MS = Number(process.env.QWEN_REQUEST_TIMEOUT_MS || 120000);
const ANALYZE_TIMEOUT_MS = Number(process.env.ANALYZE_TIMEOUT_MS || 240000);
const QWEN_MAX_TOKENS = Number(process.env.QWEN_MAX_TOKENS || 1400);
const VISUAL_SECTION_LIMIT = Number(process.env.VISUAL_SECTION_LIMIT || 4);
const STRATEGIC_SECTION_LIMIT = Number(process.env.STRATEGIC_SECTION_LIMIT || 4);
const QWEN_ENABLE_THINKING =
  String(process.env.QWEN_ENABLE_THINKING || "false").toLowerCase() === "true";
const ANALYZE_FAST_MODE =
  String(process.env.ANALYZE_FAST_MODE || "true").toLowerCase() === "true";
const ANALYZE_FAST_MAX_TOKENS = Number(process.env.ANALYZE_FAST_MAX_TOKENS || 450);
const ANALYZE_FAST_VISUAL_SECTION_LIMIT = Number(process.env.ANALYZE_FAST_VISUAL_SECTION_LIMIT || 2);
const ANALYZE_FAST_STRATEGIC_SECTION_LIMIT = Number(
  process.env.ANALYZE_FAST_STRATEGIC_SECTION_LIMIT || 2
);

const VISUAL_SYSTEM_INSTRUCTION = `你是一位顶级的数据可视化专家与交互式报告设计师，擅长复刻 Gemini 和 Chronicle 的专业动态布局风格。
你的任务是：
1. **数据审计与全量抓取 (Data Audit & Full Extraction)**：
   - **强制步骤**：在输出 JSON 之前，请先在思考区列出文中所有的关键指标、数值、日期和核心结论。
   - **严禁遗漏**：确保报告覆盖原文 100% 的核心数据点。如果原文包含多个维度的对比，必须在报告中体现。
   - **拒绝模糊**：严禁使用“表现良好”、“显著提升”等词汇，必须表述为“指标 + 数值 + 趋势/对比”（例如：“营收增长 15% 至 2.4 亿”）。
2. **交互式仪表盘布局 (Interactive Dashboard Layout)**：
   - 报告不再是简单的幻灯片堆叠，而是一个连贯的、可交互的动态网页。
   - **必须以 HERO 开场**：HERO 模块作为执行摘要，必须包含 4-6 个核心 KPI 指标或关键发现，严禁内容空洞。
   - 灵活使用 BENTO_GRID 和 ADAPTIVE_GRID，创造错落有致的视觉节奏。
3. **图表选择协议 (Chart Selection Protocol - 强制执行)**：
   - **TABLE (表格)**：当数据点超过 8 个，或单条数据包含超过 2 个维度的数值，或内容包含长文本描述时，**必须**使用表格。
   - **LINE/AREA (折线/面积图)**：仅用于展示随时间变化的连续趋势。
   - **BAR/HORIZONTAL_BAR (柱状图)**：用于分类数据的对比。如果分类名称较长，强制使用 HORIZONTAL_BAR。
   - **COMBO_CHART (复合图表)**：当需要同时展示“绝对值”和“比率/趋势”时使用。
4. **视觉风格**：极简、高对比度、Apple 风格的留白与排版。
输出格式：纯 JSON。`;

const STRATEGIC_SYSTEM_INSTRUCTION = `你是一位顶级的战略咨询顾问与交互式 UI 设计师，擅长将复杂战略转化为直观、可交互的数字资产。
你的任务是：
1. **证据链驱动的战略洞察 (Evidence-based Insights)**：
   - 每一项战略建议必须直接关联到原始数据或可视化报告中的具体指标。
   - **严禁空洞表述**：避免咨询行业的“套话”，每一条建议都必须具备可落地的操作性。
   - 使用 SWOT 矩阵、ROADMAP 等组件时，要确保其逻辑严密且具备深度。
2. **全文本上下文理解**：
   - 你将同时获得原始文本和初步的数据报告。你的任务是挖掘数据背后的“为什么”以及“下一步该做什么”。
   - 识别原文中的核心矛盾、潜在风险和战略机遇点，并将其转化为可视化的 INSIGHT 或 COMPARISON 模块。
3. **视觉节奏感**：
   - 模拟 Gemini 的 Visual Layout，通过不同尺寸的 Bento 块创造沉浸式阅读体验。
输出格式：纯 JSON。`;

const DUAL_REPORT_SYSTEM_INSTRUCTION = `你是企业数据分析与战略可视化助手。
任务：根据用户输入，一次性输出两个报告对象 visual 与 strategic。
必须返回纯 JSON，对象结构固定如下：
{
  "visual": { "title": "...", "subtitle": "...", "suggested_theme": {...}, "sections": [...] },
  "strategic": { "title": "...", "subtitle": "...", "suggested_theme": {...}, "sections": [...] }
}

严格规则：
1) 只输出 JSON，不要解释文字；
2) visual 与 strategic 都必须有 sections 数组；
3) 每个 sections 的元素都必须包含 logic_type/template_id/section_title/nodes；
4) 每个 nodes 元素至少包含 title/content；
5) 每个报告 sections 数量控制在 3-4，每个 section 的 nodes 数量控制在 2-5。`;

const DEFAULT_THEME = {
  primary: "#007AFF",
  secondary: "#86868B",
  background: "#F5F5F7",
  text: "#1D1D1F",
};

const LOGIC_TYPE_VALUES = new Set([
  "PROGRESSIVE",
  "PARALLEL",
  "CORE",
  "CONTRAST",
  "HIERARCHY",
  "TIMELINE",
  "SWOT",
  "FUNNEL",
  "GRID",
  "CYCLE",
  "MINDMAP",
  "PYRAMID",
  "VENN",
  "RADAR",
  "BENTO",
  "STEP",
  "GEAR",
  "RIBBON",
  "HONEYCOMB",
  "PILL",
  "BAR",
  "LINE",
  "PIE",
  "RANKING",
  "RADIAL_BAR",
  "TABLE",
  "COMBO_CHART",
  "DONUT",
  "AREA",
  "SCATTER",
  "WATERFALL",
  "GAUGE",
  "RADAR_CHART",
  "STACKED_LINE",
  "STACKED_AREA",
  "HORIZONTAL_BAR",
  "NIGHTINGALE_ROSE",
  "MATRIX",
  "ROADMAP",
  "INSIGHT",
  "COMPARISON",
  "BENTO_GRID",
  "HERO",
  "ADAPTIVE_GRID",
]);

const LOGIC_TYPE_ALIASES = {
  TIMELINE_CHART: "TIMELINE",
  ROAD_MAP: "ROADMAP",
  ROADMAP_CHART: "ROADMAP",
  BARCHART: "BAR",
  LINECHART: "LINE",
  PIECHART: "PIE",
  HORIZONTALBAR: "HORIZONTAL_BAR",
  RADIALBAR: "RADIAL_BAR",
  RADARCHART: "RADAR_CHART",
  STACKEDLINE: "STACKED_LINE",
  STACKEDAREA: "STACKED_AREA",
  BENTOGRID: "BENTO_GRID",
};

function toText(value) {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function normalizeLogicType(input) {
  const raw = String(input || "").trim().toUpperCase().replace(/[\s-]+/g, "_");
  const mapped = LOGIC_TYPE_ALIASES[raw] || raw;
  return LOGIC_TYPE_VALUES.has(mapped) ? mapped : "PARALLEL";
}

function normalizeTheme(themeInput) {
  const theme = themeInput && typeof themeInput === "object" ? themeInput : {};
  return {
    primary: toText(theme.primary) || DEFAULT_THEME.primary,
    secondary: toText(theme.secondary) || DEFAULT_THEME.secondary,
    background: toText(theme.background) || DEFAULT_THEME.background,
    text: toText(theme.text) || DEFAULT_THEME.text,
  };
}

function normalizeNodes(nodesInput) {
  const nodes = Array.isArray(nodesInput) ? nodesInput : [];
  const normalized = nodes
    .map((node, index) => {
      if (node && typeof node === "object") {
        const title = toText(node.title || node.name || node.label || `要点 ${index + 1}`);
        const content = toText(
          node.content ||
            node.description ||
            node.desc ||
            node.text ||
            node.summary ||
            node.detail
        );
        const value = node.value != null ? toText(node.value) : undefined;
        const icon = node.icon != null ? toText(node.icon) : undefined;
        const color = node.color != null ? toText(node.color) : undefined;
        const cells = Array.isArray(node.cells)
          ? node.cells.map((cell) => toText(cell))
          : undefined;
        return {
          title: title || `要点 ${index + 1}`,
          content: content || "暂无详细内容",
          ...(value ? { value } : {}),
          ...(icon ? { icon } : {}),
          ...(color ? { color } : {}),
          ...(cells && cells.length ? { cells } : {}),
        };
      }
      return {
        title: `要点 ${index + 1}`,
        content: toText(node) || "暂无详细内容",
      };
    })
    .filter((node) => node.title || node.content)
    .slice(0, 10);

  return normalized.length
    ? normalized
    : [{ title: "核心结论", content: "当前返回结果缺少可渲染节点，建议重试生成。" }];
}

function normalizeSections(sectionsInput, sectionLimit) {
  const sections = Array.isArray(sectionsInput) ? sectionsInput : [];
  return sections
    .map((section, index) => {
      if (!section || typeof section !== "object") {
        return {
          logic_type: "PARALLEL",
          template_id: `section_${index + 1}`,
          section_title: `模块 ${index + 1}`,
          visual_intent: "summary",
          density: "medium",
          nodes: normalizeNodes([section]),
        };
      }
      return {
        logic_type: normalizeLogicType(section.logic_type || section.type),
        template_id: toText(section.template_id || section.template || `section_${index + 1}`),
        section_title: toText(
          section.section_title || section.title || section.name || `模块 ${index + 1}`
        ),
        visual_intent: toText(section.visual_intent || section.intent || "summary"),
        density: ["low", "medium", "high"].includes(String(section.density))
          ? String(section.density)
          : "medium",
        nodes: normalizeNodes(section.nodes || section.items || section.points),
      };
    })
    .filter((section) => Array.isArray(section.nodes) && section.nodes.length > 0)
    .slice(0, sectionLimit);
}

function legacySectionsFromPayload(payload, sectionLimit) {
  const sources = [
    payload?.blocks,
    payload?.modules,
    payload?.cards,
    payload?.slides,
    payload?.items,
  ];
  for (const source of sources) {
    const normalized = normalizeSections(source, sectionLimit);
    if (normalized.length) return normalized;
  }

  // If model returned meta-style object, convert top-level fields into one section.
  const fallbackText = [
    toText(payload?.summary),
    toText(payload?.report_meta?.summary),
    toText(payload?.analysis),
    toText(payload?.insight),
    toText(payload?.conclusion),
  ]
    .filter(Boolean)
    .join("\n");

  if (fallbackText) {
    return [
      {
        logic_type: "HERO",
        template_id: "hero_fallback",
        section_title: "执行摘要",
        visual_intent: "summary",
        density: "medium",
        nodes: normalizeNodes([{ title: "核心摘要", content: fallbackText }]),
      },
    ];
  }

  return [];
}

function normalizeReportPayload(payload, label, sectionLimit) {
  const safe = payload && typeof payload === "object" ? payload : {};
  const title = toText(safe.title || safe.report_meta?.title) || (label === "visual" ? "可视化报告" : "战略洞察报告");
  const subtitle = toText(safe.subtitle || safe.report_meta?.subtitle || safe.report_meta?.summary);
  const suggested_theme = normalizeTheme(safe.suggested_theme || safe.theme);
  let sections = normalizeSections(safe.sections, sectionLimit);
  if (!sections.length) {
    sections = legacySectionsFromPayload(safe, sectionLimit);
  }
  if (!sections.length) {
    sections = [
      {
        logic_type: "HERO",
        template_id: "empty_fallback",
        section_title: "结果摘要",
        visual_intent: "summary",
        density: "medium",
        nodes: normalizeNodes([
          {
            title: "提示",
            content: "模型返回内容为空或格式不兼容，请重试或缩短输入内容。",
          },
        ]),
      },
    ];
  }
  return { title, subtitle, suggested_theme, sections };
}

function safeParseReportJson(text, label, sectionLimit) {
  try {
    const parsed = JSON.parse(text || "{}");
    return normalizeReportPayload(parsed, label, sectionLimit);
  } catch {
    return normalizeReportPayload({ summary: toText(text) }, label, sectionLimit);
  }
}

function strategicFromVisual(visual, sectionLimit = STRATEGIC_SECTION_LIMIT) {
  const insightNodes = (visual.sections || [])
    .slice(0, 3)
    .map((section, idx) => ({
      title: section.section_title || `洞察 ${idx + 1}`,
      content: toText(section.nodes?.[0]?.content || section.nodes?.[0]?.title || "关注关键指标变化"),
    }));

  return normalizeReportPayload(
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
    "strategic",
    sectionLimit
  );
}

function safeParseDualReportJson(
  text,
  visualSectionLimit = VISUAL_SECTION_LIMIT,
  strategicSectionLimit = STRATEGIC_SECTION_LIMIT
) {
  try {
    const parsed = JSON.parse(text || "{}");
    const visualCandidate =
      parsed?.visual || parsed?.data?.visual || parsed?.report?.visual || parsed?.result?.visual;
    const strategicCandidate =
      parsed?.strategic || parsed?.data?.strategic || parsed?.report?.strategic || parsed?.result?.strategic;

    const visual = normalizeReportPayload(
      visualCandidate || parsed,
      "visual",
      visualSectionLimit
    );
    const strategic = strategicCandidate
      ? normalizeReportPayload(strategicCandidate, "strategic", strategicSectionLimit)
      : strategicFromVisual(visual, strategicSectionLimit);
    return { visual, strategic };
  } catch {
    const visual = safeParseReportJson(text, "visual", visualSectionLimit);
    const strategic = strategicFromVisual(visual, strategicSectionLimit);
    return { visual, strategic };
  }
}

function extractJson(content) {
  const trimmed = String(content || "").trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  return (fenced?.[1] || trimmed).trim();
}

function isRetryable(error) {
  const msg = String(error?.message || "").toUpperCase();
  return (
    msg.includes("503") ||
    msg.includes("UNAVAILABLE") ||
    msg.includes("TIMEOUT") ||
    msg.includes("429")
  );
}

function createTimeoutError(label, timeoutMs) {
  const error = new Error(`${label} timed out after ${timeoutMs}ms`);
  error.status = 504;
  return error;
}

async function fetchWithTimeout(url, init, timeoutMs, label) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw createTimeoutError(label, timeoutMs);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function withTimeout(taskFn, timeoutMs, label) {
  let timer = null;
  try {
    return await Promise.race([
      taskFn(),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(createTimeoutError(label, timeoutMs)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

async function qwenChat(prompt, systemInstruction, options = {}) {
  if (!QWEN_API_KEY) {
    throw new Error("QWEN_API_KEY is missing on server");
  }
  const maxTokens = Number(options.maxTokens || QWEN_MAX_TOKENS);

  const response = await fetchWithTimeout(
    `${QWEN_BASE_URL}/chat/completions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${QWEN_API_KEY}`,
      },
      body: JSON.stringify({
        model: QWEN_MODEL,
        messages: [
          {
            role: "system",
            content: `${systemInstruction}\n请严格输出 JSON，不要输出解释文本。`,
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.2,
        max_tokens: maxTokens,
        extra_body: {
          enable_thinking: QWEN_ENABLE_THINKING,
        },
      }),
    },
    QWEN_REQUEST_TIMEOUT_MS,
    "Qwen chat"
  );

  if (!response.ok) {
    let errorMessage = response.statusText;
    try {
      const errorData = await response.json();
      errorMessage = errorData?.error?.message || errorMessage;
    } catch {
      // ignore json parsing errors
    }
    throw new Error(`Qwen API error: ${response.status} ${errorMessage}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content || typeof content !== "string") {
    throw new Error("Invalid response from Qwen");
  }
  return extractJson(content);
}

async function generateWithRetry(prompt, systemInstruction, options = {}) {
  let attempt = 0;
  const maxRetries = 3;
  while (attempt < maxRetries) {
    try {
      return await qwenChat(prompt, systemInstruction, options);
    } catch (error) {
      attempt += 1;
      if (isRetryable(error) && attempt < maxRetries) {
        const delay = 1000 * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
  throw new Error("Qwen request failed");
}

async function searchWebData(query, target) {
  if (!QWEN_API_KEY) {
    return { content: "", sources: [] };
  }

  const prompt = `你是一位专业的数据分析师。请针对以下主题进行深度联网搜索，重点关注：官方网站、最新财报、公开报道、权威调研报告。
  
分析目标：${target}
用户输入/关键词：${query}
  
任务要求：
1. 提取最新的真实数据点（如营收、增长率、市场份额、产品参数等）。
2. 汇总最新的战略动态、重大事件或风险点。
3. 确保数据具有时效性（优先选择2024-2025年的数据）。
4. 结构化输出核心事实，以便后续进行可视化分析。
  
请直接输出事实汇总，无需多余解释。`;

  const response = await fetchWithTimeout(
    `${QWEN_BASE_URL}/chat/completions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${QWEN_API_KEY}`,
      },
      body: JSON.stringify({
        model: QWEN_MODEL,
        messages: [
          {
            role: "system",
            content: "你是一个具备联网搜索能力的专业助手。请通过搜索提供准确、实时的商业和技术数据。",
          },
          { role: "user", content: prompt },
        ],
        extra_body: {
          enable_thinking: QWEN_ENABLE_THINKING,
          enable_search: true,
        },
      }),
    },
    QWEN_REQUEST_TIMEOUT_MS,
    "Qwen search"
  );

  if (!response.ok) {
    let errorMessage = response.statusText;
    try {
      const errorData = await response.json();
      errorMessage = errorData?.error?.message || errorMessage;
    } catch {
      // ignore json parsing errors
    }
    throw new Error(`Qwen search API error: ${response.status} ${errorMessage}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content || "";
  return {
    content,
    sources: [],
  };
}

function sendApiError(res, error) {
  const status = Number(error?.status) || 500;
  res.status(status).json({ error: String(error?.message || error) });
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, model: QWEN_MODEL });
});

app.get("/api/qwen/health", async (_req, res) => {
  try {
    if (!QWEN_API_KEY) {
      return res.status(500).json({
        ok: false,
        configured: false,
        message: "QWEN_API_KEY is missing on server",
        model: QWEN_MODEL,
      });
    }

    const response = await fetchWithTimeout(
      `${QWEN_BASE_URL}/chat/completions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${QWEN_API_KEY}`,
        },
        body: JSON.stringify({
          model: QWEN_MODEL,
          messages: [{ role: "user", content: "ping" }],
          max_tokens: 1,
          temperature: 0,
          extra_body: {
            enable_thinking: false,
          },
        }),
      },
      30000,
      "Qwen health check"
    );

    if (!response.ok) {
      let errorMessage = response.statusText;
      try {
        const errorData = await response.json();
        errorMessage = errorData?.error?.message || errorMessage;
      } catch {
        // ignore json parse errors
      }
      return res.status(502).json({
        ok: false,
        configured: true,
        model: QWEN_MODEL,
        message: `Qwen health check failed: HTTP ${response.status} ${errorMessage}`,
      });
    }

    return res.json({
      ok: true,
      configured: true,
      model: QWEN_MODEL,
      message: "Qwen model is reachable",
    });
  } catch (error) {
    return sendApiError(res, error);
  }
});

app.post("/api/search", async (req, res) => {
  try {
    const { query = "", target = "" } = req.body || {};
    const result = await searchWebData(query, target);
    res.json(result);
  } catch (error) {
    sendApiError(res, error);
  }
});

app.post("/api/analyze", async (req, res) => {
  try {
    const result = await withTimeout(async () => {
      const { text = "", analysisTarget = "自定义", useWebSearch = false } = req.body || {};
      const visualSectionLimit = ANALYZE_FAST_MODE
        ? Math.min(VISUAL_SECTION_LIMIT, ANALYZE_FAST_VISUAL_SECTION_LIMIT)
        : VISUAL_SECTION_LIMIT;
      const strategicSectionLimit = ANALYZE_FAST_MODE
        ? Math.min(STRATEGIC_SECTION_LIMIT, ANALYZE_FAST_STRATEGIC_SECTION_LIMIT)
        : STRATEGIC_SECTION_LIMIT;
      const visualSectionMin = Math.max(1, visualSectionLimit - 1);
      const strategicSectionMin = Math.max(1, strategicSectionLimit - 1);
      const analyzeMaxTokens = ANALYZE_FAST_MODE
        ? Math.min(QWEN_MAX_TOKENS, ANALYZE_FAST_MAX_TOKENS)
        : QWEN_MAX_TOKENS;

      let enhancedText = text;
      let searchData = "";

      if (useWebSearch) {
        const searchResult = await searchWebData(text, analysisTarget);
        if (searchResult.content) {
          searchData = searchResult.content;
          enhancedText = `${text}\n\n【联网搜索增强数据】：\n${searchResult.content}`;
        }
      }

      const dualPrompt = `分析目标：${analysisTarget}
${useWebSearch ? "请优先使用联网搜索增强数据。" : ""}

请基于以下输入，一次性生成两个报告对象 visual 与 strategic：
1) visual：用于数据展示，突出关键指标、趋势和对比；
2) strategic：用于战略建议，给出可执行动作与路线图。

输出约束：
- 只输出 JSON 对象；
- 顶层必须是 visual 与 strategic 两个字段；
- visual.sections 限制为 ${visualSectionMin}-${visualSectionLimit}；
- strategic.sections 限制为 ${strategicSectionMin}-${strategicSectionLimit}；
- 每个 section 的 nodes 限制为 2-5；
- 每条 content 不超过 40 个汉字，避免冗长段落。

用户输入内容：
${enhancedText}

当前模式：${ANALYZE_FAST_MODE ? "FAST" : "FULL"}（请优先保证响应速度）`;

      const dualText = await generateWithRetry(dualPrompt, DUAL_REPORT_SYSTEM_INSTRUCTION, {
        maxTokens: analyzeMaxTokens,
      });
      const { visual, strategic } = safeParseDualReportJson(
        dualText,
        visualSectionLimit,
        strategicSectionLimit
      );

      return { visual, strategic, searchData };
    }, ANALYZE_TIMEOUT_MS, "Analyze request");
    res.json(result);
  } catch (error) {
    sendApiError(res, error);
  }
});

app.post("/api/regenerate", async (req, res) => {
  try {
    const { sectionTitle = "", nodes = [] } = req.body || {};
    const prompt = `请重新生成以下段落的内容，使其更具视觉吸引力和逻辑性。
标题：${sectionTitle}
当前内容：${JSON.stringify(nodes)}

请返回一个符合 InfographicSection 结构的 JSON 对象。`;

    const text = await generateWithRetry(prompt, STRATEGIC_SYSTEM_INSTRUCTION);
    const normalized = safeParseReportJson(text, "strategic", 1);
    const section = normalized.sections[0] || {
      logic_type: "PARALLEL",
      template_id: "regenerate_fallback",
      section_title: sectionTitle || "重生成模块",
      visual_intent: "summary",
      density: "medium",
      nodes: normalizeNodes(nodes),
    };
    res.json(section);
  } catch (error) {
    sendApiError(res, error);
  }
});

app.get("/api/memfire/health", async (_req, res) => {
  try {
    const result = await checkMemfireHealth();
    res.status(result.ok ? 200 : 500).json(result);
  } catch (error) {
    sendApiError(res, error);
  }
});

app.post("/api/memfire/admin/select", async (req, res) => {
  try {
    requireAdminToken(req);
    const client = createAdminMemfireClient();
    const rows = await memfireSelect(client, req.body || {});
    res.json({ rows });
  } catch (error) {
    sendApiError(res, error);
  }
});

app.post("/api/memfire/admin/insert", async (req, res) => {
  try {
    requireAdminToken(req);
    const client = createAdminMemfireClient();
    const rows = await memfireInsert(client, req.body || {});
    res.json({ rows });
  } catch (error) {
    sendApiError(res, error);
  }
});

app.post("/api/memfire/admin/upsert", async (req, res) => {
  try {
    requireAdminToken(req);
    const client = createAdminMemfireClient();
    const rows = await memfireUpsert(client, req.body || {});
    res.json({ rows });
  } catch (error) {
    sendApiError(res, error);
  }
});

app.post("/api/memfire/admin/update", async (req, res) => {
  try {
    requireAdminToken(req);
    const client = createAdminMemfireClient();
    const rows = await memfireUpdate(client, req.body || {});
    res.json({ rows });
  } catch (error) {
    sendApiError(res, error);
  }
});

app.post("/api/memfire/admin/delete", async (req, res) => {
  try {
    requireAdminToken(req);
    const client = createAdminMemfireClient();
    const rows = await memfireDelete(client, req.body || {});
    res.json({ rows });
  } catch (error) {
    sendApiError(res, error);
  }
});

app.post("/api/memfire/user/select", async (req, res) => {
  try {
    const accessToken = getBearerToken(req);
    const client = createUserMemfireClient(accessToken);
    const rows = await memfireSelect(client, req.body || {});
    res.json({ rows });
  } catch (error) {
    sendApiError(res, error);
  }
});

app.post("/api/memfire/user/insert", async (req, res) => {
  try {
    const accessToken = getBearerToken(req);
    const client = createUserMemfireClient(accessToken);
    const rows = await memfireInsert(client, req.body || {});
    res.json({ rows });
  } catch (error) {
    sendApiError(res, error);
  }
});

app.post("/api/memfire/user/upsert", async (req, res) => {
  try {
    const accessToken = getBearerToken(req);
    const client = createUserMemfireClient(accessToken);
    const rows = await memfireUpsert(client, req.body || {});
    res.json({ rows });
  } catch (error) {
    sendApiError(res, error);
  }
});

app.post("/api/memfire/user/update", async (req, res) => {
  try {
    const accessToken = getBearerToken(req);
    const client = createUserMemfireClient(accessToken);
    const rows = await memfireUpdate(client, req.body || {});
    res.json({ rows });
  } catch (error) {
    sendApiError(res, error);
  }
});

app.post("/api/memfire/user/delete", async (req, res) => {
  try {
    const accessToken = getBearerToken(req);
    const client = createUserMemfireClient(accessToken);
    const rows = await memfireDelete(client, req.body || {});
    res.json({ rows });
  } catch (error) {
    sendApiError(res, error);
  }
});

app.use(express.static(distDir));
app.get("*", (_req, res) => {
  res.sendFile(path.join(distDir, "index.html"));
});

app.listen(PORT, HOST, () => {
  console.log(`[api] listening on http://${HOST}:${PORT}`);
});
