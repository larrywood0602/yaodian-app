import React from 'react';
import { motion } from 'motion/react';
import { DynamicIcon, Card } from '../UI';

export const SwotTemplate = ({ data }: { data: any }) => {
  const labels = ['Strengths', 'Weaknesses', 'Opportunities', 'Threats'];
  const zhLabels = ['优势 (S)', '劣势 (W)', '机会 (O)', '威胁 (T)'];
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-8">
      {data.nodes.slice(0, 4).map((node: any, index: number) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
        >
          <Card 
            className="h-full relative overflow-hidden group"
            style={{ 
              backgroundColor: `${data.suggested_theme.primary}${index % 2 === 0 ? '10' : '05'}`,
              borderColor: `${data.suggested_theme.primary}20`
            }}
          >
            <div className="absolute -right-4 -top-4 text-6xl font-black opacity-5 group-hover:opacity-10 transition-opacity italic">
              {labels[index][0]}
            </div>
            
            <div className="flex items-center gap-4 mb-6">
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg"
                style={{ backgroundColor: node.color || data.suggested_theme.primary, color: data.suggested_theme.background }}
              >
                {node.icon && <DynamicIcon name={node.icon} size={24} />}
              </div>
              <div>
                <div className="text-[10px] font-bold opacity-40 uppercase tracking-widest">{zhLabels[index]}</div>
                <h3 className="text-xl font-bold" style={{ color: data.suggested_theme.text }}>{node.title}</h3>
              </div>
            </div>
            
            <p className="opacity-70 leading-relaxed" style={{ color: data.suggested_theme.text }}>{node.content}</p>
          </Card>
        </motion.div>
      ))}
    </div>
  );
};
