import React from 'react';
import { motion } from 'motion/react';
import { EditableText } from '../UI';

export const InsightTemplate = ({ data, isEditing, onNodeUpdate }: any) => {
  const { nodes, suggested_theme: theme } = data;

  return (
    <div className="space-y-6 py-4">
      {nodes.map((node: any, idx: number) => (
        <motion.div
          key={idx}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.1 }}
          className="relative p-8 md:p-12 bg-white rounded-[2.5rem] apple-shadow border border-black/5 overflow-hidden group"
        >
          {/* Decorative Quote Mark */}
          <div 
            className="absolute -top-4 -left-4 text-9xl font-serif opacity-[0.03] select-none pointer-events-none"
            style={{ color: theme.primary }}
          >
            “
          </div>
          
          <div className="relative z-10">
            <EditableText
              value={node.title}
              onChange={(val) => onNodeUpdate(idx, { ...node, title: val })}
              isEditing={isEditing}
              tagName="h3"
              className="text-2xl md:text-3xl font-black tracking-tight mb-4 leading-tight"
              style={{ color: theme.text }}
            />
            
            <EditableText
              value={node.content}
              onChange={(val) => onNodeUpdate(idx, { ...node, content: val })}
              isEditing={isEditing}
              tagName="p"
              className="text-base md:text-lg opacity-60 leading-relaxed italic"
              style={{ color: theme.text }}
            />
          </div>
          
          {/* Accent Line */}
          <div 
            className="absolute bottom-0 left-0 h-1.5 w-full opacity-20"
            style={{ backgroundColor: theme.primary }}
          />
        </motion.div>
      ))}
    </div>
  );
};
