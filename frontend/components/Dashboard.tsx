import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, AlertTriangle, ClipboardCheck, Search, ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowRight, Download } from 'lucide-react';
import { RecommendationResult, ReviewStatus } from '../types';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { recommendationsApi } from '../services/api';
import { useAnimatedCounter } from '../hooks/useAnimatedCounter';
import TagFilter, { filterByTags } from './TagFilter';

interface DashboardProps {
  results: RecommendationResult[];
  onViewDetail: (result: RecommendationResult) => void;
}

const PAGE_SIZE_OPTIONS = [20, 50, 100, 200];
const DEFAULT_PAGE_SIZE = 20;
const COLORS = ['#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];

const REVIEW_STATUS_META: Record<ReviewStatus, { label: string; dotColor: string; bgColor: string; textColor: string }> = {
  pending: { label: '待确认', dotColor: 'bg-amber-500', bgColor: 'bg-amber-50', textColor: 'text-amber-700' },
  accepted: { label: '已接受', dotColor: 'bg-green-500', bgColor: 'bg-green-50', textColor: 'text-green-700' },
  rejected: { label: '已驳回', dotColor: 'bg-red-500', bgColor: 'bg-red-50', textColor: 'text-red-700' },
};

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

/* ── Pagination Component ──────────────────────────────────────── */

const Pagination: React.FC<{
  current: number;
  total: number;
  pageSize: number;
  pageSizeOptions: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}> = ({ current, total, pageSize, pageSizeOptions, onPageChange, onPageSizeChange }) => {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // Generate page number buttons (show max 7 around current)
  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | '...')[] = [];
    pages.push(1);
    if (current > 3) pages.push('...');
    const start = Math.max(2, current - 1);
    const end = Math.min(totalPages - 1, current + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (current < totalPages - 2) pages.push('...');
    pages.push(totalPages);
    return pages;
  };

  const startItem = (current - 1) * pageSize + 1;
  const endItem = Math.min(current * pageSize, total);

  return (
    <div className="px-4 py-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
      <div className="flex items-center gap-3 text-xs text-slate-500">
        <span>第 {startItem}-{endItem} 条，共 {total.toLocaleString()} 条</span>
        <div className="relative">
          <select
            className="appearance-none pl-2 pr-6 py-1 text-xs border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
          >
            {pageSizeOptions.map(s => (
              <option key={s} value={s}>每页 {s} 条</option>
            ))}
          </select>
          <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(1)}
          disabled={current === 1}
          className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="首页"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => onPageChange(current - 1)}
          disabled={current === 1}
          className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="上一页"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {getPageNumbers().map((p, i) =>
          p === '...' ? (
            <span key={`ellipsis-${i}`} className="px-1.5 text-slate-400 text-xs">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p as number)}
              className={`min-w-[32px] h-8 text-xs rounded-md transition-colors ${
                p === current
                  ? 'bg-brand-600 text-white font-medium shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {p}
            </button>
          )
        )}

        <button
          onClick={() => onPageChange(current + 1)}
          disabled={current === totalPages}
          className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="下一页"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={current === totalPages}
          className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="末页"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

/* ── Dashboard ─────────────────────────────────────────────────── */

const Dashboard: React.FC<DashboardProps> = ({ results, onViewDetail }) => {
  const [filterProv, setFilterProv] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const stats = useMemo(() => {
    const total = results.length;
    if (total === 0) return null;
    const riskHigh = results.filter(r => r.riskLevel === 'high').length;
    const pendingCount = results.filter(r => r.reviewStatus === 'pending').length;
    const planCount = new Set(results.map(r => r.recommendedPlan.name)).size;
    const distMap: Record<string, number> = {};
    results.forEach(r => {
      distMap[r.recommendedPlan.name] = (distMap[r.recommendedPlan.name] || 0) + 1;
    });
    const distData = Object.keys(distMap)
      .map(k => ({ name: k, value: distMap[k] }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
    return { total, riskHigh, pendingCount, planCount, distData };
  }, [results]);

  const filteredResults = useMemo(() => {
    return filterByTags(results, activeTags).filter(r => {
      const matchesProv = filterProv === 'all' || r.user.province === filterProv;
      const matchesSearch =
        r.user.phone.includes(searchTerm) ||
        r.recommendedPlan.name.includes(searchTerm);
      return matchesProv && matchesSearch;
    });
  }, [results, filterProv, searchTerm, activeTags]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterProv, searchTerm, activeTags, pageSize]);

  // Paginated slice
  const totalPages = Math.max(1, Math.ceil(filteredResults.length / pageSize));
  const paginatedResults = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredResults.slice(start, start + pageSize);
  }, [filteredResults, currentPage, pageSize]);

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

      {/* Pie Chart */}
      {stats?.distData && stats.distData.length > 0 && (() => {
        const total = stats.distData.reduce((s, d) => s + d.value, 0);
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="bg-white rounded-xl shadow-sm border border-slate-200 p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-semibold text-slate-700">推荐套餐分布</h3>
              <span className="text-xs text-slate-400">Top 5 套餐方案</span>
            </div>

            {/* Chart + center label */}
            <div className="flex justify-center">
              <div className="relative w-52 h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.distData}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={95}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="none"
                    >
                      {stats.distData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }: any) => {
                        if (!active || !payload?.length) return null;
                        const pct = ((payload[0].value / total) * 100).toFixed(1);
                        return (
                          <div className="bg-slate-900 text-white px-3 py-2 rounded-lg shadow-xl text-xs">
                            <p className="font-medium">{payload[0].name}</p>
                            <p className="text-slate-300 mt-0.5">{payload[0].value} 人 · {pct}%</p>
                          </div>
                        );
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center label */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-bold text-slate-800">{total.toLocaleString()}</span>
                  <span className="text-xs text-slate-400 mt-0.5">总推荐</span>
                </div>
              </div>
            </div>

            {/* Legend as horizontal items */}
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {stats.distData.map((d, i) => {
                const pct = ((d.value / total) * 100).toFixed(1);
                return (
                  <div key={d.name} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-slate-50">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-slate-700 truncate">{d.name}</div>
                      <div className="text-xs text-slate-400">{d.value}人 · {pct}%</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        );
      })()}

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
              共 {filteredResults.length.toLocaleString()} 条结果，推荐 {stats?.planCount ?? 0} 种套餐方案
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

        {/* Tag Filter */}
        <div className="px-4 pt-4 pb-2 border-b border-slate-100">
          <TagFilter
            activeTags={activeTags}
            onChange={setActiveTags}
            resultCount={filteredResults.length}
            totalCount={results.length}
          />
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
              {paginatedResults.map((row, idx) => {
                const recPrice = row.monthlyTotal ?? row.recommendedPlan.price;
                const saving = row.user.currentPrice - recPrice;
                return (
                  <tr
                    key={row.id ?? idx}
                    className="group hover:bg-brand-50 transition-colors"
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-medium text-slate-900">
                        {row.user.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')}
                      </div>
                      <div className="text-xs text-slate-500">
                        {row.user.province} | {row.user.hasBroadband ? `${row.user.broadbandSpeed}M宽` : '无宽'}
                      </div>
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {row.user.carrier && row.user.carrier !== '移动' && (
                          <span className="inline-block bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded text-[10px] font-medium">
                            {row.user.carrier}
                          </span>
                        )}
                        {row.user.customerType && (
                          <span className="inline-block bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded text-[10px] font-medium">
                            {row.user.customerType}
                          </span>
                        )}
                        {row.user.isOldPlan && (
                          <span className="inline-block bg-red-100 text-red-600 px-1.5 py-0.5 rounded text-[10px] font-medium">
                            老旧套餐
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-medium text-brand-600">{row.recommendedPlan.name}</div>
                      <div className="text-xs text-slate-500">
                        {row.recommendedPlan.hasBroadband ? `${row.recommendedPlan.broadbandSpeed}M宽带` : '无宽带'}
                      </div>
                      {row.monthlyTotal && row.monthlyTotal > row.recommendedPlan.price && (
                        <div className="text-xs text-amber-600 font-medium mt-0.5">
                          月总额 {row.monthlyTotal}元（含搭载）
                        </div>
                      )}
                      {row.bundledInfo && (
                        <div className="text-[10px] text-orange-600 mt-0.5 max-w-[200px] truncate" title={row.bundledInfo}>
                          ⚠ {row.bundledInfo}
                        </div>
                      )}
                      {row.selectionMode === 'manual' && (
                        <span className="text-xs text-sky-600">已人工校正</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-slate-500">{row.user.currentPrice}元</span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                        <span className={saving >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                          {recPrice}元
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
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden p-4 space-y-3">
          {paginatedResults.map((row, idx) => {
            const recPrice = row.monthlyTotal || row.recommendedPlan.price;
            const saving = row.user.currentPrice - recPrice;
            return (
              <div
                key={row.id ?? idx}
                className="border border-slate-200 rounded-xl overflow-hidden"
              >
                <div className="px-4 py-3 bg-slate-50 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-slate-900 text-sm">
                      {row.user.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')}
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-1">
                      {row.user.province}
                      {row.user.carrier && row.user.carrier !== '移动' && (
                        <span className="bg-orange-100 text-orange-700 px-1 py-0.5 rounded text-[10px]">{row.user.carrier}</span>
                      )}
                      {row.user.customerType && (
                        <span className="bg-purple-100 text-purple-700 px-1 py-0.5 rounded text-[10px]">{row.user.customerType}</span>
                      )}
                    </div>
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
                        {recPrice}元
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
              </div>
            );
          })}
        </div>

        {/* Pagination */}
        <Pagination
          current={currentPage}
          total={filteredResults.length}
          pageSize={pageSize}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          onPageChange={setCurrentPage}
          onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
        />
      </motion.div>
    </div>
  );
};

export default Dashboard;
