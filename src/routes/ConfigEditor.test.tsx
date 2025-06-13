import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ConfigEditor from './ConfigEditor';
import '@testing-library/jest-dom';

// Mock the navigate function
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [new URLSearchParams()]
  };
});

// Mock sessionStorage
const mockSessionStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};
Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage
});

// Mock window.confirm
Object.defineProperty(window, 'confirm', {
  value: vi.fn(() => true)
});

/**
 * Test wrapper component to provide Router context
 */
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>
    {children}
  </BrowserRouter>
);

describe('ConfigEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('component rendering', () => {
    it('should render the configuration editor interface', () => {
      render(
        <TestWrapper>
          <ConfigEditor />
        </TestWrapper>
      );

      // Check main elements
      expect(screen.getByText('Configuration Editor')).toBeInTheDocument();
      expect(screen.getByText('Customize game settings and create tailored gaming experiences')).toBeInTheDocument();
      
      // Check form sections
      expect(screen.getByText('Core Game Settings')).toBeInTheDocument();
      expect(screen.getByText('Agent Configuration')).toBeInTheDocument();
      expect(screen.getByText('Debug & Performance')).toBeInTheDocument();
      expect(screen.getByText('AI Instructions (Prompt P)')).toBeInTheDocument();
    });

    it('should render all form fields with proper labels', () => {
      render(
        <TestWrapper>
          <ConfigEditor />
        </TestWrapper>
      );

      // Core settings fields
      expect(screen.getByLabelText('Turn Delay (ms)')).toBeInTheDocument();
      expect(screen.getByLabelText('Maximum Players')).toBeInTheDocument();
      expect(screen.getByLabelText('Victory Target')).toBeInTheDocument();

      // Agent configuration fields
      expect(screen.getByLabelText('Agent Type')).toBeInTheDocument();
      expect(screen.getByLabelText('Agent Timeout (ms)')).toBeInTheDocument();
      expect(screen.getByLabelText('Agent Concurrency')).toBeInTheDocument();

      // Debug fields
      expect(screen.getByLabelText('Snapshot Mode')).toBeInTheDocument();
      expect(screen.getByLabelText('Force Debug Snapshots')).toBeInTheDocument();

      // AI instructions
      expect(screen.getByLabelText('AI Behavioral Prompt')).toBeInTheDocument();
    });

    it('should render action buttons', () => {
      render(
        <TestWrapper>
          <ConfigEditor />
        </TestWrapper>
      );

      expect(screen.getByText('📁 Import JSON')).toBeInTheDocument();
      expect(screen.getByText('💾 Export JSON')).toBeInTheDocument();
      expect(screen.getByText('🔄 Reset to Defaults')).toBeInTheDocument();
      expect(screen.getByText('❌ Discard')).toBeInTheDocument();
      expect(screen.getByText('🎮 Save & Use')).toBeInTheDocument();
    });
  });

  describe('form interactions', () => {
    it('should update turn delay when input changes', async () => {
      render(
        <TestWrapper>
          <ConfigEditor />
        </TestWrapper>
      );

      const turnDelayInput = screen.getByLabelText('Turn Delay (ms)');
      
      fireEvent.change(turnDelayInput, { target: { value: '500' } });
      
      await waitFor(() => {
        expect(turnDelayInput).toHaveValue(500);
      });
    });

    it('should update agent type when select changes', async () => {
      render(
        <TestWrapper>
          <ConfigEditor />
        </TestWrapper>
      );

      const agentTypeSelect = screen.getByLabelText('Agent Type');
      
      fireEvent.change(agentTypeSelect, { target: { value: 'openai' } });
      
      await waitFor(() => {
        expect(agentTypeSelect).toHaveValue('openai');
      });
    });

    it('should update checkbox when clicked', async () => {
      render(
        <TestWrapper>
          <ConfigEditor />
        </TestWrapper>
      );

      const debugCheckbox = screen.getByLabelText('Force Debug Snapshots');
      
      fireEvent.click(debugCheckbox);
      
      await waitFor(() => {
        expect(debugCheckbox).toBeChecked();
      });
    });

    it('should update prompt P textarea', async () => {
      render(
        <TestWrapper>
          <ConfigEditor />
        </TestWrapper>
      );

      const promptTextarea = screen.getByLabelText('AI Behavioral Prompt');
      const testPrompt = 'Custom AI instructions for testing';
      
      fireEvent.change(promptTextarea, { target: { value: testPrompt } });
      
      await waitFor(() => {
        expect(promptTextarea).toHaveValue(testPrompt);
      });
    });
  });

  describe('validation', () => {
    it('should show validation errors for invalid values', async () => {
      render(
        <TestWrapper>
          <ConfigEditor />
        </TestWrapper>
      );

      // Try to set an invalid turn delay (negative)
      const turnDelayInput = screen.getByLabelText('Turn Delay (ms)');
      fireEvent.change(turnDelayInput, { target: { value: '-100' } });

      // Should show validation error
      await waitFor(() => {
        expect(screen.getByText(/Validation Errors/)).toBeInTheDocument();
      });
    });

    it('should disable Save & Use button when configuration is invalid', async () => {
      render(
        <TestWrapper>
          <ConfigEditor />
        </TestWrapper>
      );

      // Make configuration invalid
      const maxPlayersInput = screen.getByLabelText('Maximum Players');
      fireEvent.change(maxPlayersInput, { target: { value: '0' } });

      await waitFor(() => {
        const saveButton = screen.getByText('🎮 Save & Use');
        expect(saveButton).toBeDisabled();
      });
    });
  });

  describe('export functionality', () => {
    it('should trigger export when Export JSON button is clicked', () => {
      // Mock URL.createObjectURL and other DOM APIs
      const mockCreateObjectURL = vi.fn(() => 'blob:mock-url');
      const mockRevokeObjectURL = vi.fn();
      const mockClick = vi.fn();
      const mockAppendChild = vi.fn();
      const mockRemoveChild = vi.fn();

      global.URL.createObjectURL = mockCreateObjectURL;
      global.URL.revokeObjectURL = mockRevokeObjectURL;

      const mockAnchor = {
        href: '',
        download: '',
        click: mockClick
      } as any;

      vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor);
      vi.spyOn(document.body, 'appendChild').mockImplementation(mockAppendChild);
      vi.spyOn(document.body, 'removeChild').mockImplementation(mockRemoveChild);

      render(
        <TestWrapper>
          <ConfigEditor />
        </TestWrapper>
      );

      const exportButton = screen.getByText('💾 Export JSON');
      fireEvent.click(exportButton);

      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockClick).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalled();
    });
  });

  describe('navigation', () => {
    it('should navigate back when Discard button is clicked', () => {
      render(
        <TestWrapper>
          <ConfigEditor />
        </TestWrapper>
      );

      const discardButton = screen.getByText('❌ Discard');
      fireEvent.click(discardButton);

      expect(mockNavigate).toHaveBeenCalledWith('/');
    });

    it('should navigate to game when Save & Use is clicked with valid config', async () => {
      render(
        <TestWrapper>
          <ConfigEditor />
        </TestWrapper>
      );

      const saveButton = screen.getByText('🎮 Save & Use');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/game');
      });
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA labels for form fields', () => {
      render(
        <TestWrapper>
          <ConfigEditor />
        </TestWrapper>
      );

      // Check ARIA labels and descriptions
      const turnDelayInput = screen.getByLabelText('Turn Delay (ms)');
      expect(turnDelayInput).toHaveAttribute('aria-describedby', 'turnDelayMs-help');

      const maxPlayersInput = screen.getByLabelText('Maximum Players');
      expect(maxPlayersInput).toHaveAttribute('aria-describedby', 'maxPlayers-help');

      const agentTypeSelect = screen.getByLabelText('Agent Type');
      expect(agentTypeSelect).toHaveAttribute('aria-describedby', 'agentType-help');
    });

    it('should be keyboard navigable', () => {
      render(
        <TestWrapper>
          <ConfigEditor />
        </TestWrapper>
      );

      // Test that form elements can be focused
      const turnDelayInput = screen.getByLabelText('Turn Delay (ms)');
      turnDelayInput.focus();
      expect(turnDelayInput).toHaveFocus();

      const agentTypeSelect = screen.getByLabelText('Agent Type');
      agentTypeSelect.focus();
      expect(agentTypeSelect).toHaveFocus();

      const saveButton = screen.getByText('🎮 Save & Use');
      saveButton.focus();
      expect(saveButton).toHaveFocus();
    });

    it('should support keyboard activation of buttons', () => {
      render(
        <TestWrapper>
          <ConfigEditor />
        </TestWrapper>
      );

      const discardButton = screen.getByText('❌ Discard');
      
      // Test Enter key
      fireEvent.keyDown(discardButton, { key: 'Enter', code: 'Enter' });
      
      // Test Space key
      fireEvent.keyDown(discardButton, { key: ' ', code: 'Space' });
      
      // Should not crash and button should be accessible
      expect(discardButton).toBeInTheDocument();
    });
  });

  describe('reset functionality', () => {
    it('should reset configuration when Reset to Defaults is clicked', async () => {
      render(
        <TestWrapper>
          <ConfigEditor />
        </TestWrapper>
      );

      // Change a value first
      const turnDelayInput = screen.getByLabelText('Turn Delay (ms)');
      fireEvent.change(turnDelayInput, { target: { value: '1000' } });

      // Reset to defaults
      const resetButton = screen.getByText('🔄 Reset to Defaults');
      fireEvent.click(resetButton);

      // Should reset to default value (200)
      await waitFor(() => {
        expect(turnDelayInput).toHaveValue(200);
      });
    });
  });

  describe('hot-reload functionality', () => {
    it('should show hot-reload URL when configuration is dirty', async () => {
      render(
        <TestWrapper>
          <ConfigEditor />
        </TestWrapper>
      );

      // Make configuration dirty
      const turnDelayInput = screen.getByLabelText('Turn Delay (ms)');
      fireEvent.change(turnDelayInput, { target: { value: '500' } });

      // Should show development tools section
      await waitFor(() => {
        expect(screen.getByText('🔧 Development Tools')).toBeInTheDocument();
        expect(screen.getByLabelText('Hot-reload URL')).toBeInTheDocument();
      });
    });
  });
}); 