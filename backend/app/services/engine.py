import re
from ..models import Plan

HIGH_SATURATION = 0.9


def clamp(value: float, min_val: float, max_val: float) -> float:
    if value != value:  # NaN check
        return min_val
    return min(max(value, min_val), max_val)


def normalize_user(user: dict) -> dict:
    return {
        **user,
        "currentPrice": max(0, user.get("currentPrice") or 0),
        "arpu3Month": max(0, user.get("arpu3Month") or 0),
        "avgData": max(0, user.get("avgData") or 0),
        "avgVoice": max(0, user.get("avgVoice") or 0),
        "saturationData": clamp(user.get("saturationData") or 0, 0, 1),
        "saturationVoice": clamp(user.get("saturationVoice") or 0, 0, 1),
        "overageAmount": max(0, user.get("overageAmount") or 0),
        "broadbandSpeed": max(0, user.get("broadbandSpeed") or 0),
        "currentPlanName": user.get("currentPlanName") or "当前套餐",
        "province": user.get("province") or "",
        "phone": user.get("phone") or "",
        "planType": user.get("planType") or "",
        "hasBroadband": bool(user.get("hasBroadband")),
        "isFTTR": bool(user.get("isFTTR")),
    }


def infer_user_segment(user: dict) -> str:
    plan_hints = f"{user.get('currentPlanName', '')} {user.get('planType', '')}"

    if user.get("isFTTR") or re.search(r"FTTR|全光", plan_hints, re.IGNORECASE):
        return "fttr"
    if user.get("hasBroadband") or re.search(r"全家|爱家|宽带", plan_hints, re.IGNORECASE):
        return "broadband"
    return "mobile"


def matches_segment(plan: Plan, segment: str) -> bool:
    if segment == "fttr":
        return plan.is_fttr
    if segment == "broadband":
        return plan.has_broadband
    return not plan.has_broadband


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

    if user.get("saturationData", 0) >= HIGH_SATURATION or user.get("overageAmount", 0) >= 20:
        cap += 10
    if user.get("saturationVoice", 0) >= HIGH_SATURATION:
        cap += 5

    return cap


def get_resource_targets(user: dict) -> dict:
    data_factor = 1.05 if user.get("saturationData", 0) >= HIGH_SATURATION or user.get("overageAmount", 0) > 0 else 1
    voice_factor = 1.05 if user.get("saturationVoice", 0) >= HIGH_SATURATION else 1

    return {
        "data": user.get("avgData", 0) * data_factor,
        "voice": user.get("avgVoice", 0) * voice_factor,
    }


def get_candidate_score(plan: Plan, user: dict, data_target: float, voice_target: float) -> float:
    unmet_data = max(0, data_target - plan.data)
    unmet_voice = max(0, voice_target - plan.voice)
    waste_data = max(0, plan.data - data_target)
    waste_voice = max(0, plan.voice - voice_target)
    price_gap = max(0, plan.price - user.get("currentPrice", 0))
    speed_waste = max(0, plan.broadband_speed - user.get("broadbandSpeed", 0))

    return -(
        price_gap * 12
        + unmet_data * 60
        + unmet_voice * 0.6
        + waste_data * 0.35
        + waste_voice * 0.03
        + speed_waste * 0.02
    )


def generate_script(user: dict, plan: Plan, save_amount: float) -> str:
    points = []

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
        points.append(f"重点是这次为您免费加装{plan.broadband_speed:.0f}兆高速宽带，全家上网都够用。")
    elif plan.has_broadband and user.get("hasBroadband") and plan.broadband_speed > user.get("broadbandSpeed", 0):
        points.append(f"家里的宽带为您提速到{plan.broadband_speed:.0f}兆，网速飞快。")

    if plan.is_fttr and not user.get("isFTTR"):
        points.append("尊享全光WiFi (FTTR) 服务，光纤直接拉到房间，全屋无死角覆盖。")

    return (
        f"您好，我是移动客服。看到您现在使用的是{user.get('currentPlanName', '当前套餐')}，"
        f"月均消费在{user.get('arpu3Month', 0):.0f}元左右。"
        f"{''.join(points)}特向您推荐{plan.name}，您看可以帮您办理吗？"
    )


