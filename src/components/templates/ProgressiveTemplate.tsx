import React from 'react';
import { motion } from 'motion/react';
import { InfographicData } from '../../types';
import { DynamicIcon } from '../UI';

export const ProgressiveTemplate = ({ data }: { data: any }) => {
  return (
    <div className="flex flex-col gap-8 py-8">
      {data.nodes.map((node, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
          className="flex items-start gap-6 relative"
        >
          {index < data.nodes.length - 1 && (
            <div 
              className="absolute left-6 top-12 bottom-[-2rem] w-0.5 opacity-20"
              style={{ backgroundColor: data.suggested_theme.primary }}
            />
          )}
          
          <div 
            className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 z-10 shadow-lg"
            style={{ backgroundColor: node.color || data.suggested_theme.primary, color: data.suggested_theme.background }}
          >
            {node.icon ? <DynamicIcon name={node.icon} size={24} /> : <span className="font-bold">{index + 1}</span>}
          </div>
          
          <div className="flex-1 pt-1">
            <h3 className="text-xl font-bold mb-2" style={{ color: data.suggested_theme.text }}>{node.title}</h3>
            <p className="opacity-80 leading-relaxed" style={{ color: data.suggested_theme.text }}>{node.content}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
};
