export enum LogicType {
  PROGRESSIVE = "PROGRESSIVE", // 递进/流程
  PARALLEL = "PARALLEL",       // 并列/聚合
  CORE = "CORE",               // 核心/放射
  CONTRAST = "CONTRAST",       // 对比/冲突
  HIERARCHY = "HIERARCHY",     // 层次/递减
  TIMELINE = "TIMELINE",       // 时间线
  SWOT = "SWOT",               // SWOT分析
  FUNNEL = "FUNNEL",           // 漏斗模型
  GRID = "GRID",               // 网格布局
  CYCLE = "CYCLE",             // 循环/闭环
  MINDMAP = "MINDMAP",         // 思维导图
  PYRAMID = "PYRAMID",         // 金字塔
  VENN = "VENN",               // 韦恩图
  RADAR = "RADAR",             // 雷达/维度
  BENTO = "BENTO",             // 模块化/Bento
  STEP = "STEP",               // 步骤/阶梯
  GEAR = "GEAR",               // 齿轮联动
  RIBBON = "RIBBON",           // 丝带/流向
  HONEYCOMB = "HONEYCOMB",     // 蜂巢
  PILL = "PILL",               // 药丸/标签
  BAR = "BAR",                 // 柱状图
  LINE = "LINE",               // 折线图
  PIE = "PIE",                 // 饼图
  RANKING = "RANKING",         // 排名/奖牌
  RADIAL_BAR = "RADIAL_BAR",   // 径向进度条
  TABLE = "TABLE",             // 表格
  COMBO_CHART = "COMBO_CHART", // 复合图表
  DONUT = "DONUT",             // 环形图
  AREA = "AREA",               // 面积图
  SCATTER = "SCATTER",         // 散点图
  WATERFALL = "WATERFALL",     // 瀑布图
  GAUGE = "GAUGE",             // 仪表盘
  RADAR_CHART = "RADAR_CHART", // 雷达图表
  STACKED_LINE = "STACKED_LINE", // 堆叠折线图
  STACKED_AREA = "STACKED_AREA", // 堆叠面积图
  HORIZONTAL_BAR = "HORIZONTAL_BAR", // 水平柱状图
  NIGHTINGALE_ROSE = "NIGHTINGALE_ROSE", // 南丁格尔玫瑰图
  MATRIX = "MATRIX",           // 2x2 矩阵 (如 SWOT, 波士顿矩阵)
  ROADMAP = "ROADMAP",         // 路线图/里程碑
  INSIGHT = "INSIGHT",         // 深度洞察/金句
  COMPARISON = "COMPARISON",   // 深度对比 (Prezent.ai 风格)
  BENTO_GRID = "BENTO_GRID",    // 复合 Bento 布局
  HERO = "HERO",               // 英雄/开篇区块
  ADAPTIVE_GRID = "ADAPTIVE_GRID" // 自适应网格
}

export interface InfographicNode {
  title: string;
  content: string;
  icon?: string; // Lucide icon name
  color?: string;
  value?: string | number; // For charts or specific data
  cells?: (string | number)[]; // For multi-column tables
}

export interface InfographicSection {
  logic_type: LogicType;
  template_id: string;
  section_title?: string;
  visual_intent?: string;      // 视觉意图 (e.g., "comparison", "flow", "impact")
  layout_strategy?: string;    // 布局策略说明
  density?: "low" | "medium" | "high"; // 信息密度
  axis_labels?: string[]; // For charts like COMBO_CHART or table headers
  column_types?: ("text" | "number" | "percentage" | "status")[]; // For TABLE
  nodes: InfographicNode[];
}

export interface KnowledgeCard {
  id: string;
  statement: string;
  evidence_refs: string[];
  scope: {
    industry?: string;
    region?: string;
    time?: string;
  };
  tags: string[];
  confidence: 'high' | 'med' | 'low';
  ttl: string; // ISO date string for review
  related_cards: string[]; // IDs of related cards
  versions: {
    version: number;
    timestamp: string;
    changes: string;
  }[];
  source_section: InfographicSection;
  source_report_data?: InfographicData;
  created_at: string;
}

export interface InfographicData {
  title: string;
  subtitle?: string;
  sections: InfographicSection[];
  suggested_theme: {
    primary: string;
    secondary: string;
    background: string;
    text: string;
  };
}
