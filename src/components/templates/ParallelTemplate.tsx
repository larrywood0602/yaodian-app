import React from 'react';
import { motion } from 'motion/react';
import { InfographicData } from '../../types';
import { DynamicIcon, Card, MarkdownContent, EditableText, EditableArea } from '../UI';

export const ParallelTemplate = ({ data, isEditing, onNodeUpdate }: { data: any, isEditing?: boolean, onNodeUpdate?: (index: number, val: any) => void }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 py-8">
      {data.nodes.map((node: any, index: number) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <Card 
            className="h-full flex flex-col items-center text-center hover:scale-[1.02] transition-transform duration-300"
            style={{ backgroundColor: `${data.suggested_theme.primary}10` }}
          >
            <div 
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-inner"
              style={{ backgroundColor: node.color || data.suggested_theme.primary, color: data.suggested_theme.background }}
            >
              {node.icon && <DynamicIcon name={node.icon} size={32} />}
            </div>
            <EditableText
              value={node.title}
              onChange={(val) => onNodeUpdate?.(index, { ...node, title: val })}
              isEditing={isEditing}
              tagName="h3"
              className="text-xl font-bold mb-3"
              style={{ color: data.suggested_theme.text }}
            />
            <div className="opacity-70 text-sm leading-relaxed w-full">
              <EditableArea
                value={node.content}
                onChange={(val) => onNodeUpdate?.(index, { ...node, content: val })}
                isEditing={isEditing}
                theme={data.suggested_theme}
              />
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  );
};
