import React, { useMemo, useState } from 'react';
import { RecommendationResult, ReviewStatus } from '../types';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { exportResults } from '../utils/excel';

interface DashboardProps {
  results: RecommendationResult[];
  onViewDetail: (result: RecommendationResult) => void;
}

const COLORS = ['#0ea5e9', '#22c55e', '#f59e0b', '#ef4444'];
const REVIEW_STATUS_META: Record<ReviewStatus, { label: string; className: string }> = {
  pending: { label: '待确认', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  accepted: { label: '已接受', className: 'bg-green-50 text-green-700 border-green-200' },
  rejected: { label: '已驳回', className: 'bg-red-50 text-red-700 border-red-200' },
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
    const distData = Object.keys(distMap).map(k => ({ name: k, value: distMap[k] })).sort((a,b) => b.value - a.value).slice(0, 5);

    return { total, riskHigh, pendingCount, distData };
  }, [results]);

  const filteredResults = useMemo(() => {
    return results.filter(r => {
        const matchesProv = filterProv === 'all' || r.user.province === filterProv;
        const matchesSearch = r.user.phone.includes(searchTerm) || r.recommendedPlan.name.includes(searchTerm);
        return matchesProv && matchesSearch;
    });
  }, [results, filterProv, searchTerm]);

  // Unique provinces for filter
  const provinces = useMemo(() => Array.from(new Set(results.map(r => r.user.province))).filter(Boolean), [results]);

  if (results.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-lg border border-dashed border-slate-300">
        <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-slate-900">暂无分析数据</h3>
        <p className="mt-1 text-sm text-slate-500">请前往导入页面上传用户清单进行分析。</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
          <p className="text-sm text-slate-500">分析用户总数</p>
          <p className="text-2xl font-bold text-slate-800">{stats?.total}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
          <p className="text-sm text-slate-500">高风险适配数</p>
          <p className="text-2xl font-bold text-red-500">{stats?.riskHigh}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
          <p className="text-sm text-slate-500">待人工确认</p>
          <p className="text-2xl font-bold text-amber-500">{stats?.pendingCount} <span className="text-sm font-normal text-slate-400">户</span></p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="lg:col-span-1 bg-white p-4 rounded-lg shadow-sm border border-slate-200">
            <h3 className="text-sm font-semibold mb-4">推荐套餐分布 (Top 5)</h3>
            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie data={stats?.distData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} fill="#8884d8" paddingAngle={5} dataKey="value">
                            {stats?.distData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip />
                    </PieChart>
                </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-2 justify-center mt-2">
                {stats?.distData.map((d, i) => (
                    <div key={d.name} className="flex items-center text-xs text-slate-500">
                        <span className="w-2 h-2 rounded-full mr-1" style={{background: COLORS[i % COLORS.length]}}></span>
                        {d.name}
                    </div>
                ))}
            </div>
        </div>

        {/* Table & Controls */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-slate-200 flex flex-col">
            <div className="p-4 border-b border-slate-100 flex flex-wrap gap-3 justify-between items-center">
                <div className="flex gap-2">
                    <select 
                        className="text-sm border rounded-md px-2 py-1.5 focus:outline-none focus:border-brand-500"
                        value={filterProv}
                        onChange={(e) => setFilterProv(e.target.value)}
                    >
                        <option value="all">所有地区</option>
                        {provinces.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <input 
                        type="text" 
                        placeholder="搜索手机号/套餐..." 
                        className="text-sm border rounded-md px-2 py-1.5 focus:outline-none focus:border-brand-500 w-48"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <button 
                    onClick={() => exportResults(filteredResults)}
                    className="bg-brand-600 hover:bg-brand-700 text-white text-sm px-4 py-1.5 rounded-md flex items-center gap-2"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                    导出最终结果
                </button>
            </div>
            
            <div className="overflow-auto custom-scroll flex-1 max-h-[500px]">
                <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 sticky top-0 z-10">
                        <tr>
                            <th className="px-4 py-3 font-semibold text-slate-700">用户</th>
                            <th className="px-4 py-3 font-semibold text-slate-700">推荐方案</th>
                            <th className="px-4 py-3 font-semibold text-slate-700">审核状态</th>
                            <th className="px-4 py-3 font-semibold text-slate-700">核心理由</th>
                            <th className="px-4 py-3 font-semibold text-slate-700 w-24">操作</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredResults.map((row, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                                <td className="px-4 py-3">
                                    <div className="font-medium text-slate-900">{row.user.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')}</div>
                                    <div className="text-xs text-slate-500">
                                        现: {row.user.currentPrice}元 | {row.user.hasBroadband ? `${row.user.broadbandSpeed}M宽` : '无宽'}
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="font-medium text-brand-600">{row.recommendedPlan.name}</div>
                                    <div className="text-xs">
                                        {row.recommendedPlan.price}元 | {row.recommendedPlan.hasBroadband ? `${row.recommendedPlan.broadbandSpeed}M` : '无宽'}
                                    </div>
                                    {row.selectionMode === 'manual' && (
                                        <div className="text-xs text-sky-600 mt-1">已人工校正</div>
                                    )}
                                </td>
                                <td className="px-4 py-3">
                                    <span className={`inline-flex items-center rounded-full border px-2 py-1 text-xs font-medium ${REVIEW_STATUS_META[row.reviewStatus].className}`}>
                                        {REVIEW_STATUS_META[row.reviewStatus].label}
                                    </span>
                                    {row.reviewNote && (
                                        <div className="text-xs text-slate-500 mt-1 max-w-[180px] truncate" title={row.reviewNote}>
                                            {row.reviewNote}
                                        </div>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-xs leading-relaxed">
                                    {row.riskLevel === 'high' && <span className="inline-block bg-red-100 text-red-700 px-1 rounded mr-1">风险</span>}
                                    {row.reason}
                                </td>
                                <td className="px-4 py-3">
                                    <button 
                                        onClick={() => onViewDetail(row)}
                                        className="text-brand-600 hover:text-brand-800 font-medium text-xs border border-brand-200 px-2 py-1 rounded hover:bg-brand-50"
                                    >
                                        详情
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
