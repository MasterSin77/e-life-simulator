import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import OverlayMenu from './OverlayMenu';
import { defaultSimulationControls, ObjectiveMetrics } from '../webgl/simulationTypes';

const metrics: ObjectiveMetrics = {
    aliveRatio: 0.2,
    neighborHarmony: 0.5,
    avgVelocity: 0.12,
    objectiveScore: 0.42,
};

describe('OverlayMenu', () => {
    it('renders performance and objective metrics', () => {
        render(
            <OverlayMenu
                isOpen
                toggleOpen={() => { }}
                side="right"
                mode="conway"
                panelTitle="Conway Logic"
                panelSubtitle="Core life simulation behavior"
                resetZoom={() => { }}
                resetSimulation={() => { }}
                copySettings={() => { }}
                downloadSettings={() => { }}
                importSettingsFromClipboard={() => { }}
                importSettingsFromFile={() => { }}
                saveReproBundle={() => { }}
                loadReproBundle={() => { }}
                setIsOpen={() => { }}
                fps={61.7}
                pups={123456}
                controls={defaultSimulationControls}
                objectiveMetrics={metrics}
                onControlsChange={() => { }}
                handleOpacity={0.9}
                onHandleOpacityChange={() => { }}
            />
        );

        expect(screen.getByText('FPS')).toBeInTheDocument();
        expect(screen.getByText('PUPS')).toBeInTheDocument();
        expect(screen.getByText('Objective')).toBeInTheDocument();
    });

    it('calls onControlsChange for pause and seed density changes', () => {
        const onControlsChange = jest.fn();

        render(
            <OverlayMenu
                isOpen
                toggleOpen={() => { }}
                side="right"
                mode="conway"
                panelTitle="Conway Logic"
                panelSubtitle="Core life simulation behavior"
                resetZoom={() => { }}
                resetSimulation={() => { }}
                copySettings={() => { }}
                downloadSettings={() => { }}
                importSettingsFromClipboard={() => { }}
                importSettingsFromFile={() => { }}
                saveReproBundle={() => { }}
                loadReproBundle={() => { }}
                setIsOpen={() => { }}
                fps={60}
                pups={1000}
                controls={defaultSimulationControls}
                objectiveMetrics={metrics}
                onControlsChange={onControlsChange}
                handleOpacity={0.9}
                onHandleOpacityChange={() => { }}
            />
        );

        const pauseLabel = screen.getByText('Pause').closest('label');
        const pauseToggle = pauseLabel?.querySelector('input[type="checkbox"]') as HTMLInputElement;
        fireEvent.click(pauseToggle);
        expect(onControlsChange).toHaveBeenCalledWith({ paused: true });

        const seedDensityLabel = screen.getByText('Seed Density').closest('label');
        const seedDensitySlider = seedDensityLabel?.querySelector('input[type="range"]') as HTMLInputElement;
        fireEvent.change(seedDensitySlider, { target: { value: '0.1' } });
        expect(onControlsChange).toHaveBeenCalledWith({ seedDensity: 0.1 });
    });
});
