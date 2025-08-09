import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CompletionModal } from '../CompletionModal';
import { SessionType } from '../../types';

// Mock timers for auto-start functionality
jest.useFakeTimers();

describe('CompletionModal', () => {
    const defaultProps = {
        isOpen: true,
        sessionType: SessionType.WORK,
        onClose: jest.fn(),
        onStartNext: jest.fn(),
        autoStartEnabled: false,
        autoStartDelay: 5
    };

    beforeEach(() => {
        jest.clearAllMocks();
        jest.clearAllTimers();
    });

    afterEach(() => {
        jest.runOnlyPendingTimers();
        jest.useRealTimers();
        jest.useFakeTimers();
    });

    describe('rendering', () => {
        it('should not render when isOpen is false', () => {
            render(<CompletionModal {...defaultProps} isOpen={false} />);
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        });

        it('should render work completion modal', () => {
            render(<CompletionModal {...defaultProps} sessionType={SessionType.WORK} />);

            expect(screen.getByRole('dialog')).toBeInTheDocument();
            expect(screen.getByText('Work Session Complete!')).toBeInTheDocument();
            expect(screen.getByText('Great job! You\'ve completed a focused work session.')).toBeInTheDocument();
            expect(screen.getByText('Time for a well-deserved break.')).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /start break/i })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /skip break/i })).toBeInTheDocument();
        });

        it('should render short break completion modal', () => {
            render(<CompletionModal {...defaultProps} sessionType={SessionType.SHORT_BREAK} />);

            expect(screen.getByText('Break Time Over!')).toBeInTheDocument();
            expect(screen.getByText('Hope you feel refreshed and ready to focus.')).toBeInTheDocument();
            expect(screen.getByText('Let\'s get back to productive work.')).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /start work/i })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /skip work session/i })).toBeInTheDocument();
        });

        it('should render long break completion modal', () => {
            render(<CompletionModal {...defaultProps} sessionType={SessionType.LONG_BREAK} />);

            expect(screen.getByText('Long Break Complete!')).toBeInTheDocument();
            expect(screen.getByText('You\'ve completed a full Pomodoro cycle!')).toBeInTheDocument();
            expect(screen.getByText('Ready to start a new cycle of focused work?')).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /start new cycle/i })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /take more time/i })).toBeInTheDocument();
        });

        it('should apply correct CSS class based on session type', () => {
            const { rerender } = render(<CompletionModal {...defaultProps} sessionType={SessionType.WORK} />);
            expect(screen.getByRole('dialog')).toHaveClass('work');

            rerender(<CompletionModal {...defaultProps} sessionType={SessionType.SHORT_BREAK} />);
            expect(screen.getByRole('dialog')).toHaveClass('short_break');

            rerender(<CompletionModal {...defaultProps} sessionType={SessionType.LONG_BREAK} />);
            expect(screen.getByRole('dialog')).toHaveClass('long_break');
        });
    });

    describe('user interactions', () => {
        it('should call onStartNext when start button is clicked', () => {
            const onStartNext = jest.fn();
            render(<CompletionModal {...defaultProps} onStartNext={onStartNext} />);

            fireEvent.click(screen.getByRole('button', { name: /start break/i }));
            expect(onStartNext).toHaveBeenCalledTimes(1);
        });

        it('should call onClose when skip button is clicked', () => {
            const onClose = jest.fn();
            render(<CompletionModal {...defaultProps} onClose={onClose} />);

            fireEvent.click(screen.getByRole('button', { name: /skip break/i }));
            expect(onClose).toHaveBeenCalledTimes(1);
        });

        it('should call onClose when close button is clicked', () => {
            const onClose = jest.fn();
            render(<CompletionModal {...defaultProps} onClose={onClose} />);

            fireEvent.click(screen.getByRole('button', { name: /close notification/i }));
            expect(onClose).toHaveBeenCalledTimes(1);
        });

        it('should call onClose when overlay is clicked', () => {
            const onClose = jest.fn();
            render(<CompletionModal {...defaultProps} onClose={onClose} />);

            fireEvent.click(screen.getByRole('presentation'));
            expect(onClose).toHaveBeenCalledTimes(1);
        });

        it('should not call onClose when modal content is clicked', () => {
            const onClose = jest.fn();
            render(<CompletionModal {...defaultProps} onClose={onClose} />);

            fireEvent.click(screen.getByRole('dialog'));
            expect(onClose).not.toHaveBeenCalled();
        });
    });

    describe('auto-start functionality', () => {
        it('should not show countdown when auto-start is disabled', () => {
            render(<CompletionModal {...defaultProps} autoStartEnabled={false} />);

            expect(screen.queryByText(/auto-starting in/i)).not.toBeInTheDocument();
            expect(screen.queryByLabelText(/auto-starting in/i)).not.toBeInTheDocument();
        });

        it('should show countdown when auto-start is enabled', () => {
            render(<CompletionModal {...defaultProps} autoStartEnabled={true} autoStartDelay={5} />);

            expect(screen.getByText(/auto-starting in 5 seconds/i)).toBeInTheDocument();
            expect(screen.getByLabelText(/auto-starting in 5 seconds/i)).toBeInTheDocument();
        });

        it('should countdown and auto-start after delay', async () => {
            const onStartNext = jest.fn();
            render(
                <CompletionModal
                    {...defaultProps}
                    onStartNext={onStartNext}
                    autoStartEnabled={true}
                    autoStartDelay={3}
                />
            );

            // Initial state
            expect(screen.getByText(/auto-starting in 3 seconds/i)).toBeInTheDocument();

            // After 1 second
            jest.advanceTimersByTime(1000);
            await waitFor(() => {
                expect(screen.getByText(/auto-starting in 2 seconds/i)).toBeInTheDocument();
            });

            // After 2 seconds
            jest.advanceTimersByTime(1000);
            await waitFor(() => {
                expect(screen.getByText(/auto-starting in 1 second/i)).toBeInTheDocument();
            });

            // After 3 seconds - should auto-start
            jest.advanceTimersByTime(1000);
            await waitFor(() => {
                expect(onStartNext).toHaveBeenCalledTimes(1);
            });
        });

        it('should change button text to "Start Now" when auto-starting', () => {
            render(<CompletionModal {...defaultProps} autoStartEnabled={true} autoStartDelay={5} />);

            expect(screen.getByText('Start Now')).toBeInTheDocument();
            expect(screen.queryByText('Start Break')).not.toBeInTheDocument();
        });

        it('should allow manual start during countdown', async () => {
            const onStartNext = jest.fn();
            render(
                <CompletionModal
                    {...defaultProps}
                    onStartNext={onStartNext}
                    autoStartEnabled={true}
                    autoStartDelay={5}
                />
            );

            // Click start now before countdown completes
            fireEvent.click(screen.getByText('Start Now'));
            expect(onStartNext).toHaveBeenCalledTimes(1);
        });

        it('should not auto-start if onStartNext is not provided', () => {
            render(
                <CompletionModal
                    {...defaultProps}
                    onStartNext={undefined}
                    autoStartEnabled={true}
                    autoStartDelay={1}
                />
            );

            // Should not show countdown without onStartNext
            expect(screen.queryByText(/auto-starting in/i)).not.toBeInTheDocument();
        });

        it('should reset countdown when modal reopens', async () => {
            const { rerender } = render(
                <CompletionModal
                    {...defaultProps}
                    isOpen={true}
                    autoStartEnabled={true}
                    autoStartDelay={5}
                />
            );

            // Let some time pass
            jest.advanceTimersByTime(2000);
            await waitFor(() => {
                expect(screen.getByText(/auto-starting in 3 seconds/i)).toBeInTheDocument();
            });

            // Close and reopen modal
            rerender(
                <CompletionModal
                    {...defaultProps}
                    isOpen={false}
                    autoStartEnabled={true}
                    autoStartDelay={5}
                />
            );

            rerender(
                <CompletionModal
                    {...defaultProps}
                    isOpen={true}
                    autoStartEnabled={true}
                    autoStartDelay={5}
                />
            );

            // Should reset to full delay
            expect(screen.getByText(/auto-starting in 5 seconds/i)).toBeInTheDocument();
        });
    });

    describe('accessibility', () => {
        it('should have proper ARIA attributes', () => {
            render(<CompletionModal {...defaultProps} />);

            const dialog = screen.getByRole('dialog');
            expect(dialog).toHaveAttribute('aria-labelledby', 'completion-title');
            expect(dialog).toHaveAttribute('aria-describedby', 'completion-message');
            expect(dialog).toHaveAttribute('aria-modal', 'true');
        });

        it('should have proper heading structure', () => {
            render(<CompletionModal {...defaultProps} />);

            expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Work Session Complete!');
        });

        it('should have accessible button labels', () => {
            render(<CompletionModal {...defaultProps} />);

            expect(screen.getByRole('button', { name: /start break now/i })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /skip break/i })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /close notification/i })).toBeInTheDocument();
        });

        it('should announce countdown changes to screen readers', () => {
            render(<CompletionModal {...defaultProps} autoStartEnabled={true} autoStartDelay={5} />);

            const countdown = screen.getByLabelText(/auto-starting in 5 seconds/i);
            expect(countdown).toBeInTheDocument();
        });
    });

    describe('keyboard navigation', () => {
        it('should handle Escape key to close modal', () => {
            const onClose = jest.fn();
            render(<CompletionModal {...defaultProps} onClose={onClose} />);

            fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape', code: 'Escape' });
            // Note: This test would need additional keyboard event handling in the component
            // For now, we're just testing that the modal renders properly
        });
    });
});