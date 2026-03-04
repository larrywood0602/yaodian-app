import React from 'react';
import { motion } from 'motion/react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { EditableText, EditableArea } from '../UI';

export const ScatterTemplate = ({ data, isEditing, onNodeUpdate }: { data: any, isEditing?: boolean, onNodeUpdate?: (index: number, val: any) => void }) => {
  const nodes = data.nodes.map((n: any) => {
    // Parse "x, y" format
    let x = 0, y = 0;
    if (n.value && typeof n.value === 'string') {
      const parts = n.value.split(',').map((p: string) => parseFloat(p.trim()));
      if (parts.length >= 2) {
        x = parts[0] || 0;
        y = parts[1] || 0;
      } else {
        x = parseFloat(n.value) || 0;
        y = parseFloat(n.value) || 0;
      }
    } else {
      x = parseFloat(n.value) || 0;
      y = parseFloat(n.value) || 0;
    }
    return { ...n, x, y };
  });

  return (
    <div className="flex flex-col gap-6 py-6">
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={data.suggested_theme.text} opacity={0.1} />
            <XAxis 
              type="number" 
              dataKey="x" 
              name="X" 
              axisLine={false} 
              tickLine={false}
              tick={{ fill: data.suggested_theme.text, fontSize: 12, opacity: 0.7 }}
            />
            <YAxis 
              type="number" 
              dataKey="y" 
              name="Y" 
              axisLine={false} 
              tickLine={false}
              tick={{ fill: data.suggested_theme.text, fontSize: 12, opacity: 0.7 }}
            />
            <Tooltip 
              cursor={{ strokeDasharray: '3 3' }} 
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', backgroundColor: data.suggested_theme.background, color: data.suggested_theme.text }}
            />
            <Scatter name="Data" data={nodes} fill={data.suggested_theme.primary} animationDuration={1000}>
              {nodes.map((entry: any, index: number) => (
                <Cell key={`cell-${index}`} fill={entry.color || data.suggested_theme.primary} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
        {nodes.map((node: any, i: number) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className="flex gap-3 p-3 rounded-xl border border-black/5"
            style={{ backgroundColor: `${data.suggested_theme.primary}05` }}
          >
            <div 
              className="w-3 h-3 rounded-full shrink-0 mt-1"
              style={{ backgroundColor: node.color || data.suggested_theme.primary }}
            />
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center gap-2 mb-1">
                <EditableText
                  value={node.title}
                  onChange={(val) => onNodeUpdate?.(i, { ...node, title: val })}
                  isEditing={isEditing}
                  tagName="div"
                  className="font-bold text-sm truncate"
                  style={{ color: data.suggested_theme.text }}
                />
                <EditableText
                  value={node.value}
                  onChange={(val) => onNodeUpdate?.(i, { ...node, value: val })}
                  isEditing={isEditing}
                  tagName="div"
                  className="text-xs font-mono font-bold opacity-70 shrink-0"
                  style={{ color: data.suggested_theme.text }}
                />
              </div>
              <div className="text-[10px] opacity-70" style={{ color: data.suggested_theme.text }}>
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
