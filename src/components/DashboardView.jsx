import React, { useState, useEffect } from 'react';
import GridLayout from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

import { RiskMetricsCard } from './RiskMetricsCard';

// Default layout configuration for 12-column grid
const defaultLayout = [
  { i: 'risk', x: 0, y: 0, w: 4, h: 2 },
  { i: 'chart', x: 4, y: 0, w: 8, h: 4 },
  { i: 'allocation', x: 0, y: 2, w: 4, h: 2 },
  { i: 'market', x: 0, y: 4, w: 12, h: 3 },
];

export const DashboardView = ({ portfolioHistory = [], children }) => {
  const [layout, setLayout] = useState(defaultLayout);

  // Load saved layout from localStorage on mount
  useEffect(() => {
    const savedLayout = localStorage.getItem('dashboard_layout');
    if (savedLayout) {
      try {
        setLayout(JSON.parse(savedLayout));
      } catch (e) {
        console.error('Failed to parse layout settings', e);
      }
    }
  }, []);

  const handleLayoutChange = (newLayout) => {
    setLayout(newLayout);
    localStorage.setItem('dashboard_layout', JSON.stringify(newLayout));
  };

  const handleResetLayout = () => {
    setLayout(defaultLayout);
    localStorage.removeItem('dashboard_layout');
  };

  // Ensure portfolioHistory passed to children is explicitly an array
  const safeHistory = Array.isArray(portfolioHistory) ? portfolioHistory : [];

  return (
    <div className="min-h-screen bg-slate-950 p-6 text-white">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Portfolio Command Center</h1>
        <button
          onClick={handleResetLayout}
          className="px-3 py-1.5 text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition"
        >
          Reset Layout
        </button>
      </div>

      <GridLayout
        className="layout"
        layout={layout}
        cols={12}
        rowHeight={100}
        width={1200}
        onLayoutChange={handleLayoutChange}
        draggableHandle=".drag-handle"
      >
        <div key="risk">
          <div className="drag-handle bg-slate-800 p-1.5 text-xs text-center text-slate-400 cursor-move rounded-t-xl select-none font-medium">
            ⠿ Risk Metrics
          </div>
          <RiskMetricsCard portfolioHistory={safeHistory} />
        </div>

        <div key="chart" className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden flex flex-col">
          <div className="drag-handle bg-slate-800 p-1.5 text-xs text-center text-slate-400 cursor-move select-none font-medium">
            ⠿ Performance Chart
          </div>
          <div className="p-4 flex-1">
            <p className="text-sm text-slate-500">Your Portfolio Chart Component Here</p>
          </div>
        </div>

        <div key="allocation" className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden flex flex-col">
          <div className="drag-handle bg-slate-800 p-1.5 text-xs text-center text-slate-400 cursor-move select-none font-medium">
            ⠿ Allocation
          </div>
          <div className="p-4 flex-1">
            <p className="text-sm text-slate-500">Your Allocation Pie Chart Here</p>
          </div>
        </div>

        <div key="market" className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden flex flex-col">
          <div className="drag-handle bg-slate-800 p-1.5 text-xs text-center text-slate-400 cursor-move select-none font-medium">
            ⠿ Market Watchlist
          </div>
          <div className="p-4 flex-1">
            <p className="text-sm text-slate-500">Your Market Table Here</p>
          </div>
        </div>
      </GridLayout>
    </div>
  );
};