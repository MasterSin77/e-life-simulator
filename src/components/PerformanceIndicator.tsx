/**
 * PerformanceIndicator.tsx
 *
 * ✅ Shows FPS
 * ✅ Shows PUPS
 * ✅ Shows per-worker timing
 */

import React from 'react';

interface Props {
  fps: number;
  pups: number;
  timings?: number[]; // optional: CPU only
}

const PerformanceIndicator: React.FC<Props> = ({ fps, pups, timings = [] }) => {
  return (
    <div style={{
      position: 'absolute',
      top: 10,
      right: 10,
      background: 'rgba(0,0,0,0.5)',
      color: '#0f0',
      padding: '8px',
      fontFamily: 'monospace',
      fontSize: '12px'
    }}>
      <div>FPS: {fps}</div>
      <div>PUPS: {pups.toLocaleString()}</div>
      {timings.map((ms, i) => (
        <div key={i}>Worker {i}: {ms.toFixed(2)} ms</div>
      ))}
    </div>
  );
};

export default PerformanceIndicator;
