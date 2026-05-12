import React, { useEffect, useMemo, useState } from 'react';
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

const protocolOptions: Array<{ value: AIProtocol; label: string; desc: string }> = [
  { value: 'responses', label: 'Responses API', desc: '适合 OpenAI 官方新接口，输入输出结构更统一。' },
  { value: 'chat-completions', label: 'Chat Completions', desc: '适合大多数第三方兼容 OpenAI 协议的网关。' },
  { value: 'anthropic', label: 'Anthropic Messages', desc: '适合 Claude 系列模型，使用 x-api-key 鉴权。' },
];

const AISettings: React.FC<AISettingsProps> = ({ config, onSave }) => {
  const [draft, setDraft] = useState(config);
  const [saveMessage, setSaveMessage] = useState('');
  const [testMessage, setTestMessage] = useState('');
  const [testStatus, setTestStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [isTesting, setIsTesting] = useState(false);

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

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-200 bg-slate-50">
          <h2 className="text-xl font-semibold text-slate-900">AI 接口设置</h2>
          <p className="text-sm text-slate-500 mt-1">统一管理话术生成所使用的 AI 提供商、协议、接口地址、API Key 和模型。</p>
        </div>
        <div className="p-6 space-y-6">
          <div className="flex items-start justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <div>
              <div className="text-sm font-medium text-slate-800">启用 AI 话术生成</div>
              <div className="text-xs text-slate-500 mt-1">关闭后，用户详情页将只保留规则引擎生成的话术，不发起 API 请求。</div>
            </div>
            <button
              type="button"
              onClick={() => setField('enabled', !draft.enabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${draft.enabled ? 'bg-brand-600' : 'bg-slate-300'}`}
            >
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${draft.enabled ? 'translate-x-5' : 'translate-x-1'}`} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">提供商名称</label>
              <input
                type="text"
                value={draft.providerName}
                onChange={(e) => setField('providerName', e.target.value)}
                placeholder="例如：OpenAI / OneAPI / SiliconFlow"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">模型名称</label>
              <input
                type="text"
                value={draft.model}
                onChange={(e) => setField('model', e.target.value)}
                placeholder="例如：gpt-5.4-mini"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <div className="text-sm font-medium text-slate-700 mb-3">协议类型</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {protocolOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => applyProtocolPreset(option.value)}
                  className={`rounded-lg border px-4 py-4 text-left transition ${
                    draft.protocol === option.value
                      ? 'border-brand-300 bg-brand-50'
                      : 'border-slate-200 bg-white hover:border-brand-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="text-sm font-semibold text-slate-800">{option.label}</div>
                  <div className="text-xs text-slate-500 mt-1">{option.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">基础地址 Base URL</label>
              <input
                type="text"
                value={draft.baseUrl}
                onChange={(e) => setField('baseUrl', e.target.value)}
                placeholder="例如：https://api.openai.com"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">请求接口路径</label>
              <input
                type="text"
                value={draft.endpointPath}
                onChange={(e) => setField('endpointPath', e.target.value)}
                placeholder={protocolPresets[draft.protocol]?.endpointPath ?? '/v1/chat/completions'}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">API Key</label>
            <input
              type="password"
              value={draft.apiKey}
              onChange={(e) => setField('apiKey', e.target.value)}
              placeholder="sk-..."
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            />
            <p className="mt-2 text-xs text-slate-500">API Key 将安全存储在后端数据库中，前端仅显示脱敏信息。</p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">请求预览</div>
            <div className="mt-2 text-sm text-slate-800 break-all">{endpointPreview}</div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="text-xs text-slate-500">
              Responses API 使用 input；Chat Completions 使用 messages；Anthropic 使用 x-api-key 鉴权。
            </div>
            <div className="flex items-center gap-3">
              {testMessage && (
                <span className={`text-xs ${testStatus === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                  {testMessage}
                </span>
              )}
              {saveMessage && <span className="text-xs text-green-600">{saveMessage}</span>}
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting}
                className="px-4 py-2 rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isTesting ? '测试中...' : '测试连接'}
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-4 py-2 bg-brand-600 text-white rounded-md hover:bg-brand-700 text-sm font-medium"
              >
                保存配置
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AISettings;
