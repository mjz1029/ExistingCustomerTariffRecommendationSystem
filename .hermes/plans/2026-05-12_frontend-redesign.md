# 前端全面优化 — 实施计划

> **For agentic workers:** 使用 Claude Code CLI 按任务逐步实施。每个任务完成后 git commit。

**Goal:** 将存量用户套餐推荐系统的前端从基础 Tailwind CDN 页面升级为视觉精致、响应式完善、动效丰富的专业级应用。

**Architecture:** 保持 React 19 + Vite + TypeScript 技术栈，将 Tailwind 从 CDN 迁移到正式构建流程，引入 Framer Motion 动画库，重构组件为移动端优先的响应式设计。

**Tech Stack:** React 19, Vite 6, TypeScript 5, Tailwind CSS 3 (PostCSS), Framer Motion, Recharts, SheetJS

**分支:** `feature/frontend-redesign`（基于 `python` 分支创建）

---

## 当前问题

| 问题 | 影响 |
|------|------|
| Tailwind via CDN，不适合生产 | 性能差，无法 tree-shake |
| 导航栏在小屏溢出 | 手机不可用 |
| 无加载骨架屏 | 体验生硬 |
| 无 Toast 通知系统 | 依赖 alert() |
| 无动效过渡 | 页面切换突兀 |
| 导入页面内联在 App.tsx | 代码结构差 |
| 无深色模式 | 现代感不足 |
| 表格在移动端溢出 | 小屏不可读 |
| Logo 依赖外部 CDN | 离线不可用 |

---

## 任务清单

### Task 1: 项目基建升级
**目标:** Tailwind 正式构建 + 新增依赖

- [ ] **Step 1:** 安装 Tailwind CSS (PostCSS) + Framer Motion + 其他依赖
  ```bash
  cd /Volumes/Harry/S1/小工具开发/ExistingCustomerTariffRecommendationSystem/frontend
  npm install tailwindcss @tailwindcss/vite framer-motion lucide-react
  ```
- [ ] **Step 2:** 修改 `vite.config.ts`，添加 Tailwind 插件
  ```typescript
  import { defineConfig } from 'vite'
  import react from '@vitejs/plugin-react'
  import tailwindcss from '@tailwindcss/vite'

  export default defineConfig({
    plugins: [react(), tailwindcss()],
    server: {
      proxy: { '/api': { target: 'http://localhost:8000', changeOrigin: true } }
    }
  })
  ```
- [ ] **Step 3:** 创建 `src/index.css`（Tailwind 入口）
  ```css
  @import "tailwindcss";

  @theme {
    --color-brand-50: #f0f9ff;
    --color-brand-100: #e0f2fe;
    --color-brand-200: #bae6fd;
    --color-brand-300: #7dd3fc;
    --color-brand-400: #38bdf8;
    --color-brand-500: #0ea5e9;
    --color-brand-600: #0284c7;
    --color-brand-700: #0369a1;
    --color-brand-800: #075985;
    --color-brand-900: #0c4a6e;
    --font-sans: 'Inter', system-ui, -apple-system, sans-serif;
  }
  ```
- [ ] **Step 4:** 修改 `index.tsx`，导入 `./index.css`，移除 index.html 中的 Tailwind CDN script 和 import map
- [ ] **Step 5:** 验证 `npm run dev` 正常启动
- [ ] **Step 6:** Commit: `chore: migrate Tailwind to PostCSS build, add framer-motion + lucide`

---

### Task 2: 全局基础设施 — Toast + 加载骨架屏 + 移动端导航
**目标:** 建立可复用的 UI 基础设施

- [ ] **Step 1:** 创建 `components/ui/Toast.tsx` — 轻量 Toast 通知系统
  - 支持 success / error / info / warning 四种类型
  - 自动消失（3 秒），可手动关闭
  - 右上角堆叠，带滑入动画
  - 使用 Context 模式，暴露 `useToast()` hook
- [ ] **Step 2:** 创建 `components/ui/Skeleton.tsx` — 通用骨架屏组件
  - CardSkeleton、TableSkeleton、StatsSkeleton 三种预设
  - 闪烁动画效果
- [ ] **Step 3:** 创建 `components/ui/MobileNav.tsx` — 移动端汉堡菜单
  - <768px 时显示汉堡按钮，点击展开侧滑抽屉
  - 半透明遮罩 + 滑入动画
  - 点击导航项后自动关闭
- [ ] **Step 4:** 创建 `components/ui/PageTransition.tsx` — 页面切换动画包装器
  - 使用 Framer Motion 的 AnimatePresence
  - 淡入 + 轻微上移效果
- [ ] **Step 5:** Commit: `feat: add Toast, Skeleton, MobileNav, PageTransition components`

---

### Task 3: 重构 App.tsx — 布局 + 路由 + 状态
**目标:** 拆分 App.tsx，集成新基础设施

- [ ] **Step 1:** 将内联的"数据导入"页面提取为 `components/DataImport.tsx`
- [ ] **Step 2:** 重构 App.tsx 的 header：
  - 桌面端：水平导航栏
  - 移动端：汉堡菜单触发 MobileNav
  - Logo 使用内嵌 SVG（不依赖外部 CDN）
  - 添加当前页面高亮指示器（底部蓝色横条 + 动画）
- [ ] **Step 3:** 集成 PageTransition 包装页面切换
- [ ] **Step 4:** 在 App.tsx 顶层包裹 ToastProvider
- [ ] **Step 5:** 替换所有 `alert()` 为 `useToast()`
- [ ] **Step 6:** 验证所有页面导航正常
- [ ] **Step 7:** Commit: `refactor: extract DataImport, add MobileNav + Toast + PageTransition`

---

### Task 4: Home 页面 — 视觉大升级
**目标:** 打造令人印象深刻的首屏

- [ ] **Step 1:** 重写 Home.tsx
  - Hero 区域：渐变背景（brand-600 → brand-900）+ 微妙网格纹理
  - Typewriter 效果保留，增加光标闪烁动画
  - 统计数据滚动数字动画（已服务用户数、推荐准确率等）
  - 3 个特性卡片：悬浮时上移 + 阴影扩散 + 图标颜色变化
  - 使用 lucide-react 图标（BarChart3, Brain, Sparkles）
  - 卡片入场动画：依次从下方滑入（stagger 动画）
- [ ] **Step 2:** 确保响应式：
  - 手机：单列堆叠，Hero 文字缩小
  - 平板：2 列卡片
  - 桌面：3 列卡片 + 大号 Hero
- [ ] **Step 3:** Commit: `feat: redesign Home page with gradient hero, stagger animations, stats counter`

---

### Task 5: Dashboard 页面 — 数据可视化升级
**目标:** 精致的数据看板

- [ ] **Step 1:** 重写统计卡片
  - 渐变色背景（不同颜色区分：总量蓝、风险橙、待审紫）
  - 数字入场时的计数动画
  - 图标使用 lucide-react
  - 卡片悬浮微动效
- [ ] **Step 2:** 升级图表区域
  - 饼图增加悬浮高亮 + 工具提示动画
  - 图表容器带渐变边框装饰
  - 图表加载时的绘制动画
- [ ] **Step 3:** 升级数据表格
  - 行悬浮高亮 + 轻微缩放
  - 状态标签带颜色圆点
  - 操作按钮使用图标
  - 移动端：表格卡片化（每行变成一张卡片）
- [ ] **Step 4:** 筛选栏优化
  - 搜索框带搜索图标 + 聚焦动画
  - 下拉框美化
- [ ] **Step 5:** Commit: `feat: redesign Dashboard with animated stats, enhanced charts, mobile card table`

---

### Task 6: UserDetail 页面 — 详情页精致化
**目标:** 专业级用户详情视图

- [ ] **Step 1:** 重构布局
  - 桌面：左侧 2/3（对比+图表）右侧 1/3（审核+AI）
  - 平板：上下堆叠
  - 手机：全宽单列，可折叠面板
- [ ] **Step 2:** 套餐对比表升级
  - 价格差异用绿色/红色高亮
  - 推荐指标用进度条可视化
  - 行入场动画
- [ ] **Step 3:** AI 脚本面板升级
  - 生成中的打字机效果
  - 复制按钮带成功反馈动画
  - 脚本内容区域带代码高亮风格
- [ ] **Step 4:** 审核面板优化
  - 审核状态切换用动画开关
  - 保存按钮带加载状态
