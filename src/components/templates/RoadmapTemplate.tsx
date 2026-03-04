import React from 'react';
import { motion } from 'motion/react';
import { EditableText } from '../UI';

export const RoadmapTemplate = ({ data, isEditing, onNodeUpdate }: any) => {
  const { nodes, suggested_theme: theme } = data;

  return (
    <div className="relative space-y-8 py-4">
      {/* Vertical Line */}
      <div className="absolute left-6 top-0 bottom-0 w-1 bg-apple-separator/30 rounded-full" />
      
      {nodes.map((node: any, idx: number) => (
        <motion.div
          key={idx}
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ delay: idx * 0.1 }}
          className="relative pl-16"
        >
          {/* Node Dot */}
          <div 
            className="absolute left-[18px] top-1 w-4 h-4 rounded-full border-4 border-white shadow-sm z-10"
            style={{ backgroundColor: theme.primary }}
          />
          
          <div className="bg-white p-6 rounded-3xl apple-shadow border border-black/5 group hover:scale-[1.01] transition-all">
            <div className="flex items-center justify-between mb-2">
              <EditableText
                value={node.title}
                onChange={(val) => onNodeUpdate(idx, { ...node, title: val })}
                isEditing={isEditing}
                tagName="h3"
                className="text-lg font-bold"
                style={{ color: theme.primary }}
              />
              <span className="text-[10px] font-black uppercase tracking-widest opacity-30">Phase {idx + 1}</span>
            </div>
            
            <EditableText
              value={node.content}
              onChange={(val) => onNodeUpdate(idx, { ...node, content: val })}
              isEditing={isEditing}
              tagName="p"
              className="text-sm opacity-70 leading-relaxed"
              style={{ color: theme.text }}
            />
            
            {node.value && (
              <div className="mt-4 pt-4 border-t border-apple-separator/30 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-tighter opacity-40">关键指标</span>
                <span className="text-sm font-black" style={{ color: theme.primary }}>{node.value}</span>
              </div>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
};
