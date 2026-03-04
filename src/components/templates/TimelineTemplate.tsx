import React from 'react';
import { motion } from 'motion/react';
import { InfographicData } from '../../types';
import { DynamicIcon, MarkdownContent, EditableText, EditableArea } from '../UI';

export const TimelineTemplate = ({ data, isEditing, onNodeUpdate }: { data: any, isEditing?: boolean, onNodeUpdate?: (index: number, val: any) => void }) => {
  // Helper to extract time/date from title or content
  const extractTime = (title: string, content: string) => {
    if (!title && !content) return null;
    
    // Regex for various date formats including Chinese and English
    // Matches: 2023-01-01, 2023/01/01, 2023.01.01, 2023年1月1日, 1月1日, 2023年, Jan 2023, Q1 2023
    const timeRegex = /((?:\d{4}[-./年])?(?:\d{1,2}[-./月])(?:\d{1,2}[日]?)?)|(\d{4}年?)|((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}?)|(Q[1-4]\s?\d{0,4})/i;
    
    let match;
    
    // Priority 1: Check title for date at the beginning
    if (title) {
      match = title.match(timeRegex);
      if (match && title.indexOf(match[0]) < 5) return match[0];
    }

    // Priority 2: Check content for date patterns
    if (content) {
      match = content.match(timeRegex);
      if (match) return match[0];
    }
    
    // Priority 3: Check title anywhere
    if (title) {
      match = title.match(timeRegex);
      if (match) return match[0];
    }

    return null;
  };

  return (
    <div className="relative py-8 pl-4">
      {/* Vertical Line */}
      <div 
        className="absolute left-[120px] top-4 bottom-4 w-0.5 opacity-20"
        style={{ backgroundColor: data.suggested_theme.primary }}
      />
      
      <div className="space-y-12">
        {data.nodes.map((node: any, index: number) => {
          const safeTitle = node.title || "";
          const safeContent = node.content || "";
          const time = extractTime(safeTitle, safeContent);
          
          // Only remove time from title if it was extracted FROM the title
          let displayTitle = safeTitle;
          if (time && safeTitle.includes(time)) {
             displayTitle = safeTitle.replace(time, '').trim();
             // Clean up leading punctuation
             displayTitle = displayTitle.replace(/^[:\-\s\.]+/, '');
          }
          
          // If no title remains (e.g. title was just the date), use content summary or keep date
          if (!displayTitle && time) displayTitle = "节点 " + (index + 1);

          const displayTime = time || (index + 1).toString().padStart(2, '0');

          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="flex items-start w-full gap-8"
            >
              {/* Time Column */}
              <div className="w-[100px] text-right pt-2 shrink-0">
                <span 
                  className="text-lg font-black tracking-tighter block break-words leading-tight"
                  style={{ color: data.suggested_theme.primary }}
                >
                  {displayTime}
                </span>
              </div>
              
              {/* Icon/Dot on Axis */}
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 z-10 shadow-lg border-4 relative bg-white"
                style={{ 
                  borderColor: node.color || data.suggested_theme.primary
                }}
              >
                 <div 
                   className="w-3 h-3 rounded-full" 
                   style={{ backgroundColor: node.color || data.suggested_theme.primary }}
                 />
              </div>
              
              {/* Content Column */}
              <div className="flex-1 pt-1 pb-4">
                <div 
                  className="bg-white/60 rounded-2xl p-5 border border-black/5 shadow-sm hover:shadow-md transition-shadow"
                >
                  <EditableText
                    value={isEditing ? node.title : displayTitle}
                    onChange={(val) => onNodeUpdate?.(index, { ...node, title: val })}
                    isEditing={isEditing}
                    tagName="h3"
                    className="text-lg font-bold mb-2"
                    style={{ color: data.suggested_theme.text }}
                  />
                  <div className="text-sm opacity-80 leading-relaxed">
                    <EditableArea
                      value={node.content}
                      onChange={(val) => onNodeUpdate?.(index, { ...node, content: val })}
                      isEditing={isEditing}
                      theme={data.suggested_theme}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
