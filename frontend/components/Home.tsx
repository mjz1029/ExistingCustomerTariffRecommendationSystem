import React, { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { BarChart3, Brain, Sparkles, ArrowRight } from 'lucide-react';
import Typewriter from './Typewriter';

interface HomeProps {
  onStart: () => void;
}

/* ── Animated Counter ───────────────────────────────────────────── */

function AnimatedCounter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const duration = 1600;
    const step = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setCount(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [inView, target]);

  return (
    <span ref={ref} className="tabular-nums">
      {count.toLocaleString()}{suffix}
    </span>
  );
}

/* ── Stat Card ──────────────────────────────────────────────────── */

interface StatProps {
  value: number;
  suffix: string;
  label: string;
  delay: number;
}

function StatCard({ value, suffix, label, delay }: StatProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.5, delay }}
      className="bg-white rounded-2xl shadow-md p-8 text-center"
    >
      <div className="text-4xl md:text-5xl font-extrabold text-brand-600 mb-2">
        <AnimatedCounter target={value} suffix={suffix} />
      </div>
      <p className="text-slate-500 text-sm font-medium">{label}</p>
    </motion.div>
  );
}

/* ── Feature Card ───────────────────────────────────────────────── */

interface FeatureProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  delay: number;
}

function FeatureCard({ icon, title, description, delay }: FeatureProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ y: -8 }}
      className="group bg-white rounded-xl shadow-md p-8 transition-shadow hover:shadow-xl cursor-default"
    >
      <div className="w-14 h-14 rounded-xl bg-brand-50 text-brand-500 flex items-center justify-center mb-5 transition-colors group-hover:bg-brand-500 group-hover:text-white">
        {icon}
      </div>
      <h3 className="text-lg font-bold text-slate-800 mb-2">{title}</h3>
      <p className="text-sm text-slate-500 leading-relaxed">{description}</p>
    </motion.div>
  );
}

/* ── Home Page ──────────────────────────────────────────────────── */

const Home: React.FC<HomeProps> = ({ onStart }) => {
  return (
    <div className="flex flex-col -mx-4 sm:-mx-6 lg:-mx-8 -mt-8">

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative min-h-[60vh] md:min-h-[80vh] flex items-center justify-center overflow-hidden bg-gradient-to-br from-brand-700 via-brand-800 to-brand-900">
        {/* dot pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.10]"
          style={{
            backgroundImage:
              'radial-gradient(circle, #fff 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />

        <div className="relative z-10 text-center px-6 py-20 max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-block mb-6 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-sm text-white/90 text-sm font-medium border border-white/15"
          >
            全新一代存量经营工具
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
          >
            <Typewriter
              fixedText=""
              rotatingTexts={[
                '让存量经营更智能',
                '让套餐推荐更精准',
                '让营销服务更高效',
                '让客户体验更有价值',
              ]}
            />
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-6 text-lg text-brand-100/80 max-w-2xl mx-auto leading-relaxed"
          >
            基于多维度用户画像与智能规则引擎，为您的一线营销团队提供最精准的套餐适配建议。
            <br className="hidden sm:block" />
            拒绝盲目推销，让每一次触达都切中用户需求。
          </motion.p>

          <motion.button
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.45 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onStart}
            className="mt-10 inline-flex items-center gap-2 px-8 py-4 bg-white text-brand-700 font-bold text-lg rounded-full shadow-lg hover:shadow-xl transition-shadow focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white/60 focus:ring-offset-brand-800"
          >
            开始使用
            <ArrowRight className="w-5 h-5" />
          </motion.button>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.65 }}
            className="mt-8 text-xs text-white/40"
          >
            本地化处理 · 数据不出网 · 安全可靠
          </motion.p>
        </div>
      </section>

      {/* ── Stats ────────────────────────────────────────────── */}
      <section className="bg-slate-50 py-20 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          <StatCard value={10000} suffix="+" label="已服务用户" delay={0} />
          <StatCard value={95} suffix="%" label="推荐准确率" delay={0.1} />
          <StatCard value={300} suffix="%" label="效率提升" delay={0.2} />
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────── */}
      <section className="bg-white py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-14"
          >
            <h2 className="text-3xl font-extrabold text-slate-800">核心功能</h2>
            <p className="mt-3 text-slate-500">三大能力，驱动存量经营全面升级</p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={<BarChart3 className="w-7 h-7" />}
              title="数据驱动分析"
              description="整合 ARPU、流量、语音、宽带等多维数据，全方位评估用户价值与需求，让决策有据可依。"
              delay={0}
            />
            <FeatureCard
              icon={<Brain className="w-7 h-7" />}
              title="智能推荐引擎"
              description="基于「绝不降档」与「资源适配」原则，自动计算最优套餐方案，平衡用户体验与公司收益。"
              delay={0.1}
            />
            <FeatureCard
              icon={<Sparkles className="w-7 h-7" />}
              title="AI 营销赋能"
              description="自动生成针对性营销话术，突出升级利益点，提升外呼成功率与客户满意度。"
              delay={0.2}
            />
          </div>
        </div>
      </section>

      {/* ── Footer CTA ───────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-700 via-brand-800 to-brand-900 py-20 px-6 text-center">
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              'radial-gradient(circle, #fff 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
        <div className="relative z-10 max-w-2xl mx-auto">
          <h2 className="text-3xl font-extrabold text-white mb-4">准备好开始了吗？</h2>
          <p className="text-brand-100/70 mb-8">只需一步，开启智能存量经营之旅</p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onStart}
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-brand-700 font-bold text-lg rounded-full shadow-lg hover:shadow-xl transition-shadow focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white/60 focus:ring-offset-brand-800"
          >
            立即体验
            <ArrowRight className="w-5 h-5" />
          </motion.button>
        </div>
      </section>
    </div>
  );
};

export default Home;
