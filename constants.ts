import type { TariffPlan } from './types';

export const DEFAULT_PLANS: TariffPlan[] = [
  // --- 5G畅享套餐 (个人版 - 无宽带) ---
  { id: '20252062', name: '5G畅享套餐39元', price: 39, data: 40, voice: 500, hasBroadband: false, broadbandSpeed: 0, isFTTR: false, isActive: true, extras: '5G优享服务' },
  { id: '20252063', name: '5G畅享套餐49元', price: 49, data: 60, voice: 700, hasBroadband: false, broadbandSpeed: 0, isFTTR: false, isActive: true, extras: '视频彩铃, 任我选黄金会员' },
  { id: '20252064', name: '5G畅享套餐59元', price: 59, data: 80, voice: 900, hasBroadband: false, broadbandSpeed: 0, isFTTR: false, isActive: true, extras: '视频彩铃, 任我选黄金会员' },
  { id: '20252065', name: '5G畅享套餐69元', price: 69, data: 90, voice: 1000, hasBroadband: false, broadbandSpeed: 0, isFTTR: false, isActive: true, extras: '视频彩铃, 任我选黄金会员' },
  { id: '20252066', name: '5G畅享套餐79元', price: 79, data: 100, voice: 1100, hasBroadband: false, broadbandSpeed: 0, isFTTR: false, isActive: true },
  { id: '20252067', name: '5GA畅享套餐99元', price: 99, data: 120, voice: 1300, hasBroadband: false, broadbandSpeed: 0, isFTTR: false, isActive: true, extras: '权益超市铂金, 咪咕视频钻石, 云盘白银' },
  { id: '20252068', name: '5GA畅享套餐129元', price: 129, data: 160, voice: 1500, hasBroadband: false, broadbandSpeed: 0, isFTTR: false, isActive: true, extras: '权益超市铂金, 咪咕视频钻石, 云盘白银' },
  { id: '20252069', name: '5GA畅享套餐169元', price: 169, data: 200, voice: 2000, hasBroadband: false, broadbandSpeed: 0, isFTTR: false, isActive: true, extras: '权益超市铂金, 咪咕视频钻石, 云盘白银' },
  { id: '20252070', name: '5GA畅享套餐199元', price: 199, data: 240, voice: 3000, hasBroadband: false, broadbandSpeed: 0, isFTTR: false, isActive: true, extras: '权益池选1, 云盘黄金, 咪咕钻石, 5G新通话' },
  { id: '20252071', name: '5GA畅享套餐239元', price: 239, data: 280, voice: 3200, hasBroadband: false, broadbandSpeed: 0, isFTTR: false, isActive: true, extras: '权益池选2, 云盘黄金, 咪咕钻石, 5G新通话' },
  { id: '20252072', name: '5GA畅享套餐299元', price: 299, data: 360, voice: 3500, hasBroadband: false, broadbandSpeed: 0, isFTTR: false, isActive: true, extras: '权益池选2, 云盘黄金, 咪咕钻石, 5G新通话' },
  { id: '20252073', name: '5GA畅享套餐399元', price: 399, data: 480, voice: 4000, hasBroadband: false, broadbandSpeed: 0, isFTTR: false, isActive: true, extras: '权益池选3, 云盘钻石, 咪咕钻石, 5G新通话' },
  { id: '20252074', name: '5GA畅享套餐599元', price: 599, data: 680, voice: 5000, hasBroadband: false, broadbandSpeed: 0, isFTTR: false, isActive: true, extras: '权益池选3, 云盘钻石, 咪咕钻石, 5G新通话' },

  // --- 5G全家享 (爱家版 - 家庭/教育 - 含宽带) ---
  { id: '20253157', name: '5G全家享(爱家基础-教育)59元', price: 59, data: 80, voice: 900, hasBroadband: true, broadbandSpeed: 500, isFTTR: false, isActive: true, extras: '视频彩铃, 黄金会员, 爱家教育包' },
  { id: '20253158', name: '5G全家享(爱家基础-教育)69元', price: 69, data: 90, voice: 1000, hasBroadband: true, broadbandSpeed: 500, isFTTR: false, isActive: true, extras: '视频彩铃, 黄金会员, 爱家教育包' },
  { id: '20253159', name: '5G全家享(爱家基础-教育)79元', price: 79, data: 100, voice: 1100, hasBroadband: true, broadbandSpeed: 1000, isFTTR: false, isActive: true, extras: '爱家教育包+6元权益' },
  { id: '20253160', name: '5G全家享(爱家版-教育)79元', price: 79, data: 100, voice: 1100, hasBroadband: true, broadbandSpeed: 1000, isFTTR: false, isActive: true, extras: '爱家教育包+6元权益' },
  { id: '20253081', name: '5GA全家享(爱家版)99元', price: 99, data: 120, voice: 1300, hasBroadband: true, broadbandSpeed: 1000, isFTTR: false, isActive: true, extras: '权益超市铂金, 咪咕钻石, 云盘白银' },
  { id: '20253082', name: '5GA全家享(爱家版)109元', price: 109, data: 140, voice: 1400, hasBroadband: true, broadbandSpeed: 1000, isFTTR: false, isActive: true, extras: '3天全天云存+AI, 权益超市铂金, 咪咕钻石' },
  { id: '20253083', name: '5GA全家享(爱家版)129元', price: 129, data: 160, voice: 1500, hasBroadband: true, broadbandSpeed: 1000, isFTTR: false, isActive: true, extras: '3天全天云存+AI, 权益超市铂金, 咪咕钻石' },
  { id: '20253087', name: '5GA全家享(爱家plus版)109元', price: 109, data: 140, voice: 1400, hasBroadband: true, broadbandSpeed: 1000, isFTTR: false, isActive: true, extras: '室外枪机安防, 权益超市铂金' },

  // --- 5G全家享 (全光版 - FTTR) ---
  { id: '20253101', name: '5GA全家享(全光版)99元', price: 99, data: 120, voice: 1300, hasBroadband: true, broadbandSpeed: 1000, isFTTR: true, isActive: true, extras: 'FTTR1+1, 语音遥控器' },
  { id: '20253102', name: '5GA全家享(全光版)109元', price: 109, data: 140, voice: 1400, hasBroadband: true, broadbandSpeed: 1000, isFTTR: true, isActive: true, extras: 'FTTR1+1, 语音遥控器' },
  { id: '20253103', name: '5GA全家享(全光版)129元', price: 129, data: 160, voice: 1500, hasBroadband: true, broadbandSpeed: 1000, isFTTR: true, isActive: true, extras: 'FTTR1+1, 权益超市铂金' },
  { id: '20253104', name: '5GA全家享(全光版)149元', price: 149, data: 180, voice: 1800, hasBroadband: true, broadbandSpeed: 1000, isFTTR: true, isActive: true, extras: 'FTTR1+1, 权益超市铂金' },
  { id: '20253105', name: '5GA全家享(全光版)169元', price: 169, data: 200, voice: 2000, hasBroadband: true, broadbandSpeed: 1000, isFTTR: true, isActive: true, extras: 'FTTR1+1, 3天全天云存+AI' },
  { id: '20253106', name: '5GA全家享(全光版)199元', price: 199, data: 240, voice: 3000, hasBroadband: true, broadbandSpeed: 2000, isFTTR: true, isActive: true, extras: 'FTTR1+1, 3天全天云存+AI' },
  { id: '20253107', name: '5GA全家享(全光版)239元', price: 239, data: 280, voice: 3200, hasBroadband: true, broadbandSpeed: 2000, isFTTR: true, isActive: true, extras: 'FTTR1+1, 3天全天云存+AI' },
  { id: '20253108', name: '5GA全家享(全光版)299元', price: 299, data: 360, voice: 3500, hasBroadband: true, broadbandSpeed: 2000, isFTTR: true, isActive: true, extras: 'FTTR1+1, 3天全天云存+AI' },
  { id: '20253109', name: '5GA全家享(全光版)399元', price: 399, data: 480, voice: 4000, hasBroadband: true, broadbandSpeed: 2000, isFTTR: true, isActive: true, extras: 'FTTR1+1' },
];

