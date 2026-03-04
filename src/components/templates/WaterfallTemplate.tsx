import React from 'react';
import { motion } from 'motion/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { EditableText, EditableArea } from '../UI';

export const WaterfallTemplate = ({ data, isEditing, onNodeUpdate }: { data: any, isEditing?: boolean, onNodeUpdate?: (index: number, val: any) => void }) => {
  let runningTotal = 0;
  
  const chartData = data.nodes.map((n: any, index: number) => {
    const val = parseFloat(n.value) || 0;
    const isTotal = index === data.nodes.length - 1 && n.title.toLowerCase().includes('total');
    
    let start, end;
    if (isTotal) {
      start = 0;
      end = runningTotal;
    } else {
      start = runningTotal;
      end = runningTotal + val;
      runningTotal = end;
    }

    return {
      ...n,
      originalIndex: index,
      start: Math.min(start, end),
      end: Math.max(start, end),
      val,
      isTotal,
      isNegative: val < 0
    };
  });

  // Recharts doesn't have a native waterfall, so we use a custom shape or stacked bars.
  // A simpler approach for waterfall in recharts is using a BarChart with a custom shape.
  // We'll use a standard BarChart and just map the data to [start, end] arrays for the dataKey.

  const formattedData = chartData.map((d: any) => ({
    ...d,
    range: [d.start, d.end]
  }));

  return (
    <div className="flex flex-col gap-6 py-6">
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
          <BarChart data={formattedData} margin={{ top: 20, right: 20, bottom: 20, left: -20 }}>
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
              cursor={{ fill: data.suggested_theme.text, opacity: 0.05 }}
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', backgroundColor: data.suggested_theme.background, color: data.suggested_theme.text }}
              formatter={(value: any, name: any, props: any) => [props.payload.val, 'Value']}
            />
            <Bar dataKey="range" animationDuration={1000} radius={[4, 4, 4, 4]}>
              {formattedData.map((entry: any, index: number) => {
                let color = data.suggested_theme.primary;
                if (entry.isTotal) color = data.suggested_theme.secondary;
                else if (entry.isNegative) color = '#ef4444'; // Red for negative
                else color = '#22c55e'; // Green for positive

                return <Cell key={`cell-${index}`} fill={entry.color || color} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
        {data.nodes.map((node: any, i: number) => {
          const val = parseFloat(node.value) || 0;
          const isNegative = val < 0;
          
          return (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="p-3 rounded-xl border border-black/5"
              style={{ backgroundColor: `${data.suggested_theme.primary}05` }}
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
                className={`text-lg font-black mb-1 ${isNegative ? 'text-red-500' : 'text-green-500'}`}
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
          );
        })}
      </div>
    </div>
  );
};
