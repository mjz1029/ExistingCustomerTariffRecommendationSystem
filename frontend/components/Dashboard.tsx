import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, AlertTriangle, ClipboardCheck, Search, ChevronDown, ArrowRight, Download } from 'lucide-react';
import { RecommendationResult, ReviewStatus } from '../types';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { recommendationsApi } from '../services/api';

interface DashboardProps {
  results: RecommendationResult[];
  onViewDetail: (result: RecommendationResult) => void;
}

const COLORS = ['#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];
const REVIEW_STATUS_META: Record<ReviewStatus, { label: string; dotColor: string; bgColor: string; textColor: string }> = {
  pending: { label: '待确认', dotColor: 'bg-amber-500', bgColor: 'bg-amber-50', textColor: 'text-amber-700' },
  accepted: { label: '已接受', dotColor: 'bg-green-500', bgColor: 'bg-green-50', textColor: 'text-green-700' },
  rejected: { label: '已驳回', dotColor: 'bg-red-500', bgColor: 'bg-red-50', textColor: 'text-red-700' },
};

// Animated counter hook
function useAnimatedCounter(target: number, duration: number = 1500) {
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

      // Ease out cubic
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

// Custom tooltip for pie chart
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white px-4 py-3 rounded-xl shadow-lg border border-slate-100">
        <p className="font-medium text-slate-800">{payload[0].name}</p>
        <p className="text-sm text-slate-500 mt-1">
          <span className="font-semibold text-brand-600">{payload[0].value}</span> 个用户
        </p>
      </div>
    );
  }
  return null;
};

