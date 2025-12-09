import { TariffPlan, UserRecord, RecommendationResult } from '../types';

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
  const activePlans = plans.filter(p => p.isActive).sort((a, b) => a.price - b.price);

  return users.map(user => {
    // --- Step 1: Base Rules (Price & ARPU) ---
    // Rule: No Downgrade (Candidate Price >= Current Plan Price)
    // Rule: ARPU Cap (Candidate Price <= Max(Current Price, ARPU + Buffer))
    // We allow a slightly larger buffer (10 yuan) for higher value/broadband plans
    const maxBudget = Math.max(user.currentPrice, user.arpu3Month + 10);
    
    let candidates = activePlans.filter(p => 
        p.price >= user.currentPrice && 
        p.price <= maxBudget
    );

    // Fallback: If no plan in range, check just >= Current Price (ignore ARPU cap to ensure we have options)
    if (candidates.length === 0) {
        candidates = activePlans.filter(p => p.price >= user.currentPrice);
        // If still empty (user on highest plan), take top plans
        if (candidates.length === 0) candidates = [activePlans[activePlans.length - 1]];
    }

    // --- Step 2: Multi-dimensional Filtering ---
    
    // Dimension: Broadband Retention/Upgrade
    // If user has broadband, we MUST recommend broadband plan (unless data is missing)
    if (user.hasBroadband) {
        const broadbandPlans = candidates.filter(p => p.hasBroadband);
        if (broadbandPlans.length > 0) candidates = broadbandPlans;
    }

    // Dimension: FTTR Retention/Upgrade
    // If user has FTTR, we MUST recommend FTTR plan
    if (user.isFTTR) {
        const fttrPlans = candidates.filter(p => p.isFTTR);
        if (fttrPlans.length > 0) candidates = fttrPlans;
    }

    // --- Step 3: Resource Matching & Scoring ---
    // We score plans based on how well they fit.
    // Score = -Price (lower better) + ResourceBonus + BroadbandBonus
    
    const scoredCandidates = candidates.map(p => {
        let score = 0;
        
        // Price penalty: we prefer cheaper plans within the budget
        score -= p.price; 

        // Resource Coverage (Essential)
        const coversData = p.data >= user.avgData * 1.1;
        const coversVoice = p.voice >= user.avgVoice * 1.1;
        
        if (coversData) score += 1000; // Big bonus for covering data
        if (coversVoice) score += 500; // Bonus for covering voice
        
        // Broadband Upgrade Bonus
        if (p.hasBroadband && !user.hasBroadband) score += 200; // Upsell broadband
        if (p.broadbandSpeed > user.broadbandSpeed) score += 100; // Speed upgrade

        // FTTR Bonus
        if (p.isFTTR && !user.isFTTR) score += 300; // Upsell FTTR

        return { plan: p, score };
    });

    // Sort by score descending
    scoredCandidates.sort((a, b) => b.score - a.score);

    // Pick top result
    const bestMatch = scoredCandidates[0].plan;
    const alternatives = scoredCandidates.slice(1, 4).map(s => s.plan);

    // Construct Reason
    const reasons = [];
    if (bestMatch.price > user.currentPrice) reasons.push("适当提档");
    else reasons.push("同档位优化");

    if (bestMatch.data >= user.avgData * 1.1 && user.saturationData > 0.9) reasons.push("解决流量饱和");
    if (bestMatch.hasBroadband && !user.hasBroadband) reasons.push("新增宽带权益");
    if (bestMatch.broadbandSpeed > user.broadbandSpeed) reasons.push("宽带提速");
    if (bestMatch.isFTTR && !user.isFTTR) reasons.push("升级全光WiFi");

    // Risk Analysis
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    if (bestMatch.data < user.avgData || bestMatch.voice < user.avgVoice) {
        reasons.push("注意:资源可能不足");
        riskLevel = 'high';
    } else if (bestMatch.price > user.arpu3Month + 20) {
        riskLevel = 'medium'; // Price jump is significant
    }

    // Generate Script
    const saveAmount = user.arpu3Month - bestMatch.price;
    const script = generateScript(user, bestMatch, saveAmount);

    return {
      user,
      recommendedPlan: bestMatch,
      alternatives,
      reason: reasons.join('，'),
      script,
      predictedBill: Math.max(bestMatch.price, user.arpu3Month * 0.9), // rough estimate
      riskLevel,
      saveAmount
    };
  });
};