export interface TariffPlan {
  id: string;
  name: string;
  price: number; // 元/月
  data: number; // GB
  voice: number; // 分钟
  hasBroadband: boolean;
  broadbandSpeed: number; // Mbps, 0 if none
  isFTTR: boolean;
  extras?: string; // 会员权益等
  isActive: boolean;
}

export interface UserRecord {
  phone: string;
  province: string;
  currentPlanName: string;
  currentPrice: number;
  arpu3Month: number; // 近三月ARPU
  avgData: number; // GB
  avgVoice: number; // 分钟
  saturationData: number; // 流量饱和度 (0-1)
  saturationVoice: number; // 语音饱和度 (0-1)
  overageAmount: number; // 超套金额
  
  // New dimensions
  planType?: string; // 个人/家庭
  hasBroadband: boolean;
  broadbandSpeed: number; // Mbps
  isFTTR: boolean;
  
  remark?: string;
}

export type ReviewStatus = 'pending' | 'accepted' | 'rejected';
export type SelectionMode = 'auto' | 'manual';
export type AIProtocol = 'responses' | 'chat-completions';

export interface RecommendationResult {
  id?: string;
  user: UserRecord;
  recommendedPlan: TariffPlan;
  originalRecommendedPlan: TariffPlan;
  alternatives: TariffPlan[];
  reason: string;
  script: string; // AI话术
  predictedBill: number; // 预测账单
  riskLevel: 'low' | 'medium' | 'high'; // 适配风险
  saveAmount: number; // 预计节省
  reviewStatus: ReviewStatus; // 人工审核状态
  reviewNote: string; // 人工备注/调整原因
  selectionMode: SelectionMode; // 当前结论是系统推荐还是人工改选
}

export interface AIProviderConfig {
  providerName: string;
  protocol: AIProtocol;
  baseUrl: string;
  endpointPath: string;
  apiKey: string;
  model: string;
  enabled: boolean;
}

export type PageView = 'home' | 'dashboard' | 'plans' | 'import' | 'user-detail' | 'ai-settings';
