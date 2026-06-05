from pydantic import BaseModel
from typing import Optional


# --- Plan schemas ---

class PlanCreate(BaseModel):
    name: str
    price: float
    data: float
    voice: float
    hasBroadband: bool = False
    broadbandSpeed: float = 0
    broadbandBaseSpeed: float = 0
    isFTTR: bool = False
    extras: Optional[str] = None
    isActive: bool = True
    monthlyTotal: float = 0
    bundledProducts: Optional[str] = None
    requiredConditions: Optional[str] = None
    targetCarrier: str = "all"
    planCategory: str = "personal"


class PlanUpdate(BaseModel):
    name: Optional[str] = None
    price: Optional[float] = None
    data: Optional[float] = None
    voice: Optional[float] = None
    hasBroadband: Optional[bool] = None
    broadbandSpeed: Optional[float] = None
    broadbandBaseSpeed: Optional[float] = None
    isFTTR: Optional[bool] = None
    extras: Optional[str] = None
    isActive: Optional[bool] = None
    monthlyTotal: Optional[float] = None
    bundledProducts: Optional[str] = None
    requiredConditions: Optional[str] = None
    targetCarrier: Optional[str] = None
    planCategory: Optional[str] = None


class PlanImportItem(BaseModel):
    id: str
    name: str
    price: float
    data: float
    voice: float
    hasBroadband: bool = False
    broadbandSpeed: float = 0
    broadbandBaseSpeed: float = 0
    isFTTR: bool = False
    extras: Optional[str] = None
    isActive: bool = True
    monthlyTotal: float = 0
    bundledProducts: Optional[str] = None
    requiredConditions: Optional[str] = None
    targetCarrier: str = "all"
    planCategory: str = "personal"


# --- User schemas ---

class UserImportItem(BaseModel):
    phone: str
    name: str = ""
    province: str = ""
    grid: str = ""
    address: str = ""
    age: int = 0
    ethnicity: str = ""
    carrier: str = "移动"
    currentPlanName: str = ""
    currentPrice: float = 0
    competitorPlanName: str = ""
    competitorPlanPrice: float = 0
    arpu3Month: float = 0
    arpu3MonthAfter: float = 0
    avgData: float = 0
    avgVoice: float = 0
    saturationData: float = 0
    saturationVoice: float = 0
    overageAmount: float = 0
    extraConsumption: float = 0
    balance: float = 0
    hasBroadband: bool = False
    broadbandSpeed: float = 0
    isFTTR: bool = False
    customerType: str = ""
    isZeroContract: bool = False
    isOldPlan: bool = False
    isSameCertNew: bool = False
    isDualCard: bool = False
    isMyNumOtherBroadband: bool = False
    isLowNetworkAge: bool = False
    specialCase: str = ""


# --- Recommendation schemas ---

class RunRecommendationsRequest(BaseModel):
    batch_id: str


class UpdateResultRequest(BaseModel):
    reviewStatus: Optional[str] = None
    reviewNote: Optional[str] = None
    script: Optional[str] = None
    recommendedPlanId: Optional[str] = None
    selectionMode: Optional[str] = None


class RecomputeRequest(BaseModel):
    plan_id: str


# --- AI schemas ---

class AIConfigUpdate(BaseModel):
    providerName: Optional[str] = None
    protocol: Optional[str] = None
    baseUrl: Optional[str] = None
    endpointPath: Optional[str] = None
    apiKey: Optional[str] = None
    model: Optional[str] = None
    enabled: Optional[bool] = None


class AITestRequest(BaseModel):
    providerName: str = "OpenAI"
    protocol: str = "chat-completions"
    baseUrl: str = "https://api.openai.com"
    endpointPath: str = "/v1/chat/completions"
    apiKey: str = ""
    model: str = "gpt-5.4-mini"
    enabled: bool = True


class GenerateScriptRequest(BaseModel):
    result_id: str
