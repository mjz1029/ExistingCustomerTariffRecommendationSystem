import React, { useEffect, useState, useCallback } from 'react';
import type { AIProviderConfig, RecommendationResult, ReviewStatus, TariffPlan } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { recommendationsApi, aiApi, usersApi } from '../services/api';
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
  // 异网资费填写
  const [compName, setCompName] = useState('');
  const [compPrice, setCompPrice] = useState('');
  const [compData, setCompData] = useState('');
  const [compVoice, setCompVoice] = useState('');
  const [compHasBB, setCompHasBB] = useState(false);
  const [compBBSpeed, setCompBBSpeed] = useState('');
  const [compFTTR, setCompFTTR] = useState(false);
  const [isSavingComp, setIsSavingComp] = useState(false);

  useEffect(() => {
    setActiveResult(result);
    setSaveMessage('');
    setScriptError('');
    setDisplayedScript(result.script || '');
    setCompName(result.user.competitorPlanName || '');
    setCompPrice(result.user.competitorPlanPrice ? String(result.user.competitorPlanPrice) : '');
    setCompData(result.user.avgData ? String(result.user.avgData) : '');
    setCompVoice(result.user.avgVoice ? String(result.user.avgVoice) : '');
    setCompHasBB(!!result.user.hasBroadband);
    setCompBBSpeed(result.user.broadbandSpeed ? String(result.user.broadbandSpeed) : '');
    setCompFTTR(!!result.user.isFTTR);
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
    if (!originalRecommendedPlan) return;
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
  }, [result.id, originalRecommendedPlan]);

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

  const handleSaveCompetitorPlan = useCallback(async () => {
    if (!result.id) return;
    setIsSavingComp(true);
    try {
      // 更新用户信息（竞品资费 + 使用情况）
      await usersApi.updateUser(result.user.id as any, {
        competitorPlanName: compName,
        competitorPlanPrice: Number(compPrice) || 0,
        avgData: Number(compData) || 0,
        avgVoice: Number(compVoice) || 0,
        hasBroadband: compHasBB,
        broadbandSpeed: Number(compBBSpeed) || 0,
        isFTTR: compFTTR,
      });
      // 重新跑推荐引擎（不是手动选套餐，而是完整重跑）
      const recomputed = await recommendationsApi.rerun(result.id);
      setActiveResult(recomputed);
      setSaveMessage('✅ 用户信息已更新，推荐已重新生成');
      setTimeout(() => setSaveMessage(''), 4000);
    } catch (err) {
      console.error('保存失败:', err);
      setSaveMessage('❌ 保存失败，请重试');
    } finally {
      setIsSavingComp(false);
    }
  }, [result.id, result.user.id, compName, compPrice, compData, compVoice, compHasBB, compBBSpeed, compFTTR]);

  const isDirty =
    activeResult.recommendedPlan.id !== result.recommendedPlan.id ||
    activeResult.reviewStatus !== result.reviewStatus ||
    activeResult.reviewNote !== result.reviewNote ||
    activeResult.script !== result.script;

  /* ─── Chart data ─── */
  /* ─── Chart data: 百分比变化 ─── */
  const pctChange = (cur: number, rec: number) => {
    if (!cur || cur === 0) return rec > 0 ? 100 : 0;
    return Math.round(((rec - cur) / cur) * 100);
  };
  const chartData = [
    { name: '资费', change: -pctChange(user.currentPrice, recommendedPlan.price), good: recommendedPlan.price <= user.currentPrice, curVal: `${user.currentPrice}元`, recVal: `${recommendedPlan.price}元` },
    { name: '流量', change: pctChange(user.avgData, recommendedPlan.data), good: recommendedPlan.data >= user.avgData, curVal: `${user.avgData}GB`, recVal: `${recommendedPlan.data}GB` },
    { name: '语音', change: pctChange(user.avgVoice, recommendedPlan.voice), good: recommendedPlan.voice >= user.avgVoice, curVal: `${user.avgVoice}分`, recVal: `${recommendedPlan.voice}分` },
  ];

  /* ─── Comparison rows ─── */
  const fmtNum = (n: number) => Number.isInteger(n) ? String(n) : n.toFixed(2);
  const comparisonRows = [
    { label: '月资费(含搭载)', current: user.currentPrice, recommended: activeResult.monthlyTotal || recommendedPlan.price, unit: '元' },
    ...(activeResult.monthlyTotal && activeResult.monthlyTotal > recommendedPlan.price
      ? [{ label: '纯套餐资费', current: user.currentPrice, recommended: recommendedPlan.price, unit: '元' }]
      : []),
    { label: '近三月ARPU', current: user.arpu3Month, recommended: activeResult.monthlyTotal || recommendedPlan.price, unit: '元' },
    { label: '流量资源', current: `${user.avgData}G (用量)`, recommended: `${recommendedPlan.data}GB (含量)` },
    { label: '语音资源', current: `${user.avgVoice}分 (用量)`, recommended: `${recommendedPlan.voice}分钟 (含量)` },
    { label: '宽带服务', current: user.hasBroadband ? `${user.broadbandSpeed}M` : '无', recommended: recommendedPlan.hasBroadband ? `${recommendedPlan.broadbandSpeed}M${recommendedPlan.broadbandBaseSpeed ? '(提速)' : ''}` : '无' },
    { label: 'FTTR (全光WiFi)', current: user.isFTTR ? '是' : '否', recommended: recommendedPlan.isFTTR ? '是' : '否' },
    ...(activeResult.bundledInfo
      ? [{ label: '搭载业务', current: '—', recommended: activeResult.bundledInfo, unit: '' }]
      : []),
    ...(activeResult.requiredConditions
      ? [{ label: '办理条件', current: '—', recommended: activeResult.requiredConditions, unit: '' }]
      : []),
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
        {user.carrier && user.carrier !== '移动' && (
          <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium bg-orange-50 text-orange-700 border-orange-200">
            {user.carrier}
          </span>
        )}
        {user.customerType && (
          <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium bg-purple-50 text-purple-700 border-purple-200">
            {user.customerType}
          </span>
        )}
        {user.isOldPlan && (
          <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium bg-red-50 text-red-600 border-red-200">
            老旧套餐
          </span>
        )}
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

      {/* ─── 异网资费填写 ─── */}
      {user.carrier && user.carrier !== '移动' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.15 }}
          className="bg-orange-50 border border-orange-200 rounded-xl p-4 md:p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <span className="text-orange-700 font-semibold text-sm">📋 填写{user.carrier}用户资费信息</span>
            <span className="text-xs text-orange-500">（填写后系统将基于竞品资费重新匹配推荐套餐）</span>
          </div>

          {/* 第一行: 竞品套餐 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">当前{user.carrier}套餐名称</label>
              <input
                type="text"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none transition"
                value={compName}
                onChange={e => setCompName(e.target.value)}
                placeholder={`如：${user.carrier}畅享99元套餐`}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">月费（元）</label>
              <input
                type="number"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none transition"
                value={compPrice}
                onChange={e => setCompPrice(e.target.value)}
                placeholder="如：99"
              />
            </div>
          </div>

          {/* 第二行: 流量/语音/宽带 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">月均流量 (GB)</label>
              <input
                type="number"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none transition"
                value={compData}
                onChange={e => setCompData(e.target.value)}
                placeholder="如：30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">月均通话 (分钟)</label>
              <input
                type="number"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none transition"
                value={compVoice}
                onChange={e => setCompVoice(e.target.value)}
                placeholder="如：200"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">宽带带宽 (Mbps)</label>
              <input
                type="number"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 focus:outline-none transition disabled:bg-slate-100 disabled:text-slate-400"
                value={compBBSpeed}
                onChange={e => setCompBBSpeed(e.target.value)}
                placeholder="如：500"
                disabled={!compHasBB}
              />
            </div>
            <div className="flex flex-col gap-2 pt-5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                  checked={compHasBB}
                  onChange={e => { setCompHasBB(e.target.checked); if (!e.target.checked) { setCompBBSpeed(''); setCompFTTR(false); } }}
                />
                <span className="text-xs font-medium text-slate-700">有宽带</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                  checked={compFTTR}
                  onChange={e => setCompFTTR(e.target.checked)}
                  disabled={!compHasBB}
                />
                <span className="text-xs font-medium text-slate-700">FTTR全光</span>
              </label>
            </div>
          </div>

          {/* 保存按钮 */}
          <div className="flex items-center gap-3 mt-2">
            <button
              type="button"
              onClick={handleSaveCompetitorPlan}
              disabled={isSavingComp || (!compName && !compPrice)}
              className="flex items-center justify-center gap-1.5 px-5 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm font-medium disabled:opacity-50 transition shadow-sm"
            >
              {isSavingComp ? '保存中...' : '💾 保存并重新推荐'}
            </button>
            {saveMessage && (
              <span className={`text-sm ${saveMessage.startsWith('✅') ? 'text-emerald-600' : 'text-red-500'}`}>
                {saveMessage}
              </span>
            )}
          </div>

          {/* 已填写摘要 */}
          {user.competitorPlanName && (
            <div className="mt-3 pt-3 border-t border-orange-200 text-xs text-orange-700 space-y-0.5">
              <div>已填写：{user.competitorPlanName} / {user.competitorPlanPrice}元/月</div>
              <div>流量 {user.avgData || '?'}GB · 通话 {user.avgVoice || '?'}分钟 · {user.hasBroadband ? `宽带${user.broadbandSpeed || '?'}M${user.isFTTR ? '(FTTR)' : ''}` : '无宽带'}</div>
            </div>
          )}
        </motion.div>
      )}

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
                <div>当前{user.currentPlanName ? `(${user.currentPlanName})` : '情况'}</div>
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
                      <div className="font-medium text-slate-700 text-sm">{typeof row.current === 'number' ? fmtNum(row.current as number) : row.current} {row.unit}</div>
                      <div className="flex items-center gap-1">
                        <span className={`font-bold text-sm ${i === 0 ? 'text-brand-700' : 'text-slate-800'}`}>
                          {typeof row.recommended === 'number' ? fmtNum(row.recommended as number) : row.recommended} {row.unit}
                        </span>
                        {isNumericDiff && diff !== 0 && (
                          <span className={`inline-flex items-center text-xs font-medium ${isSaving ? 'text-green-600' : 'text-red-500'}`}>
                            {isSaving ? <ArrowDown size={12} /> : <ArrowUp size={12} />}
                            {fmtNum(Math.abs(diff))}
                          </span>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
              {/* 注释说明 */}
              <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-400 space-y-1">
                <p>* 月资费(含搭载) = 主套餐 + 必办搭载业务的固定月费</p>
                <p>* 近三月ARPU：当前列为用户近3个月实际月均消费，推荐列为推荐套餐的月费总额（含搭载业务）</p>
              </div>
            </div>
          </CollapsibleSection>

          {/* Bundled Requirements */}
          {activeResult.bundledInfo && (
            <CollapsibleSection
              title="搭载要求（必办业务）"
              icon={<span className="text-amber-500">⚠️</span>}
              defaultOpen={true}
              className="bg-white rounded-xl shadow-sm border border-amber-200 overflow-hidden"
            >
              <div className="px-4 md:px-6 pb-4 md:pb-6">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 md:p-4">
                  <div className="text-sm text-amber-800 font-medium mb-2">
                    办理此套餐需同时开通以下业务，否则会下发差错：
                  </div>
                  <div className="text-sm text-amber-700 leading-relaxed">
                    {activeResult.bundledInfo}
                  </div>
                  {activeResult.monthlyTotal && activeResult.monthlyTotal > recommendedPlan.price && (
                    <div className="mt-2 pt-2 border-t border-amber-200 text-sm font-semibold text-amber-900">
                      月费总额：{activeResult.monthlyTotal}元（主套餐{recommendedPlan.price}元 + 搭载{activeResult.monthlyTotal - recommendedPlan.price}元）
                    </div>
                  )}
                </div>
                {activeResult.requiredConditions && (
                  <div className="mt-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-600">
                    <span className="font-medium text-slate-700">办理条件：</span>{activeResult.requiredConditions}
                  </div>
                )}
              </div>
            </CollapsibleSection>
          )}

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
                  <BarChart data={chartData} layout="vertical" margin={{ top: 10, right: 60, left: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={v => `${v}%`} domain={['auto', 'auto']} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 13, fontWeight: 600 }} width={50} />
                    <Tooltip
                      contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }}
                      formatter={(value: number, _name: string, props: any) => {
                        const d = props.payload;
                        return [`${value > 0 ? '+' : ''}${value}%  (${d.curVal} → ${d.recVal})`, '变化幅度'];
                      }}
                    />
                    <Bar
                      dataKey="change"
                      name="变化幅度"
                      radius={[0, 6, 6, 0]}
                      barSize={28}
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.good ? '#10b981' : '#ef4444'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-center gap-4 mt-2 text-xs text-slate-400">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500"></span> 资源提升</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500"></span> 资源下降</span>
                <span>* 资费为反向指标(降=好)，流量/语音为正向(升=好)</span>
              </div>
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
                        {plan.hasBroadband ? ` | ${plan.broadbandSpeed}M${plan.broadbandBaseSpeed ? '(提速)' : ''}宽带` : ''}
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
                            <span className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">{plan.broadbandSpeed}M{plan.broadbandBaseSpeed ? '(提速)' : ''}宽</span>
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
