import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Plan
from ..schemas import PlanCreate, PlanUpdate, PlanImportItem

router = APIRouter(prefix="/plans", tags=["plans"])


@router.get("")
def list_plans(active_only: bool = False, db: Session = Depends(get_db)):
    query = db.query(Plan)
    if active_only:
        query = query.filter(Plan.is_active == True)
    plans = query.all()
    return [p.to_dict() for p in plans]


@router.post("", status_code=201)
def create_plan(body: PlanCreate, db: Session = Depends(get_db)):
    plan = Plan(
        id=uuid.uuid4().hex[:16],
        name=body.name,
        price=body.price,
        data=body.data,
        voice=body.voice,
        has_broadband=body.hasBroadband,
        broadband_speed=body.broadbandSpeed,
        broadband_base_speed=body.broadbandBaseSpeed,
        is_fttr=body.isFTTR,
        extras=body.extras,
        is_active=body.isActive,
        monthly_total=body.monthlyTotal,
        bundled_products=body.bundledProducts,
        required_conditions=body.requiredConditions,
        target_carrier=body.targetCarrier,
        plan_category=body.planCategory,
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return plan.to_dict()


@router.put("/{plan_id}")
def update_plan(plan_id: str, body: PlanUpdate, db: Session = Depends(get_db)):
    plan = db.query(Plan).filter(Plan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="套餐不存在")

    if body.name is not None:
        plan.name = body.name
    if body.price is not None:
        plan.price = body.price
    if body.data is not None:
        plan.data = body.data
    if body.voice is not None:
        plan.voice = body.voice
    if body.hasBroadband is not None:
        plan.has_broadband = body.hasBroadband
    if body.broadbandSpeed is not None:
        plan.broadband_speed = body.broadbandSpeed
    if body.broadbandBaseSpeed is not None:
        plan.broadband_base_speed = body.broadbandBaseSpeed
    if body.isFTTR is not None:
        plan.is_fttr = body.isFTTR
    if body.extras is not None:
        plan.extras = body.extras
    if body.isActive is not None:
        plan.is_active = body.isActive
    if body.monthlyTotal is not None:
        plan.monthly_total = body.monthlyTotal
    if body.bundledProducts is not None:
        plan.bundled_products = body.bundledProducts
    if body.requiredConditions is not None:
        plan.required_conditions = body.requiredConditions
    if body.targetCarrier is not None:
        plan.target_carrier = body.targetCarrier
    if body.planCategory is not None:
        plan.plan_category = body.planCategory

    db.commit()
    db.refresh(plan)
    return plan.to_dict()


@router.delete("/{plan_id}")
def delete_plan(plan_id: str, db: Session = Depends(get_db)):
    plan = db.query(Plan).filter(Plan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="套餐不存在")
    db.delete(plan)
    db.commit()
    return {"ok": True}


@router.patch("/{plan_id}/toggle")
def toggle_plan(plan_id: str, db: Session = Depends(get_db)):
    plan = db.query(Plan).filter(Plan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="套餐不存在")
    plan.is_active = not plan.is_active
    db.commit()
    db.refresh(plan)
    return plan.to_dict()


@router.post("/import")
def import_plans(plans: list[PlanImportItem], db: Session = Depends(get_db)):
    # Clear existing plans and replace (wrapped in try for rollback safety)
    try:
        db.query(Plan).delete()
        db.flush()
        for item in plans:
            plan = Plan(
                id=item.id,
                name=item.name,
                price=item.price,
                data=item.data,
                voice=item.voice,
                has_broadband=item.hasBroadband,
                broadband_speed=item.broadbandSpeed,
                broadband_base_speed=item.broadbandBaseSpeed,
                is_fttr=item.isFTTR,
                extras=item.extras,
                is_active=item.isActive,
                monthly_total=item.monthlyTotal,
                bundled_products=item.bundledProducts,
                required_conditions=item.requiredConditions,
                target_carrier=item.targetCarrier,
                plan_category=item.planCategory,
            )
            db.add(plan)
        db.commit()
    except Exception:
        db.rollback()
        raise
    return {"count": len(plans)}
