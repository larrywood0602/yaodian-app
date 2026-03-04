import React from 'react';
import { motion } from 'motion/react';
import { InfographicNode } from '../../types';
import * as LucideIcons from 'lucide-react';

interface AdaptiveGridTemplateProps {
  nodes: InfographicNode[];
  theme: {
    primary: string;
    secondary: string;
    text: string;
  };
  density?: "low" | "medium" | "high";
}

export const AdaptiveGridTemplate: React.FC<AdaptiveGridTemplateProps> = ({ nodes = [], theme, density = "medium" }) => {
  if (!nodes || nodes.length === 0) return null;
  
  const getGridCols = () => {
    const count = nodes.length;
    if (count <= 2) return 'grid-cols-1 md:grid-cols-2';
    if (count === 3) return 'grid-cols-1 md:grid-cols-3';
    if (count === 4) return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4';
    return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
  };

  const getCardPadding = () => {
    if (density === "low") return "p-10";
    if (density === "high") return "p-5";
    return "p-8";
  };

  const getTitleSize = () => {
    if (density === "low") return "text-2xl";
    if (density === "high") return "text-lg";
    return "text-xl";
  };

  return (
    <div className={`grid ${getGridCols()} gap-6 p-6`}>
      {nodes.map((node, idx) => {
        const IconComponent = node.icon ? (LucideIcons as any)[node.icon] : null;
        
        return (
          <motion.div
            key={idx}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.1 }}
            className={`relative group rounded-[2rem] border border-black/5 hover:border-black/10 transition-all ${getCardPadding()}`}
            style={{ backgroundColor: `${theme.primary}05` }}
          >
            <div className="flex flex-col h-full">
              {IconComponent && (
                <div 
                  className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6 shadow-sm"
                  style={{ backgroundColor: 'white', color: theme.primary }}
                >
                  <IconComponent size={24} />
                </div>
              )}
              
              <h3 
                className={`${getTitleSize()} font-black mb-3 tracking-tight`}
                style={{ color: theme.text }}
              >
                {node.title}
              </h3>
              
              <p 
                className="text-sm opacity-60 leading-relaxed font-medium"
                style={{ color: theme.text }}
              >
                {node.content}
              </p>

              {node.value && (
                <div className="mt-auto pt-6">
                  <span 
                    className="text-3xl font-black"
                    style={{ color: theme.primary }}
                  >
                    {node.value}
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};