// Stats card component
const StatsCard: React.FC<{
  title: string;
  value: number;
  icon: React.ReactNode;
  gradient: string;
  delay: number;
}> = ({ title, value, icon, gradient, delay }) => {
  const animatedValue = useAnimatedCounter(value);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className={`${gradient} rounded-xl p-6 text-white shadow-lg cursor-default`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium opacity-90">{title}</p>
          <p className="text-3xl font-bold mt-2">{animatedValue.toLocaleString()}</p>
        </div>
        <div className="p-3 bg-white/20 rounded-lg">
          {icon}
        </div>
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

    // Distribution by recommended plan
    const distMap: Record<string, number> = {};
    results.forEach(r => {
      distMap[r.recommendedPlan.name] = (distMap[r.recommendedPlan.name] || 0) + 1;
    });
    const distData = Object.keys(distMap)
      .map(k => ({ name: k, value: distMap[k] }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    return { total, riskHigh, pendingCount, distData };
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

  // Unique provinces for filter
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
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <StatsCard
          title="总用户数"
          value={stats?.total ?? 0}
          icon={<Users className="w-6 h-6 text-white" />}
          gradient="bg-gradient-to-br from-brand-500 to-brand-600"
          delay={0}
        />
        <StatsCard
          title="高风险用户"
          value={stats?.riskHigh ?? 0}
          icon={<AlertTriangle className="w-6 h-6 text-white" />}
          gradient="bg-gradient-to-br from-amber-500 to-amber-600"
          delay={0.1}
        />
        <StatsCard
          title="待审核"
          value={stats?.pendingCount ?? 0}
          icon={<ClipboardCheck className="w-6 h-6 text-white" />}
          gradient="bg-gradient-to-br from-purple-500 to-purple-600"
          delay={0.2}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="lg:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-slate-200"
        >
          <h3 className="text-sm font-semibold text-slate-800 mb-4">推荐套餐分布 (Top 5)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats?.distData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                >
                  {stats?.distData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-3 justify-center mt-4">
            {stats?.distData.map((d, i) => (
              <div key={d.name} className="flex items-center text-xs text-slate-600">
                <span
                  className="w-2.5 h-2.5 rounded-full mr-1.5"
                  style={{ background: COLORS[i % COLORS.length] }}
                />
                {d.name}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Table & Controls */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col"
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
            <button
              onClick={() => window.open(recommendationsApi.exportUrl())}
              className="flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm px-4 py-2 rounded-lg transition-colors shadow-sm"
            >
              <Download className="w-4 h-4" />
              导出最终结果
            </button>
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-auto custom-scroll flex-1 max-h-[500px]">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 font-semibold text-slate-700">用户</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">推荐方案</th>
                  <th className="px-6 py-3 font-semibold text-slate-700">审核状态</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">核心理由</th>
                  <th className="px-4 py-3 font-semibold text-slate-700 w-24">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredResults.map((row, idx) => (
                  <motion.tr
                    key={idx}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3, delay: idx * 0.02 }}
                    className={`group hover:bg-brand-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">
                        {row.user.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')}
                      </div>
                      <div className="text-xs text-slate-500">
                        现: {row.user.currentPrice}元 | {row.user.hasBroadband ? `${row.user.broadbandSpeed}M宽` : '无宽'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-brand-600">{row.recommendedPlan.name}</div>
                      <div className="text-xs text-slate-500">
                        {row.recommendedPlan.price}元 | {row.recommendedPlan.hasBroadband ? `${row.recommendedPlan.broadbandSpeed}M` : '无宽'}
                      </div>
                      {row.selectionMode === 'manual' && (
                        <div className="text-xs text-sky-600 mt-1">已人工校正</div>
                      )}
                    </td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${REVIEW_STATUS_META[row.reviewStatus].bgColor} ${REVIEW_STATUS_META[row.reviewStatus].textColor}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${REVIEW_STATUS_META[row.reviewStatus].dotColor}`} />
                        {REVIEW_STATUS_META[row.reviewStatus].label}
                      </span>
                      {row.reviewNote && (
                        <div className="text-xs text-slate-500 mt-1 max-w-[180px] truncate" title={row.reviewNote}>
                          {row.reviewNote}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs leading-relaxed">
                      {row.riskLevel === 'high' && (
                        <span className="inline-block bg-red-100 text-red-700 px-1.5 py-0.5 rounded mr-1 font-medium">
                          风险
                        </span>
                      )}
                      {row.reason}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => onViewDetail(row)}
                        className="inline-flex items-center gap-1 text-brand-600 hover:text-brand-800 font-medium text-xs border border-brand-200 px-3 py-1.5 rounded-lg hover:bg-brand-50 transition-colors group/btn"
                      >
                        查看
                        <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover/btn:translate-x-0.5" />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden overflow-auto custom-scroll flex-1 max-h-[500px] p-4 space-y-3">
            {filteredResults.map((row, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.05 }}
                className="border border-slate-200 rounded-xl p-4 hover:border-brand-200 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-medium text-slate-900">
                      {row.user.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {row.user.province} | 现: {row.user.currentPrice}元
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${REVIEW_STATUS_META[row.reviewStatus].bgColor} ${REVIEW_STATUS_META[row.reviewStatus].textColor}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${REVIEW_STATUS_META[row.reviewStatus].dotColor}`} />
                    {REVIEW_STATUS_META[row.reviewStatus].label}
                  </span>
                </div>

                <div className="bg-brand-50 rounded-lg p-3 mb-3">
                  <div className="text-xs text-slate-500 mb-1">推荐方案</div>
                  <div className="font-medium text-brand-700">{row.recommendedPlan.name}</div>
                  <div className="text-xs text-slate-600 mt-1">
                    {row.recommendedPlan.price}元/月 | {row.recommendedPlan.hasBroadband ? `${row.recommendedPlan.broadbandSpeed}M宽带` : '无宽带'}
                  </div>
                  {row.selectionMode === 'manual' && (
                    <div className="text-xs text-sky-600 mt-1">已人工校正</div>
                  )}
                </div>

                <div className="text-xs text-slate-600 mb-3">
                  {row.riskLevel === 'high' && (
                    <span className="inline-block bg-red-100 text-red-700 px-1.5 py-0.5 rounded mr-1 font-medium">
                      风险
                    </span>
                  )}
                  {row.reason}
                </div>

                <button
                  onClick={() => onViewDetail(row)}
                  className="w-full flex items-center justify-center gap-1.5 text-brand-600 hover:text-brand-800 font-medium text-sm border border-brand-200 px-3 py-2 rounded-lg hover:bg-brand-50 transition-colors"
                >
                  查看详情
                  <ArrowRight className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