export const CSV_HEADER_MAP: Record<string, string> = {
  '联系电话': 'phone',
  '归属地': 'province',
  '主套餐': 'currentPlanName',
  '档位': 'currentPrice',
  '近三个月ARPU': 'arpu3Month',
  '流量': 'avgData',
  '通话': 'avgVoice',
  '流量饱和度': 'saturationData',
  '语音饱和度': 'saturationVoice',
  '超套金额': 'overageAmount',
  '备注': 'remark',
  
  // New columns
  '套餐类型': 'planType',
  '是否有宽带': 'hasBroadband',
  '宽带速率': 'broadbandSpeed',
  '是否FTTR': 'isFTTR'
};

export const REQUIRED_HEADERS = [
  { name: '联系电话', required: true, desc: '用户唯一标识' },
  { name: '归属地', required: false, desc: '省/市' },
  { name: '主套餐', required: false, desc: '当前使用的套餐名' },
  { name: '档位', required: true, desc: '当前套餐月费 (数值)' },
  { name: '近三个月ARPU', required: true, desc: '平均月消费 (数值)' },
  { name: '流量', required: true, desc: '月均流量使用量 (GB)' },
  { name: '通话', required: true, desc: '月均通话时长 (分钟)' },
  { name: '流量饱和度', required: false, desc: '0-1之间的小数' },
  { name: '语音饱和度', required: false, desc: '0-1之间的小数' },
  { name: '超套金额', required: false, desc: '超出套餐的费用' },
  { name: '套餐类型', required: false, desc: '如：个人/家庭' },
  { name: '是否有宽带', required: false, desc: '是/否' },
  { name: '宽带速率', required: false, desc: 'Mbps (数值)' },
  { name: '是否FTTR', required: false, desc: '是/否' },
  { name: '备注', required: false, desc: '其他信息' },
];
