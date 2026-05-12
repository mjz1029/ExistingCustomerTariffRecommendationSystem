import uuid
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import UserRecord
from ..schemas import UserImportItem

router = APIRouter(prefix="/users", tags=["users"])


@router.post("/import")
def import_users(users: list[UserImportItem], db: Session = Depends(get_db)):
    batch_id = uuid.uuid4().hex[:12]

    for item in users:
        record = UserRecord(
            phone=item.phone,
            province=item.province,
            current_plan_name=item.currentPlanName,
            current_price=item.currentPrice,
            arpu_3_month=item.arpu3Month,
            avg_data=item.avgData,
            avg_voice=item.avgVoice,
            saturation_data=item.saturationData,
            saturation_voice=item.saturationVoice,
            overage_amount=item.overageAmount,
            plan_type=item.planType,
            has_broadband=item.hasBroadband,
            broadband_speed=item.broadbandSpeed,
            is_fttr=item.isFTTR,
            remark=item.remark,
            batch_id=batch_id,
        )
        db.add(record)

    db.commit()
    return {"batch_id": batch_id, "count": len(users)}
