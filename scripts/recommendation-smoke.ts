import { DEFAULT_PLANS } from '../constants.ts';
import { runRecommendationEngine } from '../services/engine.ts';
import type { UserRecord } from '../types.ts';

const baseUser: UserRecord = {
  phone: '13800000000',
  province: '测试',
  currentPlanName: '测试套餐',
  currentPrice: 0,
  arpu3Month: 0,
  avgData: 0,
  avgVoice: 0,
  saturationData: 0,
  saturationVoice: 0,
  overageAmount: 0,
  planType: '个人',
  hasBroadband: false,
  broadbandSpeed: 0,
  isFTTR: false,
  remark: '',
};

const cases: Array<{
  name: string;
  user: UserRecord;
  verify: (price: number, result: ReturnType<typeof runRecommendationEngine>[number]) => void;
}> = [
  {
    name: '低档移动用户不应跨档到99元',
    user: {
      ...baseUser,
      currentPlanName: '18元套餐',
      currentPrice: 18,
      arpu3Month: 42,
      avgData: 8,
      avgVoice: 80,
      saturationData: 0.7,
    },
    verify: (price) => {
      if (price > 49) {
        throw new Error(`期望推荐不高于49元，实际为${price}元`);
      }
    },
  },
  {
    name: '高流量低档用户允许小步提档，但不应直接到99元',
    user: {
      ...baseUser,
      currentPlanName: '18元套餐',
      currentPrice: 18,
      arpu3Month: 68,
      avgData: 58,
      avgVoice: 120,
      saturationData: 1,
      overageAmount: 22,
    },
    verify: (price) => {
      if (price >= 99) {
        throw new Error(`期望推荐控制在99元以下，实际为${price}元`);
      }
    },
  },
  {
    name: '宽带用户必须保留宽带',
    user: {
      ...baseUser,
      currentPlanName: '爱家基础59',
      currentPrice: 59,
      arpu3Month: 66,
      avgData: 20,
      avgVoice: 180,
      planType: '家庭',
      hasBroadband: true,
      broadbandSpeed: 500,
    },
    verify: (_price, result) => {
      if (!result.recommendedPlan.hasBroadband) {
        throw new Error('宽带用户被推荐成了无宽带套餐');
      }
      if (result.recommendedPlan.broadbandSpeed < 500) {
        throw new Error(`宽带速率发生降档，实际推荐 ${result.recommendedPlan.broadbandSpeed}M`);
      }
    },
  },
  {
    name: 'FTTR用户必须保留FTTR',
    user: {
      ...baseUser,
      currentPlanName: '全光99',
      currentPrice: 99,
      arpu3Month: 109,
      avgData: 45,
      avgVoice: 260,
      planType: '家庭',
      hasBroadband: true,
      broadbandSpeed: 1000,
      isFTTR: true,
    },
    verify: (_price, result) => {
      if (!result.recommendedPlan.isFTTR) {
        throw new Error('FTTR用户未保留FTTR');
      }
    },
  },
];

cases.forEach(testCase => {
  const [result] = runRecommendationEngine([testCase.user], DEFAULT_PLANS);
  testCase.verify(result.recommendedPlan.price, result);
  console.log(`[pass] ${testCase.name}: ${result.recommendedPlan.name}`);
});

console.log(`共通过 ${cases.length} 条套餐匹配冒烟校验`);
