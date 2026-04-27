import type { TariffPlan, UserRecord, RecommendationResult } from '../types';

type PlanSegment = 'mobile' | 'broadband' | 'fttr';

const HIGH_SATURATION = 0.9;

const clamp = (value: number, min: number, max: number): number => {
  if (Number.isNaN(value)) return min;
  return Math.min(Math.max(value, min), max);
};

const normalizeUser = (user: UserRecord): UserRecord => ({
  ...user,
  currentPrice: Math.max(0, user.currentPrice || 0),
  arpu3Month: Math.max(0, user.arpu3Month || 0),
  avgData: Math.max(0, user.avgData || 0),
  avgVoice: Math.max(0, user.avgVoice || 0),
  saturationData: clamp(user.saturationData || 0, 0, 1),
  saturationVoice: clamp(user.saturationVoice || 0, 0, 1),
  overageAmount: Math.max(0, user.overageAmount || 0),
  broadbandSpeed: Math.max(0, user.broadbandSpeed || 0),
  currentPlanName: user.currentPlanName || '当前套餐',
  province: user.province || '',
  phone: user.phone || '',
  planType: user.planType || '',
  hasBroadband: Boolean(user.hasBroadband),
  isFTTR: Boolean(user.isFTTR),
});

const inferUserSegment = (user: UserRecord): PlanSegment => {
  const planHints = `${user.currentPlanName} ${user.planType || ''}`;

  if (user.isFTTR || /FTTR|全光/i.test(planHints)) {
    return 'fttr';
  }
  if (user.hasBroadband || /全家|爱家|宽带/i.test(planHints)) {
    return 'broadband';
  }
  return 'mobile';
};

const matchesSegment = (plan: TariffPlan, segment: PlanSegment): boolean => {
  if (segment === 'fttr') return plan.isFTTR;
  if (segment === 'broadband') return plan.hasBroadband;
  return !plan.hasBroadband;
};

const getPriceJumpCap = (user: UserRecord, segment: PlanSegment): number => {
  let cap = 20;

  if (segment === 'fttr') {
    cap = 60;
  } else if (segment === 'broadband') {
    cap = user.currentPrice < 79 ? 30 : 40;
  } else if (user.currentPrice < 29) {
    cap = 30;
  } else if (user.currentPrice < 59) {
    cap = 25;
  } else if (user.currentPrice < 99) {
    cap = 30;
  } else {
    cap = 40;
  }

  if (user.saturationData >= HIGH_SATURATION || user.overageAmount >= 20) cap += 10;
  if (user.saturationVoice >= HIGH_SATURATION) cap += 5;

  return cap;
};

const getResourceTargets = (user: UserRecord) => {
  const dataFactor = user.saturationData >= HIGH_SATURATION || user.overageAmount > 0 ? 1.05 : 1;
  const voiceFactor = user.saturationVoice >= HIGH_SATURATION ? 1.05 : 1;

  return {
    data: user.avgData * dataFactor,
    voice: user.avgVoice * voiceFactor,
  };
};

const getCandidateScore = (
  plan: TariffPlan,
  user: UserRecord,
  dataTarget: number,
  voiceTarget: number,
): number => {
  const unmetData = Math.max(0, dataTarget - plan.data);
  const unmetVoice = Math.max(0, voiceTarget - plan.voice);
  const wasteData = Math.max(0, plan.data - dataTarget);
  const wasteVoice = Math.max(0, plan.voice - voiceTarget);
  const priceGap = Math.max(0, plan.price - user.currentPrice);
  const speedWaste = Math.max(0, plan.broadbandSpeed - user.broadbandSpeed);

  return -(
    priceGap * 12 +
    unmetData * 60 +
    unmetVoice * 0.6 +
    wasteData * 0.35 +
    wasteVoice * 0.03 +
    speedWaste * 0.02
  );
};

