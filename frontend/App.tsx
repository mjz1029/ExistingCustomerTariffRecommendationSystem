import React, { useState, useEffect, Suspense, lazy } from 'react';
import { TariffPlan, RecommendationResult, PageView, AIProviderConfig } from './types';
import { DEFAULT_PLANS } from './constants';
import { plansApi, aiApi } from './services/api';
import { ToastProvider } from './components/ui/Toast';
import { MobileNav } from './components/ui/MobileNav';
import { PageTransition } from './components/ui/PageTransition';
import { StatsSkeleton } from './components/ui/Skeleton';

const Home = lazy(() => import('./components/Home'));
const Dashboard = lazy(() => import('./components/Dashboard'));
const UserDetail = lazy(() => import('./components/UserDetail'));
const PlanTable = lazy(() => import('./components/PlanTable'));
const AISettings = lazy(() => import('./components/AISettings'));
const DataImport = lazy(() => import('./components/DataImport'));

const DEFAULT_AI_CONFIG: AIProviderConfig = {
  providerName: 'OpenAI',
  protocol: 'responses',
  baseUrl: 'https://api.openai.com',
  endpointPath: '/v1/responses',
  apiKey: '',
  model: 'gpt-5.4-mini',
  enabled: false,
};

const NAV_ITEMS = [
  { label: '首页', value: 'home', icon: 'Home' },
  { label: '分析看板', value: 'dashboard', icon: 'BarChart3' },
  { label: '套餐管理', value: 'plans', icon: 'Settings' },
  { label: '数据导入', value: 'import', icon: 'Upload' },
  { label: 'AI 设置', value: 'ai-settings', icon: 'Brain' },
];

const App: React.FC = () => {
  const [activePage, setActivePage] = useState<PageView>('home');
  const [plans, setPlans] = useState<TariffPlan[]>([]);
  const [results, setResults] = useState<RecommendationResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<RecommendationResult | null>(null);
  const [aiConfig, setAIConfig] = useState<AIProviderConfig>(DEFAULT_AI_CONFIG);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [plansData, aiData] = await Promise.all([
          plansApi.list(),
          aiApi.getConfig(),
        ]);
        setPlans(plansData);
        setAIConfig(aiData);
      } catch (err) {
        console.error('加载数据失败:', err);
        setPlans(DEFAULT_PLANS);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const handleAddPlan = async (newPlan: Omit<TariffPlan, 'id'>) => {
    const created = await plansApi.create(newPlan);
    setPlans(prev => [...prev, created]);
  };

  const handleEditPlan = async (updatedPlan: TariffPlan) => {
    const updated = await plansApi.update(updatedPlan.id, updatedPlan);
    setPlans(prev => prev.map(p => p.id === updated.id ? updated : p));
  };

  const handleDeletePlan = async (id: string) => {
    await plansApi.delete(id);
    setPlans(prev => prev.filter(p => p.id !== id));
  };

  const handleTogglePlan = async (id: string) => {
    const updated = await plansApi.toggle(id);
    setPlans(prev => prev.map(p => p.id === updated.id ? updated : p));
  };

  const handleImportPlans = async (importedPlans: TariffPlan[]) => {
    await plansApi.import(importedPlans);
    setPlans(importedPlans);
    setResults([]);
    setSelectedResult(null);
    setActivePage('plans');
  };

  const handleImportComplete = (recs: RecommendationResult[]) => {
    setResults(recs);
    setActivePage('dashboard');
  };

  const handleViewDetail = (result: RecommendationResult) => {
    setSelectedResult(result);
    setActivePage('user-detail');
  };

  const handleBackToDashboard = () => {
    setSelectedResult(null);
    setActivePage('dashboard');
  };

  const handleSaveResult = (updatedResult: RecommendationResult) => {
    setResults(prev => prev.map(r => r.id === updatedResult.id ? updatedResult : r));
    setSelectedResult(updatedResult);
  };

  const handleSaveAIConfig = async (nextConfig: AIProviderConfig) => {
    const saved = await aiApi.updateConfig(nextConfig);
    setAIConfig(saved);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-500">加载中...</div>
      </div>
    );
  }

  return (
    <ToastProvider>
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <header className="bg-white/60 backdrop-blur-xl border-b border-white/30 sticky top-0 z-20 shadow-sm shadow-brand-900/5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16 items-center">
              <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActivePage('home')}>
                <img
                  src="https://p0.ssl.qhimgs1.com/t01abd3cd02b3b27d20.jpg"
                  alt="China Mobile"
                  className="h-12 w-auto object-contain"
                />
                <h1 className="text-xl font-bold text-slate-800 tracking-tight">存量用户套餐推荐系统</h1>
              </div>
              <nav className="hidden md:flex space-x-1" role="navigation" aria-label="主导航">
                {NAV_ITEMS.map(item => (
                  <button
                    key={item.value}
                    onClick={() => setActivePage(item.value as PageView)}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      activePage === item.value || (activePage === 'user-detail' && item.value === 'dashboard')
                      ? 'bg-brand-100/70 text-brand-700'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </nav>
              <MobileNav
                items={NAV_ITEMS}
                currentValue={activePage}
                onSelect={(value) => setActivePage(value as PageView)}
              />
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col" role="main">
          {activePage === 'home' && (
            <PageTransition>
              <Suspense fallback={<StatsSkeleton />}>
                <Home onStart={() => setActivePage('import')} />
              </Suspense>
            </PageTransition>
          )}

          {activePage === 'dashboard' && (
            <PageTransition>
              <Suspense fallback={<StatsSkeleton />}>
                <Dashboard results={results} onViewDetail={handleViewDetail} />
              </Suspense>
            </PageTransition>
          )}

          {activePage === 'user-detail' && selectedResult && (
            <PageTransition>
              <Suspense fallback={<StatsSkeleton />}>
                <UserDetail
                  result={selectedResult}
                  plans={plans}
                  aiConfig={aiConfig}
                  onOpenAISettings={() => setActivePage('ai-settings')}
                  onBack={handleBackToDashboard}
                  onSaveResult={handleSaveResult}
                />
              </Suspense>
            </PageTransition>
          )}

          {activePage === 'ai-settings' && (
            <PageTransition>
              <Suspense fallback={<StatsSkeleton />}>
                <AISettings config={aiConfig} onSave={handleSaveAIConfig} />
              </Suspense>
            </PageTransition>
          )}

          {activePage === 'plans' && (
            <PageTransition>
              <Suspense fallback={<StatsSkeleton />}>
                <PlanTable
                  plans={plans}
                  onAdd={handleAddPlan}
                  onEdit={handleEditPlan}
                  onDelete={handleDeletePlan}
                  onToggle={handleTogglePlan}
                  onImport={handleImportPlans}
                />
              </Suspense>
            </PageTransition>
          )}

          {activePage === 'import' && (
            <PageTransition>
              <Suspense fallback={<StatsSkeleton />}>
                <DataImport plans={plans} onImportComplete={handleImportComplete} />
              </Suspense>
            </PageTransition>
          )}
        </main>

        <footer className="bg-white border-t border-slate-200 py-6 mt-auto">
          <div className="max-w-7xl mx-auto px-4 text-center text-sm text-slate-500">
            <p>&copy; 2025 毛济洲 中国移动昌吉州分公司. All rights reserved.</p>
          </div>
        </footer>
      </div>
    </ToastProvider>
  );
};

export default App;
