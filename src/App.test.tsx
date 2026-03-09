import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import App from './App';

jest.mock('./components/LifeCanvas', () => {
    return function MockLifeCanvas() {
        return <div data-testid="life-canvas" />;
    };
});

describe('App integration', () => {
    it('renders canvas and allows opening overlay controls', () => {
        render(<App />);
        expect(screen.getByTestId('life-canvas')).toBeInTheDocument();

        const toggles = screen.getAllByText('☰');
        fireEvent.click(toggles[0]);
        fireEvent.click(toggles[1]);
        expect(screen.getByText(/Hole Controls/i)).toBeInTheDocument();
        expect(screen.getByText(/Conway Logic/i)).toBeInTheDocument();
    });

    it('updates control readouts when slider changes', () => {
        render(<App />);

        fireEvent.click(screen.getAllByText('☰')[0]);
        const sliders = screen.getAllByRole('slider');

        fireEvent.change(sliders[0], { target: { value: '0.12' } });
        expect((sliders[0] as HTMLInputElement).value).toBe('0.12');
    });
});
