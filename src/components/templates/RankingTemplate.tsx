import React from 'react';
import { motion } from 'motion/react';
import { Trophy, Medal, Award } from 'lucide-react';
import { MarkdownContent, EditableText, EditableArea } from '../UI';

export const RankingTemplate = ({ data, isEditing, onNodeUpdate }: { data: any, isEditing?: boolean, onNodeUpdate?: (index: number, val: any) => void }) => {
  // Trust the order provided by the AI (which is instructed to sort from best to worst)
  const sortedNodes = data.nodes.slice(0, 3);

  const order = [1, 0, 2]; // Visual order: 2nd (left), 1st (middle), 3rd (right)
  const icons = [Medal, Trophy, Award]; // idx 0: Gold, idx 1: Silver, idx 2: Bronze
  const colors = ['#FFD700', '#C0C0C0', '#CD7F32']; // Gold, Silver, Bronze

  return (
    <div className="flex justify-center items-end gap-4 md:gap-8 py-24">
      {order.map((visualIdx, i) => {
        const node = sortedNodes[visualIdx];
        if (!node) return null;
        
        const Icon = icons[visualIdx];
        const color = colors[visualIdx];
        
        // Height: 1st place (visualIdx 0) is tallest.
        const height = visualIdx === 0 ? 'h-96' : visualIdx === 1 ? 'h-72' : 'h-60';
        
        return (
          <motion.div
            key={visualIdx}
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.2 }}
            className="flex flex-col items-center flex-1 max-w-[220px]"
          >
            {/* Medal/Icon */}
            <div 
              className="w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-2xl border-4 border-white z-30 shrink-0"
              style={{ backgroundColor: color, color: '#fff' }}
            >
              <Icon size={40} />
            </div>

            {/* Podium */}
            <div 
              className={`w-full ${height} rounded-t-3xl p-6 flex flex-col items-center text-center shadow-inner border-x border-t border-white/10 relative overflow-hidden`}
              style={{ backgroundColor: `${data.suggested_theme.primary}${visualIdx === 0 ? '20' : '10'}` }}
            >
              <div className="text-5xl font-black opacity-10 mb-4 italic shrink-0">{visualIdx + 1}</div>
              <EditableText
                value={node.title}
                onChange={(val) => onNodeUpdate?.(visualIdx, { ...node, title: val })}
                isEditing={isEditing}
                tagName="h3"
                className="font-bold text-lg mb-3 leading-tight"
                style={{ color: data.suggested_theme.text }}
              />
              <div className="text-xs opacity-70 mb-4 overflow-y-auto scrollbar-hide w-full" style={{ color: data.suggested_theme.text }}>
                <EditableArea
                  value={node.content}
                  onChange={(val) => onNodeUpdate?.(visualIdx, { ...node, content: val })}
                  isEditing={isEditing}
                  theme={data.suggested_theme}
                />
              </div>
              {node.value && (
                <div className="mt-auto pt-4 text-2xl font-black shrink-0" style={{ color: data.suggested_theme.primary }}>
                  <EditableText
                    value={node.value}
                    onChange={(val) => onNodeUpdate?.(visualIdx, { ...node, value: val })}
                    isEditing={isEditing}
                    tagName="div"
                  />
                </div>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};
