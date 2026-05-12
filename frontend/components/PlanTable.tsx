import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Pencil, Trash2, Upload, Download, X, FileSpreadsheet, CheckCircle2 } from 'lucide-react';
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
  const [isDragOver, setIsDragOver] = useState(false);
  const [importedFileName, setImportedFileName] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const initialPlanState: Partial<TariffPlan> = {
    name: '', price: 0, data: 0, voice: 0,
    hasBroadband: false, broadbandSpeed: 0, isFTTR: false,
    isActive: true, extras: ''
  };

  const [formData, setFormData] = useState<Partial<TariffPlan>>(initialPlanState);

  const processImportFile = useCallback(async (file: File) => {
    const confirmed = window.confirm(
      `本次将使用 Excel 中的套餐清单全量覆盖当前本地套餐库（当前共 ${plans.length} 条），并清空已生成的推荐结果。是否继续？`
    );
    if (!confirmed) return;

    setIsImporting(true);
    setImportedFileName(null);
    try {
      const importedPlans = await parsePlanExcelFile(file);
      onImport(importedPlans);
      setImportedFileName(file.name);
      alert(`套餐导入成功，共导入 ${importedPlans.length} 条套餐。历史分析结果已清空，请重新导入用户数据。`);
    } catch (error) {
      const message = error instanceof Error ? error.message : '套餐导入失败，请检查模板和数据内容。';
      alert(message);
    } finally {
      setIsImporting(false);
    }
  }, [plans.length, onImport]);

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    await processImportFile(file);
  };

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
      await processImportFile(file);
    }
  }, [processImportFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name && formData.price) {
      setIsSaving(true);
      await new Promise(r => setTimeout(r, 300));
      if (editingId) {
        onEdit({ ...formData, id: editingId } as TariffPlan);
      } else {
        onAdd(formData as Omit<TariffPlan, 'id'>);
      }
      setIsSaving(false);
      setIsModalOpen(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
    >
      {/* Header */}
      <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">套餐目录管理</h2>
          <p className="text-sm text-slate-500 mt-0.5">维护用于推荐的本地套餐数据库</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={openAddModal}
          className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 shadow-sm shadow-brand-200"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">新增套餐</span>
          <span className="sm:hidden">新增</span>
        </motion.button>
      </div>

      {/* Import Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        className="px-6 py-5 border-b border-slate-100 bg-gradient-to-br from-slate-50/80 to-white"
      >
        <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6">
          <div>
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-brand-500" />
              Excel 全量导入套餐
            </h3>
            <p className="text-sm text-slate-500 mt-1 leading-6">
              适合批量维护完整套餐库。上传时会用 Excel 中的套餐清单全量覆盖当前本地套餐数据，并清空现有推荐结果。
            </p>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-600">
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 space-y-1.5">
                <div className="font-semibold text-slate-700 mb-1">上传前提示</div>
                <div className="flex items-start gap-1.5"><span className="text-brand-400 mt-0.5">&bull;</span>请先下载标准模板，严格按模板表头填写。</div>
                <div className="flex items-start gap-1.5"><span className="text-brand-400 mt-0.5">&bull;</span>"套餐编码、套餐名称、资费、流量、语音、是否含宽带"为必填项。</div>
                <div className="flex items-start gap-1.5"><span className="text-brand-400 mt-0.5">&bull;</span>含宽带套餐必须填写大于 0 的宽带速率，FTTR 套餐必须同时包含宽带。</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 space-y-1.5">
                <div className="font-semibold text-slate-700 mb-1">导入影响</div>
                <div className="flex items-start gap-1.5"><span className="text-amber-400 mt-0.5">&bull;</span>本地套餐库会被全量替换，不做增量合并。</div>
                <div className="flex items-start gap-1.5"><span className="text-amber-400 mt-0.5">&bull;</span>已生成的推荐结果会被清空，需重新导入用户数据后再分析。</div>
                <div className="flex items-start gap-1.5"><span className="text-amber-400 mt-0.5">&bull;</span>建议先确认 Excel 中不存在重复套餐编码。</div>
              </div>
            </div>
          </div>

          {/* Drop Zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`rounded-xl border-2 border-dashed p-6 flex flex-col items-center justify-center text-center transition-all duration-200 ${
              isDragOver
                ? 'border-brand-400 bg-brand-50 scale-[1.02]'
                : importedFileName
                  ? 'border-green-300 bg-green-50/50'
                  : 'border-slate-200 bg-white hover:border-brand-300 hover:bg-brand-50/30'
            }`}
          >
            {importedFileName ? (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex flex-col items-center gap-2"
              >
                <CheckCircle2 className="w-8 h-8 text-green-500" />
                <div className="text-sm font-medium text-green-700">导入成功</div>
                <div className="text-xs text-green-600 truncate max-w-[200px]">{importedFileName}</div>
              </motion.div>
            ) : (
              <>
                <Upload className={`w-8 h-8 mb-2 transition-colors ${isDragOver ? 'text-brand-500' : 'text-slate-400'}`} />
                <div className="text-sm font-medium text-slate-600">
                  {isDragOver ? '释放文件即可导入' : '拖拽 Excel 文件到此处'}
                </div>
                <div className="text-xs text-slate-400 mt-1">支持 .xlsx、.xls 格式</div>
              </>
            )}

            <div className="mt-4 flex flex-col gap-2 w-full">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={generatePlanTemplate}
                className="w-full rounded-lg border border-brand-200 bg-brand-50 px-4 py-2.5 text-sm font-medium text-brand-700 hover:bg-brand-100 transition-colors flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                下载标准模板
              </motion.button>
              <motion.label
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`w-full rounded-lg px-4 py-2.5 text-sm font-medium text-center transition-all flex items-center justify-center gap-2 ${
                  isImporting
                    ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                    : 'bg-brand-600 text-white hover:bg-brand-700 cursor-pointer shadow-sm shadow-brand-200'
                }`}
              >
                <Upload className="w-4 h-4" />
                {isImporting ? '导入中...' : '上传全量套餐 Excel'}
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  className="hidden"
                  onChange={handleImportFile}
                  disabled={isImporting}
                />
              </motion.label>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Desktop Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="hidden md:block overflow-x-auto"
      >
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="bg-slate-50 text-slate-700 text-xs uppercase tracking-wider border-b border-slate-200 sticky top-0 z-10">
            <tr>
              <th className="px-5 py-3.5 font-semibold">套餐名称</th>
              <th className="px-5 py-3.5 font-semibold">资费</th>
              <th className="px-5 py-3.5 font-semibold">流量/语音</th>
              <th className="px-5 py-3.5 font-semibold">宽带权益</th>
              <th className="px-5 py-3.5 font-semibold">FTTR</th>
              <th className="px-5 py-3.5 font-semibold">状态</th>
              <th className="px-5 py-3.5 font-semibold text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {plans.map((plan, i) => (
              <motion.tr
                key={plan.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 * Math.min(i, 10) }}
                className="group hover:bg-brand-50/50 transition-colors border-l-2 border-l-transparent hover:border-l-brand-500"
              >
                <td className="px-5 py-4 font-medium text-slate-900">{plan.name}</td>
                <td className="px-5 py-4">
                  <span className="text-brand-600 font-bold text-base">{plan.price}</span>
                  <span className="text-xs text-slate-400 ml-0.5">元/月</span>
                </td>
                <td className="px-5 py-4">
                  <div className="font-medium">{plan.data} GB</div>
                  <div className="text-xs text-slate-400">{plan.voice} 分钟</div>
                </td>
                <td className="px-5 py-4">
                  {plan.hasBroadband ? (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                      {plan.broadbandSpeed}M 宽带
                    </span>
                  ) : <span className="text-slate-300">&ndash;</span>}
                  {plan.extras && <div className="text-xs text-slate-400 mt-1 truncate max-w-[150px]" title={plan.extras}>{plan.extras}</div>}
                </td>
                <td className="px-5 py-4">
                  {plan.isFTTR ? (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-purple-50 text-purple-700 border border-purple-100">
                      FTTR
                    </span>
                  ) : <span className="text-slate-300">&ndash;</span>}
                </td>
                <td className="px-5 py-4">
                  <button
                    onClick={() => onToggle(plan.id)}
                    aria-label={plan.isActive ? '停用套餐' : '启用套餐'}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                      plan.isActive ? 'bg-green-500' : 'bg-slate-300'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                      plan.isActive ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </td>
                <td className="px-5 py-4 text-right">
                  <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => openEditModal(plan)}
                      className="p-2 rounded-lg text-brand-600 hover:bg-brand-50 transition-colors"
                      title="编辑"
                      aria-label="编辑套餐"
                    >
                      <Pencil className="w-4 h-4" />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => onDelete(plan.id)}
                      className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                      title="删除"
                      aria-label="删除套餐"
                    >
                      <Trash2 className="w-4 h-4" />
                    </motion.button>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
        {plans.length === 0 && (
          <div className="py-16 text-center text-slate-400">
            <FileSpreadsheet className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <div className="text-sm">暂无套餐数据</div>
            <div className="text-xs mt-1">点击&ldquo;新增套餐&rdquo;或导入 Excel 开始</div>
          </div>
        )}
      </motion.div>

      {/* Mobile Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="md:hidden divide-y divide-slate-100"
      >
        {plans.map((plan, i) => (
          <motion.div
            key={plan.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * Math.min(i, 10) }}
            className="p-4 space-y-3"
          >
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-semibold text-slate-900">{plan.name}</h4>
                <div className="mt-1">
                  <span className="text-brand-600 font-bold text-lg">{plan.price}</span>
                  <span className="text-xs text-slate-400 ml-0.5">元/月</span>
                </div>
              </div>
              <button
                onClick={() => onToggle(plan.id)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  plan.isActive ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-100 text-slate-500 border-slate-200'
                }`}
              >
                {plan.isActive ? '销售中' : '已下架'}
              </button>
            </div>

            <div className="flex flex-wrap gap-2 text-xs">
              <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600">{plan.data} GB</span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600">{plan.voice} 分钟</span>
              {plan.hasBroadband && (
                <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-100">{plan.broadbandSpeed}M 宽带</span>
              )}
              {plan.isFTTR && (
                <span className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 border border-purple-100">FTTR</span>
              )}
            </div>

            {plan.extras && (
              <div className="text-xs text-slate-400 truncate">{plan.extras}</div>
            )}

            <div className="flex gap-2 pt-1">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => openEditModal(plan)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-brand-200 text-brand-600 text-xs font-medium hover:bg-brand-50 transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
                编辑
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => onDelete(plan.id)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-red-200 text-red-500 text-xs font-medium hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                删除
              </motion.button>
            </div>
          </motion.div>
        ))}
        {plans.length === 0 && (
          <div className="py-16 text-center text-slate-400">
            <FileSpreadsheet className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <div className="text-sm">暂无套餐数据</div>
          </div>
        )}
      </motion.div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setIsModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between p-6 pb-0">
                <h3 className="text-lg font-bold text-slate-900">{editingId ? '编辑套餐' : '新增套餐'}</h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label="关闭"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">套餐名称</label>
                  <input
                    required
                    type="text"
                    className="block w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none transition-all"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="输入套餐名称"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">资费(元/月)</label>
                    <input
                      required
                      type="number"
                      className="block w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none transition-all"
                      value={formData.price}
                      onChange={e => setFormData({ ...formData, price: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">流量(GB)</label>
                    <input
                      required
                      type="number"
                      className="block w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none transition-all"
                      value={formData.data}
                      onChange={e => setFormData({ ...formData, data: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">语音(分)</label>
                    <input
                      required
                      type="number"
                      className="block w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none transition-all"
                      value={formData.voice}
                      onChange={e => setFormData({ ...formData, voice: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4">
                  <h4 className="text-sm font-semibold text-slate-800">宽带与权益</h4>
                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2.5 cursor-pointer group">
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                        formData.hasBroadband ? 'bg-brand-600 border-brand-600' : 'border-slate-300 group-hover:border-brand-400'
                      }`}>
                        {formData.hasBroadband && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={formData.hasBroadband}
                        onChange={e => setFormData({ ...formData, hasBroadband: e.target.checked })}
                      />
                      <span className="text-sm text-slate-700">包含宽带</span>
                    </label>

                    <label className="flex items-center gap-2.5 cursor-pointer group">
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                        formData.isFTTR ? 'bg-brand-600 border-brand-600' : 'border-slate-300 group-hover:border-brand-400'
                      }`}>
                        {formData.isFTTR && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={formData.isFTTR}
                        onChange={e => setFormData({ ...formData, isFTTR: e.target.checked })}
                      />
                      <span className="text-sm text-slate-700">包含FTTR (全光WiFi)</span>
                    </label>
                  </div>

                  <AnimatePresence>
                    {formData.hasBroadband && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">宽带速率 (Mbps)</label>
                        <input
                          type="number"
                          placeholder="如: 500"
                          className="block w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none transition-all"
                          value={formData.broadbandSpeed}
                          onChange={e => setFormData({ ...formData, broadbandSpeed: Number(e.target.value) })}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">其它权益备注 (会员/监控等)</label>
                    <input
                      type="text"
                      className="block w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none transition-all"
                      value={formData.extras}
                      onChange={e => setFormData({ ...formData, extras: e.target.value })}
                      placeholder="可选"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl text-sm font-medium transition-colors"
                  >
                    取消
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={isSaving}
                    className="px-5 py-2.5 bg-brand-600 text-white rounded-xl hover:bg-brand-700 text-sm font-medium shadow-sm shadow-brand-200 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  >
                    {isSaving ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                          className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                        />
                        保存中...
                      </>
                    ) : '保存'}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default PlanTable;
