import React, { useEffect, useState, useCallback } from 'react';
import type { AIProviderConfig, RecommendationResult, ReviewStatus, TariffPlan } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { recommendationsApi, aiApi } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  Check,
  Copy,
  ChevronDown,
  ChevronUp,
  Loader2,
  MessageSquareText,
  Shield,
  User,
  MapPin,
  Sparkles,
  RefreshCw,
} from 'lucide-react';

interface UserDetailProps {
  result: RecommendationResult;
  plans: TariffPlan[];
  aiConfig: AIProviderConfig;
  onOpenAISettings: () => void;
  onBack: () => void;
  onSaveResult: (result: RecommendationResult) => void;
}

const REVIEW_STATUS_META: Record<ReviewStatus, { label: string; className: string; activeBg: string }> = {
  pending: { label: '待确认', className: 'bg-amber-50 text-amber-700 border-amber-200', activeBg: 'bg-amber-500 text-white border-amber-500' },
  accepted: { label: '已接受', className: 'bg-green-50 text-green-700 border-green-200', activeBg: 'bg-green-500 text-white border-green-500' },
  rejected: { label: '已驳回', className: 'bg-red-50 text-red-700 border-red-200', activeBg: 'bg-red-500 text-white border-red-500' },
};

const RISK_META: Record<string, { label: string; className: string }> = {
  high: { label: '高风险', className: 'bg-red-100 text-red-700 border-red-200' },
  medium: { label: '中风险', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  low: { label: '低风险', className: 'bg-green-100 text-green-700 border-green-200' },
};

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const slideFromLeft = {
  hidden: { opacity: 0, x: -30 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

const slideFromRight = {
  hidden: { opacity: 0, x: 30 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

const slideUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: 'easeOut' } },
};

/* ─── Collapsible Section (mobile) ─── */
const CollapsibleSection: React.FC<{
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
}> = ({ title, icon, defaultOpen = true, children, className }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between py-3 md:cursor-default"
      >
        <div className="flex items-center gap-2">{icon}<span className="font-semibold text-slate-800">{title}</span></div>
        <span className="md:hidden text-slate-400">{open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}</span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ─── Main Component ─── */
const UserDetail: React.FC<UserDetailProps> = ({ result, plans, aiConfig, onOpenAISettings, onBack, onSaveResult }) => {
  const [activeResult, setActiveResult] = useState(result);
  const [saveMessage, setSaveMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [scriptError, setScriptError] = useState('');
  const [isRecomputing, setIsRecomputing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [displayedScript, setDisplayedScript] = useState('');

  useEffect(() => {
    setActiveResult(result);
    setSaveMessage('');
    setScriptError('');
    setDisplayedScript(result.script || '');
  }, [result]);

  const { user, recommendedPlan, reason, script, originalRecommendedPlan } = activeResult;
  const availablePlans = [...plans]
    .filter(plan => plan.isActive)
    .sort((a, b) => a.price - b.price);

  /* ─── Typewriter effect for generated script ─── */
  useEffect(() => {
    if (!script || script === displayedScript) return;
    let i = 0;
    setDisplayedScript('');
    const interval = setInterval(() => {
      i++;
      setDisplayedScript(script.slice(0, i));
      if (i >= script.length) clearInterval(interval);
    }, 18);
    return () => clearInterval(interval);
  }, [script]);

  const handleSelectAlternative = useCallback(async (planId: string) => {
    setIsRecomputing(true);
    try {
      const recomputed = await recommendationsApi.recompute(result.id!, planId);
      setActiveResult(recomputed);
      setSaveMessage('');
    } catch (err) {
      console.error('重新计算失败:', err);
    } finally {
      setIsRecomputing(false);
    }
  }, [result.id]);

  const handleReviewStatusChange = useCallback((status: ReviewStatus) => {
    setActiveResult(prev => ({ ...prev, reviewStatus: status }));
    setSaveMessage('');
  }, []);

  const handleReviewNoteChange = useCallback((value: string) => {
    setActiveResult(prev => ({ ...prev, reviewNote: value }));
    setSaveMessage('');
  }, []);

  const handleRestoreSystemRecommendation = useCallback(async () => {
    setIsRecomputing(true);
    try {
      const recomputed = await recommendationsApi.recompute(result.id!, originalRecommendedPlan.id);
      setActiveResult(recomputed);
      setSaveMessage('');
    } catch (err) {
      console.error('恢复失败:', err);
    } finally {
      setIsRecomputing(false);
    }
  }, [result.id, originalRecommendedPlan.id]);

  const handleGenerateScript = useCallback(async () => {
    setIsGeneratingScript(true);
    setScriptError('');
    setSaveMessage('');
    try {
      const { script: generatedScript } = await aiApi.generateScript(result.id!);
      setActiveResult(prev => ({ ...prev, script: generatedScript }));
    } catch (error) {
      setScriptError(error instanceof Error ? error.message : 'AI 话术生成失败，请稍后重试。');
    } finally {
      setIsGeneratingScript(false);
    }
  }, [result.id]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const updated = await recommendationsApi.update(result.id!, {
        reviewStatus: activeResult.reviewStatus,
        reviewNote: activeResult.reviewNote,
        script: activeResult.script,
        recommendedPlanId: activeResult.recommendedPlan.id,
        selectionMode: activeResult.selectionMode,
      });
      setActiveResult(updated);
      onSaveResult(updated);
      setSaveMessage('当前结论已保存');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (err) {
      console.error('保存失败:', err);
      setSaveMessage('保存失败，请重试');
    } finally {
      setIsSaving(false);
    }
  }, [result.id, activeResult, onSaveResult]);

  const handleCopyScript = useCallback(() => {
    navigator.clipboard.writeText(displayedScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [displayedScript]);

  const isDirty =
    activeResult.recommendedPlan.id !== result.recommendedPlan.id ||
    activeResult.reviewStatus !== result.reviewStatus ||
    activeResult.reviewNote !== result.reviewNote ||
    activeResult.script !== result.script;

  /* ─── Chart data ─── */
  const chartData = [
    { name: '资费(元)', 当前: user.currentPrice, 推荐: recommendedPlan.price },
    { name: '流量(GB)', 当前: user.avgData, 推荐: recommendedPlan.data },
    { name: '语音(分)', 当前: user.avgVoice, 推荐: recommendedPlan.voice },
  ];

  /* ─── Comparison rows ─── */
  const comparisonRows = [
    { label: '月资费', current: user.currentPrice, recommended: recommendedPlan.price, unit: '元' },
    { label: '近三月ARPU', current: user.arpu3Month, recommended: activeResult.predictedBill, unit: '元 (预计)' },
    { label: '流量资源', current: `${user.avgData}G (用量)`, recommended: `${recommendedPlan.data}GB (含量)` },
    { label: '语音资源', current: `${user.avgVoice}分 (用量)`, recommended: `${recommendedPlan.voice}分钟 (含量)` },
    { label: '宽带服务', current: user.hasBroadband ? `${user.broadbandSpeed}M` : '无', recommended: recommendedPlan.hasBroadband ? `${recommendedPlan.broadbandSpeed}M` : '无' },
    { label: 'FTTR (全光WiFi)', current: user.isFTTR ? '是' : '否', recommended: recommendedPlan.isFTTR ? '是' : '否' },
  ];

  const riskMeta = RISK_META[activeResult.riskLevel] || RISK_META.low;

  return (
    <div className="space-y-4 md:space-y-6">
      {/* ─── Sticky Header (mobile) ─── */}
      <motion.div
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="sticky top-0 md:static z-10 bg-slate-50/80 backdrop-blur-md md:bg-transparent md:backdrop-blur-none -mx-4 px-4 md:mx-0 md:px-0 py-3 md:py-0"
      >
        <button
          onClick={onBack}
          aria-label="返回看板"
          className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 transition-colors text-sm font-medium"
        >
          <ArrowLeft size={18} />
          <span>返回看板</span>
        </button>
      </motion.div>

      {/* ─── User Info Bar ─── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1 }}
        className="flex flex-wrap items-center gap-3 md:gap-4"
      >
        <div className="flex items-center gap-2 text-slate-700">
          <User size={16} className="text-slate-400" />
          <span className="font-semibold text-lg">{user.phone}</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-500 text-sm">
          <MapPin size={14} />
          <span>{user.province}</span>
        </div>
        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${riskMeta.className}`}>
          <Shield size={12} className="mr-1" />
          {riskMeta.label}
        </span>
        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${REVIEW_STATUS_META[activeResult.reviewStatus].className}`}>
          {REVIEW_STATUS_META[activeResult.reviewStatus].label}
        </span>
        {activeResult.selectionMode === 'manual' && (
          <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium bg-sky-50 text-sky-700 border-sky-200">
            人工校正
          </span>
        )}
      </motion.div>

      {/* ─── Main Grid ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {/* ─── Left Column (comparison + chart) ─── */}
        <div className="md:col-span-1 lg:col-span-2 space-y-4 md:space-y-6">
          {/* Comparison Table */}
          <CollapsibleSection
            title="多维度对比分析"
            icon={<Sparkles size={18} className="text-brand-500" />}
            defaultOpen={true}
            className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
          >
            <div className="px-4 md:px-6 pb-4 md:pb-6">
              <div className="flex flex-wrap items-center gap-2 mb-4 text-xs text-slate-500">
                <span>适配理由：</span>
                <span className="font-medium text-brand-600">{reason}</span>
              </div>

              {/* Table header */}
              <div className="grid grid-cols-3 gap-2 md:gap-4 pb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-200">
                <div>维度</div>
                <div>当前情况</div>
                <div>推荐方案 ({recommendedPlan.name})</div>
              </div>

              {/* Table rows with stagger */}
              <motion.div variants={stagger} initial="hidden" animate="visible">
                {comparisonRows.map((row, i) => {
                  const isNumericDiff = typeof row.current === 'number' && typeof row.recommended === 'number';
                  const diff = isNumericDiff ? (row.recommended as number) - (row.current as number) : 0;
                  const isSaving = diff < 0;
                  const isIncrease = diff > 0;

                  return (
                    <motion.div
                      key={row.label}
                      variants={slideFromLeft}
                      className={`grid grid-cols-3 gap-2 md:gap-4 py-3 border-b border-slate-100 last:border-0 ${i === 0 ? 'bg-brand-50/40' : ''}`}
                    >
                      <div className="text-slate-500 text-sm">{row.label}</div>
                      <div className="font-medium text-slate-700 text-sm">{row.current} {row.unit}</div>
                      <div className="flex items-center gap-1">
                        <span className={`font-bold text-sm ${i === 0 ? 'text-brand-700' : 'text-slate-800'}`}>
                          {row.recommended} {row.unit}
                        </span>
                        {isNumericDiff && diff !== 0 && (
                          <span className={`inline-flex items-center text-xs font-medium ${isSaving ? 'text-green-600' : 'text-red-500'}`}>
                            {isSaving ? <ArrowDown size={12} /> : <ArrowUp size={12} />}
                            {Math.abs(diff)}
                          </span>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            </div>
          </CollapsibleSection>

          {/* Bar Chart */}
          <CollapsibleSection
            title="资源覆盖对比"
            icon={<Sparkles size={18} className="text-blue-500" />}
            defaultOpen={true}
            className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
          >
            <motion.div
              variants={scaleIn}
              initial="hidden"
              animate="visible"
              className="px-4 md:px-6 pb-4 md:pb-6"
            >
              <div className="h-56 md:h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="当前" name="当前(价格/用量)" fill="#94a3b8" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="推荐" name="推荐套餐含量" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs text-center text-slate-400 mt-2">* 流量/语音对比为：用户实际使用量 vs 推荐套餐包含量</p>
            </motion.div>
          </CollapsibleSection>
        </div>

        {/* ─── Right Column (review + AI + alternatives) ─── */}
        <div className="space-y-4 md:space-y-6">
          {/* Review Panel */}
          <motion.div
            variants={slideFromRight}
            initial="hidden"
            animate="visible"
            className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
          >
            <CollapsibleSection
              title="人工校正"
              icon={<MessageSquareText size={18} className="text-slate-500" />}
              defaultOpen={true}
            >
              <div className="px-4 md:px-5 pb-4 md:pb-5 space-y-4">
                {/* Plan comparison summary */}
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm">
                  <div className="flex justify-between gap-3">
                    <span className="text-slate-500">系统初始推荐</span>
                    <span className="font-medium text-slate-800">{originalRecommendedPlan.name}</span>
                  </div>
                  <div className="mt-1.5 flex justify-between gap-3">
                    <span className="text-slate-500">当前最终方案</span>
                    <span className="font-semibold text-brand-600">{recommendedPlan.name}</span>
                  </div>
                </div>

                {/* Plan selector */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">最终套餐选择</label>
                  <select
                    value={recommendedPlan.id}
                    onChange={(e) => handleSelectAlternative(e.target.value)}
                    disabled={isRecomputing}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none disabled:opacity-50 transition"
                  >
                    {availablePlans.map(plan => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name} | {plan.price}元 | {plan.data}G | {plan.voice}分
                        {plan.hasBroadband ? ` | ${plan.broadbandSpeed}M宽带` : ''}
                        {plan.isFTTR ? ' | FTTR' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status toggle */}
                <div>
                  <div className="text-sm font-medium text-slate-700 mb-1.5">审核状态</div>
                  <div className="grid grid-cols-3 gap-2">
                    {(Object.keys(REVIEW_STATUS_META) as ReviewStatus[]).map(status => {
                      const isActive = activeResult.reviewStatus === status;
                      return (
                        <button
                          key={status}
                          type="button"
                          onClick={() => handleReviewStatusChange(status)}
                          className={`rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                            isActive
                              ? REVIEW_STATUS_META[status].activeBg + ' shadow-sm'
                              : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {REVIEW_STATUS_META[status].label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Notes textarea */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">备注 / 调整原因</label>
                  <textarea
                    rows={3}
                    value={activeResult.reviewNote}
                    onChange={(e) => handleReviewNoteChange(e.target.value)}
                    placeholder="例如：客户明确接受 79 元档；因宽带保有，保留融合套餐。"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none transition resize-none"
                  />
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 text-sm font-medium disabled:opacity-50 transition shadow-sm"
                  >
                    {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                    保存结论
                  </button>
                  <button
                    type="button"
                    onClick={handleRestoreSystemRecommendation}
                    disabled={activeResult.selectionMode !== 'manual' || isRecomputing}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    <RefreshCw size={14} className={isRecomputing ? 'animate-spin' : ''} />
                    恢复系统推荐
                  </button>
                </div>

                {/* Status messages */}
                <AnimatePresence>
                  {saveMessage && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className={`text-xs rounded-full px-3 py-1.5 inline-flex items-center gap-1 ${
                        saveMessage.includes('失败')
                          ? 'text-red-600 bg-red-50 border border-red-200'
                          : 'text-green-600 bg-green-50 border border-green-200'
                      }`}
                    >
                      <Check size={12} />
                      {saveMessage}
                    </motion.div>
                  )}
                </AnimatePresence>
                {isDirty && (
                  <span className="text-xs text-amber-600 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    当前有未保存修改
                  </span>
                )}
                {isRecomputing && (
                  <span className="text-xs text-blue-600 flex items-center gap-1">
                    <Loader2 size={12} className="animate-spin" />
                    重新计算中...
                  </span>
                )}
              </div>
            </CollapsibleSection>
          </motion.div>

          {/* AI Script Panel */}
          <motion.div
            variants={slideFromRight}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.15 }}
            className="bg-gradient-to-br from-brand-50 to-white rounded-xl shadow-sm border border-brand-100 overflow-hidden"
          >
            <CollapsibleSection
              title="AI 推荐话术"
              icon={<Sparkles size={18} className="text-brand-500" />}
              defaultOpen={true}
            >
              <div className="px-4 md:px-5 pb-4 md:pb-5 space-y-3">
                {/* AI status */}
                <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white/80 px-3 py-2 text-sm">
                  <span className="text-slate-500">AI 状态</span>
                  <span className="flex items-center gap-1.5 font-medium">
                    <span className={`w-2 h-2 rounded-full ${aiConfig.enabled ? 'bg-green-500' : 'bg-red-400'}`} />
                    <span className={aiConfig.enabled ? 'text-green-700' : 'text-amber-700'}>
                      {aiConfig.enabled ? `${aiConfig.providerName} 已启用` : '未启用'}
                    </span>
                  </span>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleGenerateScript}
                    disabled={isGeneratingScript}
                    className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 text-sm font-medium disabled:opacity-50 transition shadow-sm"
                  >
                    {isGeneratingScript ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Sparkles size={14} />
                    )}
                    {isGeneratingScript ? '生成中...' : '生成 AI 话术'}
                  </button>
                  <button
                    type="button"
                    onClick={onOpenAISettings}
                    className="px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-white text-sm transition"
                  >
                    AI 设置
                  </button>
                </div>

                {scriptError && (
                  <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    {scriptError}
                  </div>
                )}

                {/* Script display */}
                <div className="relative bg-slate-50 border border-slate-200 rounded-lg p-3 md:p-4">
                  <div className="font-mono text-sm text-slate-700 leading-relaxed whitespace-pre-wrap min-h-[60px]">
                    {displayedScript ? (
                      <>
                        {displayedScript}
                        {displayedScript.length < (script?.length || 0) && (
                          <span className="inline-block w-0.5 h-4 bg-brand-500 ml-0.5 animate-pulse align-text-bottom" />
                        )}
                      </>
                    ) : (
                      <span className="text-slate-400 italic">点击"生成 AI 话术"获取推荐话术...</span>
                    )}
                  </div>

                  {/* Copy button */}
                  {displayedScript && (
                    <button
                      type="button"
                      onClick={handleCopyScript}
                      aria-label={copied ? '已复制' : '复制话术'}
                      className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition shadow-sm"
                    >
                      {copied ? (
                        <>
                          <Check size={12} className="text-green-600" />
                          <span className="text-green-600">已复制</span>
                        </>
                      ) : (
                        <>
                          <Copy size={12} />
                          <span>复制</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </CollapsibleSection>
          </motion.div>

          {/* Alternative Plans */}
          <motion.div
            variants={slideFromRight}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
          >
            <CollapsibleSection
              title="备选方案"
              icon={<Sparkles size={18} className="text-violet-500" />}
              defaultOpen={true}
            >
              <div className="px-4 md:px-5 pb-4 md:pb-5">
                <motion.div
                  variants={stagger}
                  initial="hidden"
                  animate="visible"
                  className="space-y-2"
                >
                  {activeResult.alternatives.map((plan) => {
                    const isSelected = recommendedPlan.id === plan.id;
                    return (
                      <motion.button
                        key={plan.id}
                        variants={slideUp}
                        type="button"
                        onClick={() => handleSelectAlternative(plan.id)}
                        disabled={isRecomputing}
                        className={`w-full p-3 border rounded-lg transition-all text-left group ${
                          isSelected
                            ? 'border-brand-300 bg-brand-50 shadow-sm'
                            : 'border-slate-100 hover:bg-slate-50 hover:border-brand-200 hover:shadow-sm'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <div className="font-medium text-sm text-slate-800">{plan.name}</div>
                          <div className="text-brand-600 font-bold text-sm">¥{plan.price}</div>
                        </div>
                        <div className="text-xs text-slate-500 mt-1 flex gap-2 flex-wrap">
                          <span>{plan.data}G</span>
                          <span>{plan.voice}分</span>
                          {plan.hasBroadband && (
                            <span className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">{plan.broadbandSpeed}M宽</span>
                          )}
                          {plan.isFTTR && (
                            <span className="bg-violet-50 text-violet-600 px-1.5 py-0.5 rounded">FTTR</span>
                          )}
                        </div>
                      </motion.button>
                    );
                  })}
                </motion.div>

                {activeResult.selectionMode === 'manual' && (
                  <div className="mt-3 text-xs text-sky-700 bg-sky-50 border border-sky-200 rounded-lg px-3 py-2">
                    当前最终方案已从系统初始推荐调整为人工校正结果。
                  </div>
                )}
              </div>
            </CollapsibleSection>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default UserDetail;
