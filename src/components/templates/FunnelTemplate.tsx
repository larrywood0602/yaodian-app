import React from 'react';
import { motion } from 'motion/react';
import { EditableText, EditableArea } from '../UI';
import { CHART_COLORS } from '../../constants';

export const FunnelTemplate = ({ data, isEditing, onNodeUpdate }: { data: any, isEditing?: boolean, onNodeUpdate?: (index: number, val: any) => void }) => {
  const nodes = data.nodes;

  return (
    <div className="py-12 flex flex-col items-center">
      <div className="w-full max-w-2xl space-y-1">
        {nodes.map((node: any, index: number) => {
          const topWidth = 100 - (index * (80 / nodes.length));
          const bottomWidth = 100 - ((index + 1) * (80 / nodes.length));
          const color = node.color || CHART_COLORS[index % CHART_COLORS.length];

          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="relative group"
            >
              <svg viewBox="0 0 100 20" className="w-full h-auto overflow-visible drop-shadow-sm transition-transform hover:scale-[1.02]">
                <path
                  d={`M ${(100 - topWidth) / 2} 0 L ${(100 + topWidth) / 2} 0 L ${(100 + bottomWidth) / 2} 20 L ${(100 - bottomWidth) / 2} 20 Z`}
                  fill={color}
                  className="transition-colors"
                />
                <text
                  x="50"
                  y="12"
                  textAnchor="middle"
                  fill="#fff"
                  fontSize="4"
                  fontWeight="bold"
                  className="pointer-events-none"
                >
                  {node.title} {node.value ? `(${node.value})` : ''}
                </text>
              </svg>
              
              {/* Tooltip-like info on hover or side info */}
              <div className="absolute left-full ml-8 top-1/2 -translate-y-1/2 w-48 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                <div className="bg-white p-3 rounded-xl apple-shadow border border-apple-separator">
                  <h4 className="font-bold text-xs mb-1" style={{ color }}>{node.title}</h4>
                  <p className="text-[10px] text-apple-gray leading-tight">{node.content}</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12 w-full">
        {nodes.map((node: any, index: number) => (
          <div key={index} className="p-4 rounded-2xl bg-white/50 border border-black/5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: node.color || CHART_COLORS[index % CHART_COLORS.length] }} />
              <EditableText
                value={node.title}
                onChange={(val) => onNodeUpdate?.(index, { ...node, title: val })}
                isEditing={isEditing}
                tagName="h4"
                className="font-bold text-sm"
                style={{ color: data.suggested_theme.text }}
              />
            </div>
            <div className="text-2xl font-black mb-2" style={{ color: data.suggested_theme.text }}>
              <EditableText
                value={node.value?.toString()}
                onChange={(val) => onNodeUpdate?.(index, { ...node, value: val })}
                isEditing={isEditing}
                tagName="span"
              />
            </div>
            <div className="text-xs opacity-60">
              <EditableArea
                value={node.content}
                onChange={(val) => onNodeUpdate?.(index, { ...node, content: val })}
                isEditing={isEditing}
                theme={data.suggested_theme}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
