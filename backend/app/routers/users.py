import uuid
from io import BytesIO
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import UserRecord
from ..schemas import UserImportItem

router = APIRouter(prefix="/users", tags=["users"])


def _clean_str(v, default=""):
    """清洗字符串，'-' 视为空"""
    if v is None:
        return default
    s = str(v).strip()
    return default if s in ("", "-") else s


def _clean_num(v, default=0):
    """清洗数值，'-' / None / 非法值视为默认"""
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


@router.post("/import")
def import_users(users: list[UserImportItem], db: Session = Depends(get_db)):
    batch_id = uuid.uuid4().hex[:12]
    count = 0

    for item in users:
        # 跳过无手机号的记录
        phone = _clean_str(item.phone)
        if not phone:
            continue

        record = UserRecord(
            phone=phone,
            name=_clean_str(item.name),
            province=_clean_str(item.province),
            grid=_clean_str(item.grid),
            address=_clean_str(item.address),
            age=int(_clean_num(item.age, 0)),
            ethnicity=_clean_str(item.ethnicity),
            carrier=_clean_str(item.carrier, "移动"),
            current_plan_name=_clean_str(item.currentPlanName),
            current_price=_clean_num(item.currentPrice),
            competitor_plan_name=_clean_str(item.competitorPlanName),
            competitor_plan_price=_clean_num(item.competitorPlanPrice),
            arpu_3_month=_clean_num(item.arpu3Month),
            arpu_3_month_after=_clean_num(item.arpu3MonthAfter),
            avg_data=_clean_num(item.avgData),
            avg_voice=_clean_num(item.avgVoice),
            saturation_data=_clean_num(item.saturationData),
            saturation_voice=_clean_num(item.saturationVoice),
            overage_amount=_clean_num(item.overageAmount),
            extra_consumption=_clean_num(item.extraConsumption),
            balance=_clean_num(item.balance),
            has_broadband=bool(item.hasBroadband),
            broadband_speed=_clean_num(item.broadbandSpeed),
            is_fttr=bool(item.isFTTR),
            customer_type=_clean_str(item.customerType),
            is_zero_contract=bool(item.isZeroContract),
            is_old_plan=bool(item.isOldPlan),
            is_same_cert_new=bool(item.isSameCertNew),
            is_dual_card=bool(item.isDualCard),
            is_my_num_other_broadband=bool(item.isMyNumOtherBroadband),
            is_low_network_age=bool(item.isLowNetworkAge),
            special_case=_clean_str(item.specialCase),
            batch_id=batch_id,
        )
        db.add(record)
        count += 1

    db.commit()
    return {"batch_id": batch_id, "count": count}


class UpdateCompetitorPlan(BaseModel):
    competitorPlanName: str = ""
    competitorPlanPrice: float = 0
    currentPlanName: str = ""
    currentPrice: float = 0
    avgData: float = 0
    avgVoice: float = 0
    hasBroadband: bool = False
    broadbandSpeed: float = 0
    isFTTR: bool = False


