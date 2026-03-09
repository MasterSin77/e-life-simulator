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
                applyThreeBodyPreset={() => { }}
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

    it('sanitizes invalid performance values for display', () => {
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
                applyThreeBodyPreset={() => { }}
                setIsOpen={() => { }}
                fps={Number.POSITIVE_INFINITY}
                pups={Number.NaN}
                controls={defaultSimulationControls}
                objectiveMetrics={metrics}
                onControlsChange={() => { }}
                handleOpacity={0.9}
                onHandleOpacityChange={() => { }}
            />
        );

        expect(screen.queryByText('Infinity')).not.toBeInTheDocument();
        expect(screen.getAllByText('0.0').length).toBeGreaterThan(0);
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
                applyThreeBodyPreset={() => { }}
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

    it('adds a black hole from holes mode', () => {
        const onControlsChange = jest.fn();

        render(
            <OverlayMenu
                isOpen
                toggleOpen={() => { }}
                side="left"
                mode="holes"
                panelTitle="Hole Controls"
                panelSubtitle="Black holes, white hole, and field controls"
                resetZoom={() => { }}
                resetSimulation={() => { }}
                copySettings={() => { }}
                downloadSettings={() => { }}
                importSettingsFromClipboard={() => { }}
                importSettingsFromFile={() => { }}
                saveReproBundle={() => { }}
                loadReproBundle={() => { }}
                applyThreeBodyPreset={() => { }}
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

        fireEvent.click(screen.getByRole('button', { name: 'Add Black Hole' }));
        const lastCallArg = onControlsChange.mock.calls[onControlsChange.mock.calls.length - 1][0];
        expect(lastCallArg.blackHoles).toHaveLength(defaultSimulationControls.blackHoles.length + 1);
    });

    it('removes a black hole while preserving at least one', () => {
        const onControlsChange = jest.fn();
        const controls = {
            ...defaultSimulationControls,
            blackHoles: [
                ...defaultSimulationControls.blackHoles,
                { enabled: true, mass: 1.2, x: 0.12, y: 0.22, spin: 0.1 },
            ],
        };

        render(
            <OverlayMenu
                isOpen
                toggleOpen={() => { }}
                side="left"
                mode="holes"
                panelTitle="Hole Controls"
                panelSubtitle="Black holes, white hole, and field controls"
                resetZoom={() => { }}
                resetSimulation={() => { }}
                copySettings={() => { }}
                downloadSettings={() => { }}
                importSettingsFromClipboard={() => { }}
                importSettingsFromFile={() => { }}
                saveReproBundle={() => { }}
                loadReproBundle={() => { }}
                applyThreeBodyPreset={() => { }}
                setIsOpen={() => { }}
                fps={60}
                pups={1000}
                controls={controls}
                objectiveMetrics={metrics}
                onControlsChange={onControlsChange}
                handleOpacity={0.9}
                onHandleOpacityChange={() => { }}
            />
        );

        fireEvent.click(screen.getAllByRole('button', { name: 'Remove Black Hole' })[0]);
        const lastCallArg = onControlsChange.mock.calls[onControlsChange.mock.calls.length - 1][0];
        expect(lastCallArg.blackHoles).toHaveLength(controls.blackHoles.length - 1);
    });

    it('removes a black hole when toggled disabled and more than one exists', () => {
        const onControlsChange = jest.fn();
        const controls = {
            ...defaultSimulationControls,
            blackHoles: [
                { enabled: true, mass: 1.0, x: 0.2, y: 0.2, spin: 0.1 },
                { enabled: true, mass: 1.1, x: 0.4, y: 0.4, spin: 0.2 },
            ],
        };

        render(
            <OverlayMenu
                isOpen
                toggleOpen={() => { }}
                side="left"
                mode="holes"
                panelTitle="Hole Controls"
                panelSubtitle="Black holes, white hole, and field controls"
                resetZoom={() => { }}
                resetSimulation={() => { }}
                copySettings={() => { }}
                downloadSettings={() => { }}
                importSettingsFromClipboard={() => { }}
                importSettingsFromFile={() => { }}
                saveReproBundle={() => { }}
                loadReproBundle={() => { }}
                applyThreeBodyPreset={() => { }}
                setIsOpen={() => { }}
                fps={60}
                pups={1000}
                controls={controls}
                objectiveMetrics={metrics}
                onControlsChange={onControlsChange}
                handleOpacity={0.9}
                onHandleOpacityChange={() => { }}
            />
        );

        const enabledLabels = screen.getAllByText('Enabled');
        const secondEnabledToggle = enabledLabels[1]
            .closest('label')
            ?.querySelector('input[type="checkbox"]') as HTMLInputElement;

        fireEvent.click(secondEnabledToggle);

        const lastCallArg = onControlsChange.mock.calls[onControlsChange.mock.calls.length - 1][0];
        expect(lastCallArg.blackHoles).toHaveLength(1);
    });

    it('disables add when at black-hole max capacity', () => {
        const onControlsChange = jest.fn();
        const maxControls = {
            ...defaultSimulationControls,
            blackHoles: Array.from({ length: 16 }, (_, index) => ({
                enabled: true,
                mass: 1,
                x: (index * 0.051) % 1,
                y: (index * 0.073) % 1,
                spin: 0,
            })),
        };

        render(
            <OverlayMenu
                isOpen
                toggleOpen={() => { }}
                side="left"
                mode="holes"
                panelTitle="Hole Controls"
                panelSubtitle="Black holes, white hole, and field controls"
                resetZoom={() => { }}
                resetSimulation={() => { }}
                copySettings={() => { }}
                downloadSettings={() => { }}
                importSettingsFromClipboard={() => { }}
                importSettingsFromFile={() => { }}
                saveReproBundle={() => { }}
                loadReproBundle={() => { }}
                applyThreeBodyPreset={() => { }}
                setIsOpen={() => { }}
                fps={60}
                pups={1000}
                controls={maxControls}
                objectiveMetrics={metrics}
                onControlsChange={onControlsChange}
                handleOpacity={0.9}
                onHandleOpacityChange={() => { }}
            />
        );

        expect(screen.getByRole('button', { name: 'Add Black Hole' })).toBeDisabled();
    });

    it('calls onControlsChange when auto max black-hole toggle is changed', () => {
        const onControlsChange = jest.fn();

        render(
            <OverlayMenu
                isOpen
                toggleOpen={() => { }}
                side="left"
                mode="holes"
                panelTitle="Hole Controls"
                panelSubtitle="Black holes, white hole, and field controls"
                resetZoom={() => { }}
                resetSimulation={() => { }}
                copySettings={() => { }}
                downloadSettings={() => { }}
                importSettingsFromClipboard={() => { }}
                importSettingsFromFile={() => { }}
                saveReproBundle={() => { }}
                loadReproBundle={() => { }}
                applyThreeBodyPreset={() => { }}
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

        const autoLabel = screen.getByText('Auto Max By FPS (>=60)').closest('label');
        const autoToggle = autoLabel?.querySelector('input[type="checkbox"]') as HTMLInputElement;
        fireEvent.click(autoToggle);
        expect(onControlsChange).toHaveBeenCalledWith({ autoMaxBlackHoles: true });
    });

    it('calls onControlsChange when crowding momentum slider is changed', () => {
        const onControlsChange = jest.fn();

        render(
            <OverlayMenu
                isOpen
                toggleOpen={() => { }}
                side="left"
                mode="holes"
                panelTitle="Hole Controls"
                panelSubtitle="Black holes, white hole, and field controls"
                resetZoom={() => { }}
                resetSimulation={() => { }}
                copySettings={() => { }}
                downloadSettings={() => { }}
                importSettingsFromClipboard={() => { }}
                importSettingsFromFile={() => { }}
                saveReproBundle={() => { }}
                loadReproBundle={() => { }}
                applyThreeBodyPreset={() => { }}
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

        const crowdingLabel = screen.getByText('Crowding Momentum').closest('label');
        const crowdingSlider = crowdingLabel?.querySelector('input[type="range"]') as HTMLInputElement;
        fireEvent.change(crowdingSlider, { target: { value: '0.77' } });

        expect(onControlsChange).toHaveBeenCalledWith({ holeCrowdingMomentum: 0.77 });
    });
});