const rankPlansForUser = (user: UserRecord, plans: TariffPlan[]) => {
  const normalizedUser = normalizeUser(user);
  const activePlans = plans.filter(p => p.isActive).sort((a, b) => a.price - b.price);
  const segment = inferUserSegment(normalizedUser);
  const priceJumpCap = getPriceJumpCap(normalizedUser, segment);
  const behaviorBudget = Math.max(
    normalizedUser.currentPrice,
    normalizedUser.arpu3Month + (normalizedUser.overageAmount > 0 ? 10 : 5),
  );
  const softBudget = Math.max(
    normalizedUser.currentPrice,
    Math.min(behaviorBudget, normalizedUser.currentPrice + priceJumpCap),
  );
  const hardBudget = Math.max(softBudget, normalizedUser.currentPrice + priceJumpCap + 20);
  const resourceTargets = getResourceTargets(normalizedUser);

  let segmentPlans = activePlans.filter(plan => matchesSegment(plan, segment));
  if (segmentPlans.length === 0) {
    segmentPlans = activePlans;
  }

  if (normalizedUser.hasBroadband && !normalizedUser.isFTTR) {
    const retainedSpeedPlans = segmentPlans.filter(plan => plan.broadbandSpeed >= normalizedUser.broadbandSpeed);
    if (retainedSpeedPlans.length > 0) {
      segmentPlans = retainedSpeedPlans;
    }
  }

  const pricedPlans = segmentPlans.filter(plan => plan.price >= normalizedUser.currentPrice);
  const candidatePool = pricedPlans.length > 0 ? pricedPlans : [segmentPlans[segmentPlans.length - 1]];

  const scoredCandidates = candidatePool
    .map(plan => {
      const coversData = plan.data >= resourceTargets.data;
      const coversVoice = plan.voice >= resourceTargets.voice;
      const coversResources = coversData && coversVoice;

      let bucketRank = 4;
      if (plan.price <= softBudget && coversResources) bucketRank = 0;
      else if (plan.price <= hardBudget && coversResources) bucketRank = 1;
      else if (plan.price <= softBudget) bucketRank = 2;
      else if (plan.price <= hardBudget) bucketRank = 3;

      return {
        plan,
        bucketRank,
        coversData,
        coversVoice,
        coversResources,
        score: getCandidateScore(plan, normalizedUser, resourceTargets.data, resourceTargets.voice),
      };
    })
    .sort((a, b) => {
      if (a.bucketRank !== b.bucketRank) return a.bucketRank - b.bucketRank;
      if (a.score !== b.score) return b.score - a.score;
      return a.plan.price - b.plan.price;
    });

  return {
    normalizedUser,
    scoredCandidates,
    minimumSegmentPrice: segmentPlans[0]?.price ?? scoredCandidates[0]?.plan.price ?? normalizedUser.currentPrice,
  };
};

const buildRecommendationResultFromCandidate = (
  normalizedUser: UserRecord,
  candidate: ReturnType<typeof rankPlansForUser>['scoredCandidates'][number],
  alternatives: TariffPlan[],
  minimumSegmentPrice: number,
): RecommendationResult => {
  const bestMatch = candidate.plan;
  const reasons = [];

  if (normalizedUser.currentPrice < minimumSegmentPrice && bestMatch.price === minimumSegmentPrice) {
    reasons.push("衔接最低可售档位");
  } else if (bestMatch.price > normalizedUser.currentPrice) {
    reasons.push("小幅提档");
  } else {
    reasons.push("同档位优化");
  }

  if (candidate.bucketRank >= 2) reasons.push("当前预算内就近匹配");
  if (candidate.coversData && (normalizedUser.saturationData >= HIGH_SATURATION || normalizedUser.overageAmount > 0)) {
    reasons.push("缓解流量超套");
  }
  if (candidate.coversVoice && normalizedUser.saturationVoice >= HIGH_SATURATION) {
    reasons.push("缓解通话紧张");
  }
  if (normalizedUser.hasBroadband && bestMatch.hasBroadband) {
    reasons.push(bestMatch.broadbandSpeed > normalizedUser.broadbandSpeed ? "宽带提速" : "保留宽带权益");
  }
  if (!normalizedUser.hasBroadband && bestMatch.hasBroadband) reasons.push("新增宽带权益");
  if (normalizedUser.isFTTR && bestMatch.isFTTR) reasons.push("保留FTTR权益");
  if (!normalizedUser.isFTTR && bestMatch.isFTTR) reasons.push("升级全光WiFi");

  let riskLevel: 'low' | 'medium' | 'high' = 'low';
  if (!candidate.coversResources) {
    reasons.push("注意:资源可能不足");
    riskLevel = 'high';
  } else if (candidate.bucketRank > 0 || bestMatch.price > normalizedUser.arpu3Month + 15) {
    riskLevel = 'medium';
  }

  const saveAmount = normalizedUser.arpu3Month - bestMatch.price;
  const script = generateScript(normalizedUser, bestMatch, saveAmount);

  return {
    user: normalizedUser,
    recommendedPlan: bestMatch,
    alternatives,
    reason: reasons.join('，'),
    script,
    predictedBill: Math.max(bestMatch.price, normalizedUser.arpu3Month * 0.9),
    riskLevel,
    saveAmount
  };
};

