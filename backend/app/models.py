from sqlalchemy import Column, String, Float, Boolean, Integer, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime

from .database import Base


class Plan(Base):
    __tablename__ = "plans"

    id = Column(String(50), primary_key=True)
    name = Column(String(200), nullable=False)
    price = Column(Float, nullable=False)
    data = Column(Float, nullable=False)
    voice = Column(Float, nullable=False)
    has_broadband = Column(Boolean, nullable=False, default=False)
    broadband_speed = Column(Float, nullable=False, default=0)
    is_fttr = Column(Boolean, nullable=False, default=False)
    extras = Column(Text, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)

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
            "extras": self.extras,
            "isActive": self.is_active,
        }


class UserRecord(Base):
    __tablename__ = "user_records"

    id = Column(Integer, primary_key=True, autoincrement=True)
    phone = Column(String(20), nullable=False)
    province = Column(String(50), default="")
    current_plan_name = Column(String(200), default="")
    current_price = Column(Float, default=0)
    arpu_3_month = Column(Float, default=0)
    avg_data = Column(Float, default=0)
    avg_voice = Column(Float, default=0)
    saturation_data = Column(Float, default=0)
    saturation_voice = Column(Float, default=0)
    overage_amount = Column(Float, default=0)
    plan_type = Column(String(50), default="")
    has_broadband = Column(Boolean, default=False)
    broadband_speed = Column(Float, default=0)
    is_fttr = Column(Boolean, default=False)
    remark = Column(Text, default="")
    batch_id = Column(String(50), index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    results = relationship("RecommendationResult", back_populates="user")

    def to_dict(self):
        return {
            "phone": self.phone,
            "province": self.province,
            "currentPlanName": self.current_plan_name,
            "currentPrice": self.current_price,
            "arpu3Month": self.arpu_3_month,
            "avgData": self.avg_data,
            "avgVoice": self.avg_voice,
            "saturationData": self.saturation_data,
            "saturationVoice": self.saturation_voice,
            "overageAmount": self.overage_amount,
            "planType": self.plan_type,
            "hasBroadband": self.has_broadband,
            "broadbandSpeed": self.broadband_speed,
            "isFTTR": self.is_fttr,
            "remark": self.remark,
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
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

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
