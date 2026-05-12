import React, { useEffect, useState } from 'react';
import type { AIProviderConfig, RecommendationResult, ReviewStatus, TariffPlan } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { recommendationsApi, aiApi } from '../services/api';

interface UserDetailProps {
    result: RecommendationResult;
    plans: TariffPlan[];
    aiConfig: AIProviderConfig;
    onOpenAISettings: () => void;
    onBack: () => void;
    onSaveResult: (result: RecommendationResult) => void;
}

const REVIEW_STATUS_META: Record<ReviewStatus, { label: string; className: string }> = {
    pending: { label: '待确认', className: 'bg-amber-50 text-amber-700 border-amber-200' },
    accepted: { label: '已接受', className: 'bg-green-50 text-green-700 border-green-200' },
    rejected: { label: '已驳回', className: 'bg-red-50 text-red-700 border-red-200' },
};

const UserDetail: React.FC<UserDetailProps> = ({ result, plans, aiConfig, onOpenAISettings, onBack, onSaveResult }) => {
    const [activeResult, setActiveResult] = useState(result);
    const [saveMessage, setSaveMessage] = useState('');
    const [isGeneratingScript, setIsGeneratingScript] = useState(false);
    const [scriptError, setScriptError] = useState('');
    const [isRecomputing, setIsRecomputing] = useState(false);

    useEffect(() => {
        setActiveResult(result);
        setSaveMessage('');
        setScriptError('');
    }, [result]);

    const { user, recommendedPlan, reason, script, originalRecommendedPlan } = activeResult;
    const availablePlans = [...plans]
        .filter(plan => plan.isActive)
        .sort((a, b) => a.price - b.price);

    const handleSelectAlternative = async (planId: string) => {
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
    };

    const handleReviewStatusChange = (status: ReviewStatus) => {
        setActiveResult(prev => ({ ...prev, reviewStatus: status }));
        setSaveMessage('');
    };

    const handleReviewNoteChange = (value: string) => {
        setActiveResult(prev => ({ ...prev, reviewNote: value }));
        setSaveMessage('');
    };

    const handleRestoreSystemRecommendation = async () => {
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
    };

    const handleGenerateScript = async () => {
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
    };

    const handleSave = async () => {
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
        } catch (err) {
            console.error('保存失败:', err);
            setSaveMessage('保存失败，请重试');
        }
    };

    const isDirty = (
        activeResult.recommendedPlan.id !== result.recommendedPlan.id ||
        activeResult.reviewStatus !== result.reviewStatus ||
        activeResult.reviewNote !== result.reviewNote ||
        activeResult.script !== result.script
    );

    const ComparisonRow = ({ label, current, recommended, unit = '' }: { label: string, current: string|number, recommended: string|number, unit?: string }) => (
        <div className="grid grid-cols-3 gap-4 py-3 border-b border-slate-100 last:border-0">
            <div className="text-slate-500 text-sm">{label}</div>
            <div className="font-medium text-slate-700">{current} {unit}</div>
            <div className={`font-bold ${String(recommended) !== String(current) ? 'text-brand-600' : 'text-slate-700'}`}>
                {recommended} {unit}
                {String(recommended) !== String(current) && typeof recommended === 'number' && typeof current === 'number' && (
                     <span className="ml-1 text-xs text-slate-400">
                         ({recommended > current ? '+' : ''}{recommended - current})
                     </span>
                )}
            </div>
        </div>
    );

    const chartData = [
        { name: '资费(元)', Current: user.currentPrice, Recommended: recommendedPlan.price },
        { name: '流量(GB)', Current: user.avgData, Recommended: recommendedPlan.data },
        { name: '语音(分)', Current: user.avgVoice, Recommended: recommendedPlan.voice },
    ];

    return (
        <div className="space-y-6">
            <button onClick={onBack} className="flex items-center text-slate-500 hover:text-slate-800 transition-colors">
                <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                返回列表
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                            <div>
                                <h2 className="text-lg font-bold text-slate-800">多维度对比分析</h2>
                                <p className="text-sm text-slate-500">用户: {user.phone} ({user.province})</p>
                            </div>
                            <div className="text-right">
                                <div className="flex justify-end gap-2 mb-2">
                                    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${REVIEW_STATUS_META[activeResult.reviewStatus].className}`}>
                                        {REVIEW_STATUS_META[activeResult.reviewStatus].label}
                                    </span>
                                    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${activeResult.selectionMode === 'manual' ? 'bg-sky-50 text-sky-700 border-sky-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                                        {activeResult.selectionMode === 'manual' ? '人工校正' : '系统推荐'}
                                    </span>
                                </div>
                                <div className="text-sm text-slate-500">适配理由</div>
                                <div className="font-medium text-brand-600">{reason}</div>
                            </div>
                        </div>
                        <div className="p-6">
                            <div className="grid grid-cols-3 gap-4 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                <div>维度</div>
                                <div>当前情况 (实际/套餐)</div>
                                <div>推荐方案 ({recommendedPlan.name})</div>
                            </div>
                            <ComparisonRow label="月资费" current={user.currentPrice} recommended={recommendedPlan.price} unit="元" />
                            <ComparisonRow label="近三月ARPU" current={user.arpu3Month} recommended={activeResult.predictedBill} unit="元 (预计)" />
                            <ComparisonRow label="流量资源" current={`${user.avgData}G (用量)`} recommended={recommendedPlan.data} unit="GB (含量)" />
                            <ComparisonRow label="语音资源" current={`${user.avgVoice}分 (用量)`} recommended={recommendedPlan.voice} unit="分钟 (含量)" />
                            <ComparisonRow label="宽带服务" current={user.hasBroadband ? `${user.broadbandSpeed}M` : '无'} recommended={recommendedPlan.hasBroadband ? `${recommendedPlan.broadbandSpeed}M` : '无'} />
                            <ComparisonRow label="FTTR (全光WiFi)" current={user.isFTTR ? '是' : '否'} recommended={recommendedPlan.isFTTR ? '是' : '否'} />
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                        <h3 className="text-md font-semibold mb-4 text-slate-700">资源覆盖对比</h3>
                        <div className="h-64">
                             <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} margin={{top: 20, right: 30, left: 20, bottom: 5}}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="Current" name="当前(价格/用量)" fill="#94a3b8" radius={[4,4,0,0]} />
                                    <Bar dataKey="Recommended" name="推荐套餐含量" fill="#0ea5e9" radius={[4,4,0,0]} />
                                </BarChart>
                             </ResponsiveContainer>
                        </div>
                        <p className="text-xs text-center text-slate-400 mt-2">* 流量/语音对比为：用户实际使用量 vs 推荐套餐包含量</p>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 space-y-4">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <h3 className="text-sm font-semibold text-slate-800">人工校正</h3>
                                <p className="text-xs text-slate-500 mt-1">确认最终方案、状态和备注后可直接导出结果。</p>
                            </div>
                            {saveMessage && (
                                <span className="text-xs text-green-600 bg-green-50 border border-green-200 rounded-full px-2 py-1">
                                    {saveMessage}
                                </span>
                            )}
                        </div>

                        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                            <div className="flex justify-between gap-4">
                                <span className="text-slate-500">系统初始推荐</span>
                                <span className="font-medium text-slate-800">{originalRecommendedPlan.name}</span>
                            </div>
                            <div className="mt-2 flex justify-between gap-4">
                                <span className="text-slate-500">当前最终方案</span>
                                <span className="font-semibold text-brand-600">{recommendedPlan.name}</span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">最终套餐选择</label>
                            <select
                                value={recommendedPlan.id}
                                onChange={(e) => handleSelectAlternative(e.target.value)}
                                disabled={isRecomputing}
                                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none disabled:opacity-50"
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

                        <div>
                            <div className="text-sm font-medium text-slate-700 mb-2">审核状态</div>
                            <div className="grid grid-cols-3 gap-2">
                                {(Object.keys(REVIEW_STATUS_META) as ReviewStatus[]).map(status => (
                                    <button
                                        key={status}
                                        type="button"
                                        onClick={() => handleReviewStatusChange(status)}
                                        className={`rounded-md border px-3 py-2 text-sm font-medium transition ${
                                            activeResult.reviewStatus === status
                                                ? REVIEW_STATUS_META[status].className
                                                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                                        }`}
                                    >
                                        {REVIEW_STATUS_META[status].label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">备注 / 调整原因</label>
                            <textarea
                                rows={4}
                                value={activeResult.reviewNote}
                                onChange={(e) => handleReviewNoteChange(e.target.value)}
                                placeholder="例如：客户明确接受 79 元档；因宽带保有，保留融合套餐；暂不推荐 FTTR。"
                                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                            />
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <button
                                type="button"
                                onClick={handleSave}
                                className="px-4 py-2 bg-brand-600 text-white rounded-md hover:bg-brand-700 text-sm font-medium"
                            >
                                保存当前结论
                            </button>
                            <button
                                type="button"
                                onClick={handleRestoreSystemRecommendation}
                                disabled={activeResult.selectionMode !== 'manual' || isRecomputing}
                                className="px-4 py-2 rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                恢复系统推荐
                            </button>
                            {isDirty && (
                                <span className="text-xs text-amber-600 self-center">当前有未保存修改</span>
                            )}
                            {isRecomputing && (
                                <span className="text-xs text-blue-600 self-center">重新计算中...</span>
                            )}
                        </div>
                    </div>

                    <div className="bg-gradient-to-b from-brand-50 to-white rounded-lg shadow-sm border border-brand-100 p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="bg-brand-500 text-white p-1.5 rounded-md">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg>
                            </div>
                            <h3 className="text-lg font-bold text-brand-900">AI 推荐话术</h3>
                        </div>
                        <div className="mb-4 space-y-3 rounded-lg border border-brand-100 bg-white/80 p-4">
                            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                                <div className="flex justify-between gap-4">
                                    <span className="text-slate-500">当前提供商</span>
                                    <span className="font-medium text-slate-800">{aiConfig.providerName || '未配置'}</span>
                                </div>
                                <div className="mt-2 flex justify-between gap-4">
                                    <span className="text-slate-500">状态</span>
                                    <span className={`font-medium ${aiConfig.enabled ? 'text-green-700' : 'text-amber-700'}`}>
                                        {aiConfig.enabled ? '已启用' : '未启用（仍可直接生成）'}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center justify-between gap-3 flex-wrap">
                                <button
                                    type="button"
                                    onClick={handleGenerateScript}
                                    disabled={isGeneratingScript}
                                    className="px-4 py-2 bg-brand-600 text-white rounded-md hover:bg-brand-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isGeneratingScript ? '生成中...' : '生成 AI 话术'}
                                </button>
                                <button
                                    type="button"
                                    onClick={onOpenAISettings}
                                    className="px-4 py-2 rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-medium"
                                >
                                    打开 AI 设置
                                </button>
                                {scriptError && (
                                    <span className="text-xs text-red-600 text-right">{scriptError}</span>
                                )}
                            </div>
                        </div>
                        <div className="bg-white border border-brand-100 rounded-md p-4 text-slate-700 leading-relaxed text-sm shadow-sm relative">
                            <div className="italic">
                                "{script}"
                            </div>
                        </div>
                        <div className="mt-4 text-xs text-brand-600 flex justify-end cursor-pointer hover:underline" onClick={() => navigator.clipboard.writeText(script)}>
                            复制话术
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                        <h3 className="text-sm font-semibold mb-3 text-slate-700">备选方案</h3>
                        <div className="space-y-3">
                            {activeResult.alternatives.map(plan => (
                                <button
                                    key={plan.id}
                                    type="button"
                                    onClick={() => handleSelectAlternative(plan.id)}
                                    disabled={isRecomputing}
                                    className={`w-full p-3 border rounded transition cursor-pointer text-left ${
                                        recommendedPlan.id === plan.id
                                            ? 'border-brand-300 bg-brand-50'
                                            : 'border-slate-100 hover:bg-slate-50 hover:border-brand-200'
                                    }`}
                                >
                                    <div className="flex justify-between items-center">
                                        <div className="font-medium text-sm text-slate-800">{plan.name}</div>
                                        <div className="text-brand-600 font-bold text-sm">¥{plan.price}</div>
                                    </div>
                                    <div className="text-xs text-slate-500 mt-1 flex gap-2">
                                        <span>{plan.data}G</span>
                                        <span>{plan.voice}分</span>
                                        {plan.hasBroadband && <span className="bg-blue-50 text-blue-600 px-1 rounded">{plan.broadbandSpeed}M宽</span>}
                                    </div>
                                </button>
                            ))}
                            {activeResult.selectionMode === 'manual' && (
                                <div className="text-xs text-sky-700 bg-sky-50 border border-sky-200 rounded-md px-3 py-2">
                                    当前最终方案已从系统初始推荐调整为人工校正结果。
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserDetail;
