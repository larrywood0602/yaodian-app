import React from 'react';
import { motion } from 'motion/react';
import { InfographicData } from '../../types';
import { DynamicIcon, MarkdownContent } from '../UI';

export const ContrastTemplate = ({ data }: { data: any }) => {
  // Usually contrast has 2 main sides, but can have more
  return (
    <div className="flex flex-col md:flex-row gap-8 py-12 items-stretch relative">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-white shadow-2xl flex items-center justify-center font-black italic z-40 text-3xl text-black border-8 border-gray-50 hidden md:flex">
        VS
      </div>

      {data.nodes.slice(0, 2).map((node: any, index: number) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, x: index === 0 ? -50 : 50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ delay: index * 0.2, type: 'spring' }}
          className="flex-1 flex flex-col"
        >
          <div 
            className="rounded-[3rem] p-10 flex-1 flex flex-col items-center text-center relative overflow-hidden shadow-xl"
            style={{ 
              backgroundColor: index === 0 ? `${data.suggested_theme.primary}10` : `${data.suggested_theme.secondary}10`,
              border: `2px solid ${index === 0 ? data.suggested_theme.primary : data.suggested_theme.secondary}20`
            }}
          >
            <div 
              className="w-24 h-24 rounded-3xl flex items-center justify-center mb-8 shadow-2xl rotate-3 group-hover:rotate-0 transition-transform"
              style={{ 
                backgroundColor: index === 0 ? data.suggested_theme.primary : data.suggested_theme.secondary,
                color: data.suggested_theme.background 
              }}
            >
              {node.icon && <DynamicIcon name={node.icon} size={48} />}
            </div>
            
            <h3 className="text-3xl font-black mb-6 uppercase tracking-tighter" style={{ color: data.suggested_theme.text }}>
              {node.title}
            </h3>
            
            <div className="h-1.5 w-12 mb-8 rounded-full opacity-20" style={{ backgroundColor: data.suggested_theme.text }} />
            
            <div className="text-lg opacity-70 leading-relaxed font-medium" style={{ color: data.suggested_theme.text }}>
              <MarkdownContent content={node.content} theme={data.suggested_theme} />
            </div>

            {node.value && (
              <div className="mt-auto pt-10 text-4xl font-black tracking-tighter" style={{ color: index === 0 ? data.suggested_theme.primary : data.suggested_theme.secondary }}>
                {node.value}
              </div>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
};
