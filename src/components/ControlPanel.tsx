/**
 * ControlPanel.tsx
 * 
 * Simple control panel to pause/resume the sim and show logs.
 */

import React from 'react';
import debugLog from '../utils/debugLog';
import SimulationEngine from '../simulation/SimulationEngine'; // ✅ fix: no {}

interface Props {
  engine: SimulationEngine | null;
}


const ControlPanel: React.FC<Props> = ({ engine }) => {


  const handleDownloadLogs = () => {
    const blob = new Blob([debugLog.getLogs()], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'debug_logs.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ marginTop: '10px' }}>

      <button onClick={handleDownloadLogs}>Download Logs</button>
    </div>
  );
};

export default ControlPanel;
