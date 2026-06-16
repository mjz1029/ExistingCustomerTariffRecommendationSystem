import re
from ..models import Plan

HIGH_SATURATION = 0.9
MODERATE_SATURATION = 0.75


def clamp(value: float, min_val: float, max_val: float) -> float:
    if value != value:  # NaN check
        return min_val
    return min(max(value, min_val), max_val)


def safe_num(v, default=0):
    """安全取数值，处理 None / '-' / 空字符串"""
    if v is None:
        return default
    if isinstance(v, str):
        v = v.strip()
        if v in ("", "-"):
            return default
        try:
            return float(v)
        except ValueError:
            return default
    try:
        return float(v)
    except (TypeError, ValueError):
        return default


def safe_bool(v):
    """安全取布尔值，处理 1/0 / 是/否 / True/False / '-'"""
    if v is None or v == "":
        return False
    if isinstance(v, bool):
        return v
    if isinstance(v, (int, float)):
        return v == 1
    if isinstance(v, str):
        v = v.strip()
        if v in ("", "-"):
            return False
        return v in ("1", "是", "true", "True", "yes")
    return False


def safe_str(v, default=""):
    if v is None:
        return default
    if isinstance(v, str):
        v = v.strip()
        return default if v in ("", "-") else v
    return str(v).strip() if str(v).strip() not in ("", "-") else default


def normalize_user(user: dict) -> dict:
    """归一化用户数据，兼容新旧两种 Excel 格式"""
    return {
        **user,
        "phone": safe_str(user.get("phone")),
        "name": safe_str(user.get("name")),
        "province": safe_str(user.get("province")),
        "grid": safe_str(user.get("grid")),
        "address": safe_str(user.get("address")),
        "age": int(safe_num(user.get("age"), 0)),
        "ethnicity": safe_str(user.get("ethnicity")),
        "carrier": safe_str(user.get("carrier"), "移动"),
        "currentPlanName": safe_str(user.get("currentPlanName"), "当前套餐"),
        "currentPrice": max(0, safe_num(user.get("currentPrice"))),
        "competitorPlanName": safe_str(user.get("competitorPlanName")),
        "competitorPlanPrice": max(0, safe_num(user.get("competitorPlanPrice"))),
        "arpu3Month": max(0, safe_num(user.get("arpu3Month"))),
        "arpu3MonthAfter": max(0, safe_num(user.get("arpu3MonthAfter"))),
        "avgData": max(0, safe_num(user.get("avgData"))),
        "avgVoice": max(0, safe_num(user.get("avgVoice"))),
        "saturationData": clamp(safe_num(user.get("saturationData")), 0, 1),
        "saturationVoice": clamp(safe_num(user.get("saturationVoice")), 0, 1),
        "overageAmount": max(0, safe_num(user.get("overageAmount"))),
        "extraConsumption": max(0, safe_num(user.get("extraConsumption"))),
        "balance": max(0, safe_num(user.get("balance"))),
        "hasBroadband": safe_bool(user.get("hasBroadband")),
        "broadbandSpeed": max(0, safe_num(user.get("broadbandSpeed"))),
        "isFTTR": safe_bool(user.get("isFTTR")),
        "customerType": safe_str(user.get("customerType")),
        "isZeroContract": safe_bool(user.get("isZeroContract")),
        "isOldPlan": safe_bool(user.get("isOldPlan")),
        "specialCase": safe_str(user.get("specialCase")),
    }


def estimate_saturation(user: dict, plans: list[Plan]) -> tuple[float, float]:
    """根据 DOU/MOU 和当前套餐资源估算饱和度（当原始饱和度缺失时）"""
    sat_data = user.get("saturationData", 0)
    sat_voice = user.get("saturationVoice", 0)

    # 如果已有饱和度且合理，直接返回
    if sat_data > 0 and sat_voice > 0:
        return sat_data, sat_voice

    # 从套餐目录中查找当前套餐的流量/通话额度
    plan_name = user.get("currentPlanName", "")
    current_price = user.get("currentPrice", 0)
    matched_plan = None
    for p in plans:
        if p.price == current_price:
            matched_plan = p
            break
    # 模糊匹配
    if not matched_plan:
        for p in plans:
            if p.name in plan_name or plan_name in p.name:
                matched_plan = p
                break

    if matched_plan:
        if sat_data <= 0 and matched_plan.data > 0:
            sat_data = user.get("avgData", 0) / matched_plan.data
        if sat_voice <= 0 and matched_plan.voice > 0:
            sat_voice = user.get("avgVoice", 0) / matched_plan.voice

    return clamp(sat_data, 0, 1), clamp(sat_voice, 0, 1)


