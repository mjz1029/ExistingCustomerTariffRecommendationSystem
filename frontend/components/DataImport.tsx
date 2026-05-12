import React, { useState } from 'react';
import { RecommendationResult } from '../types';
import { REQUIRED_HEADERS } from '../constants';
import { generateTemplate, parseExcelFile } from '../utils/excel';
import { usersApi, recommendationsApi } from '../services/api';
import { useToast } from './ui/Toast';

interface DataImportProps {
  onImportComplete: (results: RecommendationResult[]) => void;
}

const DataImport: React.FC<DataImportProps> = ({ onImportComplete }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    setIsProcessing(true);
    try {
      const data = await parseExcelFile(e.target.files[0]);
      const { batch_id } = await usersApi.import(data);
      await recommendationsApi.run(batch_id);
      const recs = await recommendationsApi.list();
      onImportComplete(recs);
    } catch (err) {
      toast('文件解析或处理失败，请检查格式', 'error');
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8 text-center">
        <div className="mx-auto h-16 w-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
          <svg className="h-8 w-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
        </div>
        <h2 className="text-xl font-semibold text-slate-900 mb-2">上传用户清单 Excel</h2>
        <p className="text-slate-500 mb-6 text-sm">
          系统将自动解析数据并基于当前套餐目录生成适配建议。
        </p>
        <div className="flex flex-col items-center gap-4">
          <label className="relative cursor-pointer bg-brand-600 hover:bg-brand-700 text-white px-8 py-3 rounded-lg font-medium transition shadow-sm hover:shadow-md text-center transform hover:-translate-y-0.5">
            {isProcessing ? '处理中...' : '选择文件'}
            <input
              type="file"
              accept=".xlsx, .xls"
              className="hidden"
              onChange={handleFileUpload}
              disabled={isProcessing}
            />
          </label>
          <button onClick={generateTemplate} className="text-sm text-brand-600 hover:underline flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
            下载标准模板 (含宽带字段)
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
          <h3 className="text-sm font-semibold text-slate-800">Excel 表头格式要求</h3>
          <p className="text-xs text-slate-500 mt-1">请确保您的上传文件包含以下列（红色为必须）</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {REQUIRED_HEADERS.map(h => (
              <div key={h.name} className="flex flex-col p-2 border border-slate-100 rounded bg-slate-50/50">
                <span className={`font-mono text-sm font-bold ${h.required ? 'text-red-600' : 'text-slate-700'}`}>
                  {h.name} {h.required && '*'}
                </span>
                <span className="text-xs text-slate-400 mt-1 truncate" title={h.desc}>{h.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataImport;
