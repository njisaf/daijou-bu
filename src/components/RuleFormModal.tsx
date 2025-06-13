import React, { useState, useEffect } from 'react';
import type { IRule } from '../models/RuleModel';
import styles from './RuleFormModal.module.css';

/**
 * Modal for adding or editing a rule
 * 
 * Features:
 * - Add new rules with auto-ID assignment or manual ID input
 * - Edit existing rules with validation
 * - Mutability toggle with explanatory text
 * - Form validation and error handling
 * - Keyboard navigation and accessibility
 * 
 * @param mode - 'add' or 'edit' mode
 * @param initialData - Rule data for edit mode
 * @param onSave - Callback when rule is saved
 * @param onCancel - Callback when modal is cancelled
 * @param existingIds - Array of existing rule IDs for validation
 */
interface RuleFormModalProps {
  mode: 'add' | 'edit';
  initialData?: IRule;
  onSave: (ruleData: { id?: number; text: string; mutable: boolean }) => void;
  onCancel: () => void;
  existingIds: number[];
}

/**
 * RuleFormModal Component
 * 
 * Provides a modal interface for creating and editing rules with comprehensive
 * validation, accessibility features, and user-friendly form controls.
 */
const RuleFormModal: React.FC<RuleFormModalProps> = ({
  mode,
  initialData,
  onSave,
  onCancel,
  existingIds
}) => {
  const [id, setId] = useState<string>(initialData?.id?.toString() || '');
  const [text, setText] = useState(initialData?.text || '');
  const [mutable, setMutable] = useState(initialData?.mutable ?? true);
  const [errors, setErrors] = useState<string[]>([]);
  const [autoAssignId, setAutoAssignId] = useState(mode === 'add');

  /**
   * Calculate next available ID for auto-assignment
   */
  const getNextAvailableId = (): number => {
    if (existingIds.length === 0) return 100;
    
    const sortedIds = [...existingIds].sort((a, b) => a - b);
    let expectedId = 100;
    
    for (const existingId of sortedIds) {
      if (existingId === expectedId) {
        expectedId++;
      } else if (existingId > expectedId) {
        return expectedId;
      }
    }
    
    return expectedId;
  };

  /**
   * Validate the form data
   */
  const validateForm = (): boolean => {
    const newErrors: string[] = [];

    // Validate text
    if (!text.trim()) {
      newErrors.push('Rule text is required');
    } else if (text.trim().length < 10) {
      newErrors.push('Rule text must be at least 10 characters long');
    }

    // Validate ID (if not auto-assigned)
    if (!autoAssignId) {
      const numericId = parseInt(id, 10);
      
      if (!id || isNaN(numericId)) {
        newErrors.push('Rule ID must be a valid number');
      } else if (numericId <= 0) {
        newErrors.push('Rule ID must be a positive number');
      } else if (mode === 'add' && existingIds.includes(numericId)) {
        newErrors.push(`Rule ID ${numericId} already exists`);
      }
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const finalId = autoAssignId ? getNextAvailableId() : parseInt(id, 10);
    
    onSave({
      id: mode === 'add' ? finalId : undefined,
      text: text.trim(),
      mutable
    });
  };

  /**
   * Handle ESC key to close modal
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  /**
   * Auto-focus the text area when modal opens
   */
  useEffect(() => {
    const textArea = document.getElementById('rule-text');
    if (textArea) {
      textArea.focus();
    }
  }, []);

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3>{mode === 'add' ? 'Add New Rule' : 'Edit Rule'}</h3>
          <button 
            className={styles.closeButton}
            onClick={onCancel}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Rule ID Section */}
          {mode === 'add' && (
            <div className={styles.fieldGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={autoAssignId}
                  onChange={(e) => setAutoAssignId(e.target.checked)}
                />
                Auto-assign Rule ID
              </label>
              
              {!autoAssignId && (
                <div className={styles.field}>
                  <label htmlFor="rule-id" className={styles.label}>
                    Rule ID
                  </label>
                  <input
                    id="rule-id"
                    type="number"
                    value={id}
                    onChange={(e) => setId(e.target.value)}
                    className={styles.input}
                    min="1"
                    placeholder="Enter rule ID (e.g., 101, 201)"
                  />
                  <p className={styles.fieldHelp}>
                    Recommended: 100-199 for Immutable rules, 200+ for Mutable rules
                  </p>
                </div>
              )}
              
              {autoAssignId && (
                <p className={styles.autoIdDisplay}>
                  Next available ID: <strong>{getNextAvailableId()}</strong>
                </p>
              )}
            </div>
          )}

          {mode === 'edit' && (
            <div className={styles.field}>
              <label className={styles.label}>Rule ID</label>
              <div className={styles.readOnlyField}>
                {initialData?.id}
              </div>
              <p className={styles.fieldHelp}>
                Rule IDs cannot be changed when editing
              </p>
            </div>
          )}

          {/* Rule Text */}
          <div className={styles.field}>
            <label htmlFor="rule-text" className={styles.label}>
              Rule Text *
            </label>
            <textarea
              id="rule-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              className={styles.textarea}
              rows={4}
              placeholder="Enter the full text of the rule..."
              required
            />
            <p className={styles.fieldHelp}>
              Minimum 10 characters. Be clear and specific.
            </p>
          </div>

          {/* Mutability */}
          <div className={styles.fieldGroup}>
            <label className={styles.label}>Rule Type</label>
            
            <div className={styles.radioGroup}>
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  name="mutability"
                  checked={!mutable}
                  onChange={() => setMutable(false)}
                />
                <span className={styles.radioText}>
                  <strong>Immutable</strong> - Cannot be easily changed (100-series)
                </span>
              </label>
              
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  name="mutability"
                  checked={mutable}
                  onChange={() => setMutable(true)}
                />
                <span className={styles.radioText}>
                  <strong>Mutable</strong> - Can be changed by proposals (200+ series)
                </span>
              </label>
            </div>
            
            <p className={styles.fieldHelp}>
              Immutable rules provide game stability, while Mutable rules allow evolution.
            </p>
          </div>

          {/* Validation Errors */}
          {errors.length > 0 && (
            <div className={styles.errorBanner}>
              <h4>Please fix the following errors:</h4>
              <ul>
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Action Buttons */}
          <div className={styles.actions}>
            <button
              type="button"
              onClick={onCancel}
              className={`${styles.button} ${styles.secondary}`}
            >
              Cancel
            </button>
            
            <button
              type="submit"
              className={`${styles.button} ${styles.primary}`}
            >
              {mode === 'add' ? 'Add Rule' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RuleFormModal; 