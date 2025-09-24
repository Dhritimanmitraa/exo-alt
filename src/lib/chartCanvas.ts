export const CANVAS_THRESHOLD = 500;

export interface ChartConfig {
  width: number;
  height: number;
  padding: number;
  colors: string[];
  gridLines: boolean;
}

export interface ScatterData { x: number; y: number; label?: string; color?: string }
export interface HistogramData { value: number; count: number; color?: string }

export const setupCanvasContext = (canvas: HTMLCanvasElement): CanvasRenderingContext2D => {
  const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.floor(rect.width * dpr);
  canvas.height = Math.floor(rect.height * dpr);
  const ctx = canvas.getContext('2d')!;
  ctx.scale(dpr, dpr);
  return ctx;
};

export const drawScatterPlot = (canvas: HTMLCanvasElement, data: ScatterData[], config: ChartConfig): void => {
  const ctx = setupCanvasContext(canvas);
  const { width, height, padding } = config;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  const xs = data.map(d => d.x);
  const ys = data.map(d => d.y);
  const xMin = Math.min(...xs), xMax = Math.max(...xs);
  const yMin = Math.min(...ys), yMax = Math.max(...ys);

  const toX = (x: number) => padding + ((x - xMin) / (xMax - xMin)) * (width - 2 * padding);
  const toY = (y: number) => height - padding - ((y - yMin) / (yMax - yMin)) * (height - 2 * padding);

  ctx.clearRect(0, 0, width, height);
  ctx.save();

  // Grid
  if (config.gridLines) {
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const gx = padding + (i * (width - 2 * padding)) / 4;
      const gy = padding + (i * (height - 2 * padding)) / 4;
      ctx.beginPath();
      ctx.moveTo(gx, padding);
      ctx.lineTo(gx, height - padding);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(padding, gy);
      ctx.lineTo(width - padding, gy);
      ctx.stroke();
    }
  }

  // Points (progressive for large sets)
  const batch = 1000;
  let i = 0;
  const drawBatch = () => {
    const end = Math.min(i + batch, data.length);
    for (; i < end; i++) {
      const d = data[i];
      const x = toX(d.x); const y = toY(d.y);
      if (x < padding || x > width - padding || y < padding || y > height - padding) continue;
      ctx.fillStyle = d.color || config.colors[0] || '#8b5cf6';
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.arc(x, y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    if (i < data.length) requestAnimationFrame(drawBatch);
  };
  drawBatch();

  // Axes
  ctx.globalAlpha = 1;
  ctx.strokeStyle = '#374151';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(padding, height - padding);
  ctx.lineTo(width - padding, height - padding);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(padding, padding);
  ctx.lineTo(padding, height - padding);
  ctx.stroke();
  ctx.restore();
};

export const drawHistogram = (canvas: HTMLCanvasElement, data: HistogramData[], config: ChartConfig): void => {
  const ctx = setupCanvasContext(canvas);
  const { width, height, padding } = config;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  const maxCount = Math.max(...data.map(d => d.count));
  const barWidth = (width - 2 * padding) / data.length;

  ctx.clearRect(0, 0, width, height);
  ctx.save();

  // Bars
  for (let i = 0; i < data.length; i++) {
    const d = data[i];
    const barHeight = (d.count / maxCount) * (height - 2 * padding);
    ctx.fillStyle = d.color || config.colors[0] || '#8b5cf6';
    ctx.globalAlpha = 0.8;
    ctx.fillRect(padding + i * barWidth, height - padding - barHeight, Math.max(1, barWidth - 1), barHeight);
  }

  // Axes
  ctx.globalAlpha = 1;
  ctx.strokeStyle = '#374151';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(padding, height - padding);
  ctx.lineTo(width - padding, height - padding);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(padding, padding);
  ctx.lineTo(padding, height - padding);
  ctx.stroke();
  ctx.restore();
};