def infer_user_segment(user: dict) -> str:
    plan_hints = f"{user.get('currentPlanName', '')} {user.get('customerType', '')}"

    if user.get("isFTTR") or re.search(r"FTTR|全光", plan_hints, re.IGNORECASE):
        return "fttr"
    if user.get("hasBroadband") or re.search(r"全家|爱家|宽带|畅享家|一网通", plan_hints, re.IGNORECASE):
        return "broadband"
    return "mobile"


def matches_segment(plan: Plan, segment: str) -> bool:
    if segment == "fttr":
        return plan.is_fttr
    if segment == "broadband":
        return plan.has_broadband
    return not plan.has_broadband


def filter_plans_by_carrier(plans: list[Plan], carrier: str) -> list[Plan]:
    """根据运营商筛选可推荐套餐"""
    if carrier in ("电信", "联通"):
        # 异网用户: 仅推荐竞争应对资费
        return [p for p in plans if p.target_carrier == "competitor"]
    # 移动用户: 排除竞争资费和仅新入网资费
    return [p for p in plans if p.target_carrier not in ("competitor", "mobile_only")]


def get_effective_arpu(user: dict) -> float:
    """取更真实的 ARPU：折后 > 折前 > 0"""
    after = user.get("arpu3MonthAfter", 0)
    before = user.get("arpu3Month", 0)
    return max(after, before)


def classify_overage_severity(user: dict) -> str:
    """超套严重程度分级：none / mild / chronic
    - mild: 有超套但金额不大 (<30元) 且饱和度未极高
    - chronic: 超套金额≥30 或 (超套>0 且 流量饱和度≥80%)
    """
    overage = user.get("overageAmount", 0)
    sat = user.get("saturationData", 0)

    if overage <= 0:
        return "none"
    if overage >= 30 or (overage > 0 and sat >= 0.8):
        return "chronic"
    return "mild"


def get_customer_value_tier(user: dict) -> str:
    """客户价值分层：premium / standard / basic
    - premium: 全球通、拍照中高端、ARPU≥128
    - basic: ARPU<59 或 老旧套餐
    - standard: 其余
    """
    ct = user.get("customerType", "")
    arpu = get_effective_arpu(user)

    if "全球通" in ct or "中高端" in ct or arpu >= 128:
        return "premium"
    if arpu < 59 or user.get("isOldPlan"):
        return "basic"
    return "standard"


def get_price_jump_cap(user: dict, segment: str) -> int:
    cap = 20

    if segment == "fttr":
        cap = 60
    elif segment == "broadband":
        cap = 30 if user.get("currentPrice", 0) < 79 else 40
    elif user.get("currentPrice", 0) < 29:
        cap = 30
    elif user.get("currentPrice", 0) < 59:
        cap = 25
    elif user.get("currentPrice", 0) < 99:
        cap = 30
    else:
        cap = 40

    # --- 优化：超套严重程度分级，替代原来的单一阈值 ---
    overage_severity = classify_overage_severity(user)
    if overage_severity == "chronic":
        cap += 15  # 慢性超套用户有强升级需求，大幅放宽
    elif overage_severity == "mild":
        cap += 5   # 轻度超套小幅放宽
    elif user.get("saturationData", 0) >= HIGH_SATURATION:
        cap += 8   # 饱和但未超套

    if user.get("saturationVoice", 0) >= HIGH_SATURATION:
        cap += 5

    # --- 优化：零合约用户无合约约束，可接受更大跳档 ---
    if user.get("isZeroContract"):
        cap += 5

    # --- 优化：老旧套餐用户是强升级目标 ---
    if user.get("isOldPlan"):
        cap += 8

    return cap


