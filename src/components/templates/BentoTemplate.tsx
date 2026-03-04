import React from 'react';
import { motion } from 'motion/react';
import { DynamicIcon, Card, MarkdownContent, EditableText } from '../UI';

export const BentoTemplate = ({ data, isEditing, onNodeUpdate }: { data: any, isEditing?: boolean, onNodeUpdate?: (index: number, val: any) => void }) => {
  const nodes = data.nodes;
  const density = data.density || "medium";
  const visualIntent = data.visual_intent;
  
  const getGridCols = () => {
    if (nodes.length <= 2) return 'md:grid-cols-2';
    return 'md:grid-cols-3';
  };

  return (
    <div className={`grid grid-cols-1 ${getGridCols()} gap-6 py-8 auto-rows-[minmax(200px,auto)]`}>
      {nodes.map((node: any, index: number) => {
        let colSpan = 'md:col-span-1';
        let rowSpan = 'md:row-span-1';
        
        // Adaptive Spanning Logic
        if (nodes.length === 3) {
          if (index === 0) colSpan = 'md:col-span-2';
        } else if (nodes.length === 4) {
          if (index === 0) rowSpan = 'md:row-span-2';
          if (index === 3) colSpan = 'md:col-span-2';
        } else if (nodes.length === 5) {
          if (index === 0) colSpan = 'md:col-span-2';
          if (index === 4) colSpan = 'md:col-span-2';
        } else if (nodes.length > 5) {
          if (index % 5 === 0) colSpan = 'md:col-span-2';
        }

        const isImpact = visualIntent === 'impact' && index === 0;
        
        return (
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className={`${colSpan} ${rowSpan}`}
          >
            <Card 
              className={`h-full flex flex-col justify-between group hover:shadow-2xl transition-all duration-500 border-none ${density === 'high' ? 'p-6' : 'p-10'} ${isImpact ? 'shadow-2xl' : ''}`}
              style={{ 
                backgroundColor: isImpact ? data.suggested_theme.text : `${data.suggested_theme.primary}${index % 2 === 0 ? '15' : '08'}`,
                color: isImpact ? data.suggested_theme.background : data.suggested_theme.text
              }}
            >
              <div>
                <div className="flex justify-between items-start mb-8">
                  <div 
                    className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg group-hover:rotate-6 transition-transform"
                    style={{ 
                      backgroundColor: isImpact ? data.suggested_theme.primary : (node.color || data.suggested_theme.primary), 
                      color: isImpact ? data.suggested_theme.text : data.suggested_theme.background 
                    }}
                  >
                    {node.icon && <DynamicIcon name={node.icon} size={28} />}
                  </div>
                  {node.value && (
                    <div 
                      className={`text-4xl font-black tracking-tighter ${isImpact ? 'opacity-100' : 'opacity-20'}`}
                      style={{ color: isImpact ? data.suggested_theme.primary : data.suggested_theme.text }}
                    >
                      {node.value}
                    </div>
                  )}
                </div>

                <EditableText
                  value={node.title}
                  onChange={(val) => onNodeUpdate?.(index, { ...node, title: val })}
                  isEditing={isEditing}
                  tagName="h3"
                  className={`${isImpact ? 'text-3xl font-black' : 'text-xl font-bold'} mb-4 leading-tight tracking-tight`}
                  style={{ color: isImpact ? data.suggested_theme.background : data.suggested_theme.text }}
                />
                
                <div className={`${density === 'high' ? 'text-sm' : 'text-base'} opacity-70 leading-relaxed font-medium`}>
                  <MarkdownContent 
                    content={node.content} 
                    theme={{ 
                      ...data.suggested_theme, 
                      text: isImpact ? data.suggested_theme.background : data.suggested_theme.text,
                      primary: isImpact ? data.suggested_theme.primary : data.suggested_theme.primary
                    }} 
                  />
                </div>
              </div>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
};
