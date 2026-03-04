import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Download, RefreshCw, Type, Layout, Palette, ChevronRight, Wand2, Check, Image as ImageIcon, FileText, Presentation, Target, Database, BookmarkPlus } from 'lucide-react';
import { analyzeText, regenerateSection, diagnoseConnection, normalizeInfographicData } from './services/gemini';
import { InfographicData, KnowledgeCard } from './types';
import { InfographicRenderer, SectionRenderer } from './components/InfographicRenderer';
import { COLOR_PALETTES } from './constants';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import pptxgen from 'pptxgenjs';
import confetti from 'canvas-confetti';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import JSZip from 'jszip';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';
// @ts-ignore
import pdfWorker from 'pdfjs-dist/legacy/build/pdf.worker.mjs?url';

// Set worker path for pdfjs
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;



const ANALYSIS_TARGETS = ['行业分析', '投资评估', '产品研究', '风险分析', '学术理解', '自定义'];
const DEFAULT_THEME = {
  primary: '#007AFF',
  secondary: '#86868B',
  background: '#F5F5F7',
  text: '#1D1D1F',
};

const normalizeReportData = (data: any, kind: 'visual' | 'strategic'): InfographicData => {
  try {
    return normalizeInfographicData(data, kind);
  } catch {
    return {
      title: kind === 'visual' ? '可视化报告' : '战略洞察报告',
      sections: [],
      suggested_theme: DEFAULT_THEME,
    };
  }
};

