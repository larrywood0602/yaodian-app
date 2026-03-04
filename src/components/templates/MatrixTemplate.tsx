import React from 'react';
import { motion } from 'motion/react';
import { EditableText } from '../UI';

export const MatrixTemplate = ({ data, isEditing, onNodeUpdate }: any) => {
  const { nodes, suggested_theme: theme } = data;
  
  // Ensure we have 4 nodes for a 2x2 matrix
  const matrixNodes = nodes.slice(0, 4);
  const labels = ['S', 'W', 'O', 'T']; // Default labels for SWOT

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {matrixNodes.map((node: any, idx: number) => (
        <motion.div
          key={idx}
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ delay: idx * 0.1 }}
          className="bg-white p-6 rounded-3xl apple-shadow border border-black/5 flex flex-col h-full group"
        >
          <div className="flex items-center justify-between mb-4">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black"
              style={{ backgroundColor: `${theme.primary}${idx % 2 === 0 ? '15' : '30'}`, color: theme.primary }}
            >
              {node.title?.charAt(0) || labels[idx]}
            </div>
            {node.icon && (
              <span className="material-symbols-outlined opacity-20 group-hover:opacity-100 transition-opacity" style={{ color: theme.primary }}>
                {node.icon}
              </span>
            )}
          </div>
          
          <EditableText
            value={node.title}
            onChange={(val) => onNodeUpdate(idx, { ...node, title: val })}
            isEditing={isEditing}
            tagName="h3"
            className="text-lg font-bold mb-2"
            style={{ color: theme.text }}
          />
          
          <EditableText
            value={node.content}
            onChange={(val) => onNodeUpdate(idx, { ...node, content: val })}
            isEditing={isEditing}
            tagName="p"
            className="text-sm opacity-70 leading-relaxed flex-1"
            style={{ color: theme.text }}
          />
        </motion.div>
      ))}
    </div>
  );
};
