import React from 'react';
import { InfographicData, LogicType, InfographicSection } from '../types';
import { ProgressiveTemplate } from './templates/ProgressiveTemplate';
import { ParallelTemplate } from './templates/ParallelTemplate';
import { CoreTemplate } from './templates/CoreTemplate';
import { ContrastTemplate } from './templates/ContrastTemplate';
import { HierarchyTemplate } from './templates/HierarchyTemplate';
import { TimelineTemplate } from './templates/TimelineTemplate';
import { FunnelTemplate } from './templates/FunnelTemplate';
import { BentoTemplate } from './templates/BentoTemplate';
import { CycleTemplate } from './templates/CycleTemplate';
import { SwotTemplate } from './templates/SwotTemplate';
import { BarChartTemplate } from './templates/BarChartTemplate';
import { LineChartTemplate } from './templates/LineChartTemplate';
import { RankingTemplate } from './templates/RankingTemplate';
import { RadialBarTemplate } from './templates/RadialBarTemplate';
import { PieChartTemplate } from './templates/PieChartTemplate';
import { TableTemplate } from './templates/TableTemplate';
import { ComboChartTemplate } from './templates/ComboChartTemplate';
import { DonutTemplate } from './templates/DonutTemplate';
import { AreaTemplate } from './templates/AreaTemplate';
import { ScatterTemplate } from './templates/ScatterTemplate';
import { WaterfallTemplate } from './templates/WaterfallTemplate';
import { GaugeTemplate } from './templates/GaugeTemplate';
import { RadarChartTemplate } from './templates/RadarChartTemplate';
import { MatrixTemplate } from './templates/MatrixTemplate';
import { RoadmapTemplate } from './templates/RoadmapTemplate';
import { InsightTemplate } from './templates/InsightTemplate';
import { ComparisonTemplate } from './templates/ComparisonTemplate';
import { BentoGridTemplate } from './templates/BentoGridTemplate';
import { StackedLineTemplate } from './templates/StackedLineTemplate';
import { StackedAreaTemplate } from './templates/StackedAreaTemplate';
import { HorizontalBarTemplate } from './templates/HorizontalBarTemplate';
import { NightingaleRoseTemplate } from './templates/NightingaleRoseTemplate';
import { HeroTemplate } from './templates/HeroTemplate';
import { AdaptiveGridTemplate } from './templates/AdaptiveGridTemplate';
import { RefreshCw, Layout as LayoutIcon, BookmarkPlus, Maximize2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { EditableText, ErrorBoundary } from './UI';

interface Props {
  data: InfographicData;
  onRegenerateSection?: (index: number) => void;
  onFavoriteSection?: (index: number) => void;
  isRegenerating?: boolean;
  isEditing?: boolean;
  onUpdate?: (data: InfographicData) => void;
}

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

const LOGIC_ALIAS_MAP: Record<string, LogicType> = {
  BAR_CHART: LogicType.BAR,
  BARCHART: LogicType.BAR,
  LINE_CHART: LogicType.LINE,
  LINECHART: LogicType.LINE,
  PIE_CHART: LogicType.PIE,
  PIECHART: LogicType.PIE,
  DONUT_CHART: LogicType.DONUT,
  RADAR_CHARTS: LogicType.RADAR_CHART,
  RADARCHART: LogicType.RADAR_CHART,
  ROAD_MAP: LogicType.ROADMAP,
  ROADMAP_CHART: LogicType.ROADMAP,
  TIMELINE_CHART: LogicType.TIMELINE,
  HORIZONTALBAR: LogicType.HORIZONTAL_BAR,
  HORIZONTAL_BAR_CHART: LogicType.HORIZONTAL_BAR,
  BENTO_GRID_LAYOUT: LogicType.BENTO_GRID,
};

function parseNumeric(value: unknown): number | null {
  const raw = String(value ?? "").replace(/,/g, "").replace(/[^\d.+-]/g, "");
  if (!raw) return null;
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeRenderLogicType(input: unknown): LogicType {
  const raw = String(input || "")
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
  if ((Object.values(LogicType) as string[]).includes(raw)) {
    return raw as LogicType;
  }
  return LOGIC_ALIAS_MAP[raw] || LogicType.PARALLEL;
}

export const SectionRenderer = ({ 
  section, 
  theme, 
  index, 
  onRegenerate,
  onFavorite,
  onExpand,
  isRegenerating,
  isEditing,
  onSectionUpdate
}: { 
  section: InfographicSection, 
  theme: InfographicData['suggested_theme'],
  index: number,
  onRegenerate?: (index: number) => void,
  onFavorite?: (index: number) => void,
  onExpand?: (index: number) => void,
  isRegenerating?: boolean,
  isEditing?: boolean,
  onSectionUpdate?: (newSection: InfographicSection) => void
}) => {
  const handleNodeUpdate = (nodeIndex: number, newNode: any) => {
    if (!onSectionUpdate) return;
    const newNodes = [...section.nodes];
    newNodes[nodeIndex] = newNode;
    onSectionUpdate({ ...section, nodes: newNodes });
  };

  const renderTemplate = () => {
    if (!section || !Array.isArray(section.nodes)) {
      return null;
    }

    const data = { ...section, suggested_theme: theme } as any; 
    
    // Basic fallback/correction logic
    let effectiveLogicType = normalizeRenderLogicType(section.logic_type);
    if (effectiveLogicType === LogicType.PIE && section.nodes.length > 6) {
      effectiveLogicType = LogicType.HORIZONTAL_BAR;
    }
    if (effectiveLogicType === LogicType.BAR && section.nodes.some(n => n.title.length > 15)) {
      effectiveLogicType = LogicType.HORIZONTAL_BAR;
    }
    const hasNumeric = section.nodes.some((node) => parseNumeric(node.value) != null);
    const hasCells = section.nodes.some(
      (node) => Array.isArray((node as any).cells) && (node as any).cells.length > 0
    );
    if (!hasNumeric && !hasCells && CHART_LOGIC_TYPES.has(effectiveLogicType)) {
      effectiveLogicType = LogicType.PARALLEL;
    }

    const props = { 
      data, 
      isEditing, 
      onNodeUpdate: handleNodeUpdate 
    };
    
    switch (effectiveLogicType) {
      case LogicType.PROGRESSIVE:
      case LogicType.STEP:
      case LogicType.RIBBON:
        return <ProgressiveTemplate {...props} />;
      case LogicType.PARALLEL:
      case LogicType.GRID:
      case LogicType.PILL:
      case LogicType.HONEYCOMB:
        return <ParallelTemplate {...props} />;
      case LogicType.CORE:
      case LogicType.MINDMAP:
      case LogicType.GEAR:
        return <CoreTemplate {...props} />;
      case LogicType.RADAR:
      case LogicType.RADAR_CHART:
        return <RadarChartTemplate {...props} />;
      case LogicType.CONTRAST:
      case LogicType.VENN:
        return <ContrastTemplate {...props} />;
      case LogicType.HIERARCHY:
        return <HierarchyTemplate {...props} />;
      case LogicType.TIMELINE:
        return <TimelineTemplate {...props} />;
      case LogicType.FUNNEL:
        return <FunnelTemplate {...props} />;
      case LogicType.BENTO:
        return <BentoTemplate {...props} />;
      case LogicType.CYCLE:
        return <CycleTemplate {...props} />;
      case LogicType.SWOT:
        return <SwotTemplate {...props} />;
      case LogicType.BAR:
        return <BarChartTemplate {...props} />;
      case LogicType.LINE:
        return <LineChartTemplate {...props} />;
      case LogicType.STACKED_LINE:
        return <StackedLineTemplate {...props} />;
      case LogicType.STACKED_AREA:
        return <StackedAreaTemplate {...props} />;
      case LogicType.HORIZONTAL_BAR:
        return <HorizontalBarTemplate {...props} />;
      case LogicType.NIGHTINGALE_ROSE:
        return <NightingaleRoseTemplate {...props} />;
      case LogicType.RANKING:
        return <RankingTemplate {...props} />;
      case LogicType.RADIAL_BAR:
        return <RadialBarTemplate {...props} />;
      case LogicType.PIE:
        return <PieChartTemplate {...props} />;
      case LogicType.TABLE:
        return <TableTemplate {...props} />;
      case LogicType.COMBO_CHART:
        return <ComboChartTemplate {...props} />;
      case LogicType.DONUT:
        return <DonutTemplate {...props} />;
      case LogicType.AREA:
        return <AreaTemplate {...props} />;
      case LogicType.SCATTER:
        return <ScatterTemplate {...props} />;
      case LogicType.WATERFALL:
        return <WaterfallTemplate {...props} />;
      case LogicType.GAUGE:
        return <GaugeTemplate {...props} />;
      case LogicType.MATRIX:
        return <MatrixTemplate {...props} />;
      case LogicType.ROADMAP:
        return <RoadmapTemplate {...props} />;
      case LogicType.INSIGHT:
        return <InsightTemplate {...props} />;
      case LogicType.COMPARISON:
        return <ComparisonTemplate {...props} />;
      case LogicType.BENTO_GRID:
        return <BentoGridTemplate {...props} />;
      case LogicType.HERO:
        return <HeroTemplate nodes={section.nodes || []} theme={theme} visualIntent={section.visual_intent} />;
      case LogicType.ADAPTIVE_GRID:
        return <AdaptiveGridTemplate nodes={section.nodes || []} theme={theme} density={section.density} />;
      default:
        return <ParallelTemplate {...props} />;
    }
  };

  return (
    <motion.div 
      id={`section-${index}`}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="mb-12 last:mb-0 relative group"
    >
      <div 
        className="p-8 md:p-12 rounded-[2.5rem] apple-shadow border border-white relative overflow-hidden transition-all duration-500 hover:scale-[1.01]"
        style={{ backgroundColor: theme.background === '#ffffff' ? '#ffffff' : theme.background }}
      >
        {/* Decorative background element */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-apple-blue/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
        
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-8">
            <div className="flex flex-col gap-1 flex-1 mr-4">
              <div className="flex items-center gap-4">
                <span className="w-1.5 h-8 rounded-full shrink-0" style={{ backgroundColor: theme.primary }} />
                <EditableText
                  value={section.section_title || ""}
                  onChange={(val) => onSectionUpdate?.({ ...section, section_title: val })}
                  isEditing={isEditing}
                  tagName="h2"
                  className="text-xl md:text-2xl font-bold tracking-tight"
                  style={{ color: theme.text }}
                  placeholder="段落标题"
                />
              </div>
              {section.layout_strategy && (
                <div className="flex items-center gap-2 mt-2 ml-5 opacity-40">
                  <LayoutIcon size={12} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">{section.layout_strategy}</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => onExpand?.(index)}
                className="p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-black/5 active:scale-95"
                title="查看详情"
              >
                <Maximize2 size={18} style={{ color: theme.secondary }} />
              </button>
              <button
                onClick={() => onFavorite?.(index)}
                className="p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-black/5 active:scale-95"
                title="收藏到信息库"
              >
                <BookmarkPlus size={20} style={{ color: theme.secondary }} />
              </button>
              <button
                onClick={() => onRegenerate?.(index)}
                disabled={isRegenerating}
                className="p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-black/5 active:scale-95 disabled:opacity-50"
                title="重新生成段落"
              >
                <RefreshCw size={20} className={`${isRegenerating ? 'animate-spin' : ''}`} style={{ color: theme.primary }} />
              </button>
            </div>
          </div>
          
          <div className={`min-h-[200px] ${section.density === 'high' ? 'scale-[0.98] origin-top' : ''}`}>
            {renderTemplate()}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export const InfographicRenderer = ({ data, onRegenerateSection, onFavoriteSection, isRegenerating, isEditing, onUpdate }: Props) => {
  const [expandedIndex, setExpandedIndex] = React.useState<number | null>(null);

  const handleSectionUpdate = (index: number, newSection: InfographicSection) => {
    if (!onUpdate) return;
    const newSections = [...data.sections];
    newSections[index] = newSection;
    onUpdate({ ...data, sections: newSections });
  };

  const defaultTheme = {
    primary: '#000000',
    secondary: '#666666',
    background: '#ffffff',
    text: '#000000',
    backgroundStyle: '#ffffff'
  };

  const theme = data.suggested_theme || defaultTheme;

  return (
    <div 
      id="infographic-capture"
      className="w-full max-w-6xl mx-auto p-8 md:p-16 rounded-[3rem] transition-all duration-700"
      style={{ 
        background: (theme as any).backgroundStyle || theme.background,
        backgroundColor: theme.background 
      }}
    >
      <header className="mb-20 text-center space-y-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="inline-block px-4 py-1.5 bg-apple-blue/10 text-apple-blue rounded-full text-xs font-black uppercase tracking-widest mb-4"
        >
          AI 战略分析报告
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <EditableText
            value={data.title || ""}
            onChange={(val) => onUpdate?.({ ...data, title: val })}
            isEditing={isEditing}
            tagName="h1"
            className="text-3xl md:text-5xl font-black tracking-tight leading-[1.2] text-center"
            style={{ color: theme.text }}
            placeholder="主标题"
          />
        </motion.div>
        
        {(data.subtitle || isEditing) && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <EditableText
              value={data.subtitle || ""}
              onChange={(val) => onUpdate?.({ ...data, subtitle: val })}
              isEditing={isEditing}
              tagName="p"
              className="text-lg md:text-xl font-medium opacity-60 max-w-2xl mx-auto leading-relaxed"
              style={{ color: theme.text }}
              placeholder="副标题"
            />
          </motion.div>
        )}
      </header>

      <main className="space-y-12">
        {data.sections && data.sections.map((section, idx) => (
          <ErrorBoundary key={idx}>
            <SectionRenderer 
              section={section} 
              theme={theme} 
              index={idx}
              onRegenerate={onRegenerateSection}
              onFavorite={onFavoriteSection}
              onExpand={(idx) => setExpandedIndex(idx)}
              isRegenerating={isRegenerating}
              isEditing={isEditing}
              onSectionUpdate={(newSection) => handleSectionUpdate(idx, newSection)}
            />
          </ErrorBoundary>
        ))}
      </main>

      <footer className="mt-24 pt-12 border-t border-black/5 flex justify-between items-center opacity-40 text-xs font-bold uppercase tracking-widest">
        <div style={{ color: theme.text }}>AI 战略分析设计师</div>
        <div style={{ color: theme.text }}>{new Date().toLocaleDateString()}</div>
      </footer>

      {/* Expanded View Modal */}
      <AnimatePresence>
        {expandedIndex !== null && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-12">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setExpandedIndex(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-6xl bg-white rounded-[3rem] apple-shadow border border-white overflow-hidden flex flex-col max-h-full"
              style={{ backgroundColor: theme.background }}
            >
              <div className="p-8 border-b border-black/5 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                  <span className="w-1.5 h-8 rounded-full" style={{ backgroundColor: theme.primary }} />
                  <h2 className="text-3xl font-bold tracking-tight" style={{ color: theme.text }}>
                    {data.sections[expandedIndex].section_title}
                  </h2>
                </div>
                <button 
                  onClick={() => setExpandedIndex(null)}
                  className="p-3 hover:bg-black/5 rounded-2xl transition-all"
                >
                  <X size={24} style={{ color: theme.text }} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-12">
                <div className="max-w-4xl mx-auto">
                  <SectionRenderer 
                    section={data.sections[expandedIndex]} 
                    theme={theme} 
                    index={expandedIndex}
                    isEditing={isEditing}
                    onSectionUpdate={(newSec) => handleSectionUpdate(expandedIndex, newSec)}
                  />
                  
                  <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="p-8 bg-black/5 rounded-[2rem]">
                      <h4 className="text-xs font-black uppercase tracking-widest opacity-40 mb-4">数据详情</h4>
                      <div className="space-y-4">
                        {data.sections[expandedIndex].nodes.map((node, i) => (
                          <div key={i} className="flex items-start justify-between">
                            <span className="text-sm font-bold opacity-60">{node.title}</span>
                            <span className="text-sm font-black" style={{ color: theme.primary }}>{node.value || '-'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="p-8 bg-black/5 rounded-[2rem]">
                      <h4 className="text-xs font-black uppercase tracking-widest opacity-40 mb-4">分析建议</h4>
                      <p className="text-sm leading-relaxed opacity-80">
                        基于该模块的数据展现，建议关注核心指标的波动。当前的 {data.sections[expandedIndex].visual_intent || '布局'} 旨在突出关键趋势。
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
