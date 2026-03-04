import React from 'react';
import { motion } from 'motion/react';
import { InfographicData } from '../../types';
import { DynamicIcon, MarkdownContent, EditableText, EditableArea } from '../UI';

export const CoreTemplate = ({ data, isEditing, onNodeUpdate }: { data: any, isEditing?: boolean, onNodeUpdate?: (index: number, val: any) => void }) => {
  const nodes = data.nodes;
  const radius = 220; // Increased radius
  
  return (
    <div className="relative min-h-[700px] flex items-center justify-center py-12 overflow-visible">
      {/* Central Node */}
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        className="w-48 h-48 rounded-full flex flex-col items-center justify-center z-30 shadow-[0_0_50px_rgba(0,0,0,0.1)] text-center p-6 border-4 border-white/20 backdrop-blur-xl relative"
        style={{ backgroundColor: data.suggested_theme.primary, color: data.suggested_theme.background }}
      >
        <span className="font-black text-xl leading-tight uppercase tracking-tighter break-words w-full">
          {data.title || data.section_title}
        </span>
      </motion.div>

      {/* Radial Nodes */}
      {nodes.map((node: any, index: number) => {
        const angle = (index / nodes.length) * 2 * Math.PI - Math.PI / 2;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;

        return (
          <React.Fragment key={index}>
            {/* Connecting Line with Gradient */}
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.5 + index * 0.1, duration: 0.8 }}
              className="absolute h-0.5 origin-left z-10"
              style={{ 
                width: radius, 
                background: `linear-gradient(to right, ${data.suggested_theme.primary}, transparent)`,
                left: '50%',
                top: '50%',
                transform: `rotate(${angle}rad)`,
                opacity: 0.3
              }}
            />
            
            {/* Node */}
            <motion.div
              initial={{ opacity: 0, x: x * 0.5, y: y * 0.5 }}
              animate={{ opacity: 1, x, y }}
              transition={{ delay: 0.8 + index * 0.1, type: 'spring', stiffness: 100 }}
              className="absolute w-64 z-20"
              style={{ 
                left: `calc(50% - 128px)`, 
                top: `calc(50% - 50px)` 
              }}
            >
              <div 
                className="bg-white/90 backdrop-blur-xl border border-white/40 rounded-2xl p-5 shadow-[0_10px_30px_rgba(0,0,0,0.08)] flex items-start gap-4 group hover:scale-105 transition-transform duration-300"
                style={{ color: data.suggested_theme.text }}
              >
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm group-hover:rotate-12 transition-transform mt-1"
                  style={{ backgroundColor: node.color || data.suggested_theme.primary, color: data.suggested_theme.background }}
                >
                  {node.icon && <DynamicIcon name={node.icon} size={20} />}
                </div>
                <div className="flex-1 min-w-0">
                  <EditableText
                    value={node.title}
                    onChange={(val) => onNodeUpdate?.(index, { ...node, title: val })}
                    isEditing={isEditing}
                    tagName="h4"
                    className="font-black text-sm mb-1 break-words"
                  />
                  <div className="text-xs opacity-70 leading-relaxed break-words">
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
          </React.Fragment>
        );
      })}
    </div>
  );
};
