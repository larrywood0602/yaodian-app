import React from 'react';
import { motion } from 'motion/react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { EditableText, EditableArea } from '../UI';

export const LineChartTemplate = ({ data, isEditing, onNodeUpdate }: { data: any, isEditing?: boolean, onNodeUpdate?: (index: number, val: any) => void }) => {
  const nodes = data.nodes;
  const chartData = nodes.map((node: any) => ({
    name: node.title,
    value: parseFloat(node.value) || 0,
    fullNode: node
  }));

  return (
    <div className="py-8 w-full">
      <div className="h-[300px] mb-8">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={data.suggested_theme.primary} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={data.suggested_theme.primary} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: data.suggested_theme.text, fontSize: 12, opacity: 0.6 }}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: data.suggested_theme.text, fontSize: 12, opacity: 0.6 }}
            />
            <Tooltip 
              contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)', padding: '12px' }}
            />
            <Area 
              type="monotone" 
              dataKey="value" 
              stroke={data.suggested_theme.primary} 
              strokeWidth={4}
              fillOpacity={1} 
              fill="url(#colorValue)" 
              animationDuration={1500}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {nodes.map((node: any, index: number) => (
          <div key={index} className="p-4 rounded-2xl bg-white/50 border border-black/5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: node.color || data.suggested_theme.primary }} />
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
