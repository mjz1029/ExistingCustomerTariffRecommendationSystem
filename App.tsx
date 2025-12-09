import React, { useState, useEffect } from 'react';
import { TariffPlan, RecommendationResult, PageView, UserRecord } from './types';
import { DEFAULT_PLANS, REQUIRED_HEADERS } from './constants';
import PlanTable from './components/PlanTable';
import Dashboard from './components/Dashboard';
import UserDetail from './components/UserDetail';
import Home from './components/Home';
import { generateTemplate, parseExcelFile } from './utils/excel';
import { runRecommendationEngine } from './services/engine';

const App: React.FC = () => {
  // --- Global State ---
  const [activePage, setActivePage] = useState<PageView>('home');
  const [plans, setPlans] = useState<TariffPlan[]>(() => {
    const saved = localStorage.getItem('tariff_plans_v3');
    return saved ? JSON.parse(saved) : DEFAULT_PLANS;
  });
  
  const [rawData, setRawData] = useState<UserRecord[]>([]);
  const [results, setResults] = useState<RecommendationResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<RecommendationResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // --- Persistence ---
  useEffect(() => {
    localStorage.setItem('tariff_plans_v3', JSON.stringify(plans));
  }, [plans]);

  // --- Handlers ---
  const handleAddPlan = (newPlan: Omit<TariffPlan, 'id'>) => {
    const id = Date.now().toString();
    setPlans([...plans, { ...newPlan, id }]);
  };

  const handleEditPlan = (updatedPlan: TariffPlan) => {
      setPlans(plans.map(p => p.id === updatedPlan.id ? updatedPlan : p));
  };

  const handleDeletePlan = (id: string) => {
    setPlans(plans.filter(p => p.id !== id));
  };

  const handleTogglePlan = (id: string) => {
    setPlans(plans.map(p => p.id === id ? { ...p, isActive: !p.isActive } : p));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIsProcessing(true);
      try {
        const data = await parseExcelFile(e.target.files[0]);
        setRawData(data);
        // Auto run engine
        const recs = runRecommendationEngine(data, plans);
        setResults(recs);
        setActivePage('dashboard');
      } catch (err) {
        alert("文件解析失败，请检查格式");
        console.error(err);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleViewDetail = (result: RecommendationResult) => {
      setSelectedResult(result);
      setActivePage('user-detail');
  };

  const handleBackToDashboard = () => {
      setSelectedResult(null);
      setActivePage('dashboard');
  };

  // --- Navigation & Layout ---
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navigation */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActivePage('home')}>
              <img 
                src="https://upload.wikimedia.org/wikipedia/commons/0/03/China_Mobile_logo_2013.svg" 
                alt="China Mobile" 
                className="h-9 w-auto object-contain"
              />
              <h1 className="text-xl font-bold text-slate-800 tracking-tight">存量用户套餐推荐系统</h1>
            </div>
            <nav className="flex space-x-1">
              {[
                { id: 'home', label: '首页' },
                { id: 'dashboard', label: '分析看板' },
                { id: 'plans', label: '套餐管理' },
                { id: 'import', label: '数据导入' },
              ].map(item => (
                <button
                  key={item.id}
                  onClick={() => setActivePage(item.id as PageView)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activePage === item.id || (activePage === 'user-detail' && item.id === 'dashboard')
                    ? 'bg-brand-50 text-brand-700' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col">
        
        {/* Home View */}
        {activePage === 'home' && (
          <Home onStart={() => setActivePage('import')} />
        )}

        {/* Dashboard View */}
        {activePage === 'dashboard' && (
          <Dashboard results={results} onViewDetail={handleViewDetail} />
        )}

        {/* User Detail View */}
        {activePage === 'user-detail' && selectedResult && (
            <UserDetail result={selectedResult} onBack={handleBackToDashboard} />
        )}

        {/* Plans View */}
        {activePage === 'plans' && (
          <PlanTable 
            plans={plans} 
            onAdd={handleAddPlan} 
            onEdit={handleEditPlan}
            onDelete={handleDeletePlan} 
            onToggle={handleTogglePlan}
          />
        )}

        {/* Import View */}
        {activePage === 'import' && (
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8 text-center">
              <div className="mx-auto h-16 w-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                <svg className="h-8 w-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
              </div>
              <h2 className="text-xl font-semibold text-slate-900 mb-2">上传用户清单 Excel</h2>
              <p className="text-slate-500 mb-6 text-sm">
                系统将自动解析数据并基于当前套餐目录生成适配建议。<br/>所有数据仅在本地浏览器处理，不会上传至云端。
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

            {/* Header Requirements Table */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
                    <h3 className="text-sm font-semibold text-slate-800">Excel 表头格式要求</h3>
                    <p className="text-xs text-slate-500 mt-1">请确保您的上传文件包含以下列（红色为必须）</p>
                </div>
                <div className="p-6">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {REQUIRED_HEADERS.map(h => (
                            <div key={h.name} className="flex flex-col p-2 border border-slate-100 rounded bg-slate-50/50">
                                <div className="flex items-center justify-between">
                                    <span className={`font-mono text-sm font-bold ${h.required ? 'text-red-600' : 'text-slate-700'}`}>
                                        {h.name} {h.required && '*'}
                                    </span>
                                </div>
                                <span className="text-xs text-slate-400 mt-1 truncate" title={h.desc}>{h.desc}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {rawData.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-md p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                      <span className="text-green-800 font-medium">已解析 {rawData.length} 条数据</span>
                  </div>
                  <button onClick={() => setActivePage('dashboard')} className="text-sm text-green-700 font-semibold hover:underline">
                      查看分析结果 &rarr;
                  </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-slate-500">
            <p>&copy; 2025 毛济洲 奇台县移动公司. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default App;