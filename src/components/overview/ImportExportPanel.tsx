/**
 * 导入 / 导出面板：支持 CSV 和 JSON 两种格式的导入导出。
 */
import { useRef, useState } from 'react';
import { usePositionStore } from '@/store/usePositionStore';
import {
  exportToCSV,
  exportToJSON,
  downloadFile,
  importFromCSV,
  importFromJSON,
} from '@/services/storage/csvIO';
import { Button } from '@/components/common/Button';
import { GlassCard } from '@/components/common/GlassCard';

export function ImportExportPanel() {
  const positions = usePositionStore((s) => s.positions);
  const importPositions = usePositionStore((s) => s.importPositions);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importSuccessCount, setImportSuccessCount] = useState<number | null>(null);

  function handleExportCSV() {
    const csv = exportToCSV(positions);
    downloadFile(csv, `portfolio-${dateStamp()}.csv`, 'text/csv;charset=utf-8;');
  }

  function handleExportJSON() {
    const json = exportToJSON(positions);
    downloadFile(json, `portfolio-${dateStamp()}.json`, 'application/json;charset=utf-8;');
  }

  function dateStamp(): string {
    return new Date().toISOString().slice(0, 10);
  }

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const isJSON = file.name.toLowerCase().endsWith('.json');
    const result = isJSON ? importFromJSON(text) : importFromCSV(text);

    setImportErrors(result.errors);
    if (result.positions.length > 0) {
      importPositions(result.positions);
      setImportSuccessCount(result.positions.length);
    } else {
      setImportSuccessCount(null);
    }

    // 重置 input，允许连续导入同一个文件
    e.target.value = '';
  }

  return (
    <GlassCard className="p-5">
      <h2 className="text-lg font-semibold text-text-primary mb-4">当前持仓导入 / 导出</h2>
      <p className="text-xs text-text-muted mb-3">此处仅处理当前持仓，不包含已平仓记录、现金和资产快照。保留全部日期请使用上方“完整备份”。</p>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <Button variant="secondary" onClick={handleExportCSV}>
          导出 CSV
        </Button>
        <Button variant="secondary" onClick={handleExportJSON}>
          导出 JSON
        </Button>
        <Button variant="secondary" className="col-span-2" onClick={handleImportClick}>
          导入 CSV / JSON 文件
        </Button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.json"
        className="hidden"
        onChange={handleFileChange}
      />

      {importSuccessCount !== null && (
        <p className="text-sm text-gain mb-2">成功导入 {importSuccessCount} 条仓位</p>
      )}

      {importErrors.length > 0 && (
        <div className="text-sm text-loss space-y-1 max-h-40 overflow-y-auto">
          <p className="font-medium">部分数据导入失败：</p>
          {importErrors.map((err, i) => (
            <p key={i}>· {err}</p>
          ))}
        </div>
      )}

      <p className="text-xs text-text-muted mt-3">
        CSV 列头需包含：symbol, assetType(stock/crypto), costPrice, quantity, platform, note(可选)。导入为追加模式，不会覆盖现有数据。
      </p>
    </GlassCard>
  );
}
