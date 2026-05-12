# 存量用户套餐推荐系统

> ExistingCustomerTariffRecommendationSystem

面向中国移动存量用户运营场景的全栈推荐系统，用于批量导入用户清单、维护套餐目录、执行智能套餐推荐，并输出推荐结果、人工校正结论与营销话术，帮助一线营销人员高效完成外呼回访工作。

## 功能特性

- **套餐目录管理**：内置 30 款中国移动 5G 套餐（畅享/全家享爱家版/全光版），支持 Excel 全量导入、新增、编辑、删除、上下架
- **用户数据导入**：Excel 批量导入用户清单，自动解析字段映射与数据校验
- **智能推荐引擎**：基于规则的多维度评分算法，自动分群（移动/宽带/FTTR），输出主推荐+最多 3 个备选方案
- **分析看板**：统计卡片、套餐分布饼图、按地区筛选、按手机号/套餐搜索
- **人工校正**：支持从全部在售套餐中手动改选最终方案，填写备注，设置审核状态（待确认/已接受/已驳回）
- **AI 营销话术**：支持配置 OpenAI / Anthropic / 兼容网关，基于用户画像与推荐结果生成自然语言营销话术
- **结果导出**：导出包含推荐结果、人工校正、审核状态、AI 话术的完整 Excel 报表

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | React 19 + TypeScript 5.8 |
| 构建工具 | Vite 6.2 |
| UI 样式 | Tailwind CSS (CDN) |
| 图表库 | Recharts 3.5 |
| Excel 处理 | SheetJS (xlsx 0.20.1, CDN) |
| 后端框架 | FastAPI + Uvicorn |
| 数据库 | SQLite (SQLAlchemy 2.0 ORM) |
| HTTP 客户端 | httpx (AI API 调用) |
| Excel 导出 | openpyxl (服务端导出) |

## 项目结构

```
ExistingCustomerTariffRecommendationSystem/
├── frontend/                     # 前端项目
│   ├── index.html                # HTML 入口（Tailwind/SheetJS CDN）
│   ├── index.tsx                 # React 根挂载
│   ├── App.tsx                   # 主应用组件（路由、状态、数据流）
│   ├── types.ts                  # TypeScript 类型定义
│   ├── constants.ts              # 默认套餐、字段映射
│   ├── services/
│   │   └── api.ts                # API 客户端
│   ├── utils/
│   │   └── excel.ts              # Excel 解析/导出工具
│   ├── components/
│   │   ├── Home.tsx              # 首页
│   │   ├── Dashboard.tsx         # 分析看板
│   │   ├── PlanTable.tsx         # 套餐管理
│   │   ├── UserDetail.tsx        # 用户详情
│   │   ├── AISettings.tsx        # AI 设置
│   │   └── Typewriter.tsx        # 打字机动效
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── backend/                      # 后端项目
│   ├── requirements.txt          # Python 依赖
│   ├── tariff.db                 # SQLite 数据库文件
│   └── app/
│       ├── main.py               # FastAPI 入口
│       ├── config.py             # 数据库配置
│       ├── database.py           # SQLAlchemy 引擎/会话
│       ├── models.py             # ORM 模型
│       ├── schemas.py            # Pydantic 请求/响应模型
│       ├── seed.py               # 默认套餐种子数据
│       ├── routers/
│       │   ├── plans.py          # 套餐 CRUD + 批量导入
│       │   ├── users.py          # 用户记录导入
│       │   ├── recommendations.py # 推荐引擎/结果管理/导出
│       │   └── ai.py             # AI 配置/话术生成
│       └── services/
│           ├── engine.py         # 推荐规则引擎
│           └── ai_service.py     # AI 提供商集成
│
└── README.md                     # 本文件
```

## 环境要求

| 依赖 | 版本要求 |
|------|----------|
| Node.js | >= 18.x (推荐 20.x LTS) |
| npm | >= 9.x |
| Python | >= 3.10 (推荐 3.12) |
| pip | >= 22.x |

## 部署指南

### macOS 部署

#### 1. 安装依赖环境

```bash
# 使用 Homebrew 安装 Node.js 和 Python
brew install node python

# 验证版本
node -v    # >= 18.x
python3 --version  # >= 3.10
```

#### 2. 克隆项目

```bash
git clone https://github.com/mjz1029/ExistingCustomerTariffRecommendationSystem.git
cd ExistingCustomerTariffRecommendationSystem
```

#### 3. 启动后端

```bash
cd backend

# 创建虚拟环境（推荐）
python3 -m venv venv
source venv/bin/activate

# 安装依赖
pip install -r requirements.txt

# 启动后端服务（默认端口 8000）
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### 4. 启动前端（新终端窗口）

```bash
cd frontend

# 安装依赖
npm install

# 启动开发服务器（默认端口 3000）
npm run dev
```

#### 5. 访问应用

- 前端界面：http://localhost:3000
- 后端 API 文档：http://localhost:8000/docs

---

### Windows 部署

#### 1. 安装依赖环境

从官网下载安装包：
- Node.js: https://nodejs.org/ (推荐 LTS 版本)
- Python: https://www.python.org/ (安装时勾选 "Add Python to PATH")

验证安装：
```cmd
node -v
python --version
```

#### 2. 克隆项目

```cmd
git clone https://github.com/mjz1029/ExistingCustomerTariffRecommendationSystem.git
cd ExistingCustomerTariffRecommendationSystem
```

#### 3. 启动后端

```cmd
cd backend