def compute_budgets(user: dict, segment: str) -> dict:
    """计算软硬预算，整合消费弹性信号"""
    eff_price = user.get("_effectivePrice", user.get("currentPrice", 0))
    eff_arpu = get_effective_arpu(user)
    overage_severity = classify_overage_severity(user)
    price_jump_cap = get_price_jump_cap(user, segment)

    # 基础行为预算：用户实际消费 + 缓冲
    buffer = 10 if overage_severity != "none" else 5
    behavior_budget = max(eff_price, eff_arpu + buffer)

    # --- 优化：extraConsumption 反映消费弹性 ---
    # 超消金高的用户有额外消费意愿，预算可适当放宽
    extra = user.get("extraConsumption", 0)
    if extra > 30:
        behavior_budget += min(extra * 0.3, 20)  # 最多放宽20元

    # --- 优化：高结余用户有预算空间 ---
    balance = user.get("balance", 0)
    if balance > 100:
        behavior_budget += 5

    soft_budget = max(eff_price, min(behavior_budget, eff_price + price_jump_cap))
    hard_budget = max(soft_budget, eff_price + price_jump_cap + 20)

    return {
        "soft": soft_budget,
        "hard": hard_budget,
        "eff_price": eff_price,
    }


def get_resource_targets(user: dict) -> dict:
    """计算资源目标值，慢性超套用户目标上浮更多"""
    overage_severity = classify_overage_severity(user)

    if overage_severity == "chronic":
        data_factor = 1.10   # 慢性超套：目标上浮10%
        voice_factor = 1.10 if user.get("saturationVoice", 0) >= MODERATE_SATURATION else 1.0
    elif overage_severity == "mild":
        data_factor = 1.05
        voice_factor = 1.05 if user.get("saturationVoice", 0) >= HIGH_SATURATION else 1.0
    else:
        data_factor = 1.05 if user.get("saturationData", 0) >= HIGH_SATURATION else 1.0
        voice_factor = 1.05 if user.get("saturationVoice", 0) >= HIGH_SATURATION else 1.0

    return {
        "data": user.get("avgData", 0) * data_factor,
        "voice": user.get("avgVoice", 0) * voice_factor,
    }


def get_candidate_score(plan: Plan, user: dict, data_target: float, voice_target: float) -> float:
    unmet_data = max(0, data_target - plan.data)
    unmet_voice = max(0, voice_target - plan.voice)
    waste_data = max(0, plan.data - data_target)
    waste_voice = max(0, plan.voice - voice_target)
    effective_price = plan.monthly_total if plan.monthly_total and plan.monthly_total > 0 else plan.price
    price_gap = max(0, effective_price - user.get("currentPrice", 0))
    speed_waste = max(0, plan.broadband_speed - user.get("broadbandSpeed", 0))

    # --- 优化：引入价格敏感度系数 ---
    # 高价值客户对价格不敏感，价格惩罚降低；低价值客户对价格敏感
    value_tier = get_customer_value_tier(user)
    price_weight = { "premium": 8, "standard": 12, "basic": 16 }[value_tier]

    # --- 优化：浪费惩罚微调 ---
    # 原来浪费惩罚过轻(0.35)，容易推到远超需求的高价套餐
    # 但仍不能太高（否则不敢推宽带融合），折中取0.5
    waste_data_weight = 0.5

    return -(
        price_gap    * price_weight  # 价格差：高价值客户权重降低
      + unmet_data   * 60            # 流量缺口：权重最高，必须覆盖
      + unmet_voice  * 0.6           # 语音缺口
      + waste_data   * waste_data_weight  # 流量浪费：惩罚适度加强
      + waste_voice  * 0.03          # 语音浪费
      + speed_waste  * 0.02          # 宽带速率浪费
    )


