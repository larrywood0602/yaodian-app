import React from 'react';
import { motion } from 'motion/react';
import { 
  ComposedChart, 
  Line, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LabelList
} from 'recharts';

export const ComboChartTemplate = ({ data }: { data: any }) => {
  const chartData = data.nodes.map((node: any) => {
    const rawValues = (node.value || '').split(',').map((v: string) => v.trim());
    const val1Str = rawValues[0] || '0';
    const val2Str = rawValues[1] || '0';
    
    const val1 = parseFloat(val1Str.replace(/[^0-9.-]/g, '')) || 0;
    const val2 = parseFloat(val2Str.replace(/[^0-9.-]/g, '')) || 0;

    // Detect if val1 is percentage and val2 is absolute
    const val1IsPct = val1Str.includes('%') || val1Str.includes('率') || val1Str.includes('增长');
    const val2IsPct = val2Str.includes('%') || val2Str.includes('率') || val2Str.includes('增长');

    let barVal = val1;
    let lineVal = val2;
    let barStr = val1Str;
    let lineStr = val2Str;
    let barLabel = data.axis_labels?.[0] || "主要维度";
    let lineLabel = data.axis_labels?.[1] || "次要维度";

    // If val1 is percentage but val2 is not, swap them so Bar is absolute
    if (val1IsPct && !val2IsPct) {
      barVal = val2;
      lineVal = val1;
      barStr = val2Str;
      lineStr = val1Str;
      barLabel = data.axis_labels?.[1] || "次要维度";
      lineLabel = data.axis_labels?.[0] || "主要维度";
    }

    return {
      name: node.title,
      barVal,
      lineVal,
      barStr,
      lineStr,
      barLabel,
      lineLabel
    };
  });

  const barName = chartData[0]?.barLabel;
  const lineName = chartData[0]?.lineLabel;

  return (
    <div className="h-[400px] w-full py-8">
      <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
        <ComposedChart
          data={chartData}
          margin={{ top: 30, right: 20, bottom: 20, left: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
          <XAxis 
            dataKey="name" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: data.suggested_theme.text, fontSize: 12, opacity: 0.6 }}
            dy={10}
          />
          <YAxis 
            yAxisId="left"
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: data.suggested_theme.text, fontSize: 12, opacity: 0.6 }}
          />
          <YAxis 
            yAxisId="right" 
            orientation="right" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: data.suggested_theme.secondary, fontSize: 12, opacity: 0.6 }}
          />
          <Tooltip 
            formatter={(value: any, name: string, props: any) => {
              const { payload } = props;
              if (name === barName) return [payload.barStr, name];
              if (name === lineName) return [payload.lineStr, name];
              return [value, name];
            }}
            contentStyle={{ 
              backgroundColor: data.suggested_theme.background, 
              borderRadius: '1rem', 
              border: 'none',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)'
            }}
          />
          <Legend verticalAlign="top" height={36}/>
          <Bar 
            yAxisId="left" 
            dataKey="barVal" 
            name={barName} 
            fill={data.suggested_theme.primary} 
            radius={[8, 8, 0, 0]} 
            barSize={40}
          >
            <LabelList dataKey="barStr" position="top" fill={data.suggested_theme.text} fontSize={12} fontWeight="bold" />
          </Bar>
          <Line 
            yAxisId="right" 
            type="monotone" 
            dataKey="lineVal" 
            name={lineName} 
            stroke={data.suggested_theme.secondary} 
            strokeWidth={3}
            dot={{ r: 6, fill: data.suggested_theme.secondary, strokeWidth: 2, stroke: data.suggested_theme.background }}
            activeDot={{ r: 8 }}
          >
            <LabelList dataKey="lineStr" position="top" fill={data.suggested_theme.secondary} fontSize={12} fontWeight="bold" offset={10} />
          </Line>
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};