:: 创建虚拟环境
python -m venv venv
venv\Scripts\activate

:: 安装依赖
pip install -r requirements.txt

:: 启动后端服务
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### 4. 启动前端（新 CMD/PowerShell 窗口）

```cmd
cd frontend

:: 安装依赖
npm install

:: 启动开发服务器
npm run dev
```

#### 5. 访问应用

- 前端界面：http://localhost:3000
- 后端 API 文档：http://localhost:8000/docs

---

### Linux 部署

#### 1. 安装依赖环境

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y nodejs npm python3 python3-pip python3-venv git

# CentOS/RHEL
sudo dnf install -y nodejs npm python3 python3-pip git

# 验证版本
node -v
python3 --version
```

#### 2. 克隆项目

```bash
git clone https://github.com/mjz1029/ExistingCustomerTariffRecommendationSystem.git
cd ExistingCustomerTariffRecommendationSystem
```

#### 3. 启动后端

```bash
cd backend

# 创建虚拟环境
python3 -m venv venv
source venv/bin/activate

# 安装依赖
pip install -r requirements.txt

# 启动后端服务
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### 4. 启动前端（新终端窗口）

```bash
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

#### 5. 访问应用

- 前端界面：http://localhost:3000
- 后端 API 文档：http://localhost:8000/docs

---

### 生产构建部署

#### 前端构建

```bash
cd frontend
npm run build
```

构建产物输出到 `frontend/dist/` 目录，可部署到 Nginx、Apache 等静态服务器。

#### Nginx 配置示例

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端静态文件
    location / {
        root /path/to/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # 反向代理后端 API
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

#### 后端生产启动

```bash
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

## 使用流程

1. **套餐管理**：进入"套餐管理"页面，确认当前套餐数据是否准确，或通过 Excel 模板批量导入
2. **下载模板**：进入"数据导入"页面，下载用户清单标准模板
3. **导入数据**：按模板格式整理用户清单并上传 Excel 文件
4. **自动推荐**：系统自动解析数据并运行推荐引擎
5. **查看结果**：在"分析看板"查看批量结果，支持按地区筛选、按手机号/套餐搜索
6. **人工校正**：进入用户详情页，查看推荐理由、风险等级、预计账单，手动改选方案或设置审核状态
7. **AI 话术**（可选）：在"AI 设置"中配置 AI 提供商后，可在用户详情页生成 AI 营销话术
8. **导出结果**：返回看板导出最终确认版 Excel 报表

## 用户 Excel 导入字段

### 必填字段

| 字段名 | 说明 |
|--------|------|
| 联系电话 | 用户唯一标识 |
| 档位 | 当前套餐月费 |
| 近三个月ARPU | 用户近三个月平均消费 |
| 流量 | 月均流量使用量（GB） |
| 通话 | 月均通话使用量（分钟） |

### 可选字段

| 字段名 | 说明 |
|--------|------|
| 归属地 | 省/市/区域 |
| 主套餐 | 当前套餐名称 |
| 流量饱和度 | 0-1 小数，也兼容 0-100 整数百分比 |
| 语音饱和度 | 0-1 小数，也兼容 0-100 整数百分比 |
| 超套金额 | 超出当前套餐后的费用 |
| 套餐类型 | 如个人、家庭 |
| 是否有宽带 | 是/否 |
| 宽带速率 | Mbps |
| 是否FTTR | 是/否 |
| 备注 | 其他说明 |

## 推荐引擎逻辑

推荐引擎采用多维度加权评分算法：

1. **数据归一化**：对导入的用户数据做标准化和兜底处理
2. **用户分群**：根据套餐名称、类型、宽带/FTTR 信息推断用户所属分群（mobile/broadband/fttr）
3. **候选筛选**：在同分群可售套餐中筛选，执行"不降档"规则
4. **幅度控制**：根据分群和使用饱和度设置价格跳档上限
5. **评分排序**：综合价格差、资源缺口、资源浪费、宽带速率变化进行加权评分
6. **结果输出**：主推荐套餐 + 最多 3 个备选方案 + 推荐理由 + 风险等级 + 模板话术

## API 接口

后端提供以下 RESTful API（详细文档访问 http://localhost:8000/docs）：

| 模块 | 路径前缀 | 说明 |
|------|----------|------|
| 套餐管理 | `/api/v1/plans` | 套餐 CRUD、Excel 批量导入 |
| 用户导入 | `/api/v1/users` | 批量导入用户记录 |
| 推荐结果 | `/api/v1/recommendations` | 运行引擎、查看/更新/导出结果 |
| AI 服务 | `/api/v1/ai` | AI 配置管理、连接测试、话术生成 |

## 许可证

本项目采用 [MIT License](LICENSE) 开源许可证。

Copyright (c) 2026 JizhouMao, China Mobile Changji Prefecture Branch