def generate_script(user: dict, plan: Plan, save_amount: float) -> str:
    points = []
    carrier = user.get("carrier", "移动")
    eff_plan_name = user.get("_effectivePlanName", user.get("currentPlanName", "当前套餐"))

    if carrier in ("电信", "联通"):
        # 异网用户话术
        points.append(f"看到您目前使用的是{carrier}的{eff_plan_name}。")
        if save_amount > 5:
            points.append(f"转到移动后预计每月可节省约{save_amount:.0f}元。")
        elif save_amount < -5:
            points.append(f"每月仅需多加{abs(save_amount):.0f}元，即可享受移动更优质的网络服务。")
        else:
            points.append("转网后费用基本持平，但您可以享受移动更广的覆盖和更多权益。")
    else:
        # 移动用户话术
        points.append(f"看到您现在使用的是{eff_plan_name}，月均消费在{user.get('arpu3Month', 0):.0f}元左右。")
        if save_amount > 5:
            points.append(f"即使升级后，预计每月账单还能为您节省约{save_amount:.0f}元。")
        elif save_amount < -5:
            points.append(f"每月仅需多加{abs(save_amount):.0f}元，即可享受大幅升级的权益。")
        else:
            points.append("费用基本持平，但您可以享受更多服务。")

    if plan.data > user.get("avgData", 0) * 1.5:
        points.append(f"流量提升至{plan.data}GB，彻底告别流量焦虑。")
    if plan.voice > user.get("avgVoice", 0) * 1.5:
        points.append(f"包含{plan.voice}分钟通话，业务电话随心打。")

    if plan.has_broadband and not user.get("hasBroadband"):
        if plan.broadband_base_speed > 0:
            points.append(f"重点是这次为您免费加装{plan.broadband_base_speed:.0f}兆高速宽带，再搭配1元千兆提速包即可享受千兆网速，全家上网都够用。")
        else:
            points.append(f"重点是这次为您免费加装{plan.broadband_speed:.0f}兆高速宽带，全家上网都够用。")
    elif plan.has_broadband and user.get("hasBroadband") and plan.broadband_speed > user.get("broadbandSpeed", 0):
        if plan.broadband_base_speed > 0:
            points.append(f"宽带从{user.get('broadbandSpeed', 0):.0f}兆为您提速到千兆，只需搭配1元千兆提速包，网速飞快。")
        else:
            points.append(f"家里的宽带为您提速到{plan.broadband_speed:.0f}兆，网速飞快。")

    if plan.is_fttr and not user.get("isFTTR"):
        points.append("尊享全光WiFi (FTTR) 服务，光纤直接拉到房间，全屋无死角覆盖。")

    return (
        f"您好，我是移动客服。"
        f"{''.join(points)}特向您推荐{plan.name}，您看可以帮您办理吗？"
    )


