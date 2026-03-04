import React from 'react';
import { motion } from 'motion/react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { EditableText, EditableArea } from '../UI';

export const GaugeTemplate = ({ data, isEditing, onNodeUpdate }: { data: any, isEditing?: boolean, onNodeUpdate?: (index: number, val: any) => void }) => {
  // Gauge usually has 1 main value, but we can support multiple by taking the first node as the metric
  const mainNode = data.nodes[0] || {};
  const val = parseFloat(mainNode.value) || 0;
  
  // Assume value is a percentage (0-100)
  const percentage = Math.min(Math.max(isNaN(val) ? 0 : val, 0), 100);
  
  const chartData = [
    { name: 'Value', value: percentage, color: mainNode.color || data.suggested_theme.primary },
    { name: 'Remaining', value: 100 - percentage, color: `${data.suggested_theme.text}15` }
  ];

  return (
    <div className="flex flex-col items-center justify-center gap-6 py-8">
      <div className="relative w-64 h-32 md:w-80 md:h-40 overflow-hidden">
        <ResponsiveContainer width="100%" height="200%" minWidth={1} minHeight={1}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              startAngle={180}
              endAngle={0}
              innerRadius="70%"
              outerRadius="100%"
              dataKey="value"
              stroke="none"
              animationBegin={0}
              animationDuration={1500}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        
        <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center justify-end pb-2">
          <EditableText
            value={mainNode.value || "0"}
            onChange={(val) => onNodeUpdate?.(0, { ...mainNode, value: val })}
            isEditing={isEditing}
            tagName="div"
            className="text-4xl md:text-5xl font-black tracking-tighter"
            style={{ color: data.suggested_theme.text }}
          />
          <EditableText
            value={mainNode.title || "Metric"}
            onChange={(val) => onNodeUpdate?.(0, { ...mainNode, title: val })}
            isEditing={isEditing}
            tagName="div"
            className="text-sm font-bold uppercase tracking-widest opacity-50 mt-1"
            style={{ color: data.suggested_theme.text }}
          />
        </div>
      </div>

      <div className="w-full max-w-md mt-4 text-center">
        <div className="text-sm opacity-80 leading-relaxed" style={{ color: data.suggested_theme.text }}>
          <EditableArea
            value={mainNode.content || ""}
            onChange={(val) => onNodeUpdate?.(0, { ...mainNode, content: val })}
            isEditing={isEditing}
            theme={data.suggested_theme}
          />
        </div>
      </div>
      
      {data.nodes.length > 1 && (
        <div className="grid grid-cols-2 gap-4 w-full mt-6 pt-6 border-t border-black/5">
          {data.nodes.slice(1).map((node: any, i: number) => (
            <motion.div 
              key={i+1}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="text-center"
            >
              <EditableText
                value={node.value}
                onChange={(val) => onNodeUpdate?.(i+1, { ...node, value: val })}
                isEditing={isEditing}
                tagName="div"
                className="text-xl font-bold"
                style={{ color: node.color || data.suggested_theme.text }}
              />
              <EditableText
                value={node.title}
                onChange={(val) => onNodeUpdate?.(i+1, { ...node, title: val })}
                isEditing={isEditing}
                tagName="div"
                className="text-xs font-bold opacity-50 uppercase tracking-wider"
                style={{ color: data.suggested_theme.text }}
              />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
