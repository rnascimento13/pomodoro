import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { InstallPrompt } from '../InstallPrompt';
import { useInstallPrompt } from '../../hooks/useInstallPrompt';

// Mock the useInstallPrompt hook
jest.mock('../../hooks/useInstallPrompt');

const mockUseInstallPrompt = useInstallPrompt as jest.MockedFunction<typeof useInstallPrompt>;

describe('InstallPrompt', () => {
  const defaultMockReturn = {
    isInstallable: false,
    isInstalled: false,
    showPrompt: false,
    installApp: jest.fn(),
    dismissPrompt: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseInstallPrompt.mockReturnValue(defaultMockReturn);
  });

  it('should not render when not installable', () => {
    mockUseInstallPrompt.mockReturnValue({
      ...defaultMockReturn,
      isInstallable: false,
      showPrompt: false
    });

    const { container } = render(<InstallPrompt />);
    expect(container.firstChild).toBeNull();
  });

  it('should not render when already installed', () => {
    mockUseInstallPrompt.mockReturnValue({
      ...defaultMockReturn,
      isInstalled: true,
      isInstallable: true,
      showPrompt: true
    });

    const { container } = render(<InstallPrompt />);
    expect(container.firstChild).toBeNull();
  });

  it('should not render when showPrompt is false', () => {
    mockUseInstallPrompt.mockReturnValue({
      ...defaultMockReturn,
      isInstallable: true,
      showPrompt: false
    });

    const { container } = render(<InstallPrompt />);
    expect(container.firstChild).toBeNull();
  });

  it('should render when installable and showPrompt is true', () => {
    mockUseInstallPrompt.mockReturnValue({
      ...defaultMockReturn,
      isInstallable: true,
      showPrompt: true
    });

    render(<InstallPrompt />);
    
    expect(screen.getByText('Install Pomodoro Timer')).toBeInTheDocument();
    expect(screen.getByText('Add to your home screen for quick access and a better experience!')).toBeInTheDocument();
    expect(screen.getByText('Install App')).toBeInTheDocument();
    expect(screen.getByText('Maybe Later')).toBeInTheDocument();
  });

  it('should display benefits list', () => {
    mockUseInstallPrompt.mockReturnValue({
      ...defaultMockReturn,
      isInstallable: true,
      showPrompt: true
    });

    render(<InstallPrompt />);
    
    expect(screen.getByText('🚀 Faster loading')).toBeInTheDocument();
    expect(screen.getByText('📱 Works offline')).toBeInTheDocument();
    expect(screen.getByText('🔔 Push notifications')).toBeInTheDocument();
    expect(screen.getByText('🎯 Distraction-free')).toBeInTheDocument();
  });

  it('should call installApp when install button is clicked', async () => {
    const mockInstallApp = jest.fn().mockResolvedValue(true);
    mockUseInstallPrompt.mockReturnValue({
      ...defaultMockReturn,
      isInstallable: true,
      showPrompt: true,
      installApp: mockInstallApp
    });

    render(<InstallPrompt />);
    
    const installButton = screen.getByText('Install App');
    fireEvent.click(installButton);

    expect(mockInstallApp).toHaveBeenCalledTimes(1);
  });

  it('should call dismissPrompt when dismiss button is clicked', () => {
    const mockDismissPrompt = jest.fn();
    mockUseInstallPrompt.mockReturnValue({
      ...defaultMockReturn,
      isInstallable: true,
      showPrompt: true,
      dismissPrompt: mockDismissPrompt
    });

    render(<InstallPrompt />);
    
    const dismissButton = screen.getByText('Maybe Later');
    fireEvent.click(dismissButton);

    expect(mockDismissPrompt).toHaveBeenCalledTimes(1);
  });

  it('should call dismissPrompt when close button is clicked', () => {
    const mockDismissPrompt = jest.fn();
    mockUseInstallPrompt.mockReturnValue({
      ...defaultMockReturn,
      isInstallable: true,
      showPrompt: true,
      dismissPrompt: mockDismissPrompt
    });

    render(<InstallPrompt />);
    
    const closeButton = screen.getByLabelText('Dismiss install prompt');
    fireEvent.click(closeButton);

    expect(mockDismissPrompt).toHaveBeenCalledTimes(1);
  });

  it('should show loading state during installation', async () => {
    const mockInstallApp = jest.fn().mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve(true), 100))
    );
    
    mockUseInstallPrompt.mockReturnValue({
      ...defaultMockReturn,
      isInstallable: true,
      showPrompt: true,
      installApp: mockInstallApp
    });

    render(<InstallPrompt />);
    
    const installButton = screen.getByText('Install App');
    fireEvent.click(installButton);

    // Should show loading state
    await waitFor(() => {
      expect(screen.getByText('Installing...')).toBeInTheDocument();
    });

    // Buttons should be disabled during installation
    expect(installButton).toBeDisabled();
    expect(screen.getByText('Maybe Later')).toBeDisabled();
    expect(screen.getByLabelText('Dismiss install prompt')).toBeDisabled();

    // Wait for installation to complete
    await waitFor(() => {
      expect(mockInstallApp).toHaveBeenCalledTimes(1);
    });
  });

  it('should handle installation failure gracefully', async () => {
    const mockInstallApp = jest.fn().mockRejectedValue(new Error('Installation failed'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    
    mockUseInstallPrompt.mockReturnValue({
      ...defaultMockReturn,
      isInstallable: true,
      showPrompt: true,
      installApp: mockInstallApp
    });

    render(<InstallPrompt />);
    
    const installButton = screen.getByText('Install App');
    fireEvent.click(installButton);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Installation failed:', expect.any(Error));
    });

    consoleSpy.mockRestore();
  });

  it('should have proper accessibility attributes', () => {
    mockUseInstallPrompt.mockReturnValue({
      ...defaultMockReturn,
      isInstallable: true,
      showPrompt: true
    });

    render(<InstallPrompt />);
    
    // Check dialog role
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    
    // Check aria-labelledby
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-labelledby', 'install-title');
    
    // Check install button has aria-describedby
    const installButton = screen.getByText('Install App');
    expect(installButton).toHaveAttribute('aria-describedby', 'install-description');
    
    // Check close button has aria-label
    const closeButton = screen.getByLabelText('Dismiss install prompt');
    expect(closeButton).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    mockUseInstallPrompt.mockReturnValue({
      ...defaultMockReturn,
      isInstallable: true,
      showPrompt: true
    });

    render(<InstallPrompt className="custom-class" />);
    
    const prompt = screen.getByRole('dialog');
    expect(prompt).toHaveClass('install-prompt', 'custom-class');
  });
});