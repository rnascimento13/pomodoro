import React from 'react';
import { render, screen } from '@testing-library/react';
import OfflineIndicator from '../OfflineIndicator';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

// Mock the useOnlineStatus hook
jest.mock('../../hooks/useOnlineStatus');
const mockUseOnlineStatus = useOnlineStatus as jest.MockedFunction<typeof useOnlineStatus>;

describe('OfflineIndicator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not render when online', () => {
    mockUseOnlineStatus.mockReturnValue(true);
    
    const { container } = render(<OfflineIndicator />);
    
    expect(container.firstChild).toBeNull();
  });

  it('should render offline message when offline', () => {
    mockUseOnlineStatus.mockReturnValue(false);
    
    render(<OfflineIndicator />);
    
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/you're offline/i)).toBeInTheDocument();
    expect(screen.getByText(/the app will continue to work with cached data/i)).toBeInTheDocument();
  });

  it('should have proper accessibility attributes', () => {
    mockUseOnlineStatus.mockReturnValue(false);
    
    render(<OfflineIndicator />);
    
    const alert = screen.getByRole('alert');
    expect(alert).toHaveAttribute('aria-live', 'polite');
  });

  it('should display the offline icon', () => {
    mockUseOnlineStatus.mockReturnValue(false);
    
    render(<OfflineIndicator />);
    
    expect(screen.getByText('📡')).toBeInTheDocument();
  });
});