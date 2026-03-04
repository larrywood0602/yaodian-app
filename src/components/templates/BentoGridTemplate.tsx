import React from 'react';
import { motion } from 'motion/react';
import { EditableText } from '../UI';

export const BentoGridTemplate = ({ data, isEditing, onNodeUpdate }: any) => {
  const { nodes, suggested_theme: theme } = data;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 auto-rows-[200px]">
      {nodes.map((node: any, idx: number) => {
        // Determine span based on index or content length
        const contentLen = node.content?.length || 0;
        const isWide = idx === 0 || contentLen > 100;
        const isTall = idx === 1 && !isWide;
        
        return (
          <motion.div
            key={idx}
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.05 }}
            className={`bg-white p-6 rounded-[2rem] apple-shadow border border-black/5 flex flex-col overflow-hidden group hover:scale-[1.02] transition-all ${
              isWide ? 'md:col-span-2' : ''
            } ${
              isTall ? 'md:row-span-2' : ''
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${theme.primary}10`, color: theme.primary }}
              >
                <span className="material-symbols-outlined text-xl">
                  {node.icon || 'star'}
                </span>
              </div>
              {node.value && (
                <span className="text-lg font-black tracking-tighter" style={{ color: theme.primary }}>
                  {node.value}
                </span>
              )}
            </div>
            
            <EditableText
              value={node.title}
              onChange={(val) => onNodeUpdate(idx, { ...node, title: val })}
              isEditing={isEditing}
              tagName="h3"
              className="text-lg font-bold mb-2 truncate"
              style={{ color: theme.text }}
            />
            
            <EditableText
              value={node.content}
              onChange={(val) => onNodeUpdate(idx, { ...node, content: val })}
              isEditing={isEditing}
              tagName="p"
              className="text-sm opacity-60 leading-relaxed line-clamp-4"
              style={{ color: theme.text }}
            />
          </motion.div>
        );
      })}
    </div>
  );
};
