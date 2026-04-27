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

export interface RecommendationResult {
  user: UserRecord;
  recommendedPlan: TariffPlan;
  alternatives: TariffPlan[];
  reason: string;
  script: string; // AI话术
  predictedBill: number; // 预测账单
  riskLevel: 'low' | 'medium' | 'high'; // 适配风险
  saveAmount: number; // 预计节省
}

export type PageView = 'home' | 'dashboard' | 'plans' | 'import' | 'user-detail';