import React from 'react';
import { RecommendationResult, UserRecord, TariffPlan } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface UserDetailProps {
    result: RecommendationResult;
    onBack: () => void;
}

const UserDetail: React.FC<UserDetailProps> = ({ result, onBack }) => {
    const { user, recommendedPlan, reason, script, saveAmount } = result;

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
        { name: '流量(GB)', Current: user.avgData, Recommended: recommendedPlan.data }, // Comparing usage vs limit isn't quite right, but good for visual
        { name: '语音(分)', Current: user.avgVoice, Recommended: recommendedPlan.voice },
    ];

    return (
        <div className="space-y-6">
            <button onClick={onBack} className="flex items-center text-slate-500 hover:text-slate-800 transition-colors">
                <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                返回列表
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: User & Plan Comparison */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                            <div>
                                <h2 className="text-lg font-bold text-slate-800">多维度对比分析</h2>
                                <p className="text-sm text-slate-500">用户: {user.phone} ({user.province})</p>
                            </div>
                            <div className="text-right">
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
                            <ComparisonRow label="近三月ARPU" current={user.arpu3Month} recommended={result.predictedBill} unit="元 (预计)" />
                            
                            <ComparisonRow label="流量资源" 
                                current={`${user.avgData}G (用量)`} 
                                recommended={recommendedPlan.data} unit="GB (含量)" 
                            />
                            
                            <ComparisonRow label="语音资源" 
                                current={`${user.avgVoice}分 (用量)`} 
                                recommended={recommendedPlan.voice} unit="分钟 (含量)" 
                            />
                            
                            <ComparisonRow label="宽带服务" 
                                current={user.hasBroadband ? `${user.broadbandSpeed}M` : '无'} 
                                recommended={recommendedPlan.hasBroadband ? `${recommendedPlan.broadbandSpeed}M` : '无'} 
                            />
                            
                            <ComparisonRow label="FTTR (全光WiFi)" 
                                current={user.isFTTR ? '是' : '否'} 
                                recommended={recommendedPlan.isFTTR ? '是' : '否'} 
                            />
                        </div>
                    </div>

                    {/* Chart */}
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

                {/* Right: AI Script & Action */}
                <div className="space-y-6">
                    <div className="bg-gradient-to-b from-brand-50 to-white rounded-lg shadow-sm border border-brand-100 p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="bg-brand-500 text-white p-1.5 rounded-md">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg>
                            </div>
                            <h3 className="text-lg font-bold text-brand-900">AI 推荐话术</h3>
                        </div>
                        <div className="bg-white border border-brand-100 rounded-md p-4 text-slate-700 leading-relaxed text-sm shadow-sm relative">
                            <svg className="absolute top-2 left-2 w-4 h-4 text-slate-200 transform -scale-x-100" fill="currentColor" viewBox="0 0 24 24"><path d="M14.017 21L14.017 18C14.017 16.8954 13.1216 16 12.017 16H9C9.00001 15 9.00001 14.0007 9 13.0007C9 9.68708 11.6863 7.00073 15 7.00073C15.2956 7.00073 15.5847 7.02651 15.8638 7.07615C16.3129 7.77797 17.0862 8.24354 17.9673 8.24354C19.6241 8.24354 20.9673 6.90039 20.9673 5.24354C20.9673 3.58668 19.6241 2.24354 17.9673 2.24354C16.8687 2.24354 15.9082 2.82772 15.3676 3.71261C14.9366 3.23849 14.3312 2.89862 13.6521 2.76865C13.2982 2.70093 12.9157 2.65682 12.5186 2.65682C6.99577 2.65682 2.51855 7.13404 2.51855 12.6568V15C2.51855 16.1046 3.41399 17 4.51855 17H9C10.1046 17 11 17.8954 11 19V21H14.017Z" /></svg>
                            <div className="pl-4 italic">
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
                            {result.alternatives.map(plan => (
                                <div key={plan.id} className="p-3 border border-slate-100 rounded hover:bg-slate-50 transition cursor-pointer">
                                    <div className="flex justify-between items-center">
                                        <div className="font-medium text-sm text-slate-800">{plan.name}</div>
                                        <div className="text-brand-600 font-bold text-sm">¥{plan.price}</div>
                                    </div>
                                    <div className="text-xs text-slate-500 mt-1 flex gap-2">
                                        <span>{plan.data}G</span>
                                        <span>{plan.voice}分</span>
                                        {plan.hasBroadband && <span className="bg-blue-50 text-blue-600 px-1 rounded">{plan.broadbandSpeed}M宽</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserDetail;