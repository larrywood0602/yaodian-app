import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { ArrowUpDown, Info } from 'lucide-react';
import { MarkdownContent } from '../UI';

export const TableTemplate = ({ data }: { data: any }) => {
  const nodes = data.nodes || [];
  const headers = data.axis_labels || ['项目', '描述', '数值'];
  const columnTypes = data.column_types || ['text', 'text', 'number'];
  
  const [sortConfig, setSortConfig] = useState<{ key: number, direction: 'asc' | 'desc' } | null>(null);

  const tableData = useMemo(() => {
    return nodes.map((node: any) => {
      const row = [node.title, node.content];
      if (node.cells && Array.isArray(node.cells)) {
        return [...node.cells];
      }
      if (node.value !== undefined) {
        row.push(node.value);
      }
      return row;
    });
  }, [nodes]);

  const sortedData = useMemo(() => {
    if (!sortConfig) return tableData;
    
    return [...tableData].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      
      // Try numeric sort if possible
      const aNum = parseFloat(String(aVal).replace(/[^-0.9.]/g, ''));
      const bNum = parseFloat(String(bVal).replace(/[^-0.9.]/g, ''));
      
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return sortConfig.direction === 'asc' ? aNum - bNum : bNum - aNum;
      }
      
      // Fallback to string sort
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      if (aStr < bStr) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aStr > bStr) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [tableData, sortConfig]);

  const requestSort = (index: number) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === index && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key: index, direction });
  };

  const getCellStyles = (value: any, type: string, colIndex: number) => {
    if (type === 'number' || type === 'percentage') {
      const num = parseFloat(String(value).replace(/[^-0.9.]/g, ''));
      if (!isNaN(num)) {
        // Simple heatmap logic: if it's a number, give it a slight background based on its value relative to others
        // (This is a simplified version, ideally we'd find min/max of the column)
        return {
          fontFamily: 'var(--font-mono)',
          fontWeight: 'bold',
          textAlign: 'right' as const,
        };
      }
    }
    if (type === 'status') {
      return {
        display: 'inline-flex',
        padding: '2px 8px',
        borderRadius: '999px',
        fontSize: '10px',
        fontWeight: 'bold',
        textTransform: 'uppercase' as const,
        backgroundColor: data.suggested_theme.primary + '15',
        color: data.suggested_theme.primary,
        border: `1px solid ${data.suggested_theme.primary}30`
      };
    }
    return {};
  };

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-black/5 apple-shadow-sm bg-white/50 backdrop-blur-sm">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-black/[0.02] border-b border-black/5">
              {headers.map((header: string, i: number) => (
                <th 
                  key={i}
                  onClick={() => requestSort(i)}
                  className="p-4 text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-black/[0.05] transition-colors group"
                  style={{ color: data.suggested_theme.secondary }}
                >
                  <div className="flex items-center gap-2">
                    {header}
                    <ArrowUpDown size={12} className={`opacity-0 group-hover:opacity-100 transition-opacity ${sortConfig?.key === i ? 'opacity-100 text-apple-blue' : ''}`} />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedData.map((row: any[], rowIndex: number) => (
              <motion.tr 
                key={rowIndex}
                initial={{ opacity: 0, y: 5 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: rowIndex * 0.05 }}
                viewport={{ once: true }}
                className="border-b border-black/[0.03] last:border-0 hover:bg-apple-blue/[0.02] transition-colors group"
              >
                {row.map((cell: any, colIndex: number) => (
                  <td key={colIndex} className="p-4">
                    {columnTypes[colIndex] === 'text' && rowIndex === 0 && colIndex === 0 ? (
                      <div className="flex items-center gap-2">
                        <span className="font-bold" style={{ color: data.suggested_theme.text }}>{cell}</span>
                      </div>
                    ) : columnTypes[colIndex] === 'status' ? (
                      <span style={getCellStyles(cell, 'status', colIndex)}>{cell}</span>
                    ) : columnTypes[colIndex] === 'text' ? (
                      <div className="text-sm opacity-80" style={{ color: data.suggested_theme.text }}>
                        {typeof cell === 'string' && cell.length > 50 ? (
                          <MarkdownContent content={cell} theme={data.suggested_theme} />
                        ) : (
                          cell
                        )}
                      </div>
                    ) : (
                      <span style={getCellStyles(cell, columnTypes[colIndex], colIndex)} className="text-sm">
                        {cell}
                      </span>
                    )}
                  </td>
                ))}
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
      {nodes.length > 5 && (
        <div className="p-3 bg-black/[0.01] border-t border-black/5 flex items-center justify-center gap-2 text-[10px] font-bold text-apple-gray/50 uppercase tracking-widest">
          <Info size={10} />
          点击表头可进行排序 · 共 {nodes.length} 条数据
        </div>
      )}
    </div>
  );
};
