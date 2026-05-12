import io
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Plan, UserRecord, RecommendationResult, ResultAlternative
from ..schemas import RunRecommendationsRequest, UpdateResultRequest, RecomputeRequest
from ..services.engine import run_recommendation_engine, build_recommendation_result_for_plan

router = APIRouter(prefix="/recommendations", tags=["recommendations"])


def _result_to_dict(r: RecommendationResult, db: Session) -> dict:
    user = r.user
    rec_plan = r.recommended_plan
    orig_plan = r.original_recommended_plan
    alts = [a.plan.to_dict() for a in r.alternatives]

    return {
        "id": r.id,
        "user": user.to_dict(),
        "recommendedPlan": rec_plan.to_dict() if rec_plan else None,
        "originalRecommendedPlan": orig_plan.to_dict() if orig_plan else None,
        "alternatives": alts,
        "reason": r.reason,
        "script": r.script,
        "predictedBill": r.predicted_bill,
        "riskLevel": r.risk_level,
        "saveAmount": r.save_amount,
        "reviewStatus": r.review_status,
        "reviewNote": r.review_note,
        "selectionMode": r.selection_mode,
    }


@router.post("/run")
def run_engine(body: RunRecommendationsRequest, db: Session = Depends(get_db)):
    users = db.query(UserRecord).filter(UserRecord.batch_id == body.batch_id).all()
    if not users:
        raise HTTPException(status_code=404, detail="未找到该批次用户数据")

    plans = db.query(Plan).all()
    user_dicts = [u.to_dict() for u in users]

    results = run_recommendation_engine(user_dicts, plans)

    # Clear old results for this batch
    user_ids = [u.id for u in users]
    old_results = db.query(RecommendationResult).filter(RecommendationResult.user_id.in_(user_ids)).all()
    for old in old_results:
        db.query(ResultAlternative).filter(ResultAlternative.result_id == old.id).delete()
        db.delete(old)

    # Save new results
    count = 0
    for i, res in enumerate(results):
        result_id = f"{body.batch_id}_{i}_{int(datetime.utcnow().timestamp() * 1000)}"
        rec = RecommendationResult(
            id=result_id,
            user_id=users[i].id,
            recommended_plan_id=res["recommendedPlan"].id,
            original_recommended_plan_id=res["originalRecommendedPlan"].id,
            reason=res["reason"],
            script=res["script"],
            predicted_bill=res["predictedBill"],
            risk_level=res["riskLevel"],
            save_amount=res["saveAmount"],
            review_status="pending",
            review_note="",
            selection_mode="auto",
        )
        db.add(rec)
        db.flush()

        for j, alt in enumerate(res["alternatives"]):
            db.add(ResultAlternative(result_id=result_id, plan_id=alt.id, sort_order=j))

        count += 1

    db.commit()
    return {"count": count}


@router.get("")
def list_results(
    batch_id: str = Query(None),
    status: str = Query(None),
    search: str = Query(None),
    db: Session = Depends(get_db),
):
    query = db.query(RecommendationResult)

    if batch_id:
        user_ids = [u.id for u in db.query(UserRecord.id).filter(UserRecord.batch_id == batch_id).all()]
        query = query.filter(RecommendationResult.user_id.in_(user_ids))

    if status:
        query = query.filter(RecommendationResult.review_status == status)

    if search:
        user_ids = [
            u.id for u in db.query(UserRecord)
            .filter(UserRecord.phone.contains(search) | UserRecord.current_plan_name.contains(search))
            .all()
        ]
        query = query.filter(RecommendationResult.user_id.in_(user_ids))

    results = query.all()
    return [_result_to_dict(r, db) for r in results]


@router.get("/{result_id}")
def get_result(result_id: str, db: Session = Depends(get_db)):
    r = db.query(RecommendationResult).filter(RecommendationResult.id == result_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="推荐结果不存在")
    return _result_to_dict(r, db)


@router.put("/{result_id}")
def update_result(result_id: str, body: UpdateResultRequest, db: Session = Depends(get_db)):
    r = db.query(RecommendationResult).filter(RecommendationResult.id == result_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="推荐结果不存在")

    if body.reviewStatus is not None:
        r.review_status = body.reviewStatus
    if body.reviewNote is not None:
        r.review_note = body.reviewNote
    if body.script is not None:
        r.script = body.script
    if body.recommendedPlanId is not None:
        r.recommended_plan_id = body.recommendedPlanId
    if body.selectionMode is not None:
        r.selection_mode = body.selectionMode

    r.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(r)
    return _result_to_dict(r, db)


@router.post("/{result_id}/recompute")
def recompute_result(result_id: str, body: RecomputeRequest, db: Session = Depends(get_db)):
    r = db.query(RecommendationResult).filter(RecommendationResult.id == result_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="推荐结果不存在")

    user = r.user
    plans = db.query(Plan).all()

    new_result = build_recommendation_result_for_plan(user.to_dict(), body.plan_id, [p for p in plans])

    r.recommended_plan_id = new_result["recommendedPlan"].id
    r.reason = new_result["reason"]
    r.script = new_result["script"]
    r.predicted_bill = new_result["predictedBill"]
    r.risk_level = new_result["riskLevel"]
    r.save_amount = new_result["saveAmount"]
    r.selection_mode = "manual"
    r.updated_at = datetime.utcnow()

    # Update alternatives
    db.query(ResultAlternative).filter(ResultAlternative.result_id == result_id).delete()
    for j, alt in enumerate(new_result["alternatives"]):
        db.add(ResultAlternative(result_id=result_id, plan_id=alt.id, sort_order=j))

    db.commit()
    db.refresh(r)
    return _result_to_dict(r, db)


@router.get("/export/download")
def export_results(db: Session = Depends(get_db)):
    import openpyxl

    results = db.query(RecommendationResult).all()
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "推荐结果"

    headers = [
        "联系电话", "归属地", "当前套餐", "当前档位", "近三个月ARPU",
        "系统初始推荐", "当前宽带", "最终推荐套餐", "是否人工改选",
        "审核状态", "审核备注", "推荐理由", "AI营销话术",
        "预计月费", "预计节省", "风险等级",
    ]
    ws.append(headers)

    review_labels = {"pending": "待审核", "accepted": "已采纳", "rejected": "已拒绝"}

    for r in results:
        u = r.user
        rec = r.recommended_plan
        orig = r.original_recommended_plan
        ws.append([
            u.phone,
            u.province,
            u.current_plan_name,
            u.current_price,
            u.arpu_3_month,
            orig.name if orig else "",
            f"{u.broadband_speed}M" if u.has_broadband else "无",
            rec.name if rec else "",
            "是" if r.selection_mode == "manual" else "否",
            review_labels.get(r.review_status, r.review_status),
            r.review_note,
            r.reason,
            r.script,
            r.predicted_bill,
            r.save_amount,
            r.risk_level,
        ])

    from urllib.parse import quote
    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)

    date_str = datetime.now().strftime('%Y-%m-%d')
    ascii_name = f"recommendations_{date_str}.xlsx"
    utf8_name = f"推荐结果_{date_str}.xlsx"
    cd = f'attachment; filename="{ascii_name}"; filename*=UTF-8\'\'{quote(utf8_name)}'
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": cd},
    )


@router.delete("")
def clear_results(db: Session = Depends(get_db)):
    db.query(ResultAlternative).delete()
    db.query(RecommendationResult).delete()
    db.commit()
    return {"ok": True}
