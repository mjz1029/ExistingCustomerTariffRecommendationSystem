import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Loader2, Check, X, Save, Eye, EyeOff, Settings2 } from 'lucide-react';
import type { AIProviderConfig, AIProtocol } from '../types';
import { aiApi } from '../services/api';

interface AISettingsProps {
  config: AIProviderConfig;
  onSave: (config: AIProviderConfig) => void;
}

const protocolPresets: Record<AIProtocol, { endpointPath: string }> = {
  responses: { endpointPath: '/v1/responses' },
  'chat-completions': { endpointPath: '/v1/chat/completions' },
  anthropic: { endpointPath: '/v1/messages' },
};

const protocolOptions: Array<{ value: AIProtocol; label: string; desc: string; icon: string }> = [
  { value: 'responses', label: 'Responses API', desc: '适合 OpenAI 官方新接口，输入输出结构更统一。', icon: '⚡' },
  { value: 'chat-completions', label: 'Chat Completions', desc: '适合大多数第三方兼容 OpenAI 协议的网关。', icon: '💬' },
  { value: 'anthropic', label: 'Anthropic Messages', desc: '适合 Claude 系列模型，使用 x-api-key 鉴权。', icon: '🧠' },
];

const AISettings: React.FC<AISettingsProps> = ({ config, onSave }) => {
  const [draft, setDraft] = useState(config);
  const [saveMessage, setSaveMessage] = useState('');
  const [testMessage, setTestMessage] = useState('');
  const [testStatus, setTestStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    setDraft(config);
  }, [config]);

  const setField = <K extends keyof AIProviderConfig>(key: K, value: AIProviderConfig[K]) => {
    setDraft(prev => ({ ...prev, [key]: value }));
    setSaveMessage('');
    setTestMessage('');
    setTestStatus('idle');
  };

  const endpointPreview = useMemo(() => {
    const base = draft.baseUrl.trim().replace(/\/+$/, '');
    const path = draft.endpointPath.trim().startsWith('/') ? draft.endpointPath.trim() : `/${draft.endpointPath.trim()}`;
    if (!base) return path;
    return `${base}${path}`;
  }, [draft.baseUrl, draft.endpointPath]);

  const applyProtocolPreset = (protocol: AIProtocol) => {
    setDraft(prev => ({
      ...prev,
      protocol,
      endpointPath: protocolPresets[protocol].endpointPath,
    }));
    setSaveMessage('');
    setTestMessage('');
    setTestStatus('idle');
  };

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise(r => setTimeout(r, 400));
    const normalized: AIProviderConfig = {
      ...draft,
      providerName: draft.providerName.trim(),
      baseUrl: draft.baseUrl.trim().replace(/\/+$/, ''),
      endpointPath: draft.endpointPath.trim().startsWith('/') ? draft.endpointPath.trim() : `/${draft.endpointPath.trim()}`,
      apiKey: draft.apiKey.trim(),
      model: draft.model.trim(),
    };
    onSave(normalized);
    setDraft(normalized);
    setSaveMessage('AI 接口配置已保存');
    setIsSaving(false);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestMessage('');
    setTestStatus('idle');

    try {
      const result = await aiApi.test(draft);
      setDraft(prev => ({ ...prev, enabled: true }));
      setTestMessage(`连接成功：${result.message}`);
      setTestStatus('success');
    } catch (error) {
      setTestMessage(error instanceof Error ? error.message : '连接测试失败');
      setTestStatus('error');
    } finally {
      setIsTesting(false);
    }
  };

  // Auto-clear test success message after 3s
  useEffect(() => {
    if (testStatus === 'success') {
      const timer = setTimeout(() => {
        setTestStatus('idle');
        setTestMessage('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [testStatus]);

  const sectionVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.1, duration: 0.4, ease: 'easeOut' },
    }),
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 bg-gradient-to-br from-slate-50 to-white">
          <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2.5">
            <Settings2 className="w-5 h-5 text-brand-500" />
            AI 接口设置
          </h2>
          <p className="text-sm text-slate-500 mt-1">统一管理话术生成所使用的 AI 提供商、协议、接口地址、API Key 和模型。</p>
        </div>

        <div className="p-6 space-y-6">
          {/* Enable Toggle */}
          <motion.div
            custom={0}
            variants={sectionVariants}
            initial="hidden"
            animate="visible"
            className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 px-5 py-4"
          >
            <div>
              <div className="text-sm font-semibold text-slate-800">启用 AI 话术生成</div>
              <div className="text-xs text-slate-500 mt-1">关闭后，用户详情页将只保留规则引擎生成的话术，不发起 API 请求。</div>
            </div>
            <button
              type="button"
              onClick={() => setField('enabled', !draft.enabled)}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-300 flex-shrink-0 ${
                draft.enabled ? 'bg-green-500' : 'bg-slate-300'
              }`}
            >
              <motion.span
                layout
                className={`inline-block h-5 w-5 rounded-full bg-white shadow-md ${
                  draft.enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            </button>
          </motion.div>

          {/* Provider & Model */}
          <motion.div
            custom={1}
            variants={sectionVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">提供商名称</label>
              <input
                type="text"
                value={draft.providerName}
                onChange={(e) => setField('providerName', e.target.value)}
                placeholder="例如：OpenAI / OneAPI / SiliconFlow"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">模型名称</label>
              <input
                type="text"
                value={draft.model}
                onChange={(e) => setField('model', e.target.value)}
                placeholder="例如：gpt-5.4-mini"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none transition-all"
              />
            </div>
          </motion.div>

          {/* Protocol Cards */}
          <motion.div
            custom={2}
            variants={sectionVariants}
            initial="hidden"
            animate="visible"
          >
            <div className="text-sm font-medium text-slate-700 mb-3">协议类型</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {protocolOptions.map((option) => {
                const isSelected = draft.protocol === option.value;
                return (
                  <motion.button
                    key={option.value}
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => applyProtocolPreset(option.value)}
                    className={`rounded-xl border-2 px-5 py-4 text-left transition-all duration-200 ${
                      isSelected
                        ? 'border-brand-600 bg-brand-50 shadow-lg shadow-brand-100/50'
                        : 'border-slate-200 bg-white hover:border-brand-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg">{option.icon}</span>
                      <div className="text-sm font-semibold text-slate-800">{option.label}</div>
                    </div>
                    <div className="text-xs text-slate-500 mt-2 leading-relaxed">{option.desc}</div>
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="mt-3 flex items-center gap-1.5 text-xs font-medium text-brand-600"
                      >
                        <Check className="w-3.5 h-3.5" />
                        当前选择
                      </motion.div>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>

          {/* URL Fields */}
          <motion.div
            custom={3}
            variants={sectionVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">基础地址 Base URL</label>
              <input
                type="text"
                value={draft.baseUrl}
                onChange={(e) => setField('baseUrl', e.target.value)}
                placeholder="例如：https://api.openai.com"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">请求接口路径</label>
              <input
                type="text"
                value={draft.endpointPath}
                onChange={(e) => setField('endpointPath', e.target.value)}
                placeholder={protocolPresets[draft.protocol]?.endpointPath ?? '/v1/chat/completions'}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none transition-all"
              />
            </div>
          </motion.div>

          {/* API Key */}
          <motion.div
            custom={4}
            variants={sectionVariants}
            initial="hidden"
            animate="visible"
          >
            <label className="block text-sm font-medium text-slate-700 mb-2">API Key</label>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={draft.apiKey}
                onChange={(e) => setField('apiKey', e.target.value)}
                placeholder="sk-..."
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 pr-11 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-500">API Key 将安全存储在后端数据库中，前端仅显示脱敏信息。</p>
          </motion.div>

          {/* Endpoint Preview */}
          <motion.div
            custom={5}
            variants={sectionVariants}
            initial="hidden"
            animate="visible"
            className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-4"
          >
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">请求预览</div>
            <div className="mt-2 text-sm text-slate-800 font-mono bg-white rounded-lg px-3 py-2 border border-slate-100 break-all">
              {endpointPreview}
            </div>
          </motion.div>

          {/* Actions Bar */}
          <motion.div
            custom={6}
            variants={sectionVariants}
            initial="hidden"
            animate="visible"
            className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2"
          >
            <div className="text-xs text-slate-500">
              Responses API 使用 input；Chat Completions 使用 messages；Anthropic 使用 x-api-key 鉴权。
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              {/* Test Connection Status */}
              <AnimatePresence>
                {testStatus !== 'idle' && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, x: 10 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.9, x: 10 }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${
                      testStatus === 'success'
                        ? 'bg-green-50 text-green-700 border border-green-200'
                        : 'bg-red-50 text-red-700 border border-red-200'
                    }`}
                  >
                    {testStatus === 'success' ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <X className="w-3.5 h-3.5" />
                    )}
                    <span className="max-w-[200px] truncate">{testMessage}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Save Status */}
              <AnimatePresence>
                {saveMessage && (
                  <motion.span
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-xs text-green-600 font-medium"
                  >
                    {saveMessage}
                  </motion.span>
                )}
              </AnimatePresence>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {isTesting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    测试中...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    测试连接
                  </>
                )}
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="px-5 py-2.5 bg-brand-600 text-white rounded-xl hover:bg-brand-700 text-sm font-medium shadow-sm shadow-brand-200 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    保存中...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    保存配置
                  </>
                )}
              </motion.button>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default AISettings;
