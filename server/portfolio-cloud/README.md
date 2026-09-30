# Cloudflare 云端保存

该服务用于个人投资组合，使用一个私密同步密钥访问一个 D1 数据库。持仓、已平仓记录、现金账户和资产快照一起保存，记录 ID、日期和其他字段原样保留。拥有密钥的人可以读取和写入全部数据，请用密码管理器保管它。

当前版本采用**手动保存和读取**：修改数据后点击“保存到云端”；换设备后点击“读取云端”。不会自动把空浏览器上传，也不会在打开网页时替换本机记录。没有多人账号或自动合并功能。

## 1. 部署数据库和 Worker

在 PowerShell 中从项目根目录执行：

```powershell
cd server/portfolio-cloud
npm install
npx wrangler login
npx wrangler d1 create portfolio-data
```

创建命令会返回 `database_id`。将它填入本目录的 `wrangler.toml`，替换占位符。把 `ALLOWED_ORIGINS` 改成网站的真实来源，例如 `https://your-site.pages.dev` 或自定义域名（不含路径和末尾斜线）。多个来源用逗号分隔；本地测试使用的地址也需要明确列出。

初始化远程数据库：

```powershell
npx wrangler d1 execute portfolio-data --remote --file=schema.sql
```

生成一个随机密钥，在本机密码管理器中保存。此命令只将密钥输出给你，不要截图分享：

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

然后部署 Worker 并设置密钥：

```powershell
npx wrangler deploy
npx wrangler secret put SYNC_TOKEN
```

在交互提示中粘贴刚生成的密钥。完成后记下部署输出中的 Worker 地址，例如 `https://portfolio-cloud.your-subdomain.workers.dev`。

密钥不要写进 `wrangler.toml`、前端代码、GitHub 或任何 `VITE_*` 环境变量。后端拒绝长度不足 32 个字符的密钥。没有正确密钥，不能访问云端数据。

## 2. 更新网站

前端构建方式保持为根目录的 `npm run build`，输出目录为 `dist`。如果网站已从 GitHub 自动部署，上传这些代码后沿用原有构建配置。

可以在网站的构建环境中设置公开变量 `VITE_PORTFOLIO_CLOUD_URL` 为 Worker 地址，再重新构建；也可以在网页面板直接填写地址，无需配置这个变量。

## 3. 首次迁移原有数据

1. **更新前**，在原网站下载完整原始备份。旧版“导出 JSON”只导出当前持仓，不足以保存历史仓位和日期。
2. 更新后，使用**原网址、原浏览器和原浏览器用户配置**打开网站，确认持仓和已平仓记录都还在。
3. 在“总览 → 云端保存 / 完整备份”中点击“下载完整备份”，再填写 Worker 地址和私密同步密钥。
4. 点击“检查云端”，第一次应显示云端没有记录。
5. 点击“保存到云端”，核对记录数量并确认，等待“已保存到云端”提示。
6. 在另一台设备打开网站，填写同一地址和密钥，点击“读取云端”，核对记录数量。读取会替换本机记录，替换前会下载备份并在浏览器中保留一份恢复副本。

如果本机没有原数据，可以用“恢复完整备份”导入旧网站控制台导出的 `portfolio-full-backup.json`。此按钮也支持新版的完整备份。**不要用原来的“导入 CSV / JSON”按钮恢复完整备份**。

同步密钥仅保存在页面内存中，刷新或关闭后重新输入。服务地址会保存在当前浏览器中。

## 冲突与历史版本

每次成功保存追加一个云端版本。数据库中的旧版本不会被覆盖或删除。如果检查之后另一台设备保存了新版本，本次上传会收到 409，保留本机数据，并要求先检查或读取云端。需要合并时，请先下载两台设备各自的完整备份，再决定要保留的记录；当前不自动合并。

最新记录：`GET /portfolio`；指定旧版：`GET /portfolio?revision=1`。两者都需要 `Authorization: Bearer <同步密钥>`。你也可以在 Cloudflare D1 控制台执行 `SELECT revision, saved_at FROM portfolio_versions ORDER BY revision DESC` 查看历史版本，执行 `SELECT payload FROM portfolio_versions WHERE revision = 1` 提取该版 JSON，用网页“恢复完整备份”恢复。

单次完整备份请求上限为 1,000,000 字节。数据库永久保留版本会增加存储占用，请关注 Cloudflare 的账户配额和使用情况。

## 本地测试后端（可选）

在本目录创建 `.dev.vars`（已加入忽略规则）并写入自己的随机测试密钥：

```text
SYNC_TOKEN=你的随机测试密钥
```

执行：

```powershell
npx wrangler d1 execute portfolio-data --local --file=schema.sql
npm run dev
```

根目录另开终端运行 `npm run dev`。在网页填写 `http://localhost:8788` 和测试密钥。确保前端来源在 `ALLOWED_ORIGINS` 中。`--local` 数据库独立于线上 D1；本地测试不需访问线上持仓数据。

## 官方资料

- [Cloudflare D1 命令](https://developers.cloudflare.com/d1/wrangler-commands/)
- [Worker secrets](https://developers.cloudflare.com/workers/configuration/secrets/)