def rank_plans_for_user(user: dict, plans: list[Plan]) -> dict:
    normalized_user = normalize_user(user)

    # 估算饱和度（如果原始数据缺失）
    sat_data, sat_voice = estimate_saturation(normalized_user, plans)
    normalized_user["saturationData"] = sat_data
    normalized_user["saturationVoice"] = sat_voice

    # 异网用户填写了竞品资费时，用竞品价格替代当前价格做匹配
    carrier = normalized_user.get("carrier", "移动")
    if carrier in ("电信", "联通") and normalized_user.get("competitorPlanPrice", 0) > 0:
        normalized_user["_effectivePrice"] = normalized_user["competitorPlanPrice"]
        normalized_user["_effectivePlanName"] = normalized_user.get("competitorPlanName", "")
    else:
        normalized_user["_effectivePrice"] = normalized_user.get("currentPrice", 0)
        normalized_user["_effectivePlanName"] = normalized_user.get("currentPlanName", "")

    active_plans = sorted([p for p in plans if p.is_active], key=lambda p: p.price)

    # 根据运营商筛选套餐
    active_plans = filter_plans_by_carrier(active_plans, carrier)

    segment = infer_user_segment(normalized_user)

    # --- 优化：使用 compute_budgets 统一预算计算 ---
    budgets = compute_budgets(normalized_user, segment)
    soft_budget = budgets["soft"]
    hard_budget = budgets["hard"]
    eff_price = budgets["eff_price"]

    resource_targets = get_resource_targets(normalized_user)

    segment_plans = [p for p in active_plans if matches_segment(p, segment)]
    if not segment_plans:
        segment_plans = active_plans

    if normalized_user.get("hasBroadband") and not normalized_user.get("isFTTR"):
        retained = [p for p in segment_plans if p.broadband_speed >= normalized_user.get("broadbandSpeed", 0)]
        if retained:
            segment_plans = retained

    priced_plans = [p for p in segment_plans if (p.monthly_total if p.monthly_total and p.monthly_total > 0 else p.price) >= eff_price]
    candidate_pool = priced_plans if priced_plans else [segment_plans[-1]] if segment_plans else []

    scored_candidates = []
    for plan in candidate_pool:
        covers_data = plan.data >= resource_targets["data"]
        covers_voice = plan.voice >= resource_targets["voice"]
        covers_resources = covers_data and covers_voice

        effective_price = plan.monthly_total if plan.monthly_total and plan.monthly_total > 0 else plan.price

        bucket_rank = 4
        if effective_price <= soft_budget and covers_resources:
            bucket_rank = 0
        elif effective_price <= hard_budget and covers_resources:
            bucket_rank = 1
        elif effective_price <= soft_budget:
            bucket_rank = 2
        elif effective_price <= hard_budget:
            bucket_rank = 3

        scored_candidates.append({
            "plan": plan,
            "bucketRank": bucket_rank,
            "coversData": covers_data,
            "coversVoice": covers_voice,
            "coversResources": covers_resources,
            "score": get_candidate_score(plan, normalized_user, resource_targets["data"], resource_targets["voice"]),
        })

    scored_candidates.sort(key=lambda c: (c["bucketRank"], -c["score"], (c["plan"].monthly_total if c["plan"].monthly_total and c["plan"].monthly_total > 0 else c["plan"].price)))

    minimum_segment_price = segment_plans[0].price if segment_plans else (
        scored_candidates[0]["plan"].price if scored_candidates else eff_price
    )

    return {
        "normalizedUser": normalized_user,
        "scoredCandidates": scored_candidates,
        "minimumSegmentPrice": minimum_segment_price,
    }


