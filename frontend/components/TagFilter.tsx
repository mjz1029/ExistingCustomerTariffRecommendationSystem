import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GripVertical, X, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { UserRecord, RecommendationResult } from '../types';

// ─── Tag Definition ───

export interface TagDef {
  key: string;
  label: string;
  category: string;
  color: { bg: string; text: string; border: string; hover: string };
  match: (user: UserRecord, result: RecommendationResult) => boolean;
}

// ─── Color Schemes ───

const COLORS = {
  purple:  { bg: 'bg-purple-50',   text: 'text-purple-700',   border: 'border-purple-200',   hover: 'hover:bg-purple-100' },
  orange:  { bg: 'bg-orange-50',   text: 'text-orange-700',   border: 'border-orange-200',   hover: 'hover:bg-orange-100' },
  blue:    { bg: 'bg-sky-50',      text: 'text-sky-700',      border: 'border-sky-200',      hover: 'hover:bg-sky-100' },
  red:     { bg: 'bg-red-50',      text: 'text-red-700',      border: 'border-red-200',      hover: 'hover:bg-red-100' },
  green:   { bg: 'bg-emerald-50',  text: 'text-emerald-700',  border: 'border-emerald-200',  hover: 'hover:bg-emerald-100' },
  amber:   { bg: 'bg-amber-50',    text: 'text-amber-700',    border: 'border-amber-200',    hover: 'hover:bg-amber-100' },
  slate:   { bg: 'bg-slate-50',    text: 'text-slate-700',    border: 'border-slate-200',    hover: 'hover:bg-slate-100' },
  rose:    { bg: 'bg-rose-50',     text: 'text-rose-700',     border: 'border-rose-200',     hover: 'hover:bg-rose-100' },
  cyan:    { bg: 'bg-cyan-50',     text: 'text-cyan-700',     border: 'border-cyan-200',     hover: 'hover:bg-cyan-100' },
};

// ─── All Available Tags ───

export const ALL_TAGS: TagDef[] = [
  // 客户类型
  { key: 'ct:拍照中高端', label: '拍照中高端', category: '客户类型', color: COLORS.purple,
    match: (u) => u.customerType === '拍照中高端' },
  { key: 'ct:拍照全球通', label: '拍照全球通', category: '客户类型', color: COLORS.purple,
    match: (u) => u.customerType === '拍照全球通' },
  { key: 'ct:潜力客户', label: '潜力客户', category: '客户类型', color: COLORS.purple,
    match: (u) => u.customerType === '潜力客户' },

  // 运营商
  { key: 'carrier:移动', label: '移动', category: '运营商', color: COLORS.orange,
    match: (u) => u.carrier === '移动' || !u.carrier },
  { key: 'carrier:电信', label: '电信（异网）', category: '运营商', color: COLORS.orange,
    match: (u) => u.carrier === '电信' },
  { key: 'carrier:联通', label: '联通（异网）', category: '运营商', color: COLORS.orange,
    match: (u) => u.carrier === '联通' },

  // 宽带状态
  { key: 'bb:有', label: '宽带', category: '宽带状态', color: COLORS.blue,
    match: (u) => !!u.hasBroadband },
  { key: 'bb:无', label: '无宽', category: '宽带状态', color: COLORS.blue,
    match: (u) => !u.hasBroadband },
  { key: 'fttr', label: 'FTTR', category: '宽带状态', color: COLORS.cyan,
    match: (u) => !!u.isFTTR },

  // 套餐状态
  { key: 'old', label: '老旧套餐', category: '套餐状态', color: COLORS.red,
    match: (u) => !!u.isOldPlan },
  { key: 'zero', label: '0合约', category: '套餐状态', color: COLORS.red,
    match: (u) => !!u.isZeroContract },

  // 客户标签
  { key: 'cert_new', label: '同证新增', category: '客户标签', color: COLORS.green,
    match: (u) => !!u.isSameCertNew },
  { key: 'dual_card', label: '异网双卡', category: '客户标签', color: COLORS.green,
    match: (u) => !!u.isDualCard },
  { key: 'other_bb', label: '我号异宽', category: '客户标签', color: COLORS.green,
    match: (u) => !!u.isMyNumOtherBroadband },
  { key: 'low_age', label: '拍照低网龄', category: '客户标签', color: COLORS.green,
    match: (u) => !!u.isLowNetworkAge },

  // 推荐状态
  { key: 'rs:pending', label: '待确认', category: '审核状态', color: COLORS.amber,
    match: (_u, r) => r.reviewStatus === 'pending' },
  { key: 'rs:accepted', label: '已接受', category: '审核状态', color: COLORS.green,
    match: (_u, r) => r.reviewStatus === 'accepted' },
  { key: 'rs:rejected', label: '已驳回', category: '审核状态', color: COLORS.slate,
    match: (_u, r) => r.reviewStatus === 'rejected' },

  // 风险等级
  { key: 'risk:low', label: '低风险', category: '风险等级', color: COLORS.green,
    match: (_u, r) => r.riskLevel === 'low' },
  { key: 'risk:medium', label: '中风险', category: '风险等级', color: COLORS.amber,
    match: (_u, r) => r.riskLevel === 'medium' },
  { key: 'risk:high', label: '高风险', category: '风险等级', color: COLORS.rose,
    match: (_u, r) => r.riskLevel === 'high' },
];

