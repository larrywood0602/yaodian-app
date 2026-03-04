import React from 'react';
import { motion } from 'motion/react';
import { InfographicData } from '../../types';
import { DynamicIcon } from '../UI';

export const HierarchyTemplate = ({ data }: { data: any }) => {
  const nodes = [...data.nodes].reverse(); // Usually hierarchy is bottom-up or top-down, let's assume top-down
  
  return (
    <div className="flex flex-col items-center gap-4 py-12">
      {nodes.map((node, index) => {
        const width = 100 - (index * (60 / nodes.length)); // Tapering width
        return (
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            className="relative group cursor-default"
            style={{ width: `${width}%` }}
          >
            <div 
              className="h-24 rounded-2xl flex items-center px-8 gap-6 shadow-lg border border-white/10 overflow-hidden transition-all duration-300 group-hover:translate-y-[-4px]"
              style={{ 
                backgroundColor: `${data.suggested_theme.primary}${Math.floor(255 * (1 - index/nodes.length)).toString(16).padStart(2, '0')}`,
                color: data.suggested_theme.background
              }}
            >
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                {node.icon && <DynamicIcon name={node.icon} size={24} />}
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold leading-tight">{node.title}</h3>
                <p className="text-sm opacity-80 line-clamp-1">{node.content}</p>
              </div>
              <div className="text-4xl font-black opacity-20 italic">
                0{nodes.length - index}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};