def build_recommendation_result_from_candidate(
    normalized_user: dict,
    candidate: dict,
    alternatives: list[Plan],
    minimum_segment_price: float,
) -> dict:
    best_match = candidate["plan"]
    reasons = []
    eff_price = normalized_user.get("_effectivePrice", normalized_user.get("currentPrice", 0))
    eff_plan_name = normalized_user.get("_effectivePlanName", normalized_user.get("currentPlanName", ""))
    best_eff_price = best_match.monthly_total if best_match.monthly_total and best_match.monthly_total > 0 else best_match.price

    if eff_price < minimum_segment_price and best_eff_price == minimum_segment_price:
        reasons.append("衔接最低可售档位")
    elif best_eff_price > eff_price:
        reasons.append("小幅提档")
    else:
        reasons.append("同档位优化")

    if candidate["bucketRank"] >= 2:
        reasons.append("当前预算内就近匹配")
    if candidate["coversData"] and (normalized_user.get("saturationData", 0) >= HIGH_SATURATION or normalized_user.get("overageAmount", 0) > 0):
        reasons.append("缓解流量超套")
    if candidate["coversVoice"] and normalized_user.get("saturationVoice", 0) >= HIGH_SATURATION:
        reasons.append("缓解通话紧张")
    if normalized_user.get("hasBroadband") and best_match.has_broadband:
        reasons.append("宽带提速" if best_match.broadband_speed > normalized_user.get("broadbandSpeed", 0) else "保留宽带权益")
    if not normalized_user.get("hasBroadband") and best_match.has_broadband:
        reasons.append("新增宽带权益")
    if normalized_user.get("isFTTR") and best_match.is_fttr:
        reasons.append("保留FTTR权益")
    if not normalized_user.get("isFTTR") and best_match.is_fttr:
        reasons.append("升级全光WiFi")

    # --- 优化：利用客户标签生成更精准的推荐理由 ---
    if normalized_user.get("isOldPlan") and best_eff_price > eff_price:
        reasons.append("套餐焕新")
    if normalized_user.get("isZeroContract"):
        reasons.append("无合约约束可灵活变更")

    risk_level = "low"
    if not candidate["coversResources"]:
        reasons.append("注意:资源可能不足")
        risk_level = "high"
    elif candidate["bucketRank"] > 0 or best_eff_price > normalized_user.get("arpu3Month", 0) + 15:
        risk_level = "medium"

    save_amount = normalized_user.get("arpu3Month", 0) - (best_match.monthly_total if best_match.monthly_total and best_match.monthly_total > 0 else best_match.price)
    script = generate_script(normalized_user, best_match, save_amount)

    # 解析搭载信息
    bundled_info = ""
    if best_match.bundled_products:
        try:
            import json as _json
            bp = _json.loads(best_match.bundled_products)
            required_items = [b["name"] for b in bp if b.get("required")]
            if required_items:
                bundled_info = "需同时办理：" + " + ".join(required_items)
        except Exception:
            pass

    monthly_total = best_match.monthly_total or best_match.price
    # 预测账单 = 月总额 + 超出套餐资源的预估溢出费 (按实际运营商超套资费估算)
    overage_data = max(0, normalized_user.get("avgData", 0) - best_match.data) * 0.5   # 超出流量约0.5元/GB
    overage_voice = max(0, normalized_user.get("avgVoice", 0) - best_match.voice) * 0.1  # 超出通话约0.1元/分
    predicted_bill = round(monthly_total + overage_data + overage_voice, 2)

    return {
        "user": normalized_user,
        "recommendedPlan": best_match,
        "originalRecommendedPlan": best_match,
        "alternatives": alternatives,
        "reason": "，".join(reasons),
        "script": script,
        "bundledInfo": bundled_info,
        "requiredConditions": best_match.required_conditions or "",
        "monthlyTotal": monthly_total,
        "predictedBill": predicted_bill,
        "riskLevel": risk_level,
        "saveAmount": save_amount,
        "reviewStatus": "pending",
        "reviewNote": "",
        "selectionMode": "auto",
    }


def build_recommendation_result_for_plan(user: dict, selected_plan_id: str, plans: list[Plan]) -> dict:
    ranking = rank_plans_for_user(user, plans)
    normalized_user = ranking["normalizedUser"]

    # 在全量候选池中查找用户选择的套餐（不降档过滤）
    selected_plan = next((p for p in plans if p.id == selected_plan_id), None)
    if not selected_plan:
        raise ValueError("No candidate found")

    # 构造人工选择的候选结果
    covers_data = selected_plan.data >= get_resource_targets(normalized_user)["data"]
    covers_voice = selected_plan.voice >= get_resource_targets(normalized_user)["voice"]
    selected_candidate = {
        "plan": selected_plan,
        "bucketRank": 0,
        "coversData": covers_data,
        "coversVoice": covers_voice,
        "coversResources": covers_data and covers_voice,
        "score": get_candidate_score(
            selected_plan, normalized_user,
            get_resource_targets(normalized_user)["data"],
            get_resource_targets(normalized_user)["voice"],
        ),
    }

    # 备选方案从系统推荐的候选池中取（排除已选套餐）
    alternatives = [
        c["plan"]
        for c in ranking["scoredCandidates"]
        if c["plan"].id != selected_plan_id
    ][:3]

    return build_recommendation_result_from_candidate(
        normalized_user, selected_candidate, alternatives, ranking["minimumSegmentPrice"]
    )


def run_recommendation_engine(users: list[dict], plans: list[Plan]) -> list[dict]:
    results = []
    for user in users:
        ranking = rank_plans_for_user(user, plans)
        if not ranking["scoredCandidates"]:
            results.append(None)
            continue
        best_candidate = ranking["scoredCandidates"][0]
        alternatives = [c["plan"] for c in ranking["scoredCandidates"][1:4]]
        results.append(
            build_recommendation_result_from_candidate(
                ranking["normalizedUser"], best_candidate, alternatives, ranking["minimumSegmentPrice"]
            )
        )
    return results
