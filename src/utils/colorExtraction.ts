/**
 * ============================================================================
 * 图片平均色提取工具
 * ============================================================================
 * 通过 canvas 读取图片像素，计算平均 RGB 值。
 * 【注意】部分图床不允许跨域读取像素（CORS 限制），遇到这种情况
 * canvas 会变成"被污染"状态，读取像素时会抛出 SecurityError。
 * 这里统一 catch 掉，返回 null，调用方需要自行 fallback。
 */
export function getAverageColorFromImageUrl(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    const timeout = setTimeout(() => resolve(null), 4000);

    img.onload = () => {
      clearTimeout(timeout);
      try {
        const size = 24;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(null);

        ctx.drawImage(img, 0, 0, size, size);
        const { data } = ctx.getImageData(0, 0, size, size);

        let r = 0;
        let g = 0;
        let b = 0;
        let count = 0;

        for (let i = 0; i < data.length; i += 4) {
          const alpha = data[i + 3];
          if (alpha < 128) continue; // 跳过透明像素
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
          count++;
        }

        if (count === 0) return resolve(null);
        resolve(`${Math.round(r / count)}, ${Math.round(g / count)}, ${Math.round(b / count)}`);
      } catch (err) {
        // 跨域限制导致 canvas 被污染，无法读取像素
        resolve(null);
      }
    };

    img.onerror = () => {
      clearTimeout(timeout);
      resolve(null);
    };

    img.src = url;
  });
}