def rank_plans_for_user(user: dict, plans: list[Plan]) -> dict:
    normalized_user = normalize_user(user)
    active_plans = sorted([p for p in plans if p.is_active], key=lambda p: p.price)
    segment = infer_user_segment(normalized_user)
    price_jump_cap = get_price_jump_cap(normalized_user, segment)
    behavior_budget = max(
        normalized_user.get("currentPrice", 0),
        normalized_user.get("arpu3Month", 0) + (10 if normalized_user.get("overageAmount", 0) > 0 else 5),
    )
    soft_budget = max(
        normalized_user.get("currentPrice", 0),
        min(behavior_budget, normalized_user.get("currentPrice", 0) + price_jump_cap),
    )
    hard_budget = max(soft_budget, normalized_user.get("currentPrice", 0) + price_jump_cap + 20)
    resource_targets = get_resource_targets(normalized_user)

    segment_plans = [p for p in active_plans if matches_segment(p, segment)]
    if not segment_plans:
        segment_plans = active_plans

    if normalized_user.get("hasBroadband") and not normalized_user.get("isFTTR"):
        retained = [p for p in segment_plans if p.broadband_speed >= normalized_user.get("broadbandSpeed", 0)]
        if retained:
            segment_plans = retained

    priced_plans = [p for p in segment_plans if p.price >= normalized_user.get("currentPrice", 0)]
    candidate_pool = priced_plans if priced_plans else [segment_plans[-1]] if segment_plans else []

    scored_candidates = []
    for plan in candidate_pool:
        covers_data = plan.data >= resource_targets["data"]
        covers_voice = plan.voice >= resource_targets["voice"]
        covers_resources = covers_data and covers_voice

        bucket_rank = 4
        if plan.price <= soft_budget and covers_resources:
            bucket_rank = 0
        elif plan.price <= hard_budget and covers_resources:
            bucket_rank = 1
        elif plan.price <= soft_budget:
            bucket_rank = 2
        elif plan.price <= hard_budget:
            bucket_rank = 3

        scored_candidates.append({
            "plan": plan,
            "bucketRank": bucket_rank,
            "coversData": covers_data,
            "coversVoice": covers_voice,
            "coversResources": covers_resources,
            "score": get_candidate_score(plan, normalized_user, resource_targets["data"], resource_targets["voice"]),
        })

    scored_candidates.sort(key=lambda c: (c["bucketRank"], -c["score"], c["plan"].price))

    minimum_segment_price = segment_plans[0].price if segment_plans else (
        scored_candidates[0]["plan"].price if scored_candidates else normalized_user.get("currentPrice", 0)
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

    if normalized_user.get("currentPrice", 0) < minimum_segment_price and best_match.price == minimum_segment_price:
        reasons.append("衔接最低可售档位")
    elif best_match.price > normalized_user.get("currentPrice", 0):
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

    risk_level = "low"
    if not candidate["coversResources"]:
        reasons.append("注意:资源可能不足")
        risk_level = "high"
    elif candidate["bucketRank"] > 0 or best_match.price > normalized_user.get("arpu3Month", 0) + 15:
        risk_level = "medium"

    save_amount = normalized_user.get("arpu3Month", 0) - best_match.price
    script = generate_script(normalized_user, best_match, save_amount)

    return {
        "user": normalized_user,
        "recommendedPlan": best_match,
        "originalRecommendedPlan": best_match,
        "alternatives": alternatives,
        "reason": "，".join(reasons),
        "script": script,
        "predictedBill": max(best_match.price, normalized_user.get("arpu3Month", 0) * 0.9),
        "riskLevel": risk_level,
        "saveAmount": save_amount,
        "reviewStatus": "pending",
        "reviewNote": "",
        "selectionMode": "auto",
    }


def build_recommendation_result_for_plan(user: dict, selected_plan_id: str, plans: list[Plan]) -> dict:
    ranking = rank_plans_for_user(user, plans)
    selected_candidate = next(
        (c for c in ranking["scoredCandidates"] if c["plan"].id == selected_plan_id),
        ranking["scoredCandidates"][0] if ranking["scoredCandidates"] else None,
    )
    if not selected_candidate:
        raise ValueError("No candidate found")

    alternatives = [
        c["plan"]
        for c in ranking["scoredCandidates"]
        if c["plan"].id != selected_candidate["plan"].id
    ][:3]

    return build_recommendation_result_from_candidate(
        ranking["normalizedUser"], selected_candidate, alternatives, ranking["minimumSegmentPrice"]
    )


def run_recommendation_engine(users: list[dict], plans: list[Plan]) -> list[dict]:
    results = []
    for user in users:
        ranking = rank_plans_for_user(user, plans)
        if not ranking["scoredCandidates"]:
            continue
        best_candidate = ranking["scoredCandidates"][0]
        alternatives = [c["plan"] for c in ranking["scoredCandidates"][1:4]]
        results.append(
            build_recommendation_result_from_candidate(
                ranking["normalizedUser"], best_candidate, alternatives, ranking["minimumSegmentPrice"]
            )
        )
    return results
