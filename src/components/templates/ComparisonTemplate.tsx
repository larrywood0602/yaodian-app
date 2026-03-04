import React from 'react';
import { motion } from 'motion/react';
import { EditableText } from '../UI';

export const ComparisonTemplate = ({ data, isEditing, onNodeUpdate }: any) => {
  const { nodes, suggested_theme: theme } = data;
  
  // Group nodes into pairs for comparison
  const pairs = [];
  for (let i = 0; i < nodes.length; i += 2) {
    pairs.push(nodes.slice(i, i + 2));
  }

  return (
    <div className="space-y-6 py-4">
      {pairs.map((pair, pIdx) => (
        <div key={pIdx} className="grid grid-cols-1 md:grid-cols-2 gap-4 relative">
          {/* VS Badge */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full apple-shadow border border-apple-separator z-20 hidden md:flex items-center justify-center text-[10px] font-black italic">
            VS
          </div>
          
          {pair.map((node: any, nIdx: number) => {
            const actualIdx = pIdx * 2 + nIdx;
            return (
              <motion.div
                key={nIdx}
                initial={{ opacity: 0, x: nIdx === 0 ? -20 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                className={`bg-white p-6 rounded-3xl apple-shadow border border-black/5 flex flex-col ${nIdx === 0 ? 'md:text-right' : 'md:text-left'}`}
              >
                <EditableText
                  value={node.title}
                  onChange={(val) => onNodeUpdate(actualIdx, { ...node, title: val })}
                  isEditing={isEditing}
                  tagName="h3"
                  className="text-lg font-bold mb-2"
                  style={{ color: nIdx === 0 ? theme.primary : theme.secondary }}
                />
                <EditableText
                  value={node.content}
                  onChange={(val) => onNodeUpdate(actualIdx, { ...node, content: val })}
                  isEditing={isEditing}
                  tagName="p"
                  className="text-sm opacity-70 leading-relaxed"
                  style={{ color: theme.text }}
                />
              </motion.div>
            );
          })}
        </div>
      ))}
    </div>
  );
};
