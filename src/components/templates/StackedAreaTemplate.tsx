import React from 'react';
import { motion } from 'motion/react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export const StackedAreaTemplate = ({ data }: { data: any }) => {
  const nodes = data.nodes;
  const seriesNames = data.axis_labels || ['Series 1'];
  
  const chartData = nodes.map((node: any) => {
    const values = node.value?.toString().split(',').map((v: string) => parseFloat(v.trim()) || 0) || [0];
    const dataPoint: any = { name: node.title };
    seriesNames.forEach((name: string, idx: number) => {
      dataPoint[name] = values[idx] || 0;
    });
    return dataPoint;
  });

  const colors = [
    data.suggested_theme.primary,
    data.suggested_theme.secondary,
    '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'
  ];

  return (
    <div className="py-8 w-full h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <defs>
            {seriesNames.map((name: string, idx: number) => (
              <linearGradient key={`grad-${idx}`} id={`color-${idx}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={colors[idx % colors.length]} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={colors[idx % colors.length]} stopOpacity={0}/>
              </linearGradient>
            ))}
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
          <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
          {seriesNames.map((name: string, idx: number) => (
            <Area 
              key={name}
              type="monotone" 
              dataKey={name} 
              stackId="1" 
              stroke={colors[idx % colors.length]} 
              fillOpacity={1} 
              fill={`url(#color-${idx})`} 
              strokeWidth={2}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