- [ ] **Step 5:** Commit: `feat: redesign UserDetail with responsive layout, animated comparisons`

---

### Task 7: PlanTable + AISettings 页面优化
**目标:** 管理页面精致化

- [ ] **Step 1:** PlanTable 优化
  - 表格响应式（移动端卡片化）
  - 模态框增加弹出动画
  - 导入区域拖拽上传视觉反馈
  - 操作按钮图标化
- [ ] **Step 2:** AISettings 优化
  - 协议选择卡片：选中时边框发光 + 缩放
  - 表单输入带浮动标签动画
  - 连接测试按钮：加载中旋转动画、成功/失败反馈
- [ ] **Step 3:** Commit: `feat: enhance PlanTable and AISettings with animations and responsive`

---

### Task 8: DataImport 页面优化
**目标:** 独立的数据导入页面

- [ ] **Step 1:** 重写 DataImport.tsx（从 App.tsx 提取的版本）
  - 拖拽上传区域：虚线边框 + 悬浮时变色 + 图标动画
  - 文件选择后的进度条动画
  - 导入结果展示：成功/失败/跳过的动画计数
- [ ] **Step 2:** 响应式适配
- [ ] **Step 3:** Commit: `feat: redesign DataImport with drag-drop animation and progress`

---

### Task 9: 全局打磨 + 旧设备兼容
**目标:** 确保在所有设备上流畅运行

- [ ] **Step 1:** 添加 `prefers-reduced-motion` 媒体查询支持
  - Framer Motion 的 `useReducedMotion` hook
  - 关闭动效时使用 instant 切换
- [ ] **Step 2:** 性能优化
  - 使用 `React.lazy` + `Suspense` 按需加载各页面组件
  - 图表组件懒加载
  - 大表格使用虚拟滚动（如果行数 > 100）
- [ ] **Step 3:** 旧设备/低分辨率适配
  - 1024x768 分辨率测试：缩小间距、调整字体
  - 800x600 分辨率：确保功能可用（可能需要缩放布局）
  - 添加 `<meta name="viewport">` 确保移动端缩放正确
- [ ] **Step 4:** 无障碍基础
  - 按钮添加 aria-label
  - 表格添加 caption
  - 颜色对比度检查（WCAG AA）
  - 键盘导航支持
- [ ] **Step 5:** 深色模式基础（可选，如果时间允许）
  - CSS 变量方案
  - 跟随系统 `prefers-color-scheme`
- [ ] **Step 6:** Commit: `feat: add reduced-motion support, lazy loading, old device compat`

---

### Task 10: 最终验证 + 提交
**目标:** 确保一切正常

- [ ] **Step 1:** 运行 `npm run build`，确认无编译错误
- [ ] **Step 2:** 检查打包大小，确保合理
- [ ] **Step 3:** 在不同视口宽度下手动测试所有页面
  - 375px（手机）
  - 768px（平板）
  - 1024px（笔记本）
  - 1440px（桌面）
  - 1920px（大屏）
- [ ] **Step 4:** 最终 commit: `chore: final polish and build verification`

---

## 响应式断点策略

| 断点 | 宽度 | 设备 | 布局策略 |
|------|------|------|---------|
| xs | <640px | 手机 | 单列堆叠，汉堡菜单，卡片化表格 |
| sm | 640-763px | 大手机/小平板 | 2 列网格，保留汉堡菜单 |
| md | 768-1023px | 平板 | 2-3 列，显示顶部导航 |
| lg | 1024-1279px | 笔记本 | 完整布局，侧边栏折叠 |
| xl | ≥1280px | 桌面 | 最大宽度布局，充分利用空间 |

## 旧设备兼容策略

- CSS `@supports` 渐进增强
- 不使用 CSS Grid 的高级特性（subgrid 等）
- 动画使用 `transform` 和 `opacity`（GPU 加速）
- `prefers-reduced-motion` 关闭非必要动画
- 图片和图标使用 SVG（矢量，任意缩放）
- 字体使用 system-ui 回退栈

## 验证方式

1. `npm run dev` — 开发模式正常
2. `npm run build` — 生产构建无错误
3. Chrome DevTools 响应式模式逐个断点测试
4. 实际手机浏览器测试（如可用）
5. 所有页面导航、表单、表格交互正常
