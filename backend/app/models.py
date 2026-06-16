from sqlalchemy import Column, String, Float, Boolean, Integer, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

from .database import Base


class Plan(Base):
    __tablename__ = "plans"

    id = Column(String(50), primary_key=True)
    name = Column(String(200), nullable=False)
    price = Column(Float, nullable=False)
    data = Column(Float, nullable=False)
    voice = Column(Float, nullable=False)
    has_broadband = Column(Boolean, nullable=False, default=False)
    broadband_speed = Column(Float, nullable=False, default=0)   # 最终有效带宽 (提速后)
    is_fttr = Column(Boolean, nullable=False, default=False)
    broadband_base_speed = Column(Float, nullable=False, default=0)  # 原始带宽 (提速前，0=无提速)
    extras = Column(Text, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    # 资费体系扩展字段
    monthly_total = Column(Float, nullable=False, default=0)  # 月费总额(含搭载)
    bundled_products = Column(Text, nullable=True)  # 搭载产品JSON
    required_conditions = Column(Text, nullable=True)  # 办理条件说明
    target_carrier = Column(String(20), default="all")  # all/mobile_only/competitor
    plan_category = Column(String(50), default="personal")  # personal/broadband/fttr/competitive

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "price": self.price,
            "data": self.data,
            "voice": self.voice,
            "hasBroadband": self.has_broadband,
            "broadbandSpeed": self.broadband_speed,
            "isFTTR": self.is_fttr,
            "broadbandBaseSpeed": self.broadband_base_speed,
            "extras": self.extras,
            "isActive": self.is_active,
            "monthlyTotal": self.monthly_total,
            "bundledProducts": self.bundled_products,
            "requiredConditions": self.required_conditions,
            "targetCarrier": self.target_carrier,
            "planCategory": self.plan_category,
        }


