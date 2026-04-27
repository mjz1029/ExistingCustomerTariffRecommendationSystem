import React, { useState } from 'react';
import { TariffPlan } from '../types';
import { generatePlanTemplate, parsePlanExcelFile } from '../utils/excel';

interface PlanTableProps {
  plans: TariffPlan[];
  onAdd: (plan: Omit<TariffPlan, 'id'>) => void;
  onEdit: (plan: TariffPlan) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
  onImport: (plans: TariffPlan[]) => void;
}

const PlanTable: React.FC<PlanTableProps> = ({ plans, onAdd, onEdit, onDelete, onToggle, onImport }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  
  const initialPlanState: Partial<TariffPlan> = {
    name: '', price: 0, data: 0, voice: 0, 
    hasBroadband: false, broadbandSpeed: 0, isFTTR: false, 
    isActive: true, extras: ''
  };

  const [formData, setFormData] = useState<Partial<TariffPlan>>(initialPlanState);

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';

    if (!file) return;

    const confirmed = window.confirm(
      `本次将使用 Excel 中的套餐清单全量覆盖当前本地套餐库（当前共 ${plans.length} 条），并清空已生成的推荐结果。是否继续？`
    );

    if (!confirmed) return;

    setIsImporting(true);
    try {
      const importedPlans = await parsePlanExcelFile(file);
      onImport(importedPlans);
      alert(`套餐导入成功，共导入 ${importedPlans.length} 条套餐。历史分析结果已清空，请重新导入用户数据。`);
    } catch (error) {
      const message = error instanceof Error ? error.message : '套餐导入失败，请检查模板和数据内容。';
      alert(message);
    } finally {
      setIsImporting(false);
    }
  };

  const openAddModal = () => {
    setEditingId(null);
    setFormData(initialPlanState);
    setIsModalOpen(true);
  };

  const openEditModal = (plan: TariffPlan) => {
    setEditingId(plan.id);
    setFormData({ ...plan });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name && formData.price) {
      if (editingId) {
          // Edit Mode
          onEdit({ ...formData, id: editingId } as TariffPlan);
      } else {
          // Add Mode
          onAdd(formData as Omit<TariffPlan, 'id'>);
      }
      setIsModalOpen(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200">
      <div className="p-6 border-b border-slate-100 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">套餐目录管理</h2>
          <p className="text-sm text-slate-500">维护用于推荐的本地套餐数据库</p>
        </div>
        <button 
          onClick={openAddModal}
          className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
          新增套餐
        </button>
      </div>

      <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/70">
        <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Excel 全量导入套餐</h3>
            <p className="text-sm text-slate-500 mt-1 leading-6">
              适合批量维护完整套餐库。上传时会用 Excel 中的套餐清单全量覆盖当前本地套餐数据，并清空现有推荐结果。
            </p>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-600">
              <div className="rounded-md border border-slate-200 bg-white px-3 py-3 space-y-1">
                <div className="font-semibold text-slate-700 mb-1">上传前提示</div>
                <div>请先下载标准模板，严格按模板表头填写。</div>
                <div>“套餐编码、套餐名称、资费、流量、语音、是否含宽带”为必填项。</div>
                <div>含宽带套餐必须填写大于 0 的宽带速率，FTTR 套餐必须同时包含宽带。</div>
              </div>
              <div className="rounded-md border border-slate-200 bg-white px-3 py-3 space-y-1">
                <div className="font-semibold text-slate-700 mb-1">导入影响</div>
                <div>本地套餐库会被全量替换，不做增量合并。</div>
                <div>已生成的推荐结果会被清空，需重新导入用户数据后再分析。</div>
                <div>建议先确认 Excel 中不存在重复套餐编码。</div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-4 flex flex-col justify-center">
            <div className="text-sm font-semibold text-slate-800">导入操作</div>
            <div className="text-xs text-slate-500 mt-1">支持 `.xlsx`、`.xls`，默认读取第一个工作表。</div>
            <div className="mt-4 flex flex-col gap-3">
              <button
                type="button"
                onClick={generatePlanTemplate}
                className="w-full rounded-md border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-100"
              >
                下载标准模板
              </button>
              <label className={`w-full rounded-md px-4 py-2 text-sm font-medium text-center transition ${
                isImporting
                  ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                  : 'bg-brand-600 text-white hover:bg-brand-700 cursor-pointer'
              }`}>
                {isImporting ? '导入中...' : '上传全量套餐 Excel'}
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  className="hidden"
                  onChange={handleImportFile}
                  disabled={isImporting}
                />
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 text-slate-900 font-semibold border-b border-slate-200">
            <tr>
              <th className="px-4 py-4">套餐名称</th>
              <th className="px-4 py-4">资费</th>
              <th className="px-4 py-4">流量/语音</th>
              <th className="px-4 py-4">宽带权益</th>
              <th className="px-4 py-4">FTTR</th>
              <th className="px-4 py-4">状态</th>
              <th className="px-4 py-4 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {plans.map((plan) => (
              <tr key={plan.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-4 font-medium text-slate-900">{plan.name}</td>
                <td className="px-4 py-4 text-brand-600 font-bold">{plan.price}<span className="text-xs font-normal text-slate-500"> 元</span></td>
                <td className="px-4 py-4">
                    <div>{plan.data} GB</div>
                    <div className="text-xs text-slate-400">{plan.voice} 分钟</div>
                </td>
                <td className="px-4 py-4">
                   {plan.hasBroadband ? (
                       <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                           {plan.broadbandSpeed}M 宽带
                       </span>
                   ) : <span className="text-slate-300">-</span>}
                   {plan.extras && <div className="text-xs text-slate-400 mt-1 truncate max-w-[150px]" title={plan.extras}>{plan.extras}</div>}
                </td>
                <td className="px-4 py-4">
                    {plan.isFTTR ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                            FTTR
                        </span>
                    ) : <span className="text-slate-300">-</span>}
                </td>
                <td className="px-4 py-4">
                  <button 
                    onClick={() => onToggle(plan.id)}
                    className={`px-2 py-1 rounded-full text-xs font-medium border ${plan.isActive ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}
                  >
                    {plan.isActive ? '销售中' : '已下架'}
                  </button>
                </td>
                <td className="px-4 py-4 text-right space-x-2">
                  <button onClick={() => openEditModal(plan)} className="text-brand-600 hover:text-brand-800 font-medium">编辑</button>
                  <button onClick={() => onDelete(plan.id)} className="text-red-500 hover:text-red-700 font-medium">删除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">{editingId ? '编辑套餐' : '新增套餐'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">套餐名称</label>
                <input required type="text" className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none" 
                  value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">资费(元/月)</label>
                  <input required type="number" className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2" 
                    value={formData.price} onChange={e => setFormData({...formData, price: Number(e.target.value)})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">流量(GB)</label>
                  <input required type="number" className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2" 
                    value={formData.data} onChange={e => setFormData({...formData, data: Number(e.target.value)})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">语音(分)</label>
                  <input required type="number" className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2" 
                    value={formData.voice} onChange={e => setFormData({...formData, voice: Number(e.target.value)})} />
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-md border border-slate-100 space-y-3">
                  <h4 className="text-sm font-semibold text-slate-800">宽带与权益</h4>
                  <div className="flex items-center gap-6">
                      <label className="flex items-center space-x-2 cursor-pointer">
                          <input type="checkbox" className="rounded text-brand-600 focus:ring-brand-500"
                            checked={formData.hasBroadband} 
                            onChange={e => setFormData({...formData, hasBroadband: e.target.checked})} />
                          <span className="text-sm text-slate-700">包含宽带</span>
                      </label>
                      
                      <label className="flex items-center space-x-2 cursor-pointer">
                          <input type="checkbox" className="rounded text-brand-600 focus:ring-brand-500"
                            checked={formData.isFTTR} 
                            onChange={e => setFormData({...formData, isFTTR: e.target.checked})} />
                          <span className="text-sm text-slate-700">包含FTTR (全光WiFi)</span>
                      </label>
                  </div>
                  
                  {formData.hasBroadband && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700">宽带速率 (Mbps)</label>
                        <input type="number" placeholder="如: 500" className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2" 
                          value={formData.broadbandSpeed} onChange={e => setFormData({...formData, broadbandSpeed: Number(e.target.value)})} />
                      </div>
                  )}
                  
                  <div>
                     <label className="block text-sm font-medium text-slate-700">其它权益备注 (会员/监控等)</label>
                     <input type="text" className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2" 
                       value={formData.extras} onChange={e => setFormData({...formData, extras: e.target.value})} />
                  </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-md">取消</button>
                <button type="submit" className="px-4 py-2 bg-brand-600 text-white rounded-md hover:bg-brand-700">保存</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlanTable;
