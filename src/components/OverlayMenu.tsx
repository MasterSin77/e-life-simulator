/**
 * OverlayMenu.tsx
 *
 * FINAL:
 * ✅ Closes on click outside
 * ✅ Closes on mouse leave
 * ✅ 90% transparent hamburger when closed
 * ✅ Displays FPS, PUPS, Worker Times
 * ✅ Slide animation
 */

import React, { useEffect, useRef } from 'react';

interface OverlayMenuProps {
  isOpen: boolean;
  toggleOpen: () => void;
  resetZoom: () => void;
  setIsOpen: (value: boolean) => void;
  fps: number;
  pups: number;
  workerTimes: number[];
}

const OverlayMenu: React.FC<OverlayMenuProps> = ({
  isOpen,
  toggleOpen,
  resetZoom,
  setIsOpen,
  fps,
  pups,
  workerTimes
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setIsOpen]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        top: '10px',
        left: '10px',
        zIndex: 10
      }}
      onMouseLeave={() => setIsOpen(false)}
    >
      {/* Hamburger icon */}
      <button
        onClick={toggleOpen}
        style={{
          fontSize: '24px',
          background: 'black',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          padding: '4px 8px',
          cursor: 'pointer',
          opacity: isOpen ? 1 : 0.1,
          transition: 'opacity 0.3s ease'
        }}
      >
        ☰
      </button>

      {/* Slide-out panel */}
      <div
        style={{
          marginTop: '8px',
          width: isOpen ? '220px' : '0px',
          overflow: 'hidden',
          transition: 'width 0.3s ease',
          background: 'rgba(0, 0, 0, 0.85)',
          color: 'white',
          borderRadius: '4px',
          padding: isOpen ? '12px' : '0px'
        }}
      >
        {isOpen && (
          <div>
            <h4 style={{ margin: '0 0 10px' }}>e-Life Stats</h4>
            <p><strong>FPS:</strong> {fps.toFixed(1)}</p>
            <p><strong>PUPS:</strong> {pups.toLocaleString()}</p>
            <h5 style={{ margin: '10px 0 5px' }}>Worker Times (ms)</h5>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '12px' }}>
              {workerTimes.map((t, i) => (
                <li key={i}>Worker {i}: {t.toFixed(2)} ms</li>
              ))}
            </ul>

            <button
              onClick={resetZoom}
              style={{
                marginTop: '12px',
                padding: '6px 12px',
                border: 'none',
                background: '#555',
                color: 'white',
                cursor: 'pointer',
                borderRadius: '3px'
              }}
            >
              Reset Zoom
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default OverlayMenu;