@router.patch("/{user_id}")
def update_user_fields(user_id: int, body: UpdateCompetitorPlan, db: Session = Depends(get_db)):
    user = db.query(UserRecord).filter(UserRecord.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    user.competitor_plan_name = body.competitorPlanName
    user.competitor_plan_price = body.competitorPlanPrice
    if body.currentPlanName:
        user.current_plan_name = body.currentPlanName
    if body.currentPrice > 0:
        user.current_price = body.currentPrice
    if body.avgData > 0:
        user.avg_data = body.avgData
    if body.avgVoice > 0:
        user.avg_voice = body.avgVoice
    user.has_broadband = body.hasBroadband
    if body.broadbandSpeed > 0:
        user.broadband_speed = body.broadbandSpeed
    user.is_fttr = body.isFTTR
    db.commit()
    db.refresh(user)
    return user.to_dict()


# ─────────────────────────────────────────────
# 文件上传解析 + 导入（用 openpyxl 替代前端 XLSX.js）
# ─────────────────────────────────────────────
HEADER_MAP = {
    '县市': 'province', '网格': 'grid', '地址': 'address',
    '姓名': 'name', '联系电话': 'phone', '归属运营商': 'carrier',
    '客户类型': 'customerType', '年龄': 'age', '民族': 'ethnicity',
    '结余金额': 'balance', '套餐名称': 'currentPlanName', '套餐档位': 'currentPrice',
    '是否宽带客户': 'hasBroadband', '宽带带宽': 'broadbandSpeed',
    '近三月月均折前ARPU(元)': 'arpu3Month', '近三月月均折后ARPU': 'arpu3MonthAfter',
    '近三月DOU（GB）': 'avgData', '近三月MOU': 'avgVoice',
    '近三月月均语音+流量超套金额': 'overageAmount',
    '近三月月均家新+个新+新兴超消金': 'extraConsumption',
    '是否是0合约客户': 'isZeroContract', '是否是老旧套餐': 'isOldPlan',
    '是否是同证新增': 'isSameCertNew', '是否是异网双卡': 'isDualCard',
    '是否是我号异宽': 'isMyNumOtherBroadband', '是否是拍照低网龄': 'isLowNetworkAge',
    '一事一案名称': 'specialCase',
    '是否FTTR': 'isFTTR', '是否全光': 'isFTTR',
}
NUM_FIELDS = {'currentPrice', 'arpu3Month', 'arpu3MonthAfter', 'avgData', 'avgVoice',
              'overageAmount', 'extraConsumption', 'balance', 'broadbandSpeed', 'age'}
BOOL_FIELDS = {'hasBroadband', 'isFTTR', 'isZeroContract', 'isOldPlan',
               'isSameCertNew', 'isDualCard', 'isMyNumOtherBroadband', 'isLowNetworkAge'}
STR_FIELDS = {'phone', 'name', 'province', 'grid', 'address', 'ethnicity',
              'customerType', 'specialCase', 'carrier'}


@router.post("/import-excel")
async def import_excel(file: UploadFile = File(...), db: Session = Depends(get_db)):
    import openpyxl
    content = await file.read()
    wb = openpyxl.load_workbook(BytesIO(content), read_only=True)
    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))
    wb.close()

    if not rows:
        raise HTTPException(400, "Excel文件为空")

    header = [str(h).strip() if h else '' for h in rows[0]]
    batch_id = uuid.uuid4().hex[:12]
    count = 0
    skipped = 0

    for row in rows[1:]:
        vals = list(row)
        mapped = {}
        for j, h in enumerate(header):
            if h in HEADER_MAP and j < len(vals):
                mapped[HEADER_MAP[h]] = vals[j]

        phone = _clean_str(mapped.get('phone'))
        if not phone:
            skipped += 1
            continue

        def _num(k):
            v = mapped.get(k)
            if v is None or str(v).strip() in ('', '-', 'None'):
                return 0
            try:
                return float(v)
            except (ValueError, TypeError):
                return 0

        def _bool(k):
            v = mapped.get(k)
            if v is None:
                return False
            s = str(v).strip().lower()
            return s in ('1', 'true', '是', 'yes')

        # 检测 FTTR（从套餐名匹配"全光"）
        plan_name = _clean_str(mapped.get('currentPlanName'))
        is_fttr = _bool('isFTTR') or '全光' in plan_name or 'FTTR' in plan_name

        record = UserRecord(
            phone=phone,
            name=_clean_str(mapped.get('name')),
            province=_clean_str(mapped.get('province')),
            grid=_clean_str(mapped.get('grid')),
            address=_clean_str(mapped.get('address')),
            age=int(_num('age')),
            ethnicity=_clean_str(mapped.get('ethnicity')),
            carrier=_clean_str(mapped.get('carrier'), '移动'),
            current_plan_name=plan_name,
            current_price=_num('currentPrice'),
            arpu_3_month=_num('arpu3Month'),
            arpu_3_month_after=_num('arpu3MonthAfter'),
            avg_data=_num('avgData'),
            avg_voice=_num('avgVoice'),
            saturation_data=0,
            saturation_voice=0,
            overage_amount=_num('overageAmount'),
            extra_consumption=_num('extraConsumption'),
            balance=_num('balance'),
            has_broadband=_bool('hasBroadband'),
            broadband_speed=_num('broadbandSpeed'),
            is_fttr=is_fttr,
            customer_type=_clean_str(mapped.get('customerType')),
            is_zero_contract=_bool('isZeroContract'),
            is_old_plan=_bool('isOldPlan'),
            is_same_cert_new=_bool('isSameCertNew'),
            is_dual_card=_bool('isDualCard'),
            is_my_num_other_broadband=_bool('isMyNumOtherBroadband'),
            is_low_network_age=_bool('isLowNetworkAge'),
            special_case=_clean_str(mapped.get('specialCase')),
            batch_id=batch_id,
        )
        db.add(record)
        count += 1

    db.commit()
    return {"batch_id": batch_id, "count": count, "skipped": skipped, "total_rows": len(rows) - 1}