// ─── Category Order ───

const CATEGORY_ORDER = ['客户类型', '运营商', '宽带状态', '套餐状态', '客户标签', '审核状态', '风险等级'];

// ─── Tag Pill Component ───

const TagPill: React.FC<{
  tag: TagDef;
  variant?: 'pool' | 'active';
  onRemove?: () => void;
}> = ({ tag, variant = 'pool', onRemove }) => {
  const c = tag.color;
  const isPool = variant === 'pool';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      draggable={isPool}
      onDragStart={(e) => {
        // Use native drag event for dataTransfer
        const nativeEvent = (e as any).nativeEvent as DragEvent;
        if (nativeEvent?.dataTransfer) {
          nativeEvent.dataTransfer.setData('text/plain', tag.key);
          nativeEvent.dataTransfer.effectAllowed = 'move';
        }
      }}
      className={`
        inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
        border cursor-grab active:cursor-grabbing select-none
        transition-all duration-150
        ${c.bg} ${c.text} ${c.border} ${isPool ? c.hover : ''}
        ${isPool ? 'hover:shadow-md hover:-translate-y-0.5 active:scale-95' : ''}
      `}
    >
      {isPool && <GripVertical className="w-3 h-3 opacity-40" />}
      <span>{tag.label}</span>
      {!isPool && onRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="ml-0.5 rounded-full hover:bg-black/10 p-0.5 transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </motion.div>
  );
};

// ─── Main Component ───

interface TagFilterProps {
  activeTags: string[];
  onChange: (tags: string[]) => void;
  resultCount: number;
  totalCount: number;
}

