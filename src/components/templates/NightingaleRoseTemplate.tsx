import React from 'react';
import { motion } from 'motion/react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { CHART_COLORS } from '../../constants';

export const NightingaleRoseTemplate = ({ data }: { data: any }) => {
  const nodes = data.nodes;
  const values = nodes.map((n: any) => parseFloat(n.value) || 0);
  const maxVal = Math.max(...values, 1);
  
  // Nightingale Rose chart: each segment has the same angle but different radius
  // In Recharts, we can simulate this by giving each data point a fixed 'angle' value
  // and using outerRadius as a function of the actual value.
  // Actually, Recharts Pie doesn't support dynamic outerRadius per cell easily in the standard way.
  // But we can use multiple Pie components or just a custom shape.
  
  // Alternative: Use a standard Pie chart but normalize the values so they all have the same angle,
  // and then use a custom cell to draw the radius.
  
  const chartData = nodes.map((node: any) => ({
    name: node.title,
    value: 1, // Equal angle for all
    actualValue: parseFloat(node.value) || 0,
    color: node.color
  }));

  const CustomCell = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload } = props;
    const radiusScale = payload.actualValue / maxVal;
    const dynamicOuterRadius = innerRadius + (outerRadius - innerRadius) * radiusScale;
    
    // Calculate path for a pie slice
    const RADIAN = Math.PI / 180;
    const x1 = cx + dynamicOuterRadius * Math.cos(-startAngle * RADIAN);
    const y1 = cy + dynamicOuterRadius * Math.sin(-startAngle * RADIAN);
    const x2 = cx + dynamicOuterRadius * Math.cos(-endAngle * RADIAN);
    const y2 = cy + dynamicOuterRadius * Math.sin(-endAngle * RADIAN);
    const x3 = cx + innerRadius * Math.cos(-endAngle * RADIAN);
    const y3 = cy + innerRadius * Math.sin(-endAngle * RADIAN);
    const x4 = cx + innerRadius * Math.cos(-startAngle * RADIAN);
    const y4 = cy + innerRadius * Math.sin(-startAngle * RADIAN);

    const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;

    const d = [
      `M ${x1} ${y1}`,
      `A ${dynamicOuterRadius} ${dynamicOuterRadius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
      `L ${x3} ${y3}`,
      `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x4} ${y4}`,
      `Z`
    ].join(' ');

    return (
      <path d={d} fill={fill} stroke="#fff" strokeWidth={2} />
    );
  };

  return (
    <div className="py-8 w-full h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={20}
            outerRadius={150}
            dataKey="value"
            stroke="none"
            startAngle={90}
            endAngle={450}
            shape={<CustomCell />}
          >
            {chartData.map((entry: any, index: number) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.color || CHART_COLORS[index % CHART_COLORS.length]} 
              />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value: any, name: any, props: any) => [props.payload.actualValue, name]}
            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)', padding: '12px' }}
          />
          <Legend iconType="circle" />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};