export default function App() {
  const [input, setInput] = useState('');
  const [analysisTarget, setAnalysisTarget] = useState('自定义');
  const [activeTab, setActiveTab] = useState<'generate' | 'history' | 'infobase'>('generate');
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [showPersonalMenu, setShowPersonalMenu] = useState(false);
  const [knowledgeCards, setKnowledgeCards] = useState<any[]>(() => {
    const saved = localStorage.getItem('knowledgeCards');
    return saved ? JSON.parse(saved) : [];
  });
  const [infobaseCards, setInfobaseCards] = useState<any[]>(() => {
    const saved = localStorage.getItem('infobaseCards');
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedInfobaseCard, setSelectedInfobaseCard] = useState<KnowledgeCard | null>(null);

  const [inputMode, setInputMode] = useState<'text' | 'file'>('text');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [generationStage, setGenerationStage] = useState<'idle' | 'framework' | 'deep-dive'>('idle');
  const [isExporting, setIsExporting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [useWebSearch, setUseWebSearch] = useState(false);
  const [searchData, setSearchData] = useState<string | null>(null);
  const [visualData, setVisualData] = useState<InfographicData | null>(null);
  const [strategicData, setStrategicData] = useState<InfographicData | null>(null);
  const [activeReportType, setActiveReportType] = useState<'visual' | 'strategic'>('visual');
  const [historyViewMode, setHistoryViewMode] = useState<'grid' | 'list'>('grid');
  const [cardToDelete, setCardToDelete] = useState<number | null>(null);
  const [attachments, setAttachments] = useState<{name: string, content: string, type: string}[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [downloadConfirm, setDownloadConfirm] = useState<'png' | 'pdf' | 'ppt' | null>(null);
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);
  const rendererRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const personalMenuRef = useRef<HTMLDivElement>(null);
  const isNativeApp = Capacitor.isNativePlatform();

  // Click away listener for personal menu
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (personalMenuRef.current && !personalMenuRef.current.contains(event.target as Node)) {
        setShowPersonalMenu(false);
      }
    };
    if (showPersonalMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPersonalMenu]);

  const readPdf = async (file: File) => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let text = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map((item: any) => item.str).join(' ');
    }
    return text;
  };

  const readDocx = async (file: File) => {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  };

  const readPptx = async (file: File) => {
    const zip = await JSZip.loadAsync(file);
    let text = '';
    const slideFiles = Object.keys(zip.files).filter(name => name.startsWith('ppt/slides/slide') && name.endsWith('.xml'));
    
    for (const slideFile of slideFiles) {
      const content = await zip.file(slideFile)?.async('text');
      if (content) {
        // Simple regex to extract text from ppt xml
        const matches = content.match(/<a:t>([^<]*)<\/a:t>/g);
        if (matches) {
          text += matches.map(m => m.replace(/<a:t>|<\/a:t>/g, '')).join(' ') + '\n';
        }
      }
    }
    return text;
  };

  const dataUrlToBase64 = (dataUrl: string) => {
    const base64 = dataUrl.split(',')[1];
    if (!base64) throw new Error('Invalid data URL');
    return base64;
  };

  const shareBase64File = async (base64Data: string, fileName: string) => {
    const path = `exports/${fileName}`;
    await Filesystem.writeFile({
      path,
      data: base64Data,
      directory: Directory.Cache,
      recursive: true
    });
    const { uri } = await Filesystem.getUri({ path, directory: Directory.Cache });
    await Share.share({
      title: '导出报告',
      files: [uri]
    });
  };

  const handleVoiceInput = async () => {
    if (isNativeApp) {
      try {
        const { available } = await SpeechRecognition.available();
        if (!available) {
          alert('当前设备不支持语音识别。');
          return;
        }

        const permission = await SpeechRecognition.requestPermissions();
        if (permission.speechRecognition !== 'granted') {
          alert('语音识别权限未开启，请在系统设置中允许后重试。');
          return;
        }

        setIsListening(true);
        const { matches } = await SpeechRecognition.start({
          language: 'zh-CN',
          maxResults: 1,
          partialResults: false,
          popup: true
        });

        if (matches?.[0]) {
          setInput(prev => prev + matches[0]);
        }
      } catch (err) {
        console.error('Native speech recognition error', err);
      } finally {
        setIsListening(false);
      }
      return;
    }

    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('您的浏览器不支持语音识别。');
      return;
    }
    const BrowserSpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new BrowserSpeechRecognition();
    recognition.lang = 'zh-CN';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(prev => prev + transcript);
    };
    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      setIsListening(false);
    };
    recognition.start();
  };

  const processFile = (file: File) => {
    const fileType = file.name.split('.').pop()?.toLowerCase();
    const supportedTypes = ['pdf', 'docx', 'pptx', 'txt', 'md', 'json'];
    if (!supportedTypes.includes(fileType || '')) {
      alert('暂不支持该文件格式。目前支持 PDF, DOCX, PPTX, TXT, MD, JSON');
      return;
    }
    setPendingFile(file);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) processFile(file);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const saveToKnowledge = (isAuto = false) => {
    if (!currentData) return;
    const newCard = {
      id: Date.now(),
      title: currentData.title,
      summary: currentData.subtitle || currentData.sections[0]?.section_title,
      date: new Date().toISOString(),
      tags: [analysisTarget],
      data: currentData,
      strategicData: strategicData
    };
    setKnowledgeCards(prev => {
      const updated = [newCard, ...prev];
      localStorage.setItem('knowledgeCards', JSON.stringify(updated));
      return updated;
    });
    if (!isAuto) alert('已保存至知识库！');
  };

  const handleDeleteCard = (id: number, e: React.MouseEvent) => {
    setCardToDelete(id);
  };

  const confirmDelete = () => {
    if (cardToDelete) {
      setKnowledgeCards(prev => {
        const updated = prev.filter(card => card.id !== cardToDelete);
        localStorage.setItem('knowledgeCards', JSON.stringify(updated));
        return updated;
      });
      setCardToDelete(null);
    }
  };

  const groupCardsByDate = (cards: any[]) => {
    const groups: { [key: string]: any[] } = {};
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterday = today - 86400000;

    cards.forEach(card => {
      const cardDate = new Date(card.date);
      const cardTime = new Date(cardDate.getFullYear(), cardDate.getMonth(), cardDate.getDate()).getTime();
      
      let groupKey = '';
      if (cardTime === today) {
        groupKey = '今天';
      } else if (cardTime === yesterday) {
        groupKey = '昨天';
      } else {
        groupKey = `${cardDate.getMonth() + 1}月${cardDate.getDate()}日`;
      }

      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(card);
    });

    return groups;
  };

  const handleGenerate = async () => {
    let finalInput = input.trim();

    if (inputMode === 'file' && pendingFile) {
      setIsLoading(true);
      setGenerationStage('framework');
      try {
        const fileType = pendingFile.name.split('.').pop()?.toLowerCase();
        if (fileType === 'pdf') {
          finalInput = await readPdf(pendingFile);
        } else if (fileType === 'docx') {
          finalInput = await readDocx(pendingFile);
        } else if (fileType === 'pptx') {
          finalInput = await readPptx(pendingFile);
        } else if (['txt', 'md', 'json'].includes(fileType || '')) {
          finalInput = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.onerror = reject;
            reader.readAsText(pendingFile);
          });
        }
      } catch (err) {
        console.error('File read error:', err);
        alert('读取文件失败，请确保文件未加密且格式正确。');
        setIsLoading(false);
        setGenerationStage('idle');
        return;
      }
    }

    if (!finalInput) return;
    
    setIsLoading(true);
    setGenerationStage('framework');
    setError(null);
    setVisualData(null);
    setStrategicData(null);
    setSearchData(null);
    setActiveReportType('visual');
    
    try {
      const result = await analyzeText(
        finalInput, 
        analysisTarget, 
        (partialVisual) => {
          if (partialVisual && Array.isArray(partialVisual.sections)) {
            setVisualData(normalizeReportData(partialVisual, 'visual'));
          }
        },
        (partialStrategic) => {
          setGenerationStage('deep-dive');
          if (partialStrategic && Array.isArray(partialStrategic.sections)) {
            setStrategicData(normalizeReportData(partialStrategic, 'strategic'));
          }
        },
        (finalVisual) => {
          // Visual stage complete - allow user to see the report
          setVisualData(normalizeReportData(finalVisual, 'visual'));
          setGenerationStage('deep-dive');
        },
        useWebSearch,
        (data) => setSearchData(data)
      );

      const safeVisual = normalizeReportData(result.visual, 'visual');
      const safeStrategic = normalizeReportData(result.strategic, 'strategic');

      setVisualData(safeVisual);
      setStrategicData(safeStrategic);
      
      // Auto-save to knowledge base (saving visual by default or both?)
      const newCard = {
        id: Date.now(),
        title: safeVisual.title,
        summary: safeVisual.subtitle || safeVisual.sections[0]?.section_title || '未命名摘要',
        date: new Date().toISOString(),
        tags: [analysisTarget],
        data: safeVisual,
        strategicData: safeStrategic
      };
      setKnowledgeCards(prev => {
        const updated = [newCard, ...prev];
        localStorage.setItem('knowledgeCards', JSON.stringify(updated));
        return updated;
      });

      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: [safeVisual.suggested_theme.primary, safeVisual.suggested_theme.secondary]
      });
    } catch (err: any) {
      const is503 = err?.message?.includes('503') || err?.message?.includes('UNAVAILABLE');
      if (is503) {
        setError('当前 AI 模型访问量过大，请稍后重试。');
      } else {
        let detail = String(err?.message || '').trim();
        const isTimeoutError = /timeout|timed out|超时/i.test(detail);
        if (!detail || detail === 'Failed to fetch' || detail.includes('NetworkError') || isTimeoutError) {
          try {
            const d = await diagnoseConnection();
            if (isTimeoutError) {
              detail = `请求超时：${detail}\n\nAPI地址: ${d.apiBaseUrl}\n${d.apiMessage}\n${d.qwenMessage}\n${d.memfireMessage}\n建议：网络较慢时可重试，或减少输入内容长度。`;
            } else {
              detail = `API地址: ${d.apiBaseUrl}\n${d.apiMessage}\n${d.qwenMessage}\n${d.memfireMessage}`;
            }
          } catch (diagErr: any) {
            detail = `连接检查失败：${String(diagErr?.message || diagErr)}`;
          }
        }
        setError(`生成信息图表失败。\n${detail}`);
      }
      console.error(err);
    } finally {
      setIsLoading(false);
      setGenerationStage('idle');
    }
  };

  const handleCheckConnection = async () => {
    setIsCheckingConnection(true);
    try {
      const d = await diagnoseConnection();
      setError(`连接检查结果：\nAPI地址: ${d.apiBaseUrl}\n${d.apiMessage}\n${d.qwenMessage}\n${d.memfireMessage}`);
    } catch (err: any) {
      setError(`连接检查失败：${String(err?.message || err)}`);
    } finally {
      setIsCheckingConnection(false);
    }
  };

  const handleRegenerateSection = async (index: number) => {
    const currentData = activeReportType === 'visual' ? visualData : strategicData;
    if (!currentData) return;
    
    setIsRegenerating(true);
    try {
      const section = currentData.sections[index];
      const newSection = await regenerateSection(section.section_title || "", section.nodes);
      
      const newSections = [...currentData.sections];
      newSections[index] = newSection;
      
      if (activeReportType === 'visual') {
        setVisualData(normalizeReportData({ ...currentData, sections: newSections }, 'visual'));
      } else {
        setStrategicData(normalizeReportData({ ...currentData, sections: newSections }, 'strategic'));
      }
    } catch (err) {
      console.error('Regenerate section failed:', err);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleFavoriteSection = (index: number) => {
    const currentData = activeReportType === 'visual' ? visualData : strategicData;
    if (!currentData) return;
    
    const section = currentData.sections[index];
    
    // Create a new knowledge card from the section
    const newCard = {
      id: `kb-${Date.now()}`,
      statement: section.section_title || "未命名结论",
      evidence_refs: section.nodes.map(n => n.title).slice(0, 3), // Use first 3 nodes as evidence refs
      scope: {
        industry: analysisTarget,
        region: "全球",
        time: new Date().getFullYear().toString()
      },
      tags: [analysisTarget, section.logic_type],
      confidence: 'high',
      ttl: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days later
      related_cards: [],
      versions: [{
        version: 1,
        timestamp: new Date().toISOString(),
        changes: "初始创建"
      }],
      source_section: section,
      source_report_data: currentData,
      created_at: new Date().toISOString()
    };

    setInfobaseCards(prev => {
      const updated = [newCard, ...prev];
      localStorage.setItem('infobaseCards', JSON.stringify(updated));
      return updated;
    });
    
    confetti({
      particleCount: 40,
      spread: 50,
      origin: { y: 0.8 },
      colors: [currentData?.suggested_theme?.primary || DEFAULT_THEME.primary]
    });
    
    alert('已成功收藏至信息库！');
  };

  const handleDeleteInfobaseCard = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('确定要删除这条原子结论吗？')) {
      setInfobaseCards(prev => {
        const updated = prev.filter(c => c.id !== id);
        localStorage.setItem('infobaseCards', JSON.stringify(updated));
        return updated;
      });
    }
  };

  const handleEditInfobaseCard = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const card = infobaseCards.find(c => c.id === id);
    if (!card) return;
    
    const newStatement = window.prompt('编辑原子结论：', card.statement);
    if (newStatement !== null && newStatement !== card.statement) {
      const updatedCards = infobaseCards.map(c => c.id === id ? { ...c, statement: newStatement } : c);
      setInfobaseCards(updatedCards);
      localStorage.setItem('infobaseCards', JSON.stringify(updatedCards));
    }
  };

  const handleThemeChange = (theme: any) => {
    if (activeReportType === 'visual' && visualData) {
      setVisualData(normalizeReportData({ ...visualData, suggested_theme: theme }, 'visual'));
    } else if (activeReportType === 'strategic' && strategicData) {
      setStrategicData(normalizeReportData({ ...strategicData, suggested_theme: theme }, 'strategic'));
    }
    setShowThemeSelector(false);
  };

  const handleDataUpdate = (newData: InfographicData) => {
    if (activeReportType === 'visual') {
      setVisualData(normalizeReportData(newData, 'visual'));
    } else {
      setStrategicData(normalizeReportData(newData, 'strategic'));
    }
  };

  const currentData = activeReportType === 'visual' ? visualData : strategicData;
  const currentTheme = {
    primary: currentData?.suggested_theme?.primary || DEFAULT_THEME.primary,
    secondary: currentData?.suggested_theme?.secondary || DEFAULT_THEME.secondary,
    background: currentData?.suggested_theme?.background || DEFAULT_THEME.background,
    text: currentData?.suggested_theme?.text || DEFAULT_THEME.text,
  };

  const handleDownload = async (type: 'png' | 'pdf' | 'ppt') => {
    setDownloadConfirm(type);
  };

  const executeDownload = async () => {
    const type = downloadConfirm;
    if (!type || isExporting) return;
    
    const element = document.getElementById('infographic-capture');
    if (!element) {
      console.error('Capture element not found');
      setDownloadConfirm(null);
      return;
    }

    setIsExporting(true);
    try {
      // Give a moment for any pending renders or animations to settle
      await new Promise(resolve => setTimeout(resolve, 500));

      const timestamp = Date.now();
      const filename = `信息图表-${timestamp}`;

      // Common options for html-to-image to avoid clipping
      const captureOptions = {
        backgroundColor: currentTheme.background || '#ffffff',
        pixelRatio: 2,
        cacheBust: true,
        // Force full height/width to avoid clipping
        width: element.scrollWidth,
        height: element.scrollHeight,
        style: {
          overflow: 'visible',
          maxHeight: 'none',
          maxWidth: 'none',
        }
      };

      if (type === 'png') {
        const dataUrl = await toPng(element, captureOptions);
        if (!dataUrl || dataUrl === 'data:,') throw new Error('Generated image is empty');

        if (isNativeApp) {
          await shareBase64File(dataUrlToBase64(dataUrl), `${filename}.png`);
        } else {
          const link = document.createElement('a');
          link.download = `${filename}.png`;
          link.href = dataUrl;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      } else if (type === 'pdf') {
        const dataUrl = await toPng(element, captureOptions);
        if (!dataUrl || dataUrl === 'data:,') throw new Error('Generated image is empty');

        const img = new Image();
        img.src = dataUrl;
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });
        
        const pdf = new jsPDF({
          orientation: img.width > img.height ? 'landscape' : 'portrait',
          unit: 'px',
          format: [img.width, img.height]
        });
        pdf.addImage(dataUrl, 'PNG', 0, 0, img.width, img.height);
        if (isNativeApp) {
          const pdfDataUri = pdf.output('datauristring');
          await shareBase64File(dataUrlToBase64(pdfDataUri), `${filename}.pdf`);
        } else {
          pdf.save(`${filename}.pdf`);
        }
      } else if (type === 'ppt') {
        const pptx = new pptxgen();
        
        // 1. Title Slide
        const titleSlide = pptx.addSlide();
        titleSlide.background = { color: currentTheme.background || 'FFFFFF' };
        titleSlide.addText(currentData?.title || 'Infographic', {
          x: 0.5, y: '40%', w: '90%', h: 1,
          fontSize: 36,
          bold: true,
          align: 'center',
          color: (currentTheme.text || '#000000').replace('#', '')
        });
        if (currentData?.subtitle) {
          titleSlide.addText(currentData.subtitle, {
            x: 1, y: '55%', w: '80%', h: 0.5,
            fontSize: 18,
            align: 'center',
            color: (currentTheme.text || '#000000').replace('#', ''),
            transparency: 40
          });
        }

        // 2. Section Slides
        if (currentData?.sections) {
          for (let i = 0; i < currentData.sections.length; i++) {
            const sectionEl = document.getElementById(`section-${i}`);
            if (sectionEl) {
              // Capture individual section
              const sectionUrl = await toPng(sectionEl, {
                ...captureOptions,
                width: sectionEl.scrollWidth,
                height: sectionEl.scrollHeight
              });

              const slide = pptx.addSlide();
              slide.background = { color: currentTheme.background || 'FFFFFF' };

              // Add editable title
              const sectionTitle = currentData.sections[i].section_title;
              if (sectionTitle) {
                 slide.addText(sectionTitle, {
                   x: 0.5, y: 0.3, w: '90%', h: 0.5,
                   fontSize: 24,
                   bold: true,
                   color: (currentTheme.text || '#000000').replace('#', '')
                 });
              }

              // Add image
              // Calculate dimensions to fit slide
              const img = new Image();
              img.src = sectionUrl;
              await new Promise(r => img.onload = r);

              const slideWidth = 10;
              const slideHeight = 5.625;
              const availableHeight = 4.5; // Leave space for title
              const imgRatio = img.width / img.height;
              
              let w, h;
              if (imgRatio > (slideWidth / availableHeight)) {
                w = 9; // Max width with padding
                h = w / imgRatio;
              } else {
                h = availableHeight;
                w = h * imgRatio;
              }

              slide.addImage({
                data: sectionUrl,
                x: (slideWidth - w) / 2,
                y: 1.0, // Start below title
                w: w,
                h: h
              });
            }
          }
        }
        
        if (isNativeApp) {
          const pptBase64 = await pptx.write({ outputType: 'base64' });
          await shareBase64File(String(pptBase64), `${filename}.pptx`);
        } else {
          await pptx.writeFile({ fileName: `${filename}.pptx` });
        }
      }
    } catch (err) {
      console.error('Download failed:', err);
      alert('导出失败，请重试。如果问题持续，请尝试截图保存。');
    } finally {
      setIsExporting(false);
      setDownloadConfirm(null);
    }
  };

  const ProcessFlow = ({ currentStage }: { currentStage: 'input' | 'processing' | 'result' }) => (
    <div className="flex items-center justify-center space-x-12 mb-12">
      <div className={`flex flex-col items-center group transition-all duration-500 ${currentStage === 'input' ? 'scale-110' : 'opacity-40'}`}>
        <div className={`w-14 h-14 rounded-2xl icon-3d-effect flex items-center justify-center border relative transition-all duration-500 ${currentStage === 'input' ? 'bg-white border-apple-blue shadow-lg shadow-apple-blue/10' : 'bg-white border-white/50'}`}>
          <span className={`material-symbols-outlined text-2xl transition-colors duration-500 ${currentStage === 'input' ? 'text-apple-blue font-variation-fill-1' : 'text-apple-gray'}`}>description</span>
        </div>
        <span className={`text-[11px] mt-3 font-bold tracking-widest uppercase transition-colors duration-500 ${currentStage === 'input' ? 'text-apple-text' : 'text-apple-gray'}`}>原始数据</span>
      </div>
      <span className="material-symbols-outlined text-apple-separator">chevron_right</span>
      <div className={`flex flex-col items-center transition-all duration-500 ${currentStage === 'processing' ? 'scale-110' : 'opacity-40'}`}>
        <div className={`w-16 h-16 rounded-[1.5rem] icon-3d-effect flex items-center justify-center relative transition-all duration-500 ${currentStage === 'processing' ? 'bg-[#1D1D1F] shadow-2xl shadow-black/20' : 'bg-white border border-white/50'}`}>
          <span className={`material-symbols-outlined text-3xl transition-colors duration-500 ${currentStage === 'processing' ? 'text-white font-variation-fill-1' : 'text-apple-gray'}`}>auto_awesome</span>
        </div>
        <span className={`text-[11px] mt-3 font-black tracking-widest uppercase transition-colors duration-500 ${currentStage === 'processing' ? 'text-apple-text' : 'text-apple-gray'}`}>AI 处理</span>
      </div>
      <span className="material-symbols-outlined text-apple-separator">chevron_right</span>
      <div className={`flex flex-col items-center transition-all duration-500 ${currentStage === 'result' ? 'scale-110' : 'opacity-40'}`}>
        <div className={`w-14 h-14 rounded-2xl icon-3d-effect flex items-center justify-center border relative transition-all duration-500 ${currentStage === 'result' ? 'bg-white border-apple-blue shadow-lg shadow-apple-blue/10' : 'bg-white border-white/50'}`}>
          <span className={`material-symbols-outlined text-2xl transition-colors duration-500 ${currentStage === 'result' ? 'text-apple-blue font-variation-fill-1' : 'text-apple-gray'}`}>insights</span>
        </div>
        <span className={`text-[11px] mt-3 font-bold tracking-widest uppercase transition-colors duration-500 ${currentStage === 'result' ? 'text-apple-text' : 'text-apple-gray'}`}>可视化</span>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#F5F5F7] text-[#1D1D1F] font-sans selection:bg-apple-blue/20 overflow-hidden">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
        className="hidden" 
        accept=".txt,.md,.json,.pdf,.docx,.pptx"
      />
      {/* Sidebar */}
      <aside 
        className={`h-full border-r border-apple-separator flex flex-col items-center py-10 shrink-0 bg-white/50 backdrop-blur-sm z-50 transition-all duration-300 ${isSidebarExpanded ? 'w-64 px-6' : 'w-20 lg:w-24'}`}
      >
        <div className="mb-12 flex items-center w-full justify-center">
          <button 
            onClick={() => setIsSidebarExpanded(!isSidebarExpanded)}
            className="w-12 h-12 bg-[#1D1D1F] rounded-2xl flex items-center justify-center shadow-lg icon-3d-effect hover:scale-105 transition-transform"
          >
            <span className="material-symbols-outlined text-white text-2xl font-variation-fill-1">auto_awesome</span>
          </button>
          {isSidebarExpanded && (
            <motion.span 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="ml-4 font-black text-xl tracking-tight"
            >
              要点 AI
            </motion.span>
          )}
        </div>
        <nav className="flex-1 flex flex-col space-y-4 w-full">
          {[
            { id: 'generate', icon: 'home', label: '主页', action: () => { setActiveTab('generate'); setVisualData(null); setStrategicData(null); setIsSidebarExpanded(true); } },
            { id: 'history', icon: 'history', label: '历史', action: () => { setActiveTab('history'); setIsSidebarExpanded(true); } },
            { id: 'infobase', icon: 'database', label: '信息库', action: () => { setActiveTab('infobase'); setIsSidebarExpanded(true); } }
          ].map((item) => (
            <button 
              key={item.id}
              onClick={item.action}
              className={`flex items-center group p-3 rounded-2xl transition-all w-full ${activeTab === item.id && (item.id !== 'generate' || !currentData) ? 'bg-apple-blue/10 text-apple-blue' : 'text-apple-gray hover:text-apple-text hover:bg-apple-bg'} ${isSidebarExpanded ? 'flex-row gap-4 px-4' : 'flex-col gap-1'}`}
            >
              <span className={`material-symbols-outlined text-[28px] transition-all ${activeTab === item.id && (item.id !== 'generate' || !currentData) ? 'font-variation-fill-1' : ''}`}>
                {item.icon}
              </span>
              <motion.span 
                layout
                className={`text-[10px] font-bold tracking-wide transition-all duration-300 ${isSidebarExpanded ? 'opacity-100' : 'opacity-60'}`}
              >
                {item.label}
              </motion.span>
            </button>
          ))}
        </nav>
        <div className="mt-auto w-full flex flex-col items-center relative" ref={personalMenuRef}>
          <AnimatePresence>
            {showPersonalMenu && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, x: 20 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.9, x: 20 }}
                className="absolute bottom-0 left-full ml-4 w-56 bg-white rounded-[2rem] apple-shadow border border-apple-separator p-4 z-[100]"
              >
                <div className="space-y-2">
                  {[
                    { icon: 'person', title: '账户' },
                    { icon: 'workspace_premium', title: 'pro会员计划' },
                    { icon: 'shield', title: '隐私' },
                    { icon: 'description', title: '用户协议' }
                  ].map((item) => (
                    <button key={item.title} className="w-full flex items-center p-3 hover:bg-apple-bg rounded-xl transition-all text-left group">
                      <span className="material-symbols-outlined text-apple-gray group-hover:text-apple-blue text-xl">{item.icon}</span>
                      <span className="ml-3 text-xs font-bold text-apple-text">{item.title}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <button 
            onClick={() => {
              if (!isSidebarExpanded) setIsSidebarExpanded(true);
              setShowPersonalMenu(!showPersonalMenu);
            }}
            className={`flex items-center rounded-2xl transition-all p-3 w-full hover:bg-apple-bg ${showPersonalMenu ? 'bg-apple-blue/5 text-apple-blue' : 'text-apple-gray'} ${isSidebarExpanded ? 'flex-row gap-4 px-4' : 'flex-col gap-1'}`}
          >
            <span className="material-symbols-outlined text-[28px]">person</span>
            <motion.span 
              layout
              className={`text-[10px] font-bold tracking-wide transition-all duration-300 ${isSidebarExpanded ? 'opacity-100' : 'opacity-60'}`}
            >
              个人中心
            </motion.span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-y-auto gradient-bg">
        <AnimatePresence mode="wait">
          {activeTab === 'history' ? (
            <motion.div 
              key="history"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="px-8 lg:px-16 py-12 space-y-8"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <h2 className="text-3xl font-bold tracking-tight">历史记录</h2>
                  <div className="px-4 py-1 bg-apple-blue/10 text-apple-blue rounded-full text-xs font-bold">
                    共 {knowledgeCards.length} 份报告
                  </div>
                </div>
                <div className="flex items-center bg-white/50 p-1 rounded-xl apple-shadow border border-white">
                  <button 
                    onClick={() => setHistoryViewMode('grid')}
                    className={`p-2 rounded-lg transition-all ${historyViewMode === 'grid' ? 'bg-white apple-shadow text-apple-blue' : 'text-apple-gray hover:text-apple-text'}`}
                  >
                    <span className="material-symbols-outlined text-xl">grid_view</span>
                  </button>
                  <button 
                    onClick={() => setHistoryViewMode('list')}
                    className={`p-2 rounded-lg transition-all ${historyViewMode === 'list' ? 'bg-white apple-shadow text-apple-blue' : 'text-apple-gray hover:text-apple-text'}`}
                  >
                    <span className="material-symbols-outlined text-xl">view_list</span>
                  </button>
                </div>
              </div>
              
              <div className="space-y-12">
                {Object.entries(groupCardsByDate(knowledgeCards)).map(([date, cards]) => (
                  <div key={date} className="space-y-6">
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-black text-apple-text uppercase tracking-widest">{date}</span>
                      <div className="h-px flex-1 bg-apple-separator" />
                    </div>
                    
                    <div className={historyViewMode === 'grid' 
                      ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                      : "space-y-4"
                    }>
                      {cards.map(card => (
                        <div 
                          key={card.id} 
                          className={`bg-white rounded-[2rem] apple-shadow border border-white hover:scale-[1.01] transition-all cursor-pointer group flex relative overflow-hidden ${
                            historyViewMode === 'grid' ? 'p-8 flex-col h-full' : 'p-6 items-center gap-6'
                          }`}
                          onClick={() => {
                            setVisualData(normalizeReportData(card.data, 'visual'));
                            setStrategicData(normalizeReportData(card.strategicData || card.data, 'strategic'));
                            setActiveReportType('visual');
                            setActiveTab('generate');
                          }}
                        >
                          <div className={`flex-1 ${historyViewMode === 'list' ? 'flex items-center gap-6' : ''}`}>
                            <div className={historyViewMode === 'grid' ? "flex gap-2 mb-6" : "flex gap-2 shrink-0"}>
                              {card.tags.filter((tag: string) => tag !== '自定义').map((tag: string) => (
                                <span key={tag} className="px-3 py-1 bg-apple-bg text-apple-gray rounded-lg text-[10px] font-bold uppercase tracking-wider">{tag}</span>
                              ))}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className={`font-bold mb-2 line-clamp-1 group-hover:text-apple-blue transition-colors ${historyViewMode === 'grid' ? 'text-xl mt-3' : 'text-lg'}`}>{card.title}</h3>
                              <p className={`text-apple-gray leading-relaxed ${historyViewMode === 'grid' ? 'text-sm line-clamp-3 mb-8' : 'text-xs line-clamp-1'}`}>{card.summary}</p>
                            </div>
                          </div>
                          
                          <div className={historyViewMode === 'grid' 
                            ? "text-[10px] text-apple-gray/40 font-bold uppercase tracking-widest mt-auto pt-6 border-t border-apple-separator flex justify-between items-center"
                            : "text-[10px] text-apple-gray/40 font-bold uppercase tracking-widest shrink-0 flex items-center gap-4"
                          }>
                            <span>{new Date(card.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                handleDeleteCard(card.id, e);
                              }}
                              className="p-2 hover:bg-red-50 hover:text-red-500 rounded-xl transition-colors text-apple-gray/40 relative z-20"
                              title="删除记录"
                            >
                              <span className="material-symbols-outlined text-lg">delete</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                
                {knowledgeCards.length === 0 && (
                  <div className="text-center py-32 bg-white/50 rounded-[3rem] border-2 border-dashed border-apple-separator">
                    <span className="material-symbols-outlined text-6xl text-apple-gray/20 mb-6">database</span>
                    <h3 className="text-2xl font-bold text-apple-text mb-2">历史记录空空如也</h3>
                    <p className="text-apple-gray">快去主页生成并保存您的第一份战略报告吧！</p>
                  </div>
                )}
              </div>
            </motion.div>
          ) : activeTab === 'infobase' ? (
            <motion.div 
              key="infobase"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="px-8 lg:px-16 py-12 space-y-8"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <h2 className="text-3xl font-bold tracking-tight">信息库</h2>
                  <div className="px-4 py-1 bg-emerald-500/10 text-emerald-600 rounded-full text-xs font-bold">
                    共 {infobaseCards.length} 条原子结论
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {infobaseCards.map(card => (
                  <div 
                    key={card.id} 
                    onClick={() => setSelectedInfobaseCard(card)}
                    className="bg-white rounded-[2rem] apple-shadow border border-white p-8 space-y-6 hover:scale-[1.02] transition-all cursor-pointer group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex flex-col gap-2">
                        <div className="flex gap-2">
                          {card.tags.map((tag: string) => (
                            <span key={tag} className="px-2 py-0.5 bg-apple-bg text-apple-gray rounded-md text-[9px] font-bold uppercase tracking-wider">{tag}</span>
                          ))}
                        </div>
                        <span className="text-[9px] text-apple-gray/60 font-bold">添加于: {new Date(card.created_at).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider ${
                          card.confidence === 'high' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
                        }`}>
                          {card.confidence} Confidence
                        </div>
                        <button 
                          onClick={(e) => handleEditInfobaseCard(card.id, e)}
                          className="p-1.5 hover:bg-apple-bg rounded-lg text-apple-gray transition-colors"
                        >
                          <span className="material-symbols-outlined text-sm">edit</span>
                        </button>
                        <button 
                          onClick={(e) => handleDeleteInfobaseCard(card.id, e)}
                          className="p-1.5 hover:bg-red-50 hover:text-red-500 rounded-lg text-apple-gray transition-colors"
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-lg font-bold text-apple-text leading-tight mb-2">{card.statement}</h3>
                      <div className="flex flex-wrap gap-2">
                        {card.evidence_refs.map((ref: string, i: number) => (
                          <span key={i} className="text-[10px] text-apple-gray flex items-center gap-1">
                            <span className="w-1 h-1 rounded-full bg-apple-blue" />
                            {ref}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-apple-separator grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-apple-gray uppercase tracking-widest">适用范围</span>
                        <p className="text-[10px] font-medium text-apple-text">{card.scope.industry} | {card.scope.region}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-apple-gray uppercase tracking-widest">复查时间</span>
                        <p className="text-[10px] font-medium text-apple-text">{new Date(card.ttl).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {infobaseCards.length === 0 && (
                <div className="bg-white/50 p-12 rounded-[3rem] border-2 border-dashed border-apple-separator text-center">
                  <span className="material-symbols-outlined text-6xl text-apple-gray/20 mb-6">folder_open</span>
                  <h3 className="text-2xl font-bold text-apple-text mb-2">信息库空空如也</h3>
                  <p className="text-apple-gray">在报告预览页点击收藏图标，将关键结论沉淀到这里。</p>
                </div>
              )}

              {/* Card Detail View Modal */}
              <AnimatePresence>
                {selectedInfobaseCard && (
                  <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-12">
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setSelectedInfobaseCard(null)}
                      className="absolute inset-0 bg-black/60 backdrop-blur-xl"
                    />
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: 20 }}
                      className="relative w-full max-w-5xl bg-white rounded-[3rem] apple-shadow border border-white overflow-hidden flex flex-col max-h-full"
                    >
                      <div className="p-8 border-b border-black/5 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center">
                            <span className="material-symbols-outlined text-emerald-600">verified</span>
                          </div>
                          <div>
                            <h2 className="text-2xl font-bold tracking-tight text-apple-text">原子结论详情</h2>
                            <p className="text-xs text-apple-gray font-medium">ID: {selectedInfobaseCard.id}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => setSelectedInfobaseCard(null)}
                          className="p-3 hover:bg-black/5 rounded-2xl transition-all"
                        >
                          <span className="material-symbols-outlined">close</span>
                        </button>
                      </div>

                      <div className="flex-1 overflow-y-auto p-8 lg:p-12">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                          {/* Left Column: Source & Time */}
                          <div className="space-y-8">
                            <div className="space-y-4">
                              <span className="text-[10px] font-black text-apple-gray uppercase tracking-[0.2em]">信息来源报告</span>
                              {selectedInfobaseCard.source_report_data ? (
                                <button 
                                  onClick={() => {
                                    if (selectedInfobaseCard.source_report_data) {
                                      setVisualData(
                                        normalizeReportData(selectedInfobaseCard.source_report_data, 'visual')
                                      );
                                      setStrategicData(
                                        normalizeReportData(selectedInfobaseCard.source_report_data, 'strategic')
                                      );
                                      setActiveTab('generate');
                                      setSelectedInfobaseCard(null);
                                    }
                                  }}
                                  className="w-full p-6 bg-apple-bg rounded-[2rem] border border-apple-separator/30 text-left hover:border-apple-blue transition-all group"
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-[10px] font-bold text-apple-blue uppercase tracking-wider">点击进入完整报告</span>
                                    <span className="material-symbols-outlined text-apple-blue text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
                                  </div>
                                  <h4 className="text-sm font-bold text-apple-text line-clamp-2">{selectedInfobaseCard.source_report_data.title}</h4>
                                  <p className="text-[10px] text-apple-gray mt-2">{selectedInfobaseCard.source_report_data.subtitle || '战略分析报告'}</p>
                                </button>
                              ) : (
                                <div className="p-6 bg-apple-bg rounded-[2rem] border border-apple-separator/30 text-apple-gray text-xs italic">
                                  该结论为早期版本收藏，未关联原始报告数据。
                                </div>
                              )}
                            </div>

                            <div className="space-y-4">
                              <span className="text-[10px] font-black text-apple-gray uppercase tracking-[0.2em]">添加时间</span>
                              <div className="p-4 bg-apple-bg rounded-2xl border border-apple-separator/30">
                                <div className="flex items-center gap-3">
                                  <span className="material-symbols-outlined text-apple-gray text-lg">calendar_today</span>
                                  <span className="text-xs font-bold text-apple-text">{new Date(selectedInfobaseCard.created_at).toLocaleString()}</span>
                                </div>
                              </div>
                            </div>

                            <div className="space-y-4">
                              <span className="text-[10px] font-black text-apple-gray uppercase tracking-[0.2em]">结论陈述</span>
                              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                                <p className="text-sm font-bold text-emerald-900 leading-relaxed">{selectedInfobaseCard.statement}</p>
                              </div>
                            </div>

                            <div className="space-y-4">
                              <span className="text-[10px] font-black text-apple-gray uppercase tracking-[0.2em]">置信度与范围</span>
                              <div className="flex flex-wrap gap-2">
                                <span className={`px-3 py-1 rounded-lg text-[10px] font-bold ${
                                  selectedInfobaseCard.confidence === 'high' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
                                }`}>
                                  {selectedInfobaseCard.confidence.toUpperCase()} CONFIDENCE
                                </span>
                                <span className="px-3 py-1 bg-apple-text text-white rounded-lg text-[10px] font-bold">{selectedInfobaseCard.scope.industry}</span>
                              </div>
                            </div>
                          </div>

                          {/* Right Column: Visualization Source & Evidence */}
                          <div className="lg:col-span-2 space-y-8">
                            <div className="space-y-4">
                              <span className="text-[10px] font-black text-apple-gray uppercase tracking-[0.2em]">原始可视化参考 (Source)</span>
                              <div className="rounded-[2rem] border border-apple-separator/50 overflow-hidden bg-apple-bg/30">
                                <SectionRenderer 
                                  section={selectedInfobaseCard.source_section}
                                  theme={{
                                    primary: '#007AFF',
                                    secondary: '#86868B',
                                    background: '#FFFFFF',
                                    text: '#1D1D1F'
                                  }}
                                  index={0}
                                />
                              </div>
                            </div>

                            <div className="space-y-4">
                              <span className="text-[10px] font-black text-apple-gray uppercase tracking-[0.2em]">证据链 (Evidence)</span>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {selectedInfobaseCard.evidence_refs.map((ref, i) => (
                                  <div key={i} className="flex items-start gap-3 p-4 bg-white rounded-2xl border border-apple-separator/30 apple-shadow-sm">
                                    <span className="w-6 h-6 bg-apple-blue/10 text-apple-blue rounded-full flex items-center justify-center text-[10px] font-bold shrink-0">{i+1}</span>
                                    <span className="text-xs text-apple-text font-medium leading-relaxed">{ref}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </motion.div>
          ) : (currentData || isLoading) ? (
            /* Report View */
            <motion.div 
              key="report"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col lg:flex-row h-full overflow-hidden"
            >
              {/* Report Sidebar: Design Specs */}
              <div className="w-full lg:w-80 border-r border-apple-separator bg-white/50 backdrop-blur-md p-8 overflow-y-auto space-y-8 shrink-0">
                <div className="flex items-center justify-between">
                  <button 
                    onClick={() => { setVisualData(null); setStrategicData(null); setIsLoading(false); }}
                    className="p-2 hover:bg-apple-bg rounded-xl transition-colors text-apple-gray"
                  >
                    <span className="material-symbols-outlined">arrow_back</span>
                  </button>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setIsEditing(!isEditing)}
                      className={`p-2 rounded-xl transition-all ${isEditing ? 'bg-apple-blue text-white shadow-lg' : 'hover:bg-apple-bg text-apple-gray'}`}
                    >
                      <span className="material-symbols-outlined">{isEditing ? 'check' : 'edit'}</span>
                    </button>
                    <button 
                      onClick={() => saveToKnowledge()}
                      className="p-2 hover:bg-apple-bg rounded-xl transition-colors text-apple-gray"
                    >
                      <span className="material-symbols-outlined">bookmark_add</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-apple-gray uppercase tracking-[0.2em]">分析目标</span>
                    <div className="px-4 py-2 bg-apple-text text-white rounded-xl text-xs font-bold inline-block">
                      {analysisTarget}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-apple-gray uppercase tracking-[0.2em]">设计规范</span>
                      <button 
                        onClick={() => setShowThemeSelector(!showThemeSelector)}
                        className="text-[10px] font-bold text-apple-blue hover:underline uppercase tracking-wider"
                      >
                        更换方案
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-4">
                      <div className="bg-white p-5 rounded-2xl apple-shadow border border-white">
                        <div className="text-[10px] font-bold text-apple-gray uppercase mb-2">报告类型</div>
                        <div className="flex p-1 bg-apple-bg rounded-xl">
                          <button 
                            onClick={() => setActiveReportType('visual')}
                            className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition-all ${activeReportType === 'visual' ? 'bg-white apple-shadow text-apple-blue' : 'text-apple-gray hover:text-apple-text'}`}
                          >
                            要点总结
                          </button>
                          <button 
                            onClick={() => setActiveReportType('strategic')}
                            className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition-all ${activeReportType === 'strategic' ? 'bg-white apple-shadow text-apple-blue' : 'text-apple-gray hover:text-apple-text'}`}
                          >
                            数据洞察
                          </button>
                        </div>
                      </div>
                      <div className="bg-white p-5 rounded-2xl apple-shadow border border-white">
                        <div className="text-[10px] font-bold text-apple-gray uppercase mb-2">模块数量</div>
                        <div className="font-bold text-lg">{currentData?.sections?.length || 0} Units</div>
                      </div>
                      <div className="bg-white p-5 rounded-2xl apple-shadow border border-white relative">
                        <div className="text-[10px] font-bold text-apple-gray uppercase mb-3">调色板</div>
                        <div className="flex gap-2">
                          {currentData && [currentTheme.primary, currentTheme.secondary, currentTheme.background, currentTheme.text].map((c, i) => (
                            <div key={i} className="w-full h-8 rounded-lg shadow-inner border border-black/5" style={{ backgroundColor: c }} />
                          ))}
                        </div>

                        <AnimatePresence>
                          {showThemeSelector && (
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.95, y: 10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: 10 }}
                              className="absolute top-full left-0 right-0 mt-2 bg-white border border-apple-separator rounded-2xl shadow-2xl z-50 p-3 grid grid-cols-1 gap-2 max-h-64 overflow-y-auto"
                            >
                              {COLOR_PALETTES.map((palette) => (
                                <button
                                  key={palette.name}
                                  onClick={() => handleThemeChange(palette)}
                                  className="flex items-center gap-3 p-2 rounded-xl hover:bg-apple-bg transition-all text-left group"
                                >
                                  <div className="flex -space-x-1">
                                    <div className="w-4 h-4 rounded-full border border-white" style={{ backgroundColor: palette.primary }} />
                                    <div className="w-4 h-4 rounded-full border border-white" style={{ backgroundColor: palette.secondary }} />
                                  </div>
                                  <span className="text-[10px] font-bold truncate flex-1">{palette.name}</span>
                                  {currentTheme.primary === palette.primary && (
                                    <span className="material-symbols-outlined text-apple-blue text-sm">check</span>
                                  )}
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <span className="text-[10px] font-bold text-apple-gray uppercase tracking-[0.2em]">导出选项</span>
                    <div className="space-y-2">
                      <button onClick={() => handleDownload('png')} className="w-full py-4 bg-white hover:bg-apple-bg rounded-2xl text-sm font-bold apple-shadow border border-white transition-all flex items-center justify-center gap-2">
                        <span className="material-symbols-outlined text-lg">image</span> PNG 图片
                      </button>
                      <button onClick={() => handleDownload('pdf')} className="w-full py-4 bg-white hover:bg-apple-bg rounded-2xl text-sm font-bold apple-shadow border border-white transition-all flex items-center justify-center gap-2">
                        <span className="material-symbols-outlined text-lg">picture_as_pdf</span> PDF 文档
                      </button>
                      <button onClick={() => handleDownload('ppt')} className="w-full py-4 bg-white hover:bg-apple-bg rounded-2xl text-sm font-bold apple-shadow border border-white transition-all flex items-center justify-center gap-2">
                        <span className="material-symbols-outlined text-lg">presentation</span> PPT 文件
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Report Canvas */}
              <div className="flex-1 p-8 lg:p-12 overflow-y-auto relative bg-[#F5F5F7]">
                <div className="max-w-4xl mx-auto space-y-8">
                  <ProcessFlow currentStage={isLoading ? 'processing' : 'result'} />
                  
                  <div className="relative">
                    {currentData && (
                      <InfographicRenderer 
                        data={currentData} 
                        onRegenerateSection={handleRegenerateSection}
                        onFavoriteSection={handleFavoriteSection}
                        isRegenerating={isRegenerating}
                        isEditing={isEditing}
                        onUpdate={handleDataUpdate}
                      />
                    )}

                    {isLoading && generationStage === 'framework' && (
                      <div className="absolute inset-0 bg-white/40 backdrop-blur-sm rounded-[2rem] z-50 flex flex-col items-center justify-center">
                        <div className="flex flex-col items-center justify-center space-y-8 -translate-y-12">
                          <div className="relative">
                            <div className="w-24 h-24 border-8 border-apple-blue/10 rounded-full" />
                            <div className="w-24 h-24 border-8 border-t-apple-blue rounded-full animate-spin absolute top-0 left-0" />
                            {useWebSearch && !searchData && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <span className="material-symbols-outlined text-apple-blue animate-pulse">public</span>
                              </div>
                            )}
                          </div>
                          <div className="text-center space-y-3 max-w-md px-6">
                            <h4 className="text-2xl font-black tracking-tight animate-pulse">
                              {useWebSearch && !searchData ? '正在联网检索深度数据...' : '正在构建战略框架...'}
                            </h4>
                            <p className="text-apple-gray font-medium">
                              {useWebSearch && !searchData 
                                ? '正在访问官网、财报及公开报道，为您搜集最新真实数据点' 
                                : 'AI 正在检索权威信息并构建基础逻辑'}
                            </p>
                            
                            {searchData && (
                              <motion.div 
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="mt-6 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-left"
                              >
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="material-symbols-outlined text-emerald-500 text-sm font-variation-fill-1">check_circle</span>
                                  <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">已获取实时数据增强</span>
                                </div>
                                <p className="text-[11px] text-emerald-700/70 line-clamp-2 italic leading-relaxed">
                                  {searchData}
                                </p>
                              </motion.div>
                            )}

                            {/* Progress indicator */}
                            <div className="flex justify-center space-x-2 mt-4">
                              <div className={`h-1.5 rounded-full transition-all duration-500 ${searchData || !useWebSearch ? 'bg-apple-blue w-12' : 'bg-apple-blue/20 w-4'}`}></div>
                              <div className={`h-1.5 rounded-full transition-all duration-500 ${searchData ? 'bg-apple-blue w-12' : 'bg-apple-blue/20 w-4'}`}></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {isLoading && generationStage === 'deep-dive' && (
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="fixed bottom-8 right-8 bg-white/80 backdrop-blur-xl apple-shadow border border-apple-separator p-4 rounded-2xl z-[100] flex items-center gap-4"
                      >
                        <div className="w-8 h-8 border-4 border-apple-blue/10 border-t-apple-blue rounded-full animate-spin" />
                        <div className="flex flex-col">
                          <span className="text-xs font-black tracking-tight">正在进行深度战略深挖...</span>
                          <span className="text-[10px] text-apple-gray font-bold uppercase tracking-wider">正在复刻 Chronicle 风格</span>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            /* Workbench View */
            <motion.div 
              key="workbench"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="px-4 lg:px-12 py-6 flex flex-col h-full overflow-hidden"
            >
              <header className="max-w-4xl mx-auto w-full mb-6 flex flex-col items-center shrink-0">
                <ProcessFlow currentStage="input" />
                
                <div className="text-center space-y-2">
                  <h1 className="text-3xl lg:text-4xl font-black tracking-tight text-apple-text">
                    要点 <span className="text-apple-blue">·</span> 智能报告生成
                  </h1>
                </div>
              </header>

              <div className="max-w-5xl mx-auto w-full flex-1 flex flex-col min-h-0">
                {/* Tabs Header */}
                <div className="flex items-end mb-0">
                  <button 
                    onClick={() => setInputMode('text')}
                    className={`px-8 py-4 rounded-t-[2rem] text-sm font-bold transition-all flex items-center gap-2 ${inputMode === 'text' ? 'bg-white text-apple-blue apple-shadow border-x border-t border-white relative z-10' : 'bg-black/5 text-apple-gray hover:bg-black/10'}`}
                  >
                    <span className="material-symbols-outlined text-xl">edit_note</span>
                    粘贴文本
                  </button>
                  <button 
                    onClick={() => setInputMode('file')}
                    className={`px-8 py-4 rounded-t-[2rem] text-sm font-bold transition-all flex items-center gap-2 ${inputMode === 'file' ? 'bg-white text-apple-blue apple-shadow border-x border-t border-white relative z-10' : 'bg-black/5 text-apple-gray hover:bg-black/10'}`}
                  >
                    <span className="material-symbols-outlined text-xl">upload_file</span>
                    上传附件
                  </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 min-h-0 bg-white rounded-b-[2rem] rounded-tr-[2rem] apple-shadow border border-white relative group overflow-hidden transition-all duration-500 focus-within:ring-4 focus-within:ring-apple-blue/5">
                  {inputMode === 'text' ? (
                    <div className="h-full flex flex-col relative">
                      <textarea 
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        className="w-full h-full bg-transparent border-none p-8 lg:p-10 pt-10 pb-20 text-base lg:text-lg text-apple-text placeholder:text-apple-gray/20 focus:ring-0 leading-relaxed resize-none font-normal" 
                        placeholder="在此输入或粘贴会议纪要、原始数据或项目大纲..."
                      />
                      
                      {/* Floating Footer Metadata */}
                      <div className="absolute bottom-6 left-10 right-10 flex items-center justify-between pointer-events-none border-t border-apple-separator/50 pt-4">
                        <div className="flex items-center space-x-3 pointer-events-auto">
                          <button 
                            onClick={handleVoiceInput}
                            className={`p-2 rounded-xl transition-all duration-300 flex items-center space-x-2 ${isListening ? 'bg-apple-blue text-white animate-pulse' : 'text-apple-gray hover:bg-apple-blue/5 hover:text-apple-blue'}`}
                          >
                            <span className="material-symbols-outlined text-xl">mic</span>
                            <span className="text-[10px] font-bold uppercase tracking-wider">{isListening ? '正在聆听' : '语音输入'}</span>
                          </button>
                        </div>
                        <div className="flex items-center space-x-6 pointer-events-auto">
                          <button 
                            onClick={() => setUseWebSearch(!useWebSearch)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all border ${useWebSearch ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'text-apple-gray hover:bg-apple-blue/5 hover:text-apple-blue border-transparent'}`}
                          >
                            <span className={`material-symbols-outlined text-xl ${useWebSearch ? 'font-variation-fill-1' : ''}`}>
                              public
                            </span>
                            <span className="text-[10px] font-bold uppercase tracking-wider">联网深度洞察</span>
                            {useWebSearch && <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />}
                          </button>
                          <div className="flex items-center space-x-4">
                            <span className="text-[10px] text-apple-gray/40 font-bold uppercase tracking-wider">字数: {input.length}</span>
                            <button onClick={() => setInput('')} className="material-symbols-outlined text-apple-gray hover:text-red-500 transition-colors text-lg">delete_outline</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div 
                      onDragOver={onDragOver}
                      onDragLeave={onDragLeave}
                      onDrop={onDrop}
                      onClick={() => !pendingFile && fileInputRef.current?.click()}
                      className={`h-full w-full flex flex-col items-center justify-center p-12 transition-all duration-300 ${isDragging ? 'bg-apple-blue/5 border-4 border-dashed border-apple-blue' : 'hover:bg-black/5'} ${!pendingFile ? 'cursor-pointer' : ''}`}
                    >
                      {pendingFile ? (
                        <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
                          <div className="w-24 h-24 bg-apple-blue/10 text-apple-blue rounded-3xl flex items-center justify-center mb-6 relative group">
                            <span className="material-symbols-outlined text-5xl">description</span>
                            <button 
                              onClick={(e) => { e.stopPropagation(); setPendingFile(null); }}
                              className="absolute -top-2 -right-2 w-8 h-8 bg-white apple-shadow border border-apple-separator rounded-full flex items-center justify-center text-red-500 hover:bg-red-50 transition-colors"
                            >
                              <span className="material-symbols-outlined text-lg">close</span>
                            </button>
                          </div>
                          <h3 className="text-xl font-bold text-apple-text mb-2">{pendingFile.name}</h3>
                          <p className="text-apple-gray text-sm">文件大小: {(pendingFile.size / 1024 / 1024).toFixed(2)} MB</p>
                          <button 
                            onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                            className="mt-8 text-apple-blue text-xs font-bold uppercase tracking-widest hover:underline"
                          >
                            更换文件
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className={`w-24 h-24 rounded-3xl flex items-center justify-center mb-8 transition-all duration-500 ${isDragging ? 'bg-apple-blue text-white scale-110' : 'bg-apple-bg text-apple-gray'}`}>
                            <span className="material-symbols-outlined text-5xl">cloud_upload</span>
                          </div>
                          <h3 className="text-xl font-bold text-apple-text mb-3">点击或拖拽文件到此处上传</h3>
                          <p className="text-apple-gray text-sm mb-8">支持 PDF, DOCX, PPTX, TXT, MD, JSON</p>
                          
                          <div className="flex gap-4">
                            {['PDF', 'DOCX', 'PPTX'].map(ext => (
                              <div key={ext} className="px-4 py-2 bg-white border border-apple-separator rounded-xl text-[10px] font-black text-apple-gray apple-shadow-sm">
                                {ext}
                              </div>
                            ))}
                          </div>
                        </>
                      )}

                      {isDragging && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-8 px-6 py-3 bg-apple-blue text-white rounded-full text-xs font-bold shadow-xl"
                        >
                          松开鼠标即可上传
                        </motion.div>
                      )}
                    </div>
                  )}
                </div>

                <div className="pt-8 pb-8 flex justify-center shrink-0">
                  <div className="w-full max-w-xl space-y-3">
                    {error && (
                      <div className="w-full bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-xs whitespace-pre-line">
                        {error}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={handleGenerate}
                        disabled={isLoading || (inputMode === 'text' ? !input.trim() : !pendingFile)}
                        className="flex-1 bg-[#1D1D1F] hover:bg-black text-white font-black text-lg py-4 rounded-2xl flex items-center justify-center space-x-3 transition-all active:scale-[0.97] shadow-xl shadow-black/10 group disabled:opacity-50"
                      >
                        <span className="tracking-tight">开始生成报告</span>
                        <span className="material-symbols-outlined text-xl group-hover:translate-x-1 transition-transform">arrow_forward</span>
                      </button>
                      <button
                        onClick={handleCheckConnection}
                        disabled={isCheckingConnection || isLoading}
                        className="shrink-0 px-4 py-4 bg-white border border-apple-separator rounded-2xl text-xs font-bold text-apple-text hover:bg-apple-bg transition-all disabled:opacity-50"
                        title="检查 API 与 memfire 连接"
                      >
                        {isCheckingConnection ? '检查中...' : '检查连接'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {cardToDelete !== null && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCardToDelete(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-[2.5rem] p-10 apple-shadow border border-white overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-red-500" />
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mb-8">
                  <span className="material-symbols-outlined text-4xl text-red-500">delete_forever</span>
                </div>
                <h3 className="text-2xl font-bold text-apple-text mb-4">确认删除记录？</h3>
                <p className="text-apple-gray mb-10 leading-relaxed">
                  此操作将永久删除该份战略报告，删除后将无法恢复。您确定要继续吗？
                </p>
                <div className="flex flex-col w-full gap-3">
                  <button 
                    onClick={confirmDelete}
                    className="w-full py-4 bg-red-500 text-white rounded-2xl font-bold hover:bg-red-600 transition-all apple-shadow active:scale-[0.98]"
                  >
                    确认删除
                  </button>
                  <button 
                    onClick={() => setCardToDelete(null)}
                    className="w-full py-4 bg-apple-bg text-apple-gray rounded-2xl font-bold hover:bg-apple-separator transition-all active:scale-[0.98]"
                  >
                    取消
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Download Confirmation Modal */}
      <AnimatePresence>
        {downloadConfirm !== null && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isExporting && setDownloadConfirm(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-[2.5rem] p-10 apple-shadow border border-white overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-apple-blue" />
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-apple-blue/5 rounded-3xl flex items-center justify-center mb-8">
                  <span className={`material-symbols-outlined text-4xl text-apple-blue ${isExporting ? 'animate-bounce' : ''}`}>download</span>
                </div>
                <h3 className="text-2xl font-bold text-apple-text mb-4">确认下载报告？</h3>
                <p className="text-apple-gray mb-10 leading-relaxed">
                  您确定要将当前报告导出为 <span className="text-apple-blue font-bold">{downloadConfirm.toUpperCase()}</span> 格式吗？
                </p>
                <div className="flex flex-col w-full gap-3">
                  <button 
                    onClick={executeDownload}
                    disabled={isExporting}
                    className="w-full py-4 bg-apple-blue text-white rounded-2xl font-bold hover:bg-blue-600 transition-all apple-shadow active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isExporting ? (
                      <>
                        <RefreshCw className="animate-spin" size={18} />
                        正在导出...
                      </>
                    ) : (
                      '确认下载'
                    )}
                  </button>
                  <button 
                    onClick={() => setDownloadConfirm(null)}
                    disabled={isExporting}
                    className="w-full py-4 bg-apple-bg text-apple-gray rounded-2xl font-bold hover:bg-apple-separator transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    取消
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      </main>
      
      {/* Home Indicator */}
      <div className="fixed bottom-2 left-1/2 -translate-x-1/2 w-32 h-1.5 bg-apple-text/5 rounded-full pointer-events-none hidden lg:block"></div>
    </div>
  );
}
