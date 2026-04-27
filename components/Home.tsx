import React from 'react';
import Typewriter from './Typewriter';

interface HomeProps {
  onStart: () => void;
}

const Home: React.FC<HomeProps> = ({ onStart }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-140px)] text-center px-4 animate-fade-in-up">
      <div className="mb-12">
        <div className="mb-4 inline-block px-3 py-1 rounded-full bg-brand-50 text-brand-700 text-sm font-semibold border border-brand-100">
           ✨ 全新一代存量经营工具
        </div>
        <Typewriter 
          fixedText="让存量经营" 
          rotatingTexts={['更智能', '更精准', '更高效', '更有价值']} 
        />
        <p className="mt-6 text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed">
          基于多维度用户画像与智能规则引擎，为您的一线营销团队提供最精准的套餐适配建议。
          <br/>拒绝盲目推销，让每一次触达都切中用户需求。
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16 w-full max-w-5xl">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center mb-4 mx-auto">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
          </div>
          <h3 className="font-bold text-slate-800 mb-2">数据驱动分析</h3>
          <p className="text-sm text-slate-500">整合ARPU、流量、语音、宽带等多维数据，全方位评估用户价值与需求。</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center mb-4 mx-auto">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
          </div>
          <h3 className="font-bold text-slate-800 mb-2">智能推荐引擎</h3>
          <p className="text-sm text-slate-500">基于"绝不降档"与"资源适配"原则，自动计算最优套餐方案，平衡用户体验与公司收益。</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-green-50 text-green-600 rounded-lg flex items-center justify-center mb-4 mx-auto">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg>
          </div>
          <h3 className="font-bold text-slate-800 mb-2">AI 营销赋能</h3>
          <p className="text-sm text-slate-500">自动生成针对性营销话术，突出升级利益点（如提速、权益），提升外呼成功率。</p>
        </div>
      </div>

      <button 
        onClick={onStart}
        className="group relative px-8 py-4 bg-brand-600 text-white font-bold text-lg rounded-full shadow-lg hover:bg-brand-700 transition-all hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500"
      >
        开始使用
        <svg className="w-5 h-5 inline-block ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path></svg>
      </button>
      
      <p className="mt-8 text-xs text-slate-400">
        本地化处理 · 数据不出网 · 安全可靠
      </p>
    </div>
  );
};

export default Home;