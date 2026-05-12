import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, AlertTriangle, ClipboardCheck, Search, ChevronDown, ArrowRight, Download } from 'lucide-react';
import { RecommendationResult, ReviewStatus } from '../types';
import { recommendationsApi } from '../services/api';

interface DashboardProps {
  results: RecommendationResult[];
  onViewDetail: (result: RecommendationResult) => void;
}

const REVIEW_STATUS_META: Record<ReviewStatus, { label: string; dotColor: string; bgColor: string; textColor: string }> = {
  pending: { label: '待确认', dotColor: 'bg-amber-500', bgColor: 'bg-amber-50', textColor: 'text-amber-700' },
  accepted: { label: '已接受', dotColor: 'bg-green-500', bgColor: 'bg-green-50', textColor: 'text-green-700' },
  rejected: { label: '已驳回', dotColor: 'bg-red-500', bgColor: 'bg-red-50', textColor: 'text-red-700' },
};

// Animated counter hook
function useAnimatedCounter(target: number, duration: number = 1200) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (target === 0) { setCount(0); return; }
    let startTime: number | null = null;
    let frame: number;
    const animate = (now: number) => {
      if (!startTime) startTime = now;
      const progress = Math.min((now - startTime) / duration, 1);
      setCount(Math.floor((1 - Math.pow(1 - progress, 3)) * target));
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return count;
}

// Compact stats card
const StatsCard: React.FC<{
  title: string;
  value: number;
  icon: React.ReactNode;
  gradient: string;
  delay: number;
}> = ({ title, value, icon, gradient, delay }) => {
  const animated = useAnimatedCounter(value);
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className={`${gradient} rounded-xl px-5 py-4 text-white shadow-lg`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium opacity-80">{title}</p>
          <p className="text-2xl font-bold mt-1">{animated.toLocaleString()}</p>
        </div>
        <div className="p-2.5 bg-white/20 rounded-lg">{icon}</div>
      </div>
    </motion.div>
  );
};

