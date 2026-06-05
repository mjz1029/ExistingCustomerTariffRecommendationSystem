export interface TariffPlan {
  id: string;
  name: string;
  price: number; // 元/月
  data: number; // GB
  voice: number; // 分钟
  hasBroadband: boolean;
  broadbandSpeed: number; // Mbps, 0 if none
  isFTTR: boolean;
  broadbandBaseSpeed?: number; // 原始带宽 (>0表示需千兆提速包)
  extras?: string; // 会员权益等
  isActive: boolean;
  // 资费体系扩展
  monthlyTotal?: number;      // 月费总额(含搭载)
  bundledProducts?: string;   // 搭载产品JSON
  requiredConditions?: string; // 办理条件
  targetCarrier?: string;     // all/mobile_only/competitor
  planCategory?: string;      // personal/broadband/fttr/competitive
}

export interface UserRecord {
  id?: number;
  // 基本信息
  phone: string;
  name?: string;
  province: string;         // 县市
  grid?: string;            // 网格
  address?: string;         // 地址
  age?: number;             // 年龄
  ethnicity?: string;       // 民族
  carrier?: string;          // 归属运营商
  // 套餐信息
  currentPlanName: string;
  currentPrice: number;
  // 异网资费
  competitorPlanName?: string;
  competitorPlanPrice?: number;
  // 消费信息
  arpu3Month: number;       // 折前ARPU
  arpu3MonthAfter?: number; // 折后ARPU
  avgData: number;          // DOU (GB)
  avgVoice: number;         // MOU (分钟)
  saturationData: number;   // 流量饱和度 (0-1)
  saturationVoice: number;  // 语音饱和度 (0-1)
  overageAmount: number;    // 超套金额
  extraConsumption?: number; // 家新+个新+新兴超消金
  balance?: number;         // 结余金额
  // 宽带信息
  hasBroadband: boolean;
  broadbandSpeed: number;   // Mbps
  isFTTR: boolean;
  // 客户标签
  customerType?: string;    // 拍照中高端/全球通/潜力客户
  isZeroContract?: boolean; // 是否0合约
  isOldPlan?: boolean;      // 是否老旧套餐
  isSameCertNew?: boolean;  // 是否同证新增
  isDualCard?: boolean;     // 是否异网双卡
  isMyNumOtherBroadband?: boolean; // 是否我号异宽
  isLowNetworkAge?: boolean; // 是否拍照低网龄
  specialCase?: string;     // 一事一案名称
}

export type ReviewStatus = 'pending' | 'accepted' | 'rejected';
export type SelectionMode = 'auto' | 'manual';
export type AIProtocol = 'responses' | 'chat-completions' | 'anthropic';

export interface RecommendationResult {
  id?: string;
  user: UserRecord;
  recommendedPlan: TariffPlan;
  originalRecommendedPlan: TariffPlan;
  alternatives: TariffPlan[];
  reason: string;
  script: string; // AI话术
  bundledInfo?: string; // 搭载要求
  requiredConditions?: string; // 办理条件
  monthlyTotal?: number; // 月费总额(含搭载)
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
