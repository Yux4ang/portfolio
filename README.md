# Portfolio Dashboard

一个用于手动记录、追踪美股与加密货币持仓的个人投资组合仪表盘。支持实时价格（美股走 Alpaca，加密货币走 CoinGecko）、多平台汇总、CSV/JSON 导入导出，本地数据持久化（localStorage）。

## 技术栈

- React 19 + TypeScript + Vite
- Zustand（轻量状态管理）
- Tailwind CSS v4（CSS 原生变量做主题定制）
- Papa Parse（CSV 解析）

## 快速开始

```bash
npm install
npm run dev
```

默认打开 http://localhost:5173

### 配置实时价格（可选，不配置也能正常使用手动记录功能）

**加密货币价格**：无需任何配置，CoinGecko 公开接口直接可用。

**美股价格（Alpaca）**：因为 Alpaca API 需要密钥且不支持浏览器直接调用，需要部署一个轻量代理：

1. 注册 [Alpaca](https://alpaca.markets/) 账号，获取 API Key/Secret（免费版即可，用于 Market Data）
2. 参考 `server/alpaca-proxy/README.md` 部署代理（默认用 Cloudflare Worker，几分钟即可完成）
3. 把代理地址填入项目根目录的 `.env.local`（复制 `.env.example` 改名即可）

不配置代理的情况下，股票仓位会一直显示价格加载失败，但仓位的增删改查、导入导出等功能不受影响。

## 项目结构

```
src/
├── components/          # UI 组件，按功能域分文件夹
│   ├── common/           # 通用基础组件（按钮、卡片、弹窗、图标）
│   ├── layout/           # 布局组件（顶部导航）
│   ├── positions/         # 仓位管理相关组件（表单、列表、单行）
│   └── overview/          # 总览页面相关组件（统计卡片、平台汇总、图表）
├── hooks/                # 自定义 Hook（组合数据、价格拉取）
│   ├── usePriceFeed.ts     # 价格拉取与自动刷新
│   └── usePortfolioData.ts # 组合 store + 价格 + 计算逻辑，UI 组件的主要数据来源
├── store/                # Zustand 全局状态（仓位增删改查 + 持久化）
├── services/
│   ├── pricing/           # 价格数据源（Alpaca / CoinGecko），策略模式，易于扩展新数据源
│   └── storage/           # localStorage 持久化 + CSV/JSON 导入导出
├── utils/
│   ├── calculations.ts    # 核心计算逻辑（市值/盈亏/占比），纯函数，全站计算口径统一
│   └── formatters.ts      # 展示格式化（金额/百分比/相对时间）
├── types/                # TypeScript 类型定义（数据模型）
└── config/               # 全局可调配置（刷新频率、精度、预置平台列表）

server/alpaca-proxy/     # 独立的 Cloudflare Worker，代理 Alpaca API 请求（保护密钥）
```

## 如何修改美术风格

**改全局配色 / 圆角 / 字体**：只需要编辑 `src/index.css` 里的 `@theme` 块。例如把主题色从紫色系换成蓝色系，只改 `--color-brand-*` 这一组变量，全站所有用到 `bg-brand-500`、`text-brand-500` 的地方会自动联动更新。

**改卡片的"玻璃感"强弱**：编辑 `src/index.css` 里的 `.glass-panel` class（调整 `backdrop-filter: blur(20px)` 的模糊值、背景透明度）。

**改按钮样式**：编辑 `src/components/common/Button.tsx` 里的 `VARIANT_CLASSES`。

## 如何修改/扩展功能

**新增一个仓位字段**（比如"买入日期"）：
1. 在 `src/types/position.ts` 的 `Position` 接口里加字段
2. 在 `src/components/positions/PositionForm.tsx` 里加对应的表单输入框
3. 如果需要导入导出支持，在 `src/services/storage/csvIO.ts` 的 `CSV_COLUMNS` 和 `normalizeRow` 里补充

**新增一个价格数据源**：
1. 在 `src/services/pricing/` 下新建一个文件，实现 `PriceProvider` 接口（见 `types.ts`）
2. 在 `src/services/pricing/index.ts` 的 `PROVIDER_MAP` 里把某个资产类型指向新数据源

**新增一个统计维度**（比如"按币种/股票类型分组"）：
在 `src/utils/calculations.ts` 里仿照 `groupByPlatform` 写一个新函数，然后在 `usePortfolioData.ts` 里暴露出去，最后在总览页面加一个展示组件。

**改自动刷新频率 / 数字精度**：编辑 `src/config/app.ts`。

## 数据存储说明

所有仓位数据保存在浏览器的 localStorage 里（key 见 `src/config/app.ts` 的 `storageKey`），**不会上传到任何服务器**。清除浏览器数据或更换设备/浏览器会导致数据丢失，请定期使用"导出 JSON"功能做备份。

## CSV 导入格式

```csv
symbol,assetType,costPrice,quantity,platform,note
AAPL,stock,150.5,10,IBKR,
BTC,crypto,45000,0.05,Binance,长期持有
```

- `assetType` 必须是 `stock` 或 `crypto`
- `note` 列可留空
