import React from 'react';
import { motion } from 'motion/react';
import { DynamicIcon, MarkdownContent } from '../UI';

export const CycleTemplate = ({ data }: { data: any }) => {
  const nodes = data.nodes;
  const radius = 180;
  
  return (
    <div className="relative min-h-[500px] flex items-center justify-center py-12">
      {/* Central Circle */}
      <div 
        className="absolute w-64 h-64 rounded-full border-4 border-dashed opacity-10 animate-[spin_20s_linear_infinite]"
        style={{ borderColor: data.suggested_theme.primary }}
      />
      
      {/* Nodes */}
      {nodes.map((node: any, index: number) => {
        const angle = (index / nodes.length) * 2 * Math.PI;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;

        return (
          <React.Fragment key={index}>
            {/* Arrow/Line to next node */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.2 }}
              className="absolute h-1 origin-left z-0"
              style={{ 
                width: radius * 0.8, 
                backgroundColor: data.suggested_theme.primary,
                left: '50%',
                top: '50%',
                transform: `rotate(${angle + (Math.PI / nodes.length)}rad)`
              }}
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="absolute w-40 z-10 text-center"
              style={{ 
                left: `calc(50% + ${x}px - 80px)`, 
                top: `calc(50% + ${y}px - 60px)` 
              }}
            >
              <div 
                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-xl"
                style={{ backgroundColor: node.color || data.suggested_theme.primary, color: data.suggested_theme.background }}
              >
                {node.icon && <DynamicIcon name={node.icon} size={28} />}
              </div>
              <h4 className="font-bold text-sm mb-1" style={{ color: data.suggested_theme.text }}>{node.title}</h4>
              <div className="text-[10px] opacity-60 line-clamp-2" style={{ color: data.suggested_theme.text }}>
                <MarkdownContent content={node.content} theme={data.suggested_theme} />
              </div>
            </motion.div>
          </React.Fragment>
        );
      })}
    </div>
  );
};
