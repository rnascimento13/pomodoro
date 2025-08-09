import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { Settings } from '../Settings';
import { settingsService } from '../../services/SettingsService';
import { DEFAULT_SETTINGS } from '../../utils/constants';

// Mock the settings service
jest.mock('../../services/SettingsService', () => ({
    settingsService: {
        getSettings: jest.fn(),
        updateSettings: jest.fn(),
        resetToDefaults: jest.fn(),
        onSettingsChange: jest.fn()
    }
}));

const mockSettingsService = settingsService as jest.Mocked<typeof settingsService>;

describe('Settings Component', () => {
    const defaultProps = {
        isOpen: true,
        onClose: jest.fn()
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockSettingsService.getSettings.mockReturnValue(DEFAULT_SETTINGS);
        mockSettingsService.onSettingsChange.mockReturnValue(() => { });
    });

    describe('rendering', () => {
        it('should not render when isOpen is false', () => {
            render(<Settings isOpen={false} onClose={jest.fn()} />);
            expect(screen.queryByText('Settings')).not.toBeInTheDocument();
        });

        it('should render when isOpen is true', () => {
            render(<Settings {...defaultProps} />);
            expect(screen.getByText('Settings')).toBeInTheDocument();
        });

        it('should render all duration sliders with correct values', () => {
            render(<Settings {...defaultProps} />);

            expect(screen.getByLabelText(/Work Session: 25 minutes/)).toBeInTheDocument();
            expect(screen.getByLabelText(/Short Break: 5 minutes/)).toBeInTheDocument();
            expect(screen.getByLabelText(/Long Break: 15 minutes/)).toBeInTheDocument();
        });

        it('should render all toggle switches', () => {
            render(<Settings {...defaultProps} />);

            expect(screen.getByText('Sound Notifications')).toBeInTheDocument();
            expect(screen.getByText('Browser Notifications')).toBeInTheDocument();
            expect(screen.getByText('Auto-start Breaks')).toBeInTheDocument();
            expect(screen.getByText('Auto-start Work Sessions')).toBeInTheDocument();
        });

        it('should render action buttons', () => {
            render(<Settings {...defaultProps} />);

            expect(screen.getByText('Reset to Defaults')).toBeInTheDocument();
            expect(screen.getByText('Cancel')).toBeInTheDocument();
            expect(screen.getByText('Save')).toBeInTheDocument();
        });
    });

    describe('duration sliders', () => {
        it('should update work duration when slider changes', () => {
            render(<Settings {...defaultProps} />);

            const workSlider = screen.getByDisplayValue('25');
            fireEvent.change(workSlider, { target: { value: '30' } });

            expect(screen.getByLabelText(/Work Session: 30 minutes/)).toBeInTheDocument();
        });

        it('should update short break duration when slider changes', () => {
            render(<Settings {...defaultProps} />);

            const shortBreakSlider = screen.getByDisplayValue('5');
            fireEvent.change(shortBreakSlider, { target: { value: '10' } });

            expect(screen.getByLabelText(/Short Break: 10 minutes/)).toBeInTheDocument();
        });

        it('should update long break duration when slider changes', () => {
            render(<Settings {...defaultProps} />);

            const longBreakSlider = screen.getByDisplayValue('15');
            fireEvent.change(longBreakSlider, { target: { value: '20' } });

            expect(screen.getByLabelText(/Long Break: 20 minutes/)).toBeInTheDocument();
        });

        it('should respect slider bounds', () => {
            render(<Settings {...defaultProps} />);

            const workSlider = screen.getByDisplayValue('25');
            expect(workSlider).toHaveAttribute('min', '5');
            expect(workSlider).toHaveAttribute('max', '60');

            const shortBreakSlider = screen.getByDisplayValue('5');
            expect(shortBreakSlider).toHaveAttribute('min', '1');
            expect(shortBreakSlider).toHaveAttribute('max', '15');

            const longBreakSlider = screen.getByDisplayValue('15');
            expect(longBreakSlider).toHaveAttribute('min', '5');
            expect(longBreakSlider).toHaveAttribute('max', '30');
        });
    });

    describe('toggle switches', () => {
        it('should toggle sound notifications', () => {
            render(<Settings {...defaultProps} />);

            const soundToggle = screen.getByRole('checkbox', { name: /Sound Notifications/i });
            expect(soundToggle).toBeChecked(); // Default is true

            fireEvent.click(soundToggle);
            expect(soundToggle).not.toBeChecked();
        });

        it('should toggle browser notifications', () => {
            render(<Settings {...defaultProps} />);

            const notificationToggle = screen.getByRole('checkbox', { name: /Browser Notifications/i });
            expect(notificationToggle).not.toBeChecked(); // Default is false

            fireEvent.click(notificationToggle);
            expect(notificationToggle).toBeChecked();
        });

        it('should toggle auto-start breaks', () => {
            render(<Settings {...defaultProps} />);

            const autoStartBreaksToggle = screen.getByRole('checkbox', { name: /Auto-start Breaks/i });
            expect(autoStartBreaksToggle).not.toBeChecked(); // Default is false

            fireEvent.click(autoStartBreaksToggle);
            expect(autoStartBreaksToggle).toBeChecked();
        });

        it('should toggle auto-start work sessions', () => {
            render(<Settings {...defaultProps} />);

            const autoStartWorkToggle = screen.getByRole('checkbox', { name: /Auto-start Work Sessions/i });
            expect(autoStartWorkToggle).not.toBeChecked(); // Default is false

            fireEvent.click(autoStartWorkToggle);
            expect(autoStartWorkToggle).toBeChecked();
        });
    });

    describe('actions', () => {
        it('should save settings and close modal when Save is clicked', () => {
            const onClose = jest.fn();
            render(<Settings isOpen={true} onClose={onClose} />);

            // Make some changes
            const workSlider = screen.getByDisplayValue('25');
            fireEvent.change(workSlider, { target: { value: '30' } });

            const soundToggle = screen.getByRole('checkbox', { name: /Sound Notifications/i });
            fireEvent.click(soundToggle);

            // Save
            fireEvent.click(screen.getByText('Save'));

            expect(mockSettingsService.updateSettings).toHaveBeenCalledWith({
                ...DEFAULT_SETTINGS,
                workDuration: 30,
                soundEnabled: false
            });
            expect(onClose).toHaveBeenCalled();
        });

        it('should cancel changes and close modal when Cancel is clicked', () => {
            const onClose = jest.fn();
            render(<Settings isOpen={true} onClose={onClose} />);

            // Make some changes
            const workSlider = screen.getByDisplayValue('25');
            fireEvent.change(workSlider, { target: { value: '30' } });

            // Cancel
            fireEvent.click(screen.getByText('Cancel'));

            expect(mockSettingsService.updateSettings).not.toHaveBeenCalled();
            expect(onClose).toHaveBeenCalled();
        });

        it('should reset to defaults and close modal when Reset is clicked', () => {
            const onClose = jest.fn();
            render(<Settings isOpen={true} onClose={onClose} />);

            fireEvent.click(screen.getByText('Reset to Defaults'));

            expect(mockSettingsService.resetToDefaults).toHaveBeenCalled();
            expect(onClose).toHaveBeenCalled();
        });

        it('should close modal when close button is clicked', () => {
            const onClose = jest.fn();
            render(<Settings isOpen={true} onClose={onClose} />);

            fireEvent.click(screen.getByLabelText('Close settings'));

            expect(onClose).toHaveBeenCalled();
        });

        it('should close modal when overlay is clicked', () => {
            const onClose = jest.fn();
            render(<Settings isOpen={true} onClose={onClose} />);

            fireEvent.click(screen.getByRole('dialog').parentElement!);

            expect(onClose).toHaveBeenCalled();
        });

        it('should not close modal when modal content is clicked', () => {
            const onClose = jest.fn();
            render(<Settings isOpen={true} onClose={onClose} />);

            fireEvent.click(screen.getByRole('dialog'));

            expect(onClose).not.toHaveBeenCalled();
        });
    });

    describe('settings synchronization', () => {
        it('should subscribe to settings changes on mount', () => {
            render(<Settings {...defaultProps} />);

            expect(mockSettingsService.onSettingsChange).toHaveBeenCalled();
        });

        it('should reset temporary settings when modal opens', () => {
            const customSettings = {
                ...DEFAULT_SETTINGS,
                workDuration: 30
            };
            mockSettingsService.getSettings.mockReturnValue(customSettings);

            const { rerender } = render(<Settings isOpen={false} onClose={jest.fn()} />);

            // Open modal
            rerender(<Settings isOpen={true} onClose={jest.fn()} />);

            expect(screen.getByLabelText(/Work Session: 30 minutes/)).toBeInTheDocument();
        });

        it('should update display when settings change externally', async () => {
            let settingsChangeCallback: (settings: any) => void = () => { };
            mockSettingsService.onSettingsChange.mockImplementation((callback) => {
                settingsChangeCallback = callback;
                return () => { };
            });

            render(<Settings {...defaultProps} />);

            // Simulate external settings change
            const newSettings = { ...DEFAULT_SETTINGS, workDuration: 35 };
            act(() => {
                settingsChangeCallback(newSettings);
            });

            await waitFor(() => {
                expect(screen.getByLabelText(/Work Session: 35 minutes/)).toBeInTheDocument();
            });
        });
    });

    describe('accessibility', () => {
        it('should have proper ARIA labels', () => {
            render(<Settings {...defaultProps} />);

            expect(screen.getByLabelText('Close settings')).toBeInTheDocument();
            expect(screen.getByLabelText(/Work Session:/)).toBeInTheDocument();
            expect(screen.getByLabelText(/Short Break:/)).toBeInTheDocument();
            expect(screen.getByLabelText(/Long Break:/)).toBeInTheDocument();
        });

        it('should have proper heading structure', () => {
            render(<Settings {...defaultProps} />);

            expect(screen.getByRole('heading', { level: 2, name: 'Settings' })).toBeInTheDocument();
            expect(screen.getByRole('heading', { level: 3, name: 'Timer Durations' })).toBeInTheDocument();
            expect(screen.getByRole('heading', { level: 3, name: 'Notifications' })).toBeInTheDocument();
            expect(screen.getByRole('heading', { level: 3, name: 'Auto-start' })).toBeInTheDocument();
        });
    });
});