export const buildRecommendationResultForPlan = (
  user: UserRecord,
  selectedPlanId: string,
  plans: TariffPlan[],
): RecommendationResult => {
  const { normalizedUser, scoredCandidates, minimumSegmentPrice } = rankPlansForUser(user, plans);
  const selectedCandidate = scoredCandidates.find(candidate => candidate.plan.id === selectedPlanId) ?? scoredCandidates[0];
  const alternatives = scoredCandidates
    .filter(candidate => candidate.plan.id !== selectedCandidate.plan.id)
    .slice(0, 3)
    .map(candidate => candidate.plan);

  return buildRecommendationResultFromCandidate(normalizedUser, selectedCandidate, alternatives, minimumSegmentPrice);
};

const generateScript = (user: UserRecord, plan: TariffPlan, saveAmount: number): string => {
    const points = [];
    
    // 1. Value/Price Point
    if (saveAmount > 5) {
        points.push(`即使升级后，预计每月账单还能为您节省约${saveAmount.toFixed(0)}元。`);
    } else if (saveAmount < -5) {
        points.push(`每月仅需多加${Math.abs(saveAmount).toFixed(0)}元，即可享受大幅升级的权益。`);
    } else {
        points.push(`费用基本持平，但您可以享受更多服务。`);
    }

    // 2. Resource Point
    if (plan.data > user.avgData * 1.5) {
        points.push(`流量提升至${plan.data}GB，彻底告别流量焦虑。`);
    }
    if (plan.voice > user.avgVoice * 1.5) {
        points.push(`包含${plan.voice}分钟通话，业务电话随心打。`);
    }

    // 3. Broadband Point
    if (plan.hasBroadband && !user.hasBroadband) {
        points.push(`重点是这次为您免费加装${plan.broadbandSpeed}兆高速宽带，全家上网都够用。`);
    } else if (plan.hasBroadband && user.hasBroadband && plan.broadbandSpeed > user.broadbandSpeed) {
        points.push(`家里的宽带为您提速到${plan.broadbandSpeed}兆，网速飞快。`);
    }
    
    // 4. FTTR Point
    if (plan.isFTTR && !user.isFTTR) {
        points.push(`尊享全光WiFi (FTTR) 服务，光纤直接拉到房间，全屋无死角覆盖。`);
    }

    return `您好，我是移动客服。看到您现在使用的是${user.currentPlanName}，月均消费在${user.arpu3Month}元左右。${points.join('')}特向您推荐${plan.name}，您看可以帮您办理吗？`;
};

export const runRecommendationEngine = (users: UserRecord[], plans: TariffPlan[]): RecommendationResult[] => {
  return users.map(user => {
    const { normalizedUser, scoredCandidates, minimumSegmentPrice } = rankPlansForUser(user, plans);
    const bestCandidate = scoredCandidates[0];
    const alternatives = scoredCandidates.slice(1, 4).map(candidate => candidate.plan);
    return buildRecommendationResultFromCandidate(normalizedUser, bestCandidate, alternatives, minimumSegmentPrice);
  });
};