const Dashboard: React.FC<DashboardProps> = ({ results, onViewDetail }) => {
  const [filterProv, setFilterProv] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const stats = useMemo(() => {
    const total = results.length;
    if (total === 0) return null;
    const riskHigh = results.filter(r => r.riskLevel === 'high').length;
    const pendingCount = results.filter(r => r.reviewStatus === 'pending').length;
    const planCount = new Set(results.map(r => r.recommendedPlan.name)).size;
    return { total, riskHigh, pendingCount, planCount };
  }, [results]);

  const filteredResults = useMemo(() => {
    return results.filter(r => {
      const matchesProv = filterProv === 'all' || r.user.province === filterProv;
      const matchesSearch =
        r.user.phone.includes(searchTerm) ||
        r.recommendedPlan.name.includes(searchTerm);
      return matchesProv && matchesSearch;
    });
  }, [results, filterProv, searchTerm]);

  const provinces = useMemo(
    () => Array.from(new Set(results.map(r => r.user.province))).filter(Boolean),
    [results]
  );

  if (results.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-20 bg-white rounded-xl border border-dashed border-slate-300"
      >
        <div className="mx-auto w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
          <svg className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-slate-800">暂无分析数据</h3>
        <p className="mt-2 text-sm text-slate-500">请前往导入页面上传用户清单进行分析。</p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard
          title="总用户数"
          value={stats?.total ?? 0}
          icon={<Users className="w-5 h-5 text-white" />}
          gradient="bg-gradient-to-br from-brand-500 to-brand-600"
          delay={0}
        />
        <StatsCard
          title="高风险用户"
          value={stats?.riskHigh ?? 0}
          icon={<AlertTriangle className="w-5 h-5 text-white" />}
          gradient="bg-gradient-to-br from-amber-500 to-amber-600"
          delay={0.08}
        />
        <StatsCard
          title="待审核"
          value={stats?.pendingCount ?? 0}
          icon={<ClipboardCheck className="w-5 h-5 text-white" />}
          gradient="bg-gradient-to-br from-purple-500 to-purple-600"
          delay={0.16}
        />
      </div>

      {/* Table Container */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="bg-white rounded-xl shadow-sm border border-slate-200"
      >
        {/* Filter Bar */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
          <div className="flex flex-col sm:flex-row gap-2 flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="搜索手机号/套餐..."
                className="w-full sm:w-56 pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="relative">
              <select
                className="appearance-none w-full sm:w-auto pl-3 pr-8 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all bg-white"
                value={filterProv}
                onChange={(e) => setFilterProv(e.target.value)}
              >
                <option value="all">所有地区</option>
                {provinces.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 whitespace-nowrap">
              共 {filteredResults.length} 条结果，推荐 {stats?.planCount ?? 0} 种套餐方案
            </span>
            <button
              onClick={() => window.open(recommendationsApi.exportUrl())}
              className="flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm px-4 py-2 rounded-lg transition-colors shadow-sm whitespace-nowrap"
            >
              <Download className="w-4 h-4" />
              导出结果
            </button>
          </div>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 font-semibold text-slate-700 whitespace-nowrap">用户信息</th>
                <th className="px-4 py-3 font-semibold text-slate-700 whitespace-nowrap">推荐方案</th>
                <th className="px-4 py-3 font-semibold text-slate-700 whitespace-nowrap">价格对比</th>
                <th className="px-4 py-3 font-semibold text-slate-700 whitespace-nowrap">审核状态</th>
                <th className="px-4 py-3 font-semibold text-slate-700 whitespace-nowrap">推荐理由</th>
                <th className="px-4 py-3 font-semibold text-slate-700 whitespace-nowrap">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredResults.map((row, idx) => {
                const saving = row.user.currentPrice - row.recommendedPlan.price;
                return (
                  <motion.tr
                    key={idx}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2, delay: Math.min(idx * 0.015, 0.5) }}
                    className="group hover:bg-brand-50 transition-colors"
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-medium text-slate-900">
                        {row.user.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')}
                      </div>
                      <div className="text-xs text-slate-500">
                        {row.user.province} | {row.user.hasBroadband ? `${row.user.broadbandSpeed}M宽` : '无宽'}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-medium text-brand-600">{row.recommendedPlan.name}</div>
                      <div className="text-xs text-slate-500">
                        {row.recommendedPlan.hasBroadband ? `${row.recommendedPlan.broadbandSpeed}M宽带` : '无宽带'}
                      </div>
                      {row.selectionMode === 'manual' && (
                        <span className="text-xs text-sky-600">已人工校正</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-slate-500">{row.user.currentPrice}元</span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                        <span className={saving >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                          {row.recommendedPlan.price}元
                        </span>
                      </div>
                      {saving !== 0 && (
                        <div className={`text-xs mt-0.5 ${saving > 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {saving > 0 ? `省${saving}元` : `增${Math.abs(saving)}元`}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap ${REVIEW_STATUS_META[row.reviewStatus].bgColor} ${REVIEW_STATUS_META[row.reviewStatus].textColor}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${REVIEW_STATUS_META[row.reviewStatus].dotColor}`} />
                        {REVIEW_STATUS_META[row.reviewStatus].label}
                      </span>
                      {row.reviewNote && (
                        <div className="text-xs text-slate-500 mt-1 max-w-[140px] truncate" title={row.reviewNote}>
                          {row.reviewNote}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs leading-relaxed max-w-[200px]">
                      {row.riskLevel === 'high' && (
                        <span className="inline-block bg-red-100 text-red-700 px-1.5 py-0.5 rounded mr-1 font-medium">
                          风险
                        </span>
                      )}
                      {row.reason}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button
                        onClick={() => onViewDetail(row)}
                        className="inline-flex items-center gap-1.5 text-brand-600 hover:text-brand-800 font-medium text-xs border border-brand-200 px-3 py-1.5 rounded-lg hover:bg-brand-50 transition-colors group/btn whitespace-nowrap"
                      >
                        查看
                        <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover/btn:translate-x-0.5" />
                      </button>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden p-4 space-y-3">
          {filteredResults.map((row, idx) => {
            const saving = row.user.currentPrice - row.recommendedPlan.price;
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.03 }}
                className="border border-slate-200 rounded-xl overflow-hidden"
              >
                <div className="px-4 py-3 bg-slate-50 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-slate-900 text-sm">
                      {row.user.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')}
                    </div>
                    <div className="text-xs text-slate-500">{row.user.province}</div>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap ${REVIEW_STATUS_META[row.reviewStatus].bgColor} ${REVIEW_STATUS_META[row.reviewStatus].textColor}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${REVIEW_STATUS_META[row.reviewStatus].dotColor}`} />
                    {REVIEW_STATUS_META[row.reviewStatus].label}
                  </span>
                </div>
                <div className="px-4 py-3 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">推荐方案</span>
                    <span className="font-medium text-brand-600">{row.recommendedPlan.name}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">价格</span>
                    <span className="flex items-center gap-1">
                      <span className="text-slate-400">{row.user.currentPrice}元</span>
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                      <span className={saving >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                        {row.recommendedPlan.price}元
                      </span>
                    </span>
                  </div>
                  {row.riskLevel === 'high' && (
                    <div className="flex items-center gap-1 text-xs">
                      <span className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-medium">风险</span>
                    </div>
                  )}
                  <div className="text-xs text-slate-600 line-clamp-2">{row.reason}</div>
                </div>
                <button
                  onClick={() => onViewDetail(row)}
                  className="w-full flex items-center justify-center gap-1.5 text-brand-600 hover:text-brand-800 font-medium text-sm border-t border-slate-200 px-3 py-2.5 hover:bg-brand-50 transition-colors"
                >
                  查看详情
                  <ArrowRight className="w-4 h-4" />
                </button>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
};

export default Dashboard;
