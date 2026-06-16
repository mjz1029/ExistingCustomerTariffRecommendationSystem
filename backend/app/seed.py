import json
from sqlalchemy.orm import Session
from .models import Plan

# 6月4日版资费体系 — 来源: 营销活动编码（6.4日）.docx
# monthly_total = 主套餐 + 搭载费用总计
# bundled_products = [{"name": "...", "code": "...", "price": N, "required": true}, ...]

DEFAULT_PLANS = [
    # ─────────────────────────────────────────────
    # 新入网资费（仅新入网，存量套迁不推荐）
    # ─────────────────────────────────────────────
    {
        "id": "20252062", "name": "5G畅享套餐39元", "price": 39, "data": 40, "voice": 500,
        "has_broadband": False, "broadband_speed": 0, "broadband_base_speed": 0, "is_fttr": False, "is_active": True,
        "extras": "可办理3张副卡", "monthly_total": 39,
        "bundled_products": json.dumps([
            {"name": "5元视频彩铃畅玩包-2025版", "code": "50042296", "price": 5, "required": True, "note": "仅新入网搭载"}
        ]),
        "required_conditions": "仅限新入网用户",
        "target_carrier": "mobile_only", "plan_category": "personal",
    },
    {
        "id": "20252063", "name": "5G畅享套餐49元", "price": 49, "data": 60, "voice": 700,
        "has_broadband": False, "broadband_speed": 0, "broadband_base_speed": 0, "is_fttr": False, "is_active": True,
        "extras": "可办理3张副卡", "monthly_total": 49,
        "bundled_products": json.dumps([
            {"name": "1元和彩云", "code": "50042302", "price": 1, "required": True, "note": "仅新入网搭载"}
        ]),
        "required_conditions": "仅限新入网用户",
        "target_carrier": "mobile_only", "plan_category": "personal",
    },
    {
        "id": "20252064", "name": "5G畅享套餐59元", "price": 59, "data": 80, "voice": 900,
        "has_broadband": False, "broadband_speed": 0, "broadband_base_speed": 0, "is_fttr": False, "is_active": True,
        "extras": "可办理3张副卡", "monthly_total": 59,
        "bundled_products": "[]",
        "required_conditions": "仅限新入网用户",
        "target_carrier": "mobile_only", "plan_category": "personal",
    },

    # ─────────────────────────────────────────────
    # 融合主推 — 5G全家享（AI爱家版）
    # ─────────────────────────────────────────────
    {
        "id": "20263028", "name": "71元5G全家享（AI爱家版）", "price": 59, "data": 80, "voice": 900,
        "has_broadband": True, "broadband_speed": 1000, "broadband_base_speed": 500, "is_fttr": False, "is_active": True,
        "extras": "WIFI6路由器", "monthly_total": 71,
        "bundled_products": json.dumps([
            {"name": "WIFI6路由器", "code": "-", "price": 0, "required": True, "note": "套餐包含"},
            {"name": "5元新片速递遥控版", "code": "50043914", "price": 5, "required": True, "note": "必搭载"},
            {"name": "6元新片速递", "code": "50047180", "price": 6, "required": True, "note": "必搭载"},
            {"name": "1元千兆提速包", "code": "50042057", "price": 1, "required": True, "note": "手动添加"},
        ]),
        "required_conditions": "主套餐59元及以下办理",
        "target_carrier": "all", "plan_category": "broadband",
    },
    {
        "id": "20263029", "name": "81元5G全家享（AI爱家版）", "price": 69, "data": 90, "voice": 1000,
        "has_broadband": True, "broadband_speed": 1000, "broadband_base_speed": 500, "is_fttr": False, "is_active": True,
        "extras": "WIFI6路由器", "monthly_total": 81,
        "bundled_products": json.dumps([
            {"name": "WIFI6路由器", "code": "-", "price": 0, "required": True, "note": "套餐包含"},
            {"name": "5元新片速递遥控版", "code": "50043914", "price": 5, "required": True, "note": "必搭载"},
            {"name": "6元新片速递", "code": "50047180", "price": 6, "required": True, "note": "必搭载"},
            {"name": "1元千兆提速包", "code": "50042057", "price": 1, "required": True, "note": "手动添加"},
        ]),
        "required_conditions": "主套餐69元及以下办理",
        "target_carrier": "all", "plan_category": "broadband",
    },
    {
        "id": "20263030", "name": "90元5G全家享（AI爱家版）", "price": 79, "data": 100, "voice": 1100,
        "has_broadband": True, "broadband_speed": 1000, "broadband_base_speed": 0, "is_fttr": False, "is_active": True,
        "extras": "WIFI6路由器", "monthly_total": 90,
        "bundled_products": json.dumps([
            {"name": "WIFI6路由器", "code": "-", "price": 0, "required": True, "note": "套餐包含"},
            {"name": "5元新片速递遥控版", "code": "50043914", "price": 5, "required": True, "note": "必搭载"},
            {"name": "6元新片速递", "code": "50047180", "price": 6, "required": True, "note": "必搭载"},
        ]),
        "required_conditions": "主套餐79元及以下办理",
        "target_carrier": "all", "plan_category": "broadband",
    },
    {
        "id": "20263031", "name": "110元5G全家享（AI爱家版）", "price": 99, "data": 120, "voice": 1300,
        "has_broadband": True, "broadband_speed": 1000, "broadband_base_speed": 0, "is_fttr": False, "is_active": True,
        "extras": "WIFI6路由器", "monthly_total": 110,
        "bundled_products": json.dumps([
            {"name": "WIFI6路由器", "code": "-", "price": 0, "required": True, "note": "套餐包含"},
            {"name": "5元新片速递遥控版", "code": "50043914", "price": 5, "required": True, "note": "必搭载"},
            {"name": "6元新片速递", "code": "50047180", "price": 6, "required": True, "note": "必搭载"},
        ]),
        "required_conditions": "主套餐99元及以下办理",
        "target_carrier": "all", "plan_category": "broadband",
    },

    # ─────────────────────────────────────────────
    # 全光版 — 5GA全家享（全光版）FTTR
    # ─────────────────────────────────────────────
    {
        "id": "20253101", "name": "99元5GA全家享(全光版)", "price": 99, "data": 120, "voice": 1300,
        "has_broadband": True, "broadband_speed": 1000, "broadband_base_speed": 0, "is_fttr": True, "is_active": True,
        "extras": "FTTR+语音遥控器+爱家娱乐包(16个电视VIP)", "monthly_total": 99,
        "bundled_products": json.dumps([
            {"name": "FTTR设备", "code": "-", "price": 0, "required": True, "note": "套餐包含"},
            {"name": "语音遥控器", "code": "-", "price": 0, "required": True, "note": "套餐包含"},
            {"name": "爱家娱乐包(16个电视VIP)", "code": "-", "price": 0, "required": True, "note": "套餐包含"},
        ]),
        "required_conditions": "主套餐99元及以下办理",
        "target_carrier": "all", "plan_category": "fttr",
    },
    {
        "id": "20253102", "name": "109元5GA全家享(全光版)", "price": 109, "data": 140, "voice": 1400,
        "has_broadband": True, "broadband_speed": 1000, "broadband_base_speed": 0, "is_fttr": True, "is_active": True,
        "extras": "FTTR+语音遥控器+爱家娱乐包(16个电视VIP)", "monthly_total": 109,
        "bundled_products": json.dumps([
            {"name": "FTTR设备", "code": "-", "price": 0, "required": True, "note": "套餐包含"},
            {"name": "语音遥控器", "code": "-", "price": 0, "required": True, "note": "套餐包含"},
            {"name": "爱家娱乐包(16个电视VIP)", "code": "-", "price": 0, "required": True, "note": "套餐包含"},
        ]),
        "required_conditions": "主套餐109元及以下办理",
        "target_carrier": "all", "plan_category": "fttr",
    },
    {
        "id": "20253103", "name": "129元5GA全家享(全光版)", "price": 129, "data": 160, "voice": 1500,
        "has_broadband": True, "broadband_speed": 1000, "broadband_base_speed": 0, "is_fttr": True, "is_active": True,
        "extras": "FTTR+语音遥控器+爱家畅享包(21个电视VIP)", "monthly_total": 129,
        "bundled_products": json.dumps([
            {"name": "FTTR设备", "code": "-", "price": 0, "required": True, "note": "套餐包含"},
            {"name": "语音遥控器", "code": "-", "price": 0, "required": True, "note": "套餐包含"},
            {"name": "爱家畅享包(21个电视VIP)", "code": "-", "price": 0, "required": True, "note": "套餐包含"},
        ]),
        "required_conditions": "主套餐129元及以下办理",
        "target_carrier": "all", "plan_category": "fttr",
    },
    {
        "id": "20253104", "name": "149元5GA全家享(全光版)", "price": 149, "data": 180, "voice": 1800,
        "has_broadband": True, "broadband_speed": 1000, "broadband_base_speed": 0, "is_fttr": True, "is_active": True,
        "extras": "FTTR+语音遥控器+爱家畅享包(21个电视VIP)", "monthly_total": 149,
        "bundled_products": json.dumps([
            {"name": "FTTR设备", "code": "-", "price": 0, "required": True, "note": "套餐包含"},
            {"name": "语音遥控器", "code": "-", "price": 0, "required": True, "note": "套餐包含"},
            {"name": "爱家畅享包(21个电视VIP)", "code": "-", "price": 0, "required": True, "note": "套餐包含"},
        ]),
        "required_conditions": "主套餐149元及以下办理",
        "target_carrier": "all", "plan_category": "fttr",
    },
    {
        "id": "20253105", "name": "169元5GA全家享(全光版)", "price": 169, "data": 200, "voice": 2000,
        "has_broadband": True, "broadband_speed": 1000, "broadband_base_speed": 0, "is_fttr": True, "is_active": True,
        "extras": "FTTR+语音遥控器+爱家畅享包(21个电视VIP)", "monthly_total": 169,
        "bundled_products": json.dumps([
            {"name": "FTTR设备", "code": "-", "price": 0, "required": True, "note": "套餐包含"},
            {"name": "语音遥控器", "code": "-", "price": 0, "required": True, "note": "套餐包含"},
            {"name": "爱家畅享包(21个电视VIP)", "code": "-", "price": 0, "required": True, "note": "套餐包含"},
        ]),
        "required_conditions": "主套餐169元及以下办理",
        "target_carrier": "all", "plan_category": "fttr",
    },
    {
        "id": "20253106", "name": "199元5GA全家享(全光版)", "price": 199, "data": 240, "voice": 3000,
        "has_broadband": True, "broadband_speed": 2000, "broadband_base_speed": 0, "is_fttr": True, "is_active": True,
        "extras": "FTTR+语音遥控器+爱家畅享包(21个电视VIP)+室内安防(3天云存储)", "monthly_total": 199,
        "bundled_products": json.dumps([
            {"name": "FTTR设备", "code": "-", "price": 0, "required": True, "note": "套餐包含"},
            {"name": "语音遥控器", "code": "-", "price": 0, "required": True, "note": "套餐包含"},
            {"name": "爱家畅享包(21个电视VIP)", "code": "-", "price": 0, "required": True, "note": "套餐包含"},
            {"name": "室内安防(3天云存储)", "code": "-", "price": 0, "required": True, "note": "套餐包含"},
        ]),
        "required_conditions": "主套餐199元及以下办理",
        "target_carrier": "all", "plan_category": "fttr",
    },
    {
        "id": "20253107", "name": "239元5GA全家享(全光版)", "price": 239, "data": 280, "voice": 3200,
        "has_broadband": True, "broadband_speed": 2000, "broadband_base_speed": 0, "is_fttr": True, "is_active": True,
        "extras": "FTTR+语音遥控器+爱家畅享包(21个电视VIP)+室内安防(3天云存储)", "monthly_total": 239,
        "bundled_products": json.dumps([
            {"name": "FTTR设备", "code": "-", "price": 0, "required": True, "note": "套餐包含"},
            {"name": "语音遥控器", "code": "-", "price": 0, "required": True, "note": "套餐包含"},
            {"name": "爱家畅享包(21个电视VIP)", "code": "-", "price": 0, "required": True, "note": "套餐包含"},
            {"name": "室内安防(3天云存储)", "code": "-", "price": 0, "required": True, "note": "套餐包含"},
        ]),
        "required_conditions": "主套餐239元及以下办理",
        "target_carrier": "all", "plan_category": "fttr",
    },

    # ─────────────────────────────────────────────
    # 竞争应对特殊资费（异网/低占猎宽区域）
    # ─────────────────────────────────────────────
    {
        "id": "20263026", "name": "45元全家享（AI爱家版）竞争资费", "price": 39, "data": 40, "voice": 500,
        "has_broadband": True, "broadband_speed": 1000, "broadband_base_speed": 500, "is_fttr": False, "is_active": True,
        "extras": "WIFI6路由器(39+1+5元组合)", "monthly_total": 45,
        "bundled_products": json.dumps([
            {"name": "WIFI6路由器", "code": "-", "price": 0, "required": True, "note": "套餐包含"},
            {"name": "5元语音遥控器", "code": "50043914", "price": 5, "required": True, "note": "必搭载"},
            {"name": "1元千兆提速包", "code": "50042057", "price": 1, "required": True, "note": "手动添加"},
        ]),
        "required_conditions": "低占+猎宽区域可办理；新入网须纯新增或存量双不降档",
        "target_carrier": "competitor", "plan_category": "competitive",
    },
    {
        "id": "20253027", "name": "55元全家享爱家基础版", "price": 49, "data": 60, "voice": 700,
        "has_broadband": True, "broadband_speed": 1000, "broadband_base_speed": 500, "is_fttr": False, "is_active": True,
        "extras": "WIFI6路由器(49+1+5元组合)", "monthly_total": 55,
        "bundled_products": json.dumps([
            {"name": "WIFI6路由器", "code": "-", "price": 0, "required": True, "note": "套餐包含"},
            {"name": "5元语音遥控器", "code": "50043914", "price": 5, "required": True, "note": "必搭载"},
            {"name": "1元千兆提速包", "code": "50042057", "price": 1, "required": True, "note": "手动添加"},
        ]),
        "required_conditions": "全区域可办理；新入网须纯新增或存量双不降档",
        "target_carrier": "competitor", "plan_category": "competitive",
    },
    {
        "id": "999001810566563", "name": "300包年融合活动", "price": 25, "data": 40, "voice": 500,
        "has_broadband": True, "broadband_speed": 1000, "broadband_base_speed": 500, "is_fttr": False, "is_active": True,
        "extras": "WIFI6路由器(年付300元≈25元/月)", "monthly_total": 25,
        "bundled_products": json.dumps([
            {"name": "WIFI6路由器", "code": "-", "price": 0, "required": True, "note": "套餐包含"},
            {"name": "5元语音遥控器", "code": "50043914", "price": 5, "required": True, "note": "必搭载"},
            {"name": "1元千兆提速包", "code": "50042057", "price": 1, "required": True, "note": "手动添加"},
        ]),
        "required_conditions": "低占+猎宽区域；仅100%纯新增办理",
        "target_carrier": "competitor", "plan_category": "competitive",
    },
    {
        "id": "999001810523252", "name": "60元5G全家享惠民资费（教育版）", "price": 59, "data": 250, "voice": 1500,
        "has_broadband": True, "broadband_speed": 1000, "broadband_base_speed": 500, "is_fttr": False, "is_active": True,
        "extras": "WIFI6路由器+爱家教育包", "monthly_total": 60,
        "bundled_products": json.dumps([
            {"name": "WIFI6路由器", "code": "-", "price": 0, "required": True, "note": "套餐包含"},
            {"name": "语音遥控器", "code": "-", "price": 0, "required": True, "note": "套餐包含"},
            {"name": "爱家教育包", "code": "-", "price": 0, "required": True, "note": "套餐包含"},
            {"name": "1元千兆提速包", "code": "50042057", "price": 1, "required": True, "note": "手动添加"},
        ]),
        "required_conditions": "低占+猎宽区域；纯新增入网30天内",
        "target_carrier": "competitor", "plan_category": "competitive",
    },
]


def seed_plans(db: Session):
    if db.query(Plan).count() == 0:
        for p in DEFAULT_PLANS:
            db.add(Plan(**p))
        db.commit()
