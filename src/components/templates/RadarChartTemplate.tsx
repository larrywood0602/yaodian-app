import React from 'react';
import { motion } from 'motion/react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { EditableText, EditableArea } from '../UI';
import { CHART_COLORS } from '../../constants';

export const RadarChartTemplate = ({ data, isEditing, onNodeUpdate }: { data: any, isEditing?: boolean, onNodeUpdate?: (index: number, val: any) => void }) => {
  const hasMultipleValues = data.nodes.some((n: any) => n.value && n.value.includes(','));

  const nodes = data.nodes.map((n: any) => {
    const values = (n.value || '').split(',').map((v: string) => parseFloat(v.trim().replace(/[^0-9.-]/g, '')) || 0);
    return {
      ...n,
      value1: values[0] || 0,
      value2: values[1] || 0,
    };
  });

  const label1 = data.axis_labels?.[0] || "维度 1";
  const label2 = data.axis_labels?.[1] || "维度 2";

  return (
    <div className="py-8 w-full">
      <div className="h-[400px] mb-12">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={nodes}>
            <PolarGrid stroke="#eee" />
            <PolarAngleAxis 
              dataKey="title" 
              tick={{ fill: data.suggested_theme.text, fontSize: 12, fontWeight: 'bold' }} 
            />
            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
            <Tooltip 
              contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)', padding: '12px' }}
            />
            {hasMultipleValues && <Legend verticalAlign="bottom" iconType="circle" />}
            <Radar 
              name={hasMultipleValues ? label1 : "数值"} 
              dataKey="value1" 
              stroke={data.suggested_theme.primary} 
              fill={data.suggested_theme.primary} 
              fillOpacity={0.3} 
              strokeWidth={3}
              animationDuration={1500}
            />
            {hasMultipleValues && (
              <Radar 
                name={label2} 
                dataKey="value2" 
                stroke={data.suggested_theme.secondary} 
                fill={data.suggested_theme.secondary} 
                fillOpacity={0.3} 
                strokeWidth={3}
                animationDuration={1500}
              />
            )}
          </RadarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {nodes.map((node: any, i: number) => (
          <div key={i} className="p-4 rounded-2xl bg-white/50 border border-black/5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: node.color || CHART_COLORS[i % CHART_COLORS.length] }} />
              <EditableText
                value={node.title}
                onChange={(val) => onNodeUpdate?.(i, { ...node, title: val })}
                isEditing={isEditing}
                tagName="h4"
                className="font-bold text-sm"
                style={{ color: data.suggested_theme.text }}
              />
            </div>
            <div className="text-2xl font-black mb-2" style={{ color: data.suggested_theme.text }}>
              <EditableText
                value={node.value}
                onChange={(val) => onNodeUpdate?.(i, { ...node, value: val })}
                isEditing={isEditing}
                tagName="span"
              />
            </div>
            <div className="text-xs opacity-60">
              <EditableArea
                value={node.content}
                onChange={(val) => onNodeUpdate?.(i, { ...node, content: val })}
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
