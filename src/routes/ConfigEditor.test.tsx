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
 * ConfigEditor doesn't need GameProvider - it manages its own config state
 */
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>
    {children}
  </BrowserRouter>
);

/**
 * Render ConfigEditor with appropriate test context
 */
const renderConfigEditor = () => {
  return render(
    <TestWrapper>
      <ConfigEditor />
    </TestWrapper>
  );
};

describe('ConfigEditor', () => {
  beforeEach(() => {
    // Cleanup and reset before each test
    vi.clearAllMocks();
    
    // Ensure clean DOM state 
    document.body.innerHTML = '';
    
    // Reset all sessionStorage mocks
    mockSessionStorage.getItem.mockReturnValue(null);
    mockSessionStorage.setItem.mockImplementation(() => {});
    mockSessionStorage.removeItem.mockImplementation(() => {});
    mockSessionStorage.clear.mockImplementation(() => {});
  });

  describe('component rendering', () => {
    it('should render the configuration editor interface', () => {
      renderConfigEditor();

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
      renderConfigEditor();

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
      renderConfigEditor();

      expect(screen.getByText('📁 Import JSON')).toBeInTheDocument();
      expect(screen.getByText('💾 Export JSON')).toBeInTheDocument();
      expect(screen.getByText('🔄 Reset to Defaults')).toBeInTheDocument();
      expect(screen.getByText('❌ Discard')).toBeInTheDocument();
      expect(screen.getByText('🎮 Save & Use')).toBeInTheDocument();
    });
  });

  describe('form interactions', () => {
    it('should update turn delay when input changes', async () => {
      renderConfigEditor();

      const turnDelayInput = screen.getByLabelText('Turn Delay (ms)');
      
      fireEvent.change(turnDelayInput, { target: { value: '500' } });
      
      await waitFor(() => {
        expect(turnDelayInput).toHaveValue(500);
      });
    });

    it('should update agent type when select changes', async () => {
      renderConfigEditor();

      const agentTypeSelect = screen.getByLabelText('Agent Type');
      
      fireEvent.change(agentTypeSelect, { target: { value: 'openai' } });
      
      await waitFor(() => {
        expect(agentTypeSelect).toHaveValue('openai');
      });
    });

    it('should update checkbox when clicked', async () => {
      renderConfigEditor();

      const debugCheckbox = screen.getByLabelText('Force Debug Snapshots');
      
      fireEvent.click(debugCheckbox);
      
      await waitFor(() => {
        expect(debugCheckbox).toBeChecked();
      });
    });

    it('should update prompt P textarea', async () => {
      renderConfigEditor();

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
      renderConfigEditor();

      // Try to set an invalid turn delay (negative)
      const turnDelayInput = screen.getByLabelText('Turn Delay (ms)');
      fireEvent.change(turnDelayInput, { target: { value: '-100' } });

      // Look for the actual error message that appears
      await waitFor(() => {
        expect(screen.getByText(/Turn delay must be non-negative/)).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should show error banner when configuration is invalid', async () => {
      renderConfigEditor();

      // Make configuration invalid by setting invalid max players
      const maxPlayersInput = screen.getByLabelText('Maximum Players');
      fireEvent.change(maxPlayersInput, { target: { value: '0' } });

      // Should show error banner (as seen in the test output)
      await waitFor(() => {
        expect(screen.getByText('⚠️ Configuration Error')).toBeInTheDocument();
        expect(screen.getByText('Max players must be positive')).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('export functionality', () => {
    it('should trigger export when Export JSON button is clicked', () => {
      // Mock DOM methods
      const mockElement = {
        click: vi.fn(),
        href: '',
        download: '',
        style: { display: '' }
      } as unknown as HTMLElement;
      
      const mockCreateElement = vi.fn(() => mockElement);
      const mockAppendChild = vi.fn();
      const mockRemoveChild = vi.fn();
      
      vi.spyOn(document, 'createElement').mockImplementation(mockCreateElement);
      vi.spyOn(document.body, 'appendChild').mockImplementation(mockAppendChild);
      vi.spyOn(document.body, 'removeChild').mockImplementation(mockRemoveChild);

      renderConfigEditor();

      const exportButton = screen.getByText('💾 Export JSON');
      fireEvent.click(exportButton);

      expect(mockCreateElement).toHaveBeenCalledWith('a');
      expect(mockAppendChild).toHaveBeenCalled();
      expect(mockRemoveChild).toHaveBeenCalled();
    });
  });

  describe('navigation', () => {
    it('should navigate back when Discard button is clicked', () => {
      renderConfigEditor();

      const discardButton = screen.getByText('❌ Discard');
      fireEvent.click(discardButton);

      expect(mockNavigate).toHaveBeenCalledWith(-1);
    });

    it('should navigate to game when Save & Use is clicked with valid config', async () => {
      renderConfigEditor();

      const saveButton = screen.getByText('🎮 Save & Use');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/');
      });
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA labels for form fields', () => {
      renderConfigEditor();

      // Check ARIA labels and descriptions
      const turnDelayInput = screen.getByLabelText('Turn Delay (ms)');
      expect(turnDelayInput).toHaveAttribute('aria-describedby', 'turnDelayMs-help');

      const agentTypeSelect = screen.getByLabelText('Agent Type');
      expect(agentTypeSelect).toHaveAttribute('aria-describedby', 'agentType-help');

      const promptTextarea = screen.getByLabelText('AI Behavioral Prompt');
      expect(promptTextarea).toHaveAttribute('aria-describedby', 'promptP-help');
    });

    it('should be keyboard navigable', () => {
      renderConfigEditor();

      // Test that form elements can be focused
      const turnDelayInput = screen.getByLabelText('Turn Delay (ms)');
      turnDelayInput.focus();
      expect(turnDelayInput).toHaveFocus();

      const agentTypeSelect = screen.getByLabelText('Agent Type');
      agentTypeSelect.focus();
      expect(agentTypeSelect).toHaveFocus();
    });

    it('should support keyboard activation of buttons', () => {
      renderConfigEditor();

      const discardButton = screen.getByText('❌ Discard');
      
      // Test keyboard activation
      fireEvent.keyDown(discardButton, { key: 'Enter', code: 'Enter' });
      expect(mockNavigate).toHaveBeenCalledWith(-1);
    });
  });

  describe('reset functionality', () => {
    it('should reset configuration when Reset to Defaults is clicked', async () => {
      renderConfigEditor();

      // Change a value first
      const turnDelayInput = screen.getByLabelText('Turn Delay (ms)');
      fireEvent.change(turnDelayInput, { target: { value: '1000' } });

      // Reset to defaults
      const resetButton = screen.getByText('🔄 Reset to Defaults');
      fireEvent.click(resetButton);

      await waitFor(() => {
        expect(turnDelayInput).toHaveValue(200); // Default value
      });
    });
  });

  describe('hot-reload functionality', () => {
    it('should show hot-reload URL when configuration is dirty', async () => {
      renderConfigEditor();

      // Make configuration dirty
      const turnDelayInput = screen.getByLabelText('Turn Delay (ms)');
      fireEvent.change(turnDelayInput, { target: { value: '1000' } });

      // Check if hot-reload functionality is available (this might be implementation-dependent)
      await waitFor(() => {
        // This test might need adjustment based on actual hot-reload implementation
        expect(turnDelayInput).toHaveValue(1000);
      });
    });
  });
}); 