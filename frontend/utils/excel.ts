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
  if (['否', 'no', 'false', '0', 'n'].includes(strVal)) return false;
  return defaultValue;
};

export const parseExcelFile = (file: File): Promise<UserRecord[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = window.XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = window.XLSX.utils.sheet_to_json(worksheet);

        const parsedData: UserRecord[] = jsonData.map((row: any) => {
          const newRow: any = {};
          // Map Chinese headers to English keys
          Object.keys(CSV_HEADER_MAP).forEach((cnKey) => {
            const enKey = CSV_HEADER_MAP[cnKey];
            let value = row[cnKey];

            // Basic type conversion
            if (['currentPrice', 'arpu3Month', 'avgData', 'avgVoice', 'saturationData', 'saturationVoice', 'overageAmount', 'broadbandSpeed'].includes(enKey)) {
               value = parseFloat(value) || 0;
            }
            if (['saturationData', 'saturationVoice'].includes(enKey)) {
                value = normalizeRatio(value);
            }
            if (['hasBroadband', 'isFTTR'].includes(enKey)) {
                value = parseBooleanValue(value);
            }
            if (enKey === 'phone') {
                value = String(value);
            }
            newRow[enKey] = value;
          });

          // Default boolean fields if missing
          if (newRow.hasBroadband === undefined) newRow.hasBroadband = false;
          if (newRow.isFTTR === undefined) newRow.isFTTR = false;
          if (newRow.broadbandSpeed === undefined) newRow.broadbandSpeed = 0;

          return newRow as UserRecord;
        });

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
  const headers = PLAN_REQUIRED_HEADERS.map(item => item.name);
  const data = [
    {
      '套餐编码': '20252063',
      '套餐名称': '5G畅享套餐49元',
      '资费': 49,
      '流量': 60,
      '语音': 700,
      '是否含宽带': '否',
      '宽带速率': 0,
      '是否FTTR': '否',
      '其他权益': '视频彩铃, 任我选黄金会员',
      '是否上架': '是',
    },
    {
      '套餐编码': '20253101',
      '套餐名称': '5GA全家享(全光版)99元',
      '资费': 99,
      '流量': 120,
      '语音': 1300,
      '是否含宽带': '是',
      '宽带速率': 1000,
      '是否FTTR': '是',
      '其他权益': 'FTTR1+1, 语音遥控器',
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
          const dataValue = Number(mapped.data);
          const voice = Number(mapped.voice);
          const hasBroadband = parseBooleanValue(mapped.hasBroadband, false);
          const broadbandSpeed = Number(mapped.broadbandSpeed || 0);
          const isFTTR = parseBooleanValue(mapped.isFTTR, false);
          const extras = String(mapped.extras || '').trim();
          const isActive = parseBooleanValue(mapped.isActive, true);

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
            isFTTR,
            extras,
            isActive,
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
  // Define explicit order for template
  const headers = [
      '联系电话', '归属地', '主套餐', '档位', 
      '近三个月ARPU', '流量', '通话', 
      '流量饱和度', '语音饱和度', '超套金额', '超套比例', 
      '套餐类型', '是否有宽带', '宽带速率', '是否FTTR', '备注'
  ];
  
  const data = [
    {
      '联系电话': '13800001111',
      '归属地': '北京',
      '主套餐': '4G飞享38',
      '档位': 38,
      '近三个月ARPU': 85.5,
      '流量': 15,
      '通话': 200,
      '流量饱和度': 0.95,
      '语音饱和度': 0.8,
      '超套金额': 45,
      '超套比例': 0.5,
      '套餐类型': '个人',
      '是否有宽带': '否',
      '宽带速率': 0,
      '是否FTTR': '否',
      '备注': '投诉过资费贵'
    },
    {
      '联系电话': '13900002222',
      '归属地': '上海',
      '主套餐': '5G畅享129',
      '档位': 129,
      '近三个月ARPU': 129,
      '流量': 80,
      '通话': 100,
      '流量饱和度': 0.6,
      '语音饱和度': 0.2,
      '超套金额': 0,
      '超套比例': 0,
      '套餐类型': '家庭',
      '是否有宽带': '是',
      '宽带速率': 500,
      '是否FTTR': '否',
      '备注': ''
    }
  ];
  
  const ws = window.XLSX.utils.json_to_sheet(data, { header: headers });
  const wb = window.XLSX.utils.book_new();
  window.XLSX.utils.book_append_sheet(wb, ws, "用户数据模板");
  window.XLSX.writeFile(wb, "用户导入模板.xlsx");
};
