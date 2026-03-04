import React from 'react';
import { motion } from 'motion/react';
import { InfographicNode } from '../../types';

interface HeroTemplateProps {
  nodes: InfographicNode[];
  theme: {
    primary: string;
    secondary: string;
    text: string;
  };
  visualIntent?: string;
}

export const HeroTemplate: React.FC<HeroTemplateProps> = ({ nodes, theme, visualIntent }) => {
  if (!nodes || nodes.length === 0) {
    return (
      <div className="py-12 px-8 text-center opacity-50">
        <p>暂无核心摘要数据</p>
      </div>
    );
  }

  const mainNode = nodes[0];
  const subNodes = nodes.slice(1);

  return (
    <div className="relative overflow-hidden py-12 px-8 min-h-[400px] flex flex-col justify-center items-center text-center">
      {/* Background Decorative Elements */}
      <div 
        className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none"
        style={{ 
          background: `radial-gradient(circle at 20% 20%, ${theme.primary} 0%, transparent 50%), 
                       radial-gradient(circle at 80% 80%, ${theme.secondary} 0%, transparent 50%)` 
        }}
      />
      
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 max-w-4xl"
      >
        {visualIntent && (
          <span 
            className="inline-block px-4 py-1 rounded-full text-[10px] font-black tracking-[0.2em] uppercase mb-6"
            style={{ backgroundColor: `${theme.primary}15`, color: theme.primary }}
          >
            {visualIntent}
          </span>
        )}
        
        <h1 
          className="text-5xl md:text-7xl font-black tracking-tighter mb-6 leading-[0.9]"
          style={{ color: theme.text }}
        >
          {mainNode.title}
        </h1>
        
        <p 
          className="text-xl md:text-2xl opacity-60 font-medium leading-relaxed mb-12"
          style={{ color: theme.text }}
        >
          {mainNode.content}
        </p>

        {subNodes.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
            {subNodes.map((node, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + idx * 0.1 }}
                className="flex flex-col items-center"
              >
                {node.value && (
                  <span 
                    className="text-4xl font-black mb-2"
                    style={{ color: theme.primary }}
                  >
                    {node.value}
                  </span>
                )}
                <span className="text-xs font-bold uppercase tracking-widest opacity-40">
                  {node.title}
                </span>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
};