class UserRecord(Base):
    __tablename__ = "user_records"

    id = Column(Integer, primary_key=True, autoincrement=True)
    # 基本信息
    phone = Column(String(20), nullable=False)
    name = Column(String(100), default="")
    province = Column(String(50), default="")       # 县市
    grid = Column(String(100), default="")           # 网格
    address = Column(String(300), default="")        # 地址
    age = Column(Integer, default=0)                 # 年龄
    ethnicity = Column(String(50), default="")       # 民族
    carrier = Column(String(20), default="移动")        # 归属运营商
    # 套餐信息
    current_plan_name = Column(String(200), default="")
    current_price = Column(Float, default=0)
    # 异网用户填写的资费信息
    competitor_plan_name = Column(String(200), default="")  # 异网套餐名称
    competitor_plan_price = Column(Float, default=0)        # 异网套餐月费
    # 消费信息
    arpu_3_month = Column(Float, default=0)          # 折前ARPU
    arpu_3_month_after = Column(Float, default=0)    # 折后ARPU
    avg_data = Column(Float, default=0)              # DOU
    avg_voice = Column(Float, default=0)             # MOU
    overage_amount = Column(Float, default=0)        # 超套金额
    extra_consumption = Column(Float, default=0)     # 家新+个新+新兴超消金
    balance = Column(Float, default=0)               # 结余金额
    # 计算字段（推荐引擎填充）
    saturation_data = Column(Float, default=0)
    saturation_voice = Column(Float, default=0)
    # 宽带信息
    has_broadband = Column(Boolean, default=False)
    broadband_speed = Column(Float, default=0)
    is_fttr = Column(Boolean, default=False)
    # 客户标签
    customer_type = Column(String(50), default="")   # 拍照中高端/全球通/潜力客户
    is_zero_contract = Column(Boolean, default=False)    # 是否0合约
    is_old_plan = Column(Boolean, default=False)         # 是否老旧套餐
    is_same_cert_new = Column(Boolean, default=False)    # 是否同证新增
    is_dual_card = Column(Boolean, default=False)        # 是否异网双卡
    is_my_num_other_broadband = Column(Boolean, default=False)  # 是否我号异宽
    is_low_network_age = Column(Boolean, default=False)  # 是否拍照低网龄
    special_case = Column(String(200), default="")       # 一事一案名称
    # 批次
    batch_id = Column(String(50), index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    results = relationship("RecommendationResult", back_populates="user")

    def to_dict(self):
        return {
            "id": self.id,
            "phone": self.phone,
            "name": self.name,
            "province": self.province,
            "grid": self.grid,
            "address": self.address,
            "age": self.age,
            "ethnicity": self.ethnicity,
            "carrier": self.carrier,
            "currentPlanName": self.current_plan_name,
            "currentPrice": self.current_price,
            "competitorPlanName": self.competitor_plan_name,
            "competitorPlanPrice": self.competitor_plan_price,
            "arpu3Month": self.arpu_3_month,
            "arpu3MonthAfter": self.arpu_3_month_after,
            "avgData": self.avg_data,
            "avgVoice": self.avg_voice,
            "saturationData": self.saturation_data,
            "saturationVoice": self.saturation_voice,
            "overageAmount": self.overage_amount,
            "extraConsumption": self.extra_consumption,
            "balance": self.balance,
            "hasBroadband": self.has_broadband,
            "broadbandSpeed": self.broadband_speed,
            "isFTTR": self.is_fttr,
            "customerType": self.customer_type,
            "isZeroContract": self.is_zero_contract,
            "isOldPlan": self.is_old_plan,
            "isSameCertNew": self.is_same_cert_new,
            "isDualCard": self.is_dual_card,
            "isMyNumOtherBroadband": self.is_my_num_other_broadband,
            "isLowNetworkAge": self.is_low_network_age,
            "specialCase": self.special_case,
        }


class RecommendationResult(Base):
    __tablename__ = "recommendation_results"

    id = Column(String(100), primary_key=True)
    user_id = Column(Integer, ForeignKey("user_records.id"), nullable=False)
    recommended_plan_id = Column(String(50), ForeignKey("plans.id"), nullable=False)
    original_recommended_plan_id = Column(String(50), ForeignKey("plans.id"), nullable=False)
    reason = Column(Text, default="")
    script = Column(Text, default="")
    predicted_bill = Column(Float, default=0)
    risk_level = Column(String(10), default="low")
    save_amount = Column(Float, default=0)
    review_status = Column(String(20), default="pending")
    review_note = Column(Text, default="")
    selection_mode = Column(String(10), default="auto")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    user = relationship("UserRecord", back_populates="results")
    recommended_plan = relationship("Plan", foreign_keys=[recommended_plan_id])
    original_recommended_plan = relationship("Plan", foreign_keys=[original_recommended_plan_id])
    alternatives = relationship("ResultAlternative", back_populates="result", order_by="ResultAlternative.sort_order")


class ResultAlternative(Base):
    __tablename__ = "result_alternatives"

    id = Column(Integer, primary_key=True, autoincrement=True)
    result_id = Column(String(100), ForeignKey("recommendation_results.id"), nullable=False)
    plan_id = Column(String(50), ForeignKey("plans.id"), nullable=False)
    sort_order = Column(Integer, default=0)

    result = relationship("RecommendationResult", back_populates="alternatives")
    plan = relationship("Plan")


class AIConfig(Base):
    __tablename__ = "ai_config"

    id = Column(Integer, primary_key=True, default=1)
    provider_name = Column(String(100), default="OpenAI")
    protocol = Column(String(20), default="chat-completions")
    base_url = Column(String(500), default="https://api.openai.com")
    endpoint_path = Column(String(200), default="/v1/chat/completions")
    api_key = Column(String(500), default="")
    model = Column(String(100), default="gpt-5.4-mini")
    enabled = Column(Boolean, default=False)

    def to_dict_masked(self):
        key = self.api_key or ""
        masked = f"{key[:5]}...{key[-4:]}" if len(key) > 9 else ""
        return {
            "providerName": self.provider_name,
            "protocol": self.protocol,
            "baseUrl": self.base_url,
            "endpointPath": self.endpoint_path,
            "apiKey": masked,
            "model": self.model,
            "enabled": self.enabled,
        }

    def to_dict_full(self):
        return {
            "providerName": self.provider_name,
            "protocol": self.protocol,
            "baseUrl": self.base_url,
            "endpointPath": self.endpoint_path,
            "apiKey": self.api_key,
            "model": self.model,
            "enabled": self.enabled,
        }
