import type { TariffPlan, UserRecord } from '../types';
import { CSV_HEADER_MAP, PLAN_HEADER_MAP, PLAN_REQUIRED_HEADERS } from '../constants';

declare global {
  interface Window {
    XLSX: any;
  }
}

const normalizeRatio = (value: number): number => {
  if (!Number.isFinite(value) || value <= 0) return 0;
  if (value > 1 && Number.isInteger(value) && value <= 100) return value / 100;
  if (value > 1) return 1;
  return value;
};

const parseBooleanValue = (value: unknown, defaultValue = false): boolean => {
  if (value === undefined || value === null || value === '') return defaultValue;
  const strVal = String(value).trim().toLowerCase();
  if (['是', 'yes', 'true', '1', 'y'].includes(strVal)) return true;
  if (['否', 'no', 'false', '0', 'n', '-'].includes(strVal)) return false;
  return defaultValue;
};

const safeNum = (value: unknown, defaultVal = 0): number => {
  if (value === undefined || value === null) return defaultVal;
  const strVal = String(value).trim();
  if (strVal === '' || strVal === '-') return defaultVal;
  const num = parseFloat(strVal);
  return Number.isFinite(num) ? num : defaultVal;
};

const safeStr = (value: unknown, defaultVal = ''): string => {
  if (value === undefined || value === null) return defaultVal;
  const strVal = String(value).trim();
  return (strVal === '' || strVal === '-') ? defaultVal : strVal;
};

export const parseExcelFile = (file: File): Promise<UserRecord[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        if (!window.XLSX) {
          reject(new Error('Excel解析库(XLSX)未加载，请检查网络连接后刷新页面'));
          return;
        }
        const data = e.target?.result;
        const workbook = window.XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = window.XLSX.utils.sheet_to_json(worksheet);
        // 同时按列号读取（兜底：某些列名可能被 XLSX.js 跳过）
        const rawData = window.XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];
        const rawHeaders: string[] = (rawData[0] || []).map(h => String(h ?? '').trim());
        console.log(`[XLSX] Sheet "${firstSheetName}": ${jsonData.length} rows, headers(${rawHeaders.length}):`, rawHeaders);

        // 建立列名→列索引映射
        const headerIdxMap: Record<string, number> = {};
        rawHeaders.forEach((h, i) => { if (h) headerIdxMap[h] = i; });

        const parsedData: UserRecord[] = [];

        for (let rowIdx = 0; rowIdx < jsonData.length; rowIdx++) {
          const row = jsonData[rowIdx];
          const rawRow = rawData[rowIdx + 1]; // +1 跳过表头
          const newRow: any = {};

          // Map Chinese headers to English keys
          Object.keys(CSV_HEADER_MAP).forEach((cnKey) => {
            const enKey = CSV_HEADER_MAP[cnKey];
            let value = row[cnKey];

            // 兜底：如果 jsonData 按名称找不到，从 rawData 按列索引取
            if (value === undefined && cnKey in headerIdxMap && rawRow) {
              value = rawRow[headerIdxMap[cnKey]];
            }

            // Numeric fields
            if (['currentPrice', 'arpu3Month', 'arpu3MonthAfter', 'avgData', 'avgVoice',
                 'overageAmount', 'extraConsumption', 'balance', 'broadbandSpeed', 'age'].includes(enKey)) {
              value = safeNum(value);
            }
            // Boolean fields (1/0)
            if (['hasBroadband', 'isFTTR', 'isZeroContract', 'isOldPlan'].includes(enKey)) {
              value = parseBooleanValue(value);
            }
            // String fields
            if (['phone', 'name', 'province', 'grid', 'address', 'ethnicity',
                 'customerType', 'specialCase', 'carrier'].includes(enKey)) {
              value = safeStr(value);
            }
            // 检测 FTTR（从套餐名匹配"全光"）
            if (enKey === 'currentPlanName') {
              const planName = safeStr(value);
              value = planName;
              if (planName.includes('全光') || planName.includes('FTTR')) {
                newRow['isFTTR'] = true;
              }
            }

            newRow[enKey] = value;
          });

          // 跳过无手机号或非移动用户（如果有归属运营商字段）
          if (!newRow.phone) continue;
          // 跳过套餐信息完全为空的记录
          if (!newRow.currentPlanName) newRow.currentPlanName = '';
          if (!newRow.currentPrice) newRow.currentPrice = 0;

          // Default boolean fields if missing
          if (newRow.hasBroadband === undefined) newRow.hasBroadband = false;
          if (newRow.isFTTR === undefined) newRow.isFTTR = false;
          if (newRow.broadbandSpeed === undefined) newRow.broadbandSpeed = 0;
          if (newRow.isZeroContract === undefined) newRow.isZeroContract = false;
          if (newRow.isOldPlan === undefined) newRow.isOldPlan = false;

          parsedData.push(newRow as UserRecord);
        }
        console.log(`[XLSX] Parsed: ${parsedData.length} valid users from ${jsonData.length} rows`);
        resolve(parsedData);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsBinaryString(file);
  });
};

export const generatePlanTemplate = () => {
  if (!window.XLSX) {
    alert('Excel处理库加载失败，请刷新页面重试');
    return;
  }
  const headers = PLAN_REQUIRED_HEADERS.map(item => item.name);
  const data = [
    {
      '套餐编码': '20252063',
      '套餐名称': '5G畅享套餐49元',
      '资费': 49,
      '月费总额': 49,
      '流量': 60,
      '语音': 700,
      '是否含宽带': '否',
      '宽带速率': 0,
      '原始宽带速率': 0,
      '是否FTTR': '否',
      '其他权益': '视频彩铃, 任我选黄金会员',
      '搭载产品': '',
      '办理条件': '',
      '目标用户': 'all',
      '套餐分类': 'personal',
      '是否上架': '是',
    },
    {
      '套餐编码': '20263028',
      '套餐名称': '71元5G全家享（AI爱家版）',
      '资费': 59,
      '月费总额': 71,
      '流量': 80,
      '语音': 900,
      '是否含宽带': '是',
      '宽带速率': 1000,
      '原始宽带速率': 500,
      '是否FTTR': '否',
      '其他权益': 'WIFI6路由器',
      '搭载产品': 'WIFI6路由器+5元新片速递遥控版+6元新片速递+1元千兆提速包',
      '办理条件': '主套餐59元及以下办理',
      '目标用户': 'all',
      '套餐分类': 'broadband',
      '是否上架': '是',
    },
    {
      '套餐编码': '999001810523252',
      '套餐名称': '60元5G全家享惠民资费（教育版）',
      '资费': 59,
      '月费总额': 60,
      '流量': 250,
      '语音': 1500,
      '是否含宽带': '是',
      '宽带速率': 1000,
      '原始宽带速率': 500,
      '是否FTTR': '否',
      '其他权益': 'WIFI6路由器+爱家教育包',
      '搭载产品': 'WIFI6路由器+爱家教育包+1元千兆提速包',
      '办理条件': '',
      '目标用户': 'competitor',
      '套餐分类': 'competitive',
      '是否上架': '是',
    },
  ];

  const ws = window.XLSX.utils.json_to_sheet(data, { header: headers });
  const wb = window.XLSX.utils.book_new();
  window.XLSX.utils.book_append_sheet(wb, ws, '套餐导入模板');
  window.XLSX.writeFile(wb, '套餐导入模板.xlsx');
};

export const parsePlanExcelFile = (file: File): Promise<TariffPlan[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = window.XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rows = window.XLSX.utils.sheet_to_json(worksheet, { defval: '' }) as Record<string, unknown>[];

        const headerRow = window.XLSX.utils.sheet_to_json(worksheet, { header: 1, range: 0, blankrows: false })[0] as string[] | undefined;
        const missingHeaders = PLAN_REQUIRED_HEADERS
          .filter(header => header.required && !(headerRow || []).includes(header.name))
          .map(header => header.name);

        if (missingHeaders.length > 0) {
          throw new Error(`缺少必要表头：${missingHeaders.join('、')}`);
        }

        if (rows.length === 0) {
          throw new Error('套餐文件为空，请至少保留一条套餐记录。');
        }

        const importedPlans: TariffPlan[] = [];
        const rowErrors: string[] = [];
        const seenIds = new Set<string>();

        rows.forEach((row, index) => {
          const rowNo = index + 2;
          const mapped: Record<string, unknown> = {};

          Object.keys(PLAN_HEADER_MAP).forEach((cnKey) => {
            const enKey = PLAN_HEADER_MAP[cnKey];
            mapped[enKey] = row[cnKey];
          });

          const id = String(mapped.id || '').trim();
          const name = String(mapped.name || '').trim();
          const price = Number(mapped.price);
          const monthlyTotal = Number(mapped.monthlyTotal || 0);
          const dataValue = Number(mapped.data);
          const voice = Number(mapped.voice);
          const hasBroadband = parseBooleanValue(mapped.hasBroadband, false);
          const broadbandSpeed = Number(mapped.broadbandSpeed || 0);
          const broadbandBaseSpeed = Number(mapped.broadbandBaseSpeed || 0);
          const isFTTR = parseBooleanValue(mapped.isFTTR, false);
          const extras = String(mapped.extras || '').trim();
          const isActive = parseBooleanValue(mapped.isActive, true);
          const requiredConditions = String(mapped.requiredConditions || '').trim();
          const targetCarrier = String(mapped.targetCarrier || 'all').trim() || 'all';
          const planCategory = String(mapped.planCategory || 'personal').trim() || 'personal';
          // 搭载产品文本 → JSON
          const bpText = String(mapped.bundledProductsText || '').trim();
          let bundledProducts = '[]';
          if (bpText) {
            const items = bpText.split('+').map(s => s.trim()).filter(Boolean);
            bundledProducts = JSON.stringify(items.map(item => {
              const m = item.match(/^(.+?)(\d+)元$/);
              return m ? { name: m[1], code: '-', price: Number(m[2]), required: true, note: '必搭载' }
                       : { name: item, code: '-', price: 0, required: true, note: '必搭载' };
            }));
          }

          if (!id) rowErrors.push(`第 ${rowNo} 行：套餐编码不能为空`);
          if (!name) rowErrors.push(`第 ${rowNo} 行：套餐名称不能为空`);
          if (!Number.isFinite(price) || price < 0) rowErrors.push(`第 ${rowNo} 行：资费必须是大于等于 0 的数字`);
          if (!Number.isFinite(dataValue) || dataValue < 0) rowErrors.push(`第 ${rowNo} 行：流量必须是大于等于 0 的数字`);
          if (!Number.isFinite(voice) || voice < 0) rowErrors.push(`第 ${rowNo} 行：语音必须是大于等于 0 的数字`);
          if (!Number.isFinite(broadbandSpeed) || broadbandSpeed < 0) rowErrors.push(`第 ${rowNo} 行：宽带速率必须是大于等于 0 的数字`);
          if (hasBroadband && broadbandSpeed <= 0) rowErrors.push(`第 ${rowNo} 行：含宽带套餐必须填写大于 0 的宽带速率`);
          if (!hasBroadband && broadbandSpeed > 0) rowErrors.push(`第 ${rowNo} 行：无宽带套餐的宽带速率应为 0`);
          if (isFTTR && !hasBroadband) rowErrors.push(`第 ${rowNo} 行：FTTR 套餐必须同时包含宽带`);
          if (seenIds.has(id)) rowErrors.push(`第 ${rowNo} 行：套餐编码 ${id} 重复`);

          seenIds.add(id);

          importedPlans.push({
            id,
            name,
            price,
            data: dataValue,
            voice,
            hasBroadband,
            broadbandSpeed: hasBroadband ? broadbandSpeed : 0,
            broadbandBaseSpeed: hasBroadband ? broadbandBaseSpeed : 0,
            isFTTR,
            extras,
            isActive,
            monthlyTotal: monthlyTotal || price,
            bundledProducts,
            requiredConditions,
            targetCarrier,
            planCategory,
          });
        });

        if (rowErrors.length > 0) {
          throw new Error(rowErrors.slice(0, 8).join('\n'));
        }

        resolve(importedPlans);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsBinaryString(file);
  });
};

export const generateTemplate = () => {
  if (!window.XLSX) {
    alert('Excel处理库加载失败，请刷新页面重试');
    return;
  }
  const headers = [
    '联系电话', '姓名', '归属运营商', '县市', '网格', '地址', '年龄', '民族',
    '套餐名称', '套餐档位',
    '近三月月均折前ARPU(元)', '近三月月均折后ARPU',
    '近三月DOU（GB）', '近三月MOU',
    '近三月月均语音+流量超套金额', '近三月月均家新+个新+新兴超消金',
    '结余金额',
    '是否宽带客户', '宽带带宽',
    '客户类型', '是否是0合约客户', '是否是老旧套餐', '一事一案名称'
  ];

  const data = [
    {
      '联系电话': '13899632887',
      '姓名': '张三',
      '归属运营商': '移动',
      '县市': '奇台',
      '网格': '奇台县城东网格',
      '地址': '奇台镇#美居苑二号13-1-401',
      '年龄': 51,
      '民族': '汉族',
      '套餐名称': '畅享家58元套餐基础产品',
      '套餐档位': 58,
      '近三月月均折前ARPU(元)': 69.2,
      '近三月月均折后ARPU': 69.1,
      '近三月DOU（GB）': 11.5,
      '近三月MOU': 1415,
      '近三月月均语音+流量超套金额': 3.6,
      '近三月月均家新+个新+新兴超消金': 5,
      '结余金额': 296.57,
      '是否宽带客户': 1,
      '宽带带宽': 300,
      '客户类型': '拍照中高端',
      '是否是0合约客户': 0,
      '是否是老旧套餐': 1,
      '一事一案名称': '承诺消费尊享特惠-75元（36个月）'
    },
    {
      '联系电话': '17881002086',
      '姓名': '阿达勒',
      '县市': '奇台',
      '网格': '奇台县城东网格',
      '地址': '奇台镇#美居苑五号楼一单元二楼右',
      '年龄': 52,
      '民族': '哈萨克族',
      '套餐名称': '全家享套餐59元（升级扩容版）基础产品',
      '套餐档位': 59,
      '近三月月均折前ARPU(元)': 63.1,
      '近三月月均折后ARPU': 63.1,
      '近三月DOU（GB）': 15.57,
      '近三月MOU': 1029,
      '近三月月均语音+流量超套金额': 0,
      '近三月月均家新+个新+新兴超消金': 0,
      '结余金额': 47.2,
      '是否宽带客户': 1,
      '宽带带宽': 1000,
      '客户类型': '拍照中高端',
      '是否是0合约客户': 0,
      '是否是老旧套餐': 0,
      '一事一案名称': '-'
    }
  ];

  const ws = window.XLSX.utils.json_to_sheet(data, { header: headers });
  const wb = window.XLSX.utils.book_new();
  window.XLSX.utils.book_append_sheet(wb, ws, "用户数据模板");
  window.XLSX.writeFile(wb, "用户导入模板.xlsx");
};
