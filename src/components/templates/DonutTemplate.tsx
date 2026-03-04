import React from 'react';
import { motion } from 'motion/react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { EditableText, EditableArea } from '../UI';
import { CHART_COLORS } from '../../constants';

export const DonutTemplate = ({ data, isEditing, onNodeUpdate }: { data: any, isEditing?: boolean, onNodeUpdate?: (index: number, val: any) => void }) => {
  const nodes = data.nodes.map((n: any) => ({
    ...n,
    numericValue: parseFloat(n.value) || 0
  }));

  const total = nodes.reduce((sum: number, n: any) => sum + n.numericValue, 0);

  return (
    <div className="flex flex-col md:flex-row items-center justify-center gap-8 py-8">
      <div className="relative w-48 h-48 md:w-64 md:h-64">
        <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
          <PieChart>
            <Pie
              data={nodes}
              cx="50%"
              cy="50%"
              innerRadius="60%"
              outerRadius="90%"
              paddingAngle={2}
              dataKey="numericValue"
              stroke="none"
              animationBegin={0}
              animationDuration={1000}
            >
              {nodes.map((entry: any, index: number) => (
                <Cell key={`cell-${index}`} fill={entry.color || CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
              itemStyle={{ color: '#000', fontWeight: 'bold' }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-3xl font-black" style={{ color: data.suggested_theme.text }}>{total}</span>
          <span className="text-xs font-bold uppercase tracking-widest opacity-50" style={{ color: data.suggested_theme.text }}>Total</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 w-full md:w-auto">
        {nodes.map((node: any, i: number) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 + i * 0.1 }}
            className="flex items-center gap-3"
          >
            <div 
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: node.color || CHART_COLORS[i % CHART_COLORS.length] }}
            />
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center gap-6">
                <EditableText
                  value={node.title}
                  onChange={(val) => onNodeUpdate?.(i, { ...node, title: val })}
                  isEditing={isEditing}
                  tagName="span"
                  className="font-bold text-sm"
                  style={{ color: data.suggested_theme.text }}
                />
                <EditableText
                  value={node.value}
                  onChange={(val) => onNodeUpdate?.(i, { ...node, value: val })}
                  isEditing={isEditing}
                  tagName="span"
                  className="font-black text-sm text-right"
                  style={{ color: data.suggested_theme.text }}
                />
              </div>
              <div className="text-xs opacity-60" style={{ color: data.suggested_theme.text }}>
                <EditableArea
                  value={node.content}
                  onChange={(val) => onNodeUpdate?.(i, { ...node, content: val })}
                  isEditing={isEditing}
                  theme={data.suggested_theme}
                />
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
