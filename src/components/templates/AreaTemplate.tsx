import React from 'react';
import { motion } from 'motion/react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts';
import { EditableText, EditableArea } from '../UI';

export const AreaTemplate = ({ data, isEditing, onNodeUpdate }: { data: any, isEditing?: boolean, onNodeUpdate?: (index: number, val: any) => void }) => {
  const nodes = data.nodes.map((n: any) => ({
    ...n,
    numericValue: parseFloat(n.value) || 0
  }));

  return (
    <div className="flex flex-col gap-6 py-6">
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
          <AreaChart data={nodes} margin={{ top: 30, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={data.suggested_theme.primary} stopOpacity={0.8}/>
                <stop offset="95%" stopColor={data.suggested_theme.primary} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={data.suggested_theme.text} opacity={0.1} />
            <XAxis 
              dataKey="title" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: data.suggested_theme.text, fontSize: 12, opacity: 0.7 }}
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: data.suggested_theme.text, fontSize: 12, opacity: 0.7 }}
            />
            <Tooltip 
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', backgroundColor: data.suggested_theme.background, color: data.suggested_theme.text }}
              itemStyle={{ color: data.suggested_theme.primary, fontWeight: 'bold' }}
            />
            <Area 
              type="monotone" 
              dataKey="numericValue" 
              stroke={data.suggested_theme.primary} 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorValue)" 
              animationDuration={1500}
            >
              <LabelList dataKey="value" position="top" fill={data.suggested_theme.text} fontSize={12} fontWeight="bold" offset={10} />
            </Area>
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
        {nodes.map((node: any, i: number) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="p-3 rounded-xl border border-black/5"
            style={{ backgroundColor: `${data.suggested_theme.primary}08` }}
          >
            <EditableText
              value={node.title}
              onChange={(val) => onNodeUpdate?.(i, { ...node, title: val })}
              isEditing={isEditing}
              tagName="div"
              className="text-xs font-bold opacity-60 mb-1"
              style={{ color: data.suggested_theme.text }}
            />
            <EditableText
              value={node.value}
              onChange={(val) => onNodeUpdate?.(i, { ...node, value: val })}
              isEditing={isEditing}
              tagName="div"
              className="text-lg font-black mb-1"
              style={{ color: data.suggested_theme.text }}
            />
            <div className="text-[10px] opacity-70" style={{ color: data.suggested_theme.text }}>
              <EditableArea
                value={node.content}
                onChange={(val) => onNodeUpdate?.(i, { ...node, content: val })}
                isEditing={isEditing}
                theme={data.suggested_theme}
              />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
