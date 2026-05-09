import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import FusionReport from './FusionReport';
import { useAuth } from '@/contexts/AuthContext';
import { getAssessments, syncReport } from '@/db/api';

// Mocks
jest.mock('@/contexts/AuthContext');
jest.mock('@/db/api');
jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
}));

// Mock UI components that might cause issues in test environment
jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => open ? <div>{children}</div> : null,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <div>{children}</div>,
  DialogDescription: ({ children }: any) => <div>{children}</div>,
  DialogTrigger: ({ children }: any) => <div>{children}</div>,
}));

describe('FusionReport Component', () => {
  const mockUser = { id: 'test-user-id' };
  const mockProfile = { full_name: 'Test User' };

  beforeEach(() => {
    (useAuth as jest.Mock).mockReturnValue({ user: mockUser, profile: mockProfile });
    (getAssessments as jest.Mock).mockResolvedValue([]);
    (syncReport as jest.Mock).mockResolvedValue('new-assessment-id');
  });

  it('renders report with initial data', () => {
    render(<FusionReport scaleData={{ score: 10 }} voiceData={{ score: 50 }} expressionData={{ depression_risk_score: 30 }} />);
    expect(screen.getByText('综合风险评估')).toBeInTheDocument();
    // Check if score is rendered (might be inside text nodes, simple check)
    // Scale score 10
    const scaleElements = screen.getAllByText('10');
    expect(scaleElements.length).toBeGreaterThan(0);
  });

  it('updates data when props change (Sync Logic)', async () => {
    const { rerender } = render(<FusionReport scaleData={{ score: 5 }} voiceData={{ score: 0 }} expressionData={{ depression_risk_score: 0 }} />);
    
    // Rerender with new data
    rerender(<FusionReport scaleData={{ score: 20 }} voiceData={{ score: 0 }} expressionData={{ depression_risk_score: 0 }} />);
    
    await waitFor(() => {
      // Scale score 20
      const scaleElements = screen.getAllByText('20');
      expect(scaleElements.length).toBeGreaterThan(0);
    });
  });

  it('shows report modals when buttons clicked', async () => {
    render(<FusionReport scaleData={{ score: 10 }} />);
    
    const btn = screen.getByText('量表评估报告');
    fireEvent.click(btn);
    
    expect(screen.getByText('量表评估报告详情')).toBeInTheDocument();
  });

  it('displays correct scores in dialogs', async () => {
    render(<FusionReport scaleData={{ phq9_score: 12 }} voiceData={{ emotion_score: 65 }} />);
    // Open scale dialog
    fireEvent.click(screen.getByText('量表评估报告'));
    expect(screen.getByText(/总分: 12 \/ 27/)).toBeInTheDocument();
    // Open voice dialog
    fireEvent.click(screen.getByText('语音情绪识别报告'));
    expect(screen.getByText(/情绪分值: 65 \/ 100/)).toBeInTheDocument();
  });

  it('generates professional advice', async () => {
    render(<FusionReport scaleData={{ score: 25 }} voiceData={{ score: 90 }} expressionData={{ depression_risk_score: 90 }} />); // High risk
    
    await waitFor(() => {
      // It might be generating or already generated depending on timing
      // We check for the section title first
      expect(screen.getByText('专业诊断建议')).toBeInTheDocument();
    });

    // Since generation has a timeout of 1500ms
    await waitFor(() => {
      // Check for content that appears in advice
      expect(screen.getByText(/情绪状态分析/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });
});