const TagFilter: React.FC<TagFilterProps> = ({ activeTags, onChange, resultCount, totalCount }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [poolCollapsed, setPoolCollapsed] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  const activeTagDefs = activeTags.map(key => ALL_TAGS.find(t => t.key === key)).filter(Boolean) as TagDef[];
  const poolTags = ALL_TAGS.filter(t => !activeTags.includes(t.key));

  // Group pool tags by category
  const groupedPool = CATEGORY_ORDER.map(cat => ({
    category: cat,
    tags: poolTags.filter(t => t.category === cat),
  })).filter(g => g.tags.length > 0);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const tagKey = e.dataTransfer.getData('text/plain');
    if (tagKey && !activeTags.includes(tagKey) && ALL_TAGS.some(t => t.key === tagKey)) {
      onChange([...activeTags, tagKey]);
    }
  }, [activeTags, onChange]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleRemove = useCallback((tagKey: string) => {
    onChange(activeTags.filter(k => k !== tagKey));
  }, [activeTags, onChange]);

  const handleClearAll = useCallback(() => {
    onChange([]);
  }, [onChange]);

  // Click to add (as alternative to drag)
  const handleTagClick = useCallback((tagKey: string) => {
    if (!activeTags.includes(tagKey)) {
      onChange([...activeTags, tagKey]);
    }
  }, [activeTags, onChange]);

  return (
    <div className="space-y-4">
      {/* ── Tag Pool ── */}
      <div>
        <div
          className="flex items-center gap-2 mb-2 cursor-pointer select-none group"
          onClick={() => setPoolCollapsed(c => !c)}
        >
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <Filter className="w-3.5 h-3.5" />
            标签池
          </div>
          <div className="flex-1 h-px bg-slate-100" />
          {!poolCollapsed && (
            <span className="text-[11px] text-slate-400">拖拽或点击添加筛选</span>
          )}
          <div className="text-slate-400 group-hover:text-slate-600 transition-colors">
            {poolCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </div>
        </div>
        <AnimatePresence initial={false}>
          {!poolCollapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="space-y-2.5 pb-1">
                {groupedPool.map(({ category, tags }) => (
                  <div key={category} className="flex items-start gap-2">
                    <span className="text-[11px] text-slate-400 font-medium min-w-[52px] pt-1.5 text-right shrink-0">
                      {category}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {tags.map(tag => (
                        <div key={tag.key} onClick={() => handleTagClick(tag.key)} className="cursor-pointer">
                          <TagPill tag={tag} variant="pool" />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Drop Zone ── */}
      <div
        ref={dropRef}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          relative min-h-[56px] rounded-xl border-2 border-dashed transition-all duration-200
          flex items-center gap-2 flex-wrap p-3
          ${isDragOver
            ? 'border-brand-400 bg-brand-50/50 shadow-lg shadow-brand-100/50 scale-[1.01]'
            : activeTagDefs.length > 0
              ? 'border-slate-200 bg-white'
              : 'border-slate-200 bg-slate-50/50'
          }
        `}
      >
        {/* Background pattern when empty */}
        {activeTagDefs.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className={`flex items-center gap-2 text-sm transition-colors ${isDragOver ? 'text-brand-500' : 'text-slate-300'}`}>
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 4v16m8-8H4" strokeLinecap="round" />
              </svg>
              <span>{isDragOver ? '释放以添加筛选' : '将标签拖拽到此处'}</span>
            </div>
          </div>
        )}

        <AnimatePresence mode="popLayout">
          {activeTagDefs.map(tag => (
            <TagPill
              key={tag.key}
              tag={tag}
              variant="active"
              onRemove={() => handleRemove(tag.key)}
            />
          ))}
        </AnimatePresence>

        {activeTagDefs.length > 0 && (
          <button
            onClick={handleClearAll}
            className="ml-auto text-xs text-slate-400 hover:text-red-500 transition-colors shrink-0"
          >
            清空全部
          </button>
        )}
      </div>

      {/* ── Result Count ── */}
      {activeTagDefs.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 text-xs text-slate-500"
        >
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-brand-50 text-brand-700 rounded-full font-medium">
            {activeTagDefs.length} 个标签
          </span>
          <span>
            匹配 <strong className="text-slate-800">{resultCount.toLocaleString()}</strong> / {totalCount.toLocaleString()} 条结果
          </span>
        </motion.div>
      )}
    </div>
  );
};

export default TagFilter;

// ─── Helper: filter results by active tags ───

export function filterByTags(
  results: RecommendationResult[],
  activeTags: string[]
): RecommendationResult[] {
  if (activeTags.length === 0) return results;

  const tagDefs = activeTags.map(key => ALL_TAGS.find(t => t.key === key)).filter(Boolean) as TagDef[];

  // Group tags by category — within category = OR, across categories = AND
  const categoryGroups = new Map<string, TagDef[]>();
  for (const tag of tagDefs) {
    const existing = categoryGroups.get(tag.category) || [];
    existing.push(tag);
    categoryGroups.set(tag.category, existing);
  }

  return results.filter(r => {
    // Every category group must match (AND)
    for (const [, tags] of categoryGroups) {
      // At least one tag in the category must match (OR)
      const categoryMatch = tags.some(tag => tag.match(r.user, r));
      if (!categoryMatch) return false;
    }
    return true;
  });
}
