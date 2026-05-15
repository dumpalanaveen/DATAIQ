'use client';
import dynamic from 'next/dynamic';
import { useMemo } from 'react';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

interface PlotlyChartProps {
  config: {
    data: any[];
    layout?: any;
  };
  height?: number;
}

export default function PlotlyChart({ config, height = 320 }: PlotlyChartProps) {
  const layout = useMemo(() => ({
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(15,15,25,0.6)',
    font: { color: '#94a3b8', family: 'IBM Plex Mono, monospace', size: 11 },
    xaxis: { gridcolor: 'rgba(255,255,255,0.04)', color: '#64748b', zerolinecolor: 'rgba(255,255,255,0.08)' },
    yaxis: { gridcolor: 'rgba(255,255,255,0.04)', color: '#64748b', zerolinecolor: 'rgba(255,255,255,0.08)' },
    margin: { l: 55, r: 20, t: 40, b: 50 },
    legend: { bgcolor: 'rgba(0,0,0,0)', bordercolor: 'rgba(255,255,255,0.1)', font: { color: '#94a3b8' } },
    colorway: ['#00d4ff', '#7c3aed', '#f59e0b', '#10b981', '#ef4444', '#ec4899', '#f97316'],
    height,
    ...config.layout,
  }), [config.layout, height]);

  return (
    <div className="w-full overflow-hidden">
      <Plot
        data={config.data || []}
        layout={layout}
        config={{
          responsive: true,
          displayModeBar: true,
          displaylogo: false,
          modeBarButtonsToRemove: ['toImage', 'sendDataToCloud', 'editInChartStudio'],
          modeBarButtonsToAdd: [],
        }}
        style={{ width: '100%' }}
        useResizeHandler
      />
    </div>
  );
}
