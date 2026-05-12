import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Download, CheckCircle, AlertCircle, FileSpreadsheet, ChevronDown, ChevronUp, ArrowRight, X, Loader2 } from 'lucide-react';
import { TariffPlan, RecommendationResult } from '../types';
import { REQUIRED_HEADERS } from '../constants';
import { generateTemplate, parseExcelFile } from '../utils/excel';
import { usersApi, recommendationsApi } from '../services/api';
import { useToast } from './ui/Toast';

interface DataImportProps {
  plans: TariffPlan[];
  onImportComplete: (results: RecommendationResult[]) => void;
}

type ImportStep = 'idle' | 'parsing' | 'importing' | 'generating' | 'done';

interface ImportResults {
  success: number;
  skipped: number;
  failed: number;
  errors: string[];
}

const STEP_LABELS: { key: ImportStep; label: string }[] = [
  { key: 'parsing', label: '解析文件' },
  { key: 'importing', label: '导入数据' },
  { key: 'generating', label: '生成推荐' },
];

function useAnimatedCounter(target: number, duration: number = 1200) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (target === 0) {
      setCount(0);
      return;
    }
    let startTime: number | null = null;
    let animationFrame: number;
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };
    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [target, duration]);

  return count;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 30 } },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 28 } },
};

const DataImport: React.FC<DataImportProps> = ({ plans: _plans, onImportComplete }) => {
  const [step, setStep] = useState<ImportStep>('idle');
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ImportResults | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const successCount = useAnimatedCounter(results?.success ?? 0);
  const skippedCount = useAnimatedCounter(results?.skipped ?? 0);
  const failedCount = useAnimatedCounter(results?.failed ?? 0);

  const stepIndex = STEP_LABELS.findIndex((s) => s.key === step);
  const currentProgress = step === 'done' ? 100 : progress;

  const simulateProgress = useCallback((targetPercent: number, duration: number) => {
    return new Promise<void>((resolve) => {
      const start = progress;
      const startTime = Date.now();
      const tick = () => {
        const elapsed = Date.now() - startTime;
        const t = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        setProgress(start + (targetPercent - start) * eased);
        if (t < 1) {
          requestAnimationFrame(tick);
        } else {
          resolve();
        }
      };
      requestAnimationFrame(tick);
    });
  }, [progress]);

  const processFile = useCallback(async (file: File) => {
    setSelectedFile(file);
    setResults(null);
    setShowErrors(false);
    setProgress(0);

    try {
      // Step 1: Parse file
      setStep('parsing');
      await simulateProgress(30, 800);
      const data = await parseExcelFile(file);
      setProgress(33);

      // Step 2: Import data
      setStep('importing');
      await simulateProgress(60, 600);
      const { batch_id, count } = await usersApi.import(data);
      setProgress(66);

      // Step 3: Generate recommendations
      setStep('generating');
      await simulateProgress(90, 800);
      await recommendationsApi.run(batch_id);
      setProgress(95);

      const recs = await recommendationsApi.list();
      setProgress(100);
      setStep('done');

      // Build results summary
      const skipped = Math.max(0, data.length - count);
      setResults({
        success: count,
        skipped,
        failed: 0,
        errors: [],
      });

      onImportComplete(recs);
    } catch (err) {
      setStep('done');
      const errorMsg = err instanceof Error ? err.message : '未知错误';
      setResults({
        success: 0,
        skipped: 0,
        failed: 1,
        errors: [errorMsg],
      });
      toast('文件解析或处理失败，请检查格式', 'error');
      console.error(err);
    }
  }, [simulateProgress, onImportComplete, toast]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext === 'xlsx' || ext === 'xls') {
        processFile(file);
      } else {
        toast('请上传 .xlsx 或 .xls 格式的文件', 'warning');
      }
    }
  }, [processFile, toast]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleReset = useCallback(() => {
    setStep('idle');
    setProgress(0);
    setResults(null);
    setShowErrors(false);
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const isProcessing = step !== 'idle' && step !== 'done';

  return (
    <motion.div
      className="max-w-4xl mx-auto space-y-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Upload Zone */}
      <motion.div variants={scaleIn}>
        <div
          className={`
            relative rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer
            ${dragOver
              ? 'border-brand-500 bg-brand-100 scale-[1.01] shadow-lg shadow-brand-200/50'
              : selectedFile && step === 'done'
                ? 'border-emerald-400 bg-emerald-50'
                : 'border-slate-300 bg-white hover:border-brand-400 hover:bg-brand-50 hover:scale-[1.005]'
            }
          `}
          onClick={() => !isProcessing && fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          {/* Pulsing border animation for drag-over */}
          {dragOver && (
            <motion.div
              className="absolute inset-0 rounded-2xl border-2 border-brand-500 pointer-events-none"
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          )}

          <div className="flex flex-col items-center justify-center py-16 px-8">
            <AnimatePresence mode="wait">
              {selectedFile && step === 'done' ? (
                <motion.div
                  key="done"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex flex-col items-center gap-4"
                >
                  <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center">
                    <CheckCircle className="h-8 w-8 text-emerald-500" />
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold text-slate-900">{selectedFile.name}</p>
                    <p className="text-sm text-slate-500 mt-1">文件已处理完成</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReset();
                    }}
                    className="mt-2 flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                    重新选择
                  </button>
                </motion.div>
              ) : isProcessing ? (
                <motion.div
                  key="processing"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center gap-4"
                >
                  <div className="h-16 w-16 rounded-full bg-brand-100 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 text-brand-500 animate-spin" />
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold text-slate-900">正在处理...</p>
                    <p className="text-sm text-slate-500 mt-1">{selectedFile?.name}</p>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center gap-4"
                >
                  <div className={`
                    h-16 w-16 rounded-full flex items-center justify-center transition-colors duration-300
                    ${dragOver ? 'bg-brand-200' : 'bg-slate-100'}
                  `}>
                    <Upload className={`h-8 w-8 transition-colors duration-300 ${dragOver ? 'text-brand-600' : 'text-slate-400'}`} />
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold text-slate-900">
                      {dragOver ? '释放文件以开始上传' : '拖拽文件到此处或点击选择'}
                    </p>
                    <p className="text-sm text-slate-500 mt-1">
                      支持 .xlsx, .xls 格式
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx, .xls"
            className="hidden"
            onChange={handleFileUpload}
            disabled={isProcessing}
            aria-label="上传 Excel 文件"
          />
        </div>
      </motion.div>

      {/* Template Download */}
      <motion.div variants={itemVariants} className="flex flex-col items-center gap-2">
        <button
          onClick={generateTemplate}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-brand-600 bg-brand-50 hover:bg-brand-100 transition-colors"
        >
          <Download className="w-4 h-4" />
          下载标准模板
        </button>
        <p className="text-xs text-slate-400">包含宽带字段的用户数据导入模板</p>
      </motion.div>

      {/* Import Progress */}
      <AnimatePresence>
        {isProcessing && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm"
          >
            {/* Progress Bar */}
            <div className="mb-8">
              <div className="flex justify-between text-sm mb-2">
                <span className="font-medium text-slate-700">处理进度</span>
                <span className="text-slate-500">{Math.round(currentProgress)}%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-brand-600 rounded-full"
                  style={{ width: `${currentProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>

            {/* Step Indicators */}
            <div className="flex items-center justify-between">
              {STEP_LABELS.map((s, i) => {
                const isActive = s.key === step;
                const isCompleted = stepIndex > i || step === 'done';
                return (
                  <React.Fragment key={s.key}>
                    <div className="flex flex-col items-center gap-2">
                      <div className={`
                        h-10 w-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300
                        ${isCompleted
                          ? 'bg-emerald-500 text-white'
                          : isActive
                            ? 'bg-brand-600 text-white'
                            : 'bg-slate-100 text-slate-400'
                        }
                      `}>
                        {isCompleted ? (
                          <CheckCircle className="h-5 w-5" />
                        ) : isActive ? (
                          <motion.div
                            animate={{ scale: [1, 1.15, 1] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                          >
                            <FileSpreadsheet className="h-5 w-5" />
                          </motion.div>
                        ) : (
                          <span>{i + 1}</span>
                        )}
                      </div>
                      <span className={`text-xs font-medium ${isActive ? 'text-brand-600' : isCompleted ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {s.label}
                      </span>
                    </div>
                    {i < STEP_LABELS.length - 1 && (
                      <div className={`flex-1 h-0.5 mx-3 rounded-full transition-colors duration-500 ${stepIndex > i ? 'bg-emerald-400' : 'bg-slate-200'}`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Import Results */}
      <AnimatePresence>
        {step === 'done' && results && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: '成功', value: successCount, color: 'emerald', icon: CheckCircle },
                { label: '跳过', value: skippedCount, color: 'amber', icon: AlertCircle },
                { label: '失败', value: failedCount, color: 'red', icon: AlertCircle },
              ].map((card) => {
                const colorClasses: Record<string, { bg: string; border: string; text: string; icon: string; value: string }> = {
                  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-600', icon: 'text-emerald-500', value: 'text-emerald-700' },
                  amber: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-600', icon: 'text-amber-500', value: 'text-amber-700' },
                  red: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-600', icon: 'text-red-500', value: 'text-red-700' },
                };
                const c = colorClasses[card.color];
                return (
                  <motion.div
                    key={card.label}
                    variants={itemVariants}
                    className={`${c.bg} ${c.border} border rounded-xl p-5 text-center`}
                  >
                    <card.icon className={`h-6 w-6 ${c.icon} mx-auto mb-2`} />
                    <p className={`text-3xl font-bold ${c.value}`}>{card.value}</p>
                    <p className={`text-sm font-medium ${c.text} mt-1`}>{card.label}</p>
                  </motion.div>
                );
              })}
            </div>

            {/* Expandable Error List */}
            {results.errors.length > 0 && (
              <motion.div variants={itemVariants} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <button
                  onClick={() => setShowErrors(!showErrors)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <span className="text-sm font-medium text-slate-700">错误详情 ({results.errors.length})</span>
                  </div>
                  {showErrors ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                </button>
                <AnimatePresence>
                  {showErrors && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="border-t border-slate-100"
                    >
                      <div className="p-5 space-y-2 max-h-48 overflow-y-auto">
                        {results.errors.map((err, i) => (
                          <div key={i} className="flex items-start gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                            <span>{err}</span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {/* CTA Button */}
            {results.success > 0 && (
              <motion.div variants={itemVariants} className="flex justify-center">
                <button
                  onClick={() => onImportComplete([])}
                  className="flex items-center gap-2 px-8 py-3.5 rounded-xl text-base font-semibold text-white bg-brand-600 hover:bg-brand-700 shadow-lg shadow-brand-200 hover:shadow-xl hover:shadow-brand-300 transition-all hover:-translate-y-0.5"
                >
                  查看分析结果
                  <ArrowRight className="h-5 w-5" />
                </button>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Excel Header Requirements */}
      <motion.div variants={itemVariants} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 border-b border-slate-200">
          <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-slate-500" />
            Excel 表头格式要求
          </h3>
          <p className="text-xs text-slate-500 mt-1">请确保您的上传文件包含以下列（红色为必须）</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {REQUIRED_HEADERS.map((h, i) => (
              <motion.div
                key={h.name}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * i }}
                className="flex flex-col p-3 border border-slate-100 rounded-lg bg-slate-50/50 hover:bg-slate-50 transition-colors"
              >
                <span className={`font-mono text-sm font-bold ${h.required ? 'text-red-500' : 'text-slate-700'}`}>
                  {h.name} {h.required && <span className="text-red-400">*</span>}
                </span>
                <span className="text-xs text-slate-400 mt-1 truncate" title={h.desc}>{h.desc}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default DataImport;
