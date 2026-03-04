import React from 'react';
import * as Icons from 'lucide-react';
import { LucideProps } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface DynamicIconProps extends LucideProps {
  name: string;
}

export const DynamicIcon = ({ name, ...props }: DynamicIconProps) => {
  const IconComponent = (Icons as any)[name] || Icons.HelpCircle;
  return <IconComponent {...props} />;
};

export const Card = ({ children, className = "", style = {} }: { children: React.ReactNode, className?: string, style?: React.CSSProperties }) => (
  <div 
    className={`rounded-2xl p-6 shadow-sm border border-white/10 backdrop-blur-sm ${className}`}
    style={style}
  >
    {children}
  </div>
);

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 text-red-500 bg-red-50 rounded-lg border border-red-200">
          <div className="font-bold mb-2 flex items-center gap-2">
            <Icons.AlertTriangle size={16} />
            渲染此部分时出错
          </div>
          <div className="text-xs opacity-80 font-mono overflow-auto max-h-32">
            {this.props.fallback || "请尝试重新生成该段落或刷新页面。"}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export const EditableText = ({
  value,
  onChange,
  isEditing,
  className = "",
  style = {},
  tagName = "div",
  placeholder = ""
}: {
  value: string;
  onChange?: (val: string) => void;
  isEditing?: boolean;
  className?: string;
  style?: React.CSSProperties;
  tagName?: string;
  placeholder?: string;
}) => {
  if (!isEditing || !onChange) {
    const Tag = tagName as any;
    return <Tag className={className} style={style}>{value}</Tag>;
  }
  
  return (
    <input
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`bg-blue-50/50 border border-blue-300 rounded px-2 py-0.5 w-full outline-none focus:ring-2 focus:ring-blue-500/50 transition-all ${className}`}
      style={{ ...style, minWidth: '1em' }}
      onClick={(e) => e.stopPropagation()}
    />
  );
};

export const EditableArea = ({
  value,
  onChange,
  isEditing,
  theme,
  className = "",
  placeholder = ""
}: {
  value: string;
  onChange?: (val: string) => void;
  isEditing?: boolean;
  theme: any;
  className?: string;
  placeholder?: string;
}) => {
  if (!isEditing || !onChange) {
    return <div className={className}><MarkdownContent content={value || ""} theme={theme} /></div>;
  }
  
  return (
    <textarea
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`bg-blue-50/50 border border-blue-300 rounded px-2 py-1 w-full min-h-[80px] text-sm outline-none focus:ring-2 focus:ring-blue-500/50 transition-all resize-y ${className}`}
      style={{ color: theme.text }}
      onClick={(e) => e.stopPropagation()}
    />
  );
};

export const MarkdownContent = ({ content, theme }: { content: string, theme: any }) => (
  <div className="markdown-body prose prose-sm max-w-none">
    <ReactMarkdown
      components={{
        strong: ({ node, ...props }) => (
          <span 
            style={{ color: theme.primary }} 
            className="font-black" 
            {...props} 
          />
        ),
        p: ({ node, ...props }) => <p className="mb-2 last:mb-0 leading-relaxed" {...props} />,
        ul: ({ node, ...props }) => <ul className="list-disc list-inside mb-2 space-y-1" {...props} />,
        ol: ({ node, ...props }) => <ol className="list-decimal list-inside mb-2 space-y-1" {...props} />,
        li: ({ node, ...props }) => <li className="inline-block w-full" {...props} />,
      }}
    >
      {content}
    </ReactMarkdown>
  </div>
);
