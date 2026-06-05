from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import AIConfig, RecommendationResult, Plan
from ..schemas import AIConfigUpdate, AITestRequest, GenerateScriptRequest
from ..services.ai_service import generate_recommendation_script, test_provider_connection, normalize_config

router = APIRouter(prefix="/ai", tags=["ai"])


def _get_or_create_config(db: Session) -> AIConfig:
    config = db.query(AIConfig).filter(AIConfig.id == 1).first()
    if not config:
        config = AIConfig(id=1)
        db.add(config)
        db.commit()
        db.refresh(config)
    return config


@router.get("/config")
def get_config(db: Session = Depends(get_db)):
    config = _get_or_create_config(db)
    return config.to_dict_masked()


@router.put("/config")
def update_config(body: AIConfigUpdate, db: Session = Depends(get_db)):
    config = _get_or_create_config(db)

    if body.providerName is not None:
        config.provider_name = body.providerName
    if body.protocol is not None:
        config.protocol = body.protocol
    if body.baseUrl is not None:
        config.base_url = body.baseUrl
    if body.endpointPath is not None:
        config.endpoint_path = body.endpointPath
    if body.apiKey is not None and body.apiKey:
        # Only update if not masked
        if not ("..." in body.apiKey and len(body.apiKey) < 20):
            config.api_key = body.apiKey
    if body.model is not None:
        config.model = body.model
    if body.enabled is not None:
        config.enabled = body.enabled

    db.commit()
    db.refresh(config)
    return config.to_dict_masked()


@router.post("/test")
async def test_connection(body: AITestRequest):
    config_dict = {
        "providerName": body.providerName,
        "protocol": body.protocol,
        "baseUrl": body.baseUrl,
        "endpointPath": body.endpointPath,
        "apiKey": body.apiKey,
        "model": body.model,
        "enabled": body.enabled,
    }
    try:
        result = await test_provider_connection(config_dict)
        return {"success": True, "message": result}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/generate-script")
async def generate_script(body: GenerateScriptRequest, db: Session = Depends(get_db)):
    # Get AI config
    ai_config = _get_or_create_config(db)
    if not ai_config.enabled or not ai_config.api_key:
        raise HTTPException(status_code=400, detail="请先在 AI 设置中启用并配置 API Key。")

    # Get recommendation result
    r = db.query(RecommendationResult).filter(RecommendationResult.id == body.result_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="推荐结果不存在")

    # Build result dict for AI service
    plan_dict = r.recommended_plan.to_dict() if r.recommended_plan else {}
    result_dict = {
        "user": r.user.to_dict(),
        "recommendedPlan": plan_dict,
        "reason": r.reason,
        "riskLevel": r.risk_level,
        "saveAmount": r.save_amount,
        "reviewNote": r.review_note,
        "selectionMode": r.selection_mode,
        "monthlyTotal": r.predicted_bill or plan_dict.get("monthlyTotal", 0) or plan_dict.get("price", 0),
        "bundledInfo": "",  # will be populated if needed
        "requiredConditions": plan_dict.get("requiredConditions", ""),
    }

    # Parse bundled products for the prompt
    import json as _json
    raw_bp = plan_dict.get("bundledProducts", "") or ""
    if raw_bp:
        try:
            bp_list = _json.loads(raw_bp) if isinstance(raw_bp, str) else raw_bp
            if isinstance(bp_list, list):
                required_items = [b["name"] for b in bp_list if b.get("required")]
                if required_items:
                    result_dict["bundledInfo"] = "需同时办理：" + " + ".join(required_items)
        except Exception:
            pass

    config_dict = ai_config.to_dict_full()

    try:
        script = await generate_recommendation_script(result_dict, config_dict)
        return {"script": script}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
