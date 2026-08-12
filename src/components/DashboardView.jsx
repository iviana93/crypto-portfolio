import React, { useState, useEffect } from 'react';
import GridLayout from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

import { RiskMetricsCard } from './RiskMetricsCard';

const defaultLayout = [
  { i: 'risk', x: 0, y: 0, w: 4, h: 2 },
  { i: 'chart', x: 4, y: 0, w: 8, h: 4 },
  { i: 'allocation', x: 0, y: 2, w: 4, h: 2 },
  { i: 'market', x: 0, y: 4, w: 12, h: 3 },
];

export const DashboardView = ({ portfolioHistory = [] }) => {
  const [layout, setLayout] = useState(defaultLayout);

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

  const safeHistory = Array.isArray(portfolioHistory) ? portfolioHistory : [];

  const handleStyle = {
    backgroundColor: '#1e293b',
    padding: '6px',
    fontSize: '12px',
    textAlign: 'center',
    color: '#94a3b8',
    cursor: 'move',
    userSelect: 'none',
    fontWeight: 500,
    borderTopLeftRadius: '12px',
    borderTopRightRadius: '12px',
  };

  const cardStyle = {
    backgroundColor: '#0f172a',
    borderRadius: '12px',
    border: '1px solid #1e293b',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    boxSizing: 'border-box',
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#020617', padding: '24px', color: '#ffffff', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>Portfolio Command Center</h1>
        <button
          onClick={handleResetLayout}
          style={{
            padding: '6px 12px',
            fontSize: '14px',
            backgroundColor: '#1e293b',
            color: '#cbd5e1',
            borderRadius: '4px',
            border: '1px solid #334155',
            cursor: 'pointer',
          }}
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
          <div className="drag-handle" style={handleStyle}>
            ⠿ Risk Metrics
          </div>
          <RiskMetricsCard portfolioHistory={safeHistory} />
        </div>

        <div key="chart" style={cardStyle}>
          <div className="drag-handle" style={handleStyle}>
            ⠿ Performance Chart
          </div>
          <div style={{ padding: '16px', flex: 1 }}>
            <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>Your Portfolio Chart Component Here</p>
          </div>
        </div>

        <div key="allocation" style={cardStyle}>
          <div className="drag-handle" style={handleStyle}>
            ⠿ Allocation
          </div>
          <div style={{ padding: '16px', flex: 1 }}>
            <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>Your Allocation Pie Chart Here</p>
          </div>
        </div>

        <div key="market" style={cardStyle}>
          <div className="drag-handle" style={handleStyle}>
            ⠿ Market Watchlist
          </div>
          <div style={{ padding: '16px', flex: 1 }}>
            <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>Your Market Table Here</p>
          </div>
        </div>
      </GridLayout>
    </div>
  );
};