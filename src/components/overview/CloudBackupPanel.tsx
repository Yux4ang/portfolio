import { useRef, useState } from 'react';
import { GlassCard } from '../common/GlassCard';
import { Button } from '../common/Button';
import { downloadFile } from '../../services/storage/csvIO';
import { backupCounts, parseBackupFile, recordCount, type PortfolioBackup } from '../../services/storage/portfolioBackup';
import { capturePortfolio, cloudRequest, restorePortfolio } from '../../services/storage/cloudStorage';

function downloadBackup(data: PortfolioBackup, label = 'full-backup') {
  downloadFile(JSON.stringify(data, null, 2), `portfolio-${label}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`, 'application/json');
}

export function CloudBackupPanel() {
  const [url, setUrl] = useState(() => localStorage.getItem('portfolio-dashboard:cloud-url:v1') || import.meta.env.VITE_PORTFOLIO_CLOUD_URL || '');
  const [token, setToken] = useState('');
  const [revision, setRevision] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('云端备份采用手动保存；修改仓位后，请点击“保存到云端”。');
  const fileRef = useRef<HTMLInputElement>(null);

  async function run(action: () => Promise<void> | void) {
    setBusy(true);
    try { await action(); }
    catch (error) { setMessage(error instanceof Error ? error.message : '操作失败，本地数据已保留。'); }
    finally { setBusy(false); }
  }

  async function checkCloud() {
    const remote = await cloudRequest(url, token);
    setRevision(remote?.revision ?? 0);
    localStorage.setItem('portfolio-dashboard:cloud-url:v1', url.trim());
    setMessage(remote
      ? `云端第 ${remote.revision} 版 · ${new Date(remote.savedAt).toLocaleString()} · ${backupCounts(remote.data)}。可读取，或保存本机数据为新版本。`
      : '云端还没有记录。请在有原始数据的浏览器中点击“保存到云端”。');
  }

  async function saveCloud() {
    if (revision === null) { setMessage('请先点击“检查云端”，确认云端已有的数据。'); return; }
    const data = capturePortfolio();
    if (recordCount(data) === 0) throw new Error('本机没有数据，已阻止空备份上传。请先读取云端或导入完整备份。');
    if (!window.confirm(`将以下本机数据保存到云端：\n${backupCounts(data)}\n${revision ? '这会成为最新版本，云端旧版本会保留。' : '这是首次上传，原有日期和记录 ID 会保留。'}`)) return;
    const remote = await cloudRequest(url, token, data, revision);
    if (!remote) throw new Error('云端未确认保存，请检查云端后重试。');
    setRevision(remote.revision);
    setMessage(`已保存到云端，第 ${remote.revision} 版 · ${backupCounts(remote.data)}。`);
  }

  function replaceLocal(data: PortfolioBackup): boolean {
    if (!window.confirm(`将用以下数据替换本机记录：\n${backupCounts(data)}\n替换前会下载并在本机保存原始备份。是否继续？`)) return false;
    // Back up raw values even if the previous data is too old for current validation.
    const raw: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('portfolio-dashboard:') && !key.includes('before-restore') && !key.includes('cloud-url')) {
        raw[key] = localStorage.getItem(key)!;
      }
    }
    downloadFile(JSON.stringify(raw, null, 2), `portfolio-before-restore-${Date.now()}.json`, 'application/json');
    restorePortfolio(data);
    return true;
  }

  async function loadCloud() {
    const remote = await cloudRequest(url, token);
    if (!remote) { setMessage('云端还没有数据，本机记录保持不变。'); return; }
    if (!replaceLocal(remote.data)) return;
    setRevision(remote.revision);
    setMessage(`已读取云端第 ${remote.revision} 版 · ${backupCounts(remote.data)}。`);
  }

  return (
    <GlassCard className="p-5">
      <h2 className="text-lg font-semibold mb-2">云端保存 / 完整备份</h2>
      <p className="text-xs text-text-muted mb-4">包含当前持仓、已平仓记录、现金账户和资产走势，保留全部日期。换设备后填写同一地址和密钥，再读取云端。密钥仅在本次页面打开期间使用。</p>
      <div className="grid gap-3 mb-4">
        <label className="text-sm">云端服务地址
          <input className="input-field w-full mt-1" type="url" placeholder="https://portfolio-cloud.你的子域.workers.dev" value={url} disabled={busy} onChange={(event) => { setUrl(event.target.value); setRevision(null); }} />
        </label>
        <label className="text-sm">私密同步密钥
          <input className="input-field w-full mt-1" type="password" autoComplete="off" value={token} disabled={busy} onChange={(event) => { setToken(event.target.value); setRevision(null); }} />
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" disabled={busy || !url || !token} onClick={() => void run(checkCloud)}>检查云端</Button>
        <Button disabled={busy || !url || !token} onClick={() => void run(saveCloud)}>保存到云端</Button>
        <Button variant="secondary" disabled={busy || !url || !token} onClick={() => void run(loadCloud)}>读取云端</Button>
        <Button variant="secondary" disabled={busy} onClick={() => void run(() => { downloadBackup(capturePortfolio()); setMessage('已下载完整备份，包含历史仓位与日期。'); })}>下载完整备份</Button>
        <Button variant="secondary" disabled={busy} onClick={() => fileRef.current?.click()}>恢复完整备份</Button>
      </div>
      <input ref={fileRef} type="file" accept=".json" className="hidden" disabled={busy} onChange={(event) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (file) void run(async () => {
          const data = parseBackupFile(await file.text());
          if (replaceLocal(data)) setMessage(`已恢复完整备份 · ${backupCounts(data)}。如需同步，请再保存到云端。`);
        });
      }} />
      <p role="status" className="text-sm text-text-secondary mt-3">{busy ? '正在处理，请稍候…' : message}</p>
    </GlassCard>
  );
}
