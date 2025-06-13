import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import { getSnapshot } from 'mobx-state-tree';
import { createRuleSet } from '../models/RuleSetModel';
import { createGameConfig } from '../models/GameConfigModel';
import { createGame } from '../models/GameModel';
import { cloneDefaultRuleset } from '../utils/cloneDefaultRuleset';
import RuleFormModal from '../components/RuleFormModal';
import styles from './RulesetEditor.module.css';

/**
 * Ruleset Editor Route - Stage 6.2 Implementation
 * 
 * This component provides a comprehensive interface for editing game rulesets.
 * Features include:
 * - Table/List view of all rules with ID, mutability, and text
 * - CRUD operations: Add, Edit, Delete, Move Up/Down
 * - Immutable/Mutable toggle with validation warnings
 * - Import/Export functionality (JSON and Markdown)
 * - Validation with inline error display
 * - Full accessibility with keyboard navigation
 * 
 * State Management:
 * - Uses standalone RuleSetModel instance until "Save & Use"
 * - Optimistic updates with rollback on validation failure
 * - Real-time validation with user feedback
 * 
 * @see daijo-bu_architecture.md Stage 6.2 for specifications
 */
const RulesetEditor: React.FC = observer(() => {
  const navigate = useNavigate();
  
  // Local state for the ruleset being edited
  const [ruleset, setRuleset] = useState(() => cloneDefaultRuleset());
  const [selectedRuleId, setSelectedRuleId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isDirty, setIsDirty] = useState(false);

  /**
   * Handle adding a new rule
   */
  const handleAddRule = () => {
    setSelectedRuleId(null);
    setModalMode('add');
    setIsModalOpen(true);
  };

  /**
   * Handle editing an existing rule
   */
  const handleEditRule = (ruleId: number) => {
    setSelectedRuleId(ruleId);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  /**
   * Handle deleting a rule
   */
  const handleDeleteRule = (ruleId: number) => {
    try {
      ruleset.removeRule(ruleId);
      setIsDirty(true);
      setValidationErrors([]);
    } catch (error) {
      setValidationErrors([error instanceof Error ? error.message : 'Failed to delete rule']);
    }
  };

  /**
   * Handle moving a rule up in order
   */
  const handleMoveRuleUp = (ruleId: number) => {
    try {
      ruleset.moveRuleUp(ruleId);
      setIsDirty(true);
    } catch (error) {
      setValidationErrors([error instanceof Error ? error.message : 'Failed to move rule']);
    }
  };

  /**
   * Handle moving a rule down in order
   */
  const handleMoveRuleDown = (ruleId: number) => {
    try {
      ruleset.moveRuleDown(ruleId);
      setIsDirty(true);
    } catch (error) {
      setValidationErrors([error instanceof Error ? error.message : 'Failed to move rule']);
    }
  };

  /**
   * Handle toggling rule mutability
   */
  const handleToggleMutability = (ruleId: number) => {
    try {
      const rule = ruleset.findRule(ruleId);
      if (!rule) {
        throw new Error(`Rule with ID ${ruleId} not found`);
      }
      
      // Show warning for transmuting immutable rules
      if (!rule.mutable) {
        const confirmed = window.confirm(
          `Warning: You are about to transmute an Immutable rule to Mutable. ` +
          `This is a significant change that affects rule precedence. Continue?`
        );
        if (!confirmed) return;
      }
      
      rule.transmute();
      setIsDirty(true);
      setValidationErrors([]);
    } catch (error) {
      setValidationErrors([error instanceof Error ? error.message : 'Failed to toggle mutability']);
    }
  };

  /**
   * Handle saving a rule from the modal
   */
  const handleSaveRule = (ruleData: { id?: number; text: string; mutable: boolean }) => {
    try {
      if (modalMode === 'add') {
        // Auto-assign ID if not provided
        const id = ruleData.id || ruleset.getNextAvailableId();
        ruleset.addRule({ id, text: ruleData.text, mutable: ruleData.mutable });
      } else if (modalMode === 'edit' && selectedRuleId) {
        ruleset.updateRule(selectedRuleId, ruleData.text, ruleData.mutable);
      }
      
      setIsDirty(true);
      setIsModalOpen(false);
      setValidationErrors([]);
    } catch (error) {
      setValidationErrors([error instanceof Error ? error.message : 'Failed to save rule']);
    }
  };

  /**
   * Handle importing JSON ruleset
   */
  const handleImportJSON = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        const newRuleset = createRuleSet(json);
        setRuleset(newRuleset);
        setIsDirty(true);
        setValidationErrors([]);
      } catch {
        setValidationErrors(['Invalid JSON file or format']);
      }
    };
    reader.readAsText(file);
  };

  /**
   * Handle importing Markdown ruleset
   */
  const handleImportMarkdown = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const markdown = e.target?.result as string;
        const newRuleset = createRuleSet();
        
        // Parse markdown format: look for patterns like "### Rule 101: Text" or "**Rule 101** (Immutable): Text"
        const ruleRegex = /(?:###?\s*)?(?:\*\*)?Rule\s+(\d+)(?:\*\*)?\s*(?:\(([^)]+)\))?\s*:?\s*(.+?)(?=(?:###?\s*)?(?:\*\*)?Rule\s+\d+|$)/gis;
        let match;
        
        while ((match = ruleRegex.exec(markdown)) !== null) {
          const [, idStr, mutabilityStr, text] = match;
          const id = parseInt(idStr, 10);
          const mutable = mutabilityStr ? mutabilityStr.toLowerCase().includes('mutable') && !mutabilityStr.toLowerCase().includes('immutable') : true;
          const cleanText = text.trim().replace(/\n+/g, ' ');
          
          if (cleanText) {
            newRuleset.addRule({ id, text: cleanText, mutable });
          }
        }
        
        if (newRuleset.rules.length === 0) {
          throw new Error('No valid rules found in markdown format');
        }
        
        setRuleset(newRuleset);
        setIsDirty(true);
        setValidationErrors([]);
      } catch (error) {
        setValidationErrors([error instanceof Error ? error.message : 'Invalid Markdown file or format']);
      }
    };
    reader.readAsText(file);
  };

  /**
   * Handle exporting ruleset as JSON
   */
  const handleExportJSON = () => {
    try {
      const data = JSON.stringify(ruleset.toJSON(), null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `custom-ruleset-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setValidationErrors(['Failed to export JSON']);
    }
  };

  /**
   * Handle exporting ruleset as Markdown
   */
  const handleExportMarkdown = () => {
    try {
      const markdown = ruleset.toMarkdown();
      const blob = new Blob([markdown], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `custom-ruleset-${new Date().toISOString().slice(0, 10)}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setValidationErrors(['Failed to export Markdown']);
    }
  };

  /**
   * Handle saving and using the current ruleset
   */
  const handleSaveAndUse = () => {
    try {
      // Validate the ruleset
      ruleset.validateAndThrow();
      
      // Create a game with the custom ruleset
      const config = createGameConfig({
        promptP: 'Custom ruleset game - strategic AI gameplay'
      });
      
      createGame({ ruleset, config });
      
      // Store the game data for the game route
      sessionStorage.setItem('customGame', JSON.stringify({
        ruleset: ruleset.toJSON(),
        config: getSnapshot(config),
        timestamp: Date.now()
      }));
      
      // Navigate to game
      navigate('/game');
    } catch (err) {
      setValidationErrors([err instanceof Error ? err.message : 'Failed to create game']);
    }
  };

  /**
   * Handle discarding changes and going back
   */
  const handleDiscard = () => {
    if (isDirty) {
      const confirmed = window.confirm(
        'You have unsaved changes. Are you sure you want to discard them?'
      );
      if (!confirmed) return;
    }
    
    navigate('/');
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Ruleset Editor</h2>
        <p>Customize your game rules and create unique Nomic experiences</p>
        
        {isDirty && (
          <div className={styles.dirtyIndicator}>
            ⚠️ You have unsaved changes
          </div>
        )}
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className={styles.errorBanner}>
          <h4>⚠️ Validation Errors</h4>
          <ul>
            {validationErrors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Action Bar */}
      <div className={styles.actionBar}>
        <div className={styles.actionGroup}>
          <button 
            onClick={handleAddRule}
            className={`${styles.button} ${styles.primary}`}
          >
            ➕ Add Rule
          </button>
          
          <label className={styles.fileButton}>
            📁 Import JSON
            <input
              type="file"
              accept=".json"
              onChange={handleImportJSON}
              style={{ display: 'none' }}
            />
          </label>
          
          <label className={styles.fileButton}>
            📝 Import Markdown
            <input
              type="file"
              accept=".md,.markdown"
              onChange={handleImportMarkdown}
              style={{ display: 'none' }}
            />
          </label>
          
          <button 
            onClick={handleExportJSON}
            className={styles.button}
          >
            💾 Export JSON
          </button>
          
          <button 
            onClick={handleExportMarkdown}
            className={styles.button}
          >
            📄 Export Markdown
          </button>
        </div>

        <div className={styles.actionGroup}>
          <button 
            onClick={handleDiscard}
            className={`${styles.button} ${styles.secondary}`}
          >
            ❌ Discard
          </button>
          
          <button 
            onClick={handleSaveAndUse}
            className={`${styles.button} ${styles.success}`}
            disabled={validationErrors.length > 0}
          >
            🎮 Save & Use
          </button>
        </div>
      </div>

      {/* Rules Table */}
      <div className={styles.rulesSection}>
        <h3>Rules ({ruleset.rules.length})</h3>
        
        {ruleset.rules.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No rules defined. Add your first rule to get started!</p>
          </div>
        ) : (
          <div className={styles.rulesTable}>
            <div className={styles.tableHeader}>
              <div>ID</div>
              <div>Type</div>
              <div>Text</div>
              <div>Actions</div>
            </div>
            
            {ruleset.sortedRules.map((rule, index) => (
              <div key={rule.id} className={styles.tableRow}>
                <div className={styles.ruleId}>
                  {rule.id}
                </div>
                
                <div className={styles.ruleType}>
                  <button
                    onClick={() => handleToggleMutability(rule.id)}
                    className={`${styles.mutabilityButton} ${rule.mutable ? styles.mutable : styles.immutable}`}
                    title={`Click to toggle to ${rule.mutable ? 'Immutable' : 'Mutable'}`}
                  >
                    {rule.mutable ? 'Mutable' : 'Immutable'}
                  </button>
                </div>
                
                <div className={styles.ruleText}>
                  {rule.text.length > 100 ? `${rule.text.slice(0, 100)}...` : rule.text}
                </div>
                
                <div className={styles.ruleActions}>
                  <button
                    onClick={() => handleEditRule(rule.id)}
                    className={`${styles.iconButton} ${styles.edit}`}
                    title="Edit rule"
                  >
                    ✏️
                  </button>
                  
                  <button
                    onClick={() => handleMoveRuleUp(rule.id)}
                    disabled={index === 0}
                    className={`${styles.iconButton} ${styles.move}`}
                    title="Move up"
                  >
                    ⬆️
                  </button>
                  
                  <button
                    onClick={() => handleMoveRuleDown(rule.id)}
                    disabled={index === ruleset.rules.length - 1}
                    className={`${styles.iconButton} ${styles.move}`}
                    title="Move down"
                  >
                    ⬇️
                  </button>
                  
                  <button
                    onClick={() => handleDeleteRule(rule.id)}
                    className={`${styles.iconButton} ${styles.delete}`}
                    title="Delete rule"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Rule Form Modal */}
      {isModalOpen && (
        <RuleFormModal
          mode={modalMode}
          initialData={selectedRuleId ? ruleset.findRule(selectedRuleId) : undefined}
          onSave={handleSaveRule}
          onCancel={() => setIsModalOpen(false)}
          existingIds={ruleset.rules.map(r => r.id)}
        />
      )}
    </div>
  );
});

export default RulesetEditor; 