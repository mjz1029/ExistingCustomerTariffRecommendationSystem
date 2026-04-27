import type { UserRecord } from '../types';
import { CSV_HEADER_MAP } from '../constants';

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
                // Convert "是"/"Yes"/"TRUE" to boolean
                const strVal = String(value).trim().toLowerCase();
                value = ['是', 'yes', 'true', '1'].includes(strVal);
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

export const exportResults = (results: any[]) => {
    const exportData = results.map(r => ({
        '联系电话': r.user.phone,
        '归属地': r.user.province,
        '当前套餐': r.user.currentPlanName,
        '当前档位': r.user.currentPrice,
        '近三月ARPU': r.user.arpu3Month,
        '当前宽带': r.user.hasBroadband ? `${r.user.broadbandSpeed}M` : '无',
        '推荐套餐': r.recommendedPlan.name,
        '推荐档位': r.recommendedPlan.price,
        '推荐宽带': r.recommendedPlan.hasBroadband ? `${r.recommendedPlan.broadbandSpeed}M` : '无',
        '推荐理由': r.reason,
        'AI话术': r.script,
        '预计账单': r.predictedBill.toFixed(2),
        '预计节省': r.saveAmount.toFixed(2),
        '风险等级': r.riskLevel
    }));

    const ws = window.XLSX.utils.json_to_sheet(exportData);
    const wb = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(wb, ws, "推荐结果");
    window.XLSX.writeFile(wb, `推荐结果_${new Date().toISOString().slice(0,10)}.xlsx`);
}
