import React from 'react';
import { motion } from 'motion/react';
import { DynamicIcon } from '../UI';
import { CHART_COLORS } from '../../constants';

export const RadialBarTemplate = ({ data }: { data: any }) => {
  const nodes = data.nodes;
  const maxRadius = 180;
  const strokeWidth = 12;
  const gap = 20;

  return (
    <div className="flex flex-col md:flex-row items-center justify-center gap-12 py-16">
      <div className="relative w-[400px] h-[400px]">
        <svg viewBox="0 0 400 400" className="w-full h-full transform -rotate-90">
          {nodes.map((node: any, i: number) => {
            const radius = maxRadius - i * (strokeWidth + gap);
            if (isNaN(radius) || radius <= 0) return null;
            
            const val = parseFloat(node.value) || 0;
            const percentage = Math.min(val / 100, 1); 
            const circumference = 2 * Math.PI * radius;
            const offset = circumference * (1 - (isNaN(percentage) ? 0 : percentage));
            const color = node.color || CHART_COLORS[i % CHART_COLORS.length];

            return (
              <g key={i}>
                {/* Background Track */}
                <circle
                  cx="200"
                  cy="200"
                  r={radius}
                  fill="none"
                  stroke={data.suggested_theme.text}
                  strokeWidth={strokeWidth}
                  opacity="0.05"
                />
                {/* Progress Bar */}
                <motion.circle
                  cx="200"
                  cy="200"
                  r={radius}
                  fill="none"
                  stroke={color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={circumference}
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset: isNaN(offset) ? circumference : offset }}
                  transition={{ duration: 1.5, delay: i * 0.2, ease: "easeOut" }}
                  strokeLinecap="round"
                />
              </g>
            );
          })}
        </svg>
        
        {/* Center Label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
          <div className="text-4xl font-black opacity-10 uppercase tracking-tighter">达成情况</div>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        {nodes.map((node: any, i: number) => {
          const color = node.color || CHART_COLORS[i % CHART_COLORS.length];
          return (
            <motion.div 
              key={i}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + i * 0.1 }}
              className="flex items-start gap-4"
            >
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-lg"
                style={{ backgroundColor: color, color: data.suggested_theme.background }}
              >
                {node.icon ? <DynamicIcon name={node.icon} size={20} /> : <span className="font-bold">{i + 1}</span>}
              </div>
              <div>
                <h4 className="font-bold text-lg leading-tight" style={{ color: color }}>
                  {node.title}
                </h4>
                <p className="text-xs opacity-60 mb-1" style={{ color: data.suggested_theme.text }}>{node.content}</p>
                <div className="text-xl font-black" style={{ color: data.suggested_theme.text }}>
                  {node.value}{!node.value?.toString().includes('%') && !isNaN(parseFloat(node.value)) && '%'}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
