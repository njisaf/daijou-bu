import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { observer } from 'mobx-react-lite';
import { createGameConfig, type IGameConfig } from '../models/GameConfigModel';
import { createRuleSet } from '../models/RuleSetModel';
import { createGame } from '../models/GameModel';
import { loadInitialRules } from '../utils/loadInitialRules';
import { getGameConfig } from '../config';
import styles from './ConfigEditor.module.css';

/**
 * Configuration Editor Route Component
 * 
 * Provides a comprehensive interface for editing game configuration:
 * - Real-time validation with inline error display
 * - Read-only preview of computed defaults
 * - Import/Export JSON functionality (Markdown not supported - use RulesetEditor for Markdown)
 * - Accessibility-compliant form controls
 * - Hot-reload convenience via query parameters
 * 
 * @see Stage 6.3 specification in devbot_kickoff_prompt.md
 */
const ConfigEditor: React.FC = observer(() => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Local state for the configuration being edited
  const [config, setConfig] = useState<IGameConfig>(() => {
    // Check for hot-reload config in query params
    const configParam = searchParams.get('config');
    if (configParam) {
      try {
        const decoded = JSON.parse(atob(configParam));
        return createGameConfig(decoded);
      } catch {
        // Fall back to defaults if decode fails
      }
    }
    
    // Start with current defaults
    return createGameConfig(getGameConfig());
  });
  
  const [isDirty, setIsDirty] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  /**
   * Handle configuration field updates
   */
  const handleFieldUpdate = (field: string, value: any) => {
    try {
      switch (field) {
        case 'turnDelayMs':
          config.setTurnDelay(value);
          break;
        case 'agentTimeoutMs':
          config.setAgentTimeout(value);
          break;
        case 'maxPlayers':
          config.setMaxPlayers(value);
          break;
        case 'snapshotMode':
          config.setSnapshotMode(value);
          break;
        case 'debugSnapshots':
          config.setDebugSnapshots(value);
          break;
        case 'snapshotCompression':
          config.setSnapshotCompression(value);
          break;
        case 'agentType':
          config.setAgentType(value);
          break;
        case 'agentConcurrency':
          config.setAgentConcurrency(value);
          break;
        case 'promptP':
          config.setPromptP(value);
          break;
        default:
          // Use the generic updateConfig method for other fields
          config.updateConfig({ [field]: value });
      }
      setIsDirty(true);
      setImportError(null);
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Invalid value');
    }
  };

  /**
   * Reset configuration to defaults
   */
  const handleResetToDefaults = () => {
    const confirmed = window.confirm(
      'Reset all configuration to defaults? This will lose any unsaved changes.'
    );
    if (confirmed) {
      config.resetToDefaults();
      setIsDirty(false);
      setImportError(null);
    }
  };

  /**
   * Export configuration as JSON
   */
  const handleExportJSON = () => {
    try {
      const configData = config.asPlainObject;
      const data = JSON.stringify(configData, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `daijo-bu-config-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      setImportError('Failed to export configuration');
    }
  };

  /**
   * Import configuration from JSON file
   */
  const handleImportJSON = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        const newConfig = createGameConfig(json);
        setConfig(newConfig);
        setIsDirty(true);
        setImportError(null);
      } catch (error) {
        setImportError('Invalid JSON file or configuration format');
      }
    };
    reader.readAsText(file);
  };

  /**
   * Save configuration and create a new game
   */
  const handleSaveAndUse = () => {
    try {
      // Validate configuration
      config.validateAndThrow();
      
      // Create game with the new configuration
      const ruleset = createRuleSet(loadInitialRules(config.promptP));
      const game = createGame({ ruleset, config });
      
      // Store the game data for the game route
      sessionStorage.setItem('customGame', JSON.stringify({
        config: config.asPlainObject,
        timestamp: Date.now()
      }));
      
      // Navigate to game
      navigate('/game');
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Failed to create game');
    }
  };

  /**
   * Discard changes and go back
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

  /**
   * Generate hot-reload URL for development convenience
   */
  const getHotReloadUrl = () => {
    try {
      const configData = config.asPlainObject;
      const encoded = btoa(JSON.stringify(configData));
      return `${window.location.origin}/config?config=${encoded}`;
    } catch {
      return window.location.href;
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Configuration Editor</h2>
        <p>Customize game settings and create tailored gaming experiences</p>
        
        {isDirty && (
          <div className={styles.dirtyIndicator}>
            ⚠️ You have unsaved changes
          </div>
        )}
      </div>

      {/* Error Display */}
      {importError && (
        <div className={styles.errorBanner}>
          <h4>⚠️ Configuration Error</h4>
          <p>{importError}</p>
        </div>
      )}

      {/* Validation Errors */}
      {!config.isValid && (
        <div className={styles.errorBanner}>
          <h4>⚠️ Validation Errors</h4>
          <ul>
            {config.validationErrors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Action Bar */}
      <div className={styles.actionBar}>
        <div className={styles.actionGroup}>
          <label className={styles.fileButton}>
            📁 Import JSON
            <input
              type="file"
              accept=".json"
              onChange={handleImportJSON}
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
            onClick={handleResetToDefaults}
            className={`${styles.button} ${styles.secondary}`}
          >
            🔄 Reset to Defaults
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
            disabled={!config.isValid}
          >
            🎮 Save & Use
          </button>
        </div>
      </div>

      {/* Configuration Form */}
      <div className={styles.formContainer}>
        <form className={styles.configForm}>
          {/* Core Game Settings */}
          <section className={styles.section}>
            <h3>Core Game Settings</h3>
            
            <div className={styles.field}>
              <label htmlFor="turnDelayMs">Turn Delay (ms)</label>
              <input
                id="turnDelayMs"
                type="number"
                min="0"
                step="100"
                value={config.turnDelayMs}
                onChange={(e) => handleFieldUpdate('turnDelayMs', parseInt(e.target.value, 10))}
                aria-describedby="turnDelayMs-help"
              />
              <div id="turnDelayMs-help" className={styles.helpText}>
                Milliseconds between turns. Default: 200ms
              </div>
            </div>

            <div className={styles.field}>
              <label htmlFor="maxPlayers">Maximum Players</label>
              <input
                id="maxPlayers"
                type="number"
                min="1"
                max="20"
                value={config.maxPlayers}
                onChange={(e) => handleFieldUpdate('maxPlayers', parseInt(e.target.value, 10))}
                aria-describedby="maxPlayers-help"
              />
              <div id="maxPlayers-help" className={styles.helpText}>
                Maximum number of players allowed in game. Default: 6
              </div>
            </div>

            <div className={styles.field}>
              <label htmlFor="victoryTarget">Victory Target</label>
              <input
                id="victoryTarget"
                type="number"
                min="1"
                value={config.victoryTarget}
                onChange={(e) => handleFieldUpdate('victoryTarget', parseInt(e.target.value, 10))}
                aria-describedby="victoryTarget-help"
              />
              <div id="victoryTarget-help" className={styles.helpText}>
                Points needed to win (legacy mode). Default: 100
              </div>
            </div>
          </section>

          {/* Agent Configuration */}
          <section className={styles.section}>
            <h3>Agent Configuration</h3>
            
            <div className={styles.field}>
              <label htmlFor="agentType">Agent Type</label>
              <select
                id="agentType"
                value={config.agent.type}
                onChange={(e) => handleFieldUpdate('agentType', e.target.value as 'openai' | 'ollama' | 'mock')}
                aria-describedby="agentType-help"
              >
                <option value="mock">Mock (Testing)</option>
                <option value="ollama">Ollama (Local)</option>
                <option value="openai">OpenAI (Cloud)</option>
              </select>
              <div id="agentType-help" className={styles.helpText}>
                Type of AI agent to use for players. Default: auto-detected
              </div>
            </div>

            <div className={styles.field}>
              <label htmlFor="agentTimeoutMs">Agent Timeout (ms)</label>
              <input
                id="agentTimeoutMs"
                type="number"
                min="1000"
                step="1000"
                value={config.agentTimeoutMs}
                onChange={(e) => handleFieldUpdate('agentTimeoutMs', parseInt(e.target.value, 10))}
                aria-describedby="agentTimeoutMs-help"
              />
              <div id="agentTimeoutMs-help" className={styles.helpText}>
                Individual agent request timeout. Default: 15000ms
              </div>
            </div>

            <div className={styles.field}>
              <label htmlFor="agentConcurrency">Agent Concurrency</label>
              <input
                id="agentConcurrency"
                type="number"
                min="1"
                max="20"
                value={config.agent.concurrency}
                onChange={(e) => handleFieldUpdate('agentConcurrency', parseInt(e.target.value, 10))}
                aria-describedby="agentConcurrency-help"
              />
              <div id="agentConcurrency-help" className={styles.helpText}>
                Maximum concurrent agent requests. Default: 4
              </div>
            </div>
          </section>

          {/* Debug Settings */}
          <section className={styles.section}>
            <h3>Debug & Performance</h3>
            
            <div className={styles.field}>
              <label htmlFor="snapshotMode">Snapshot Mode</label>
              <select
                id="snapshotMode"
                value={config.snapshotMode}
                onChange={(e) => handleFieldUpdate('snapshotMode', e.target.value as 'full' | 'diff')}
                aria-describedby="snapshotMode-help"
              >
                <option value="full">Full Snapshots</option>
                <option value="diff">Diff Mode</option>
              </select>
              <div id="snapshotMode-help" className={styles.helpText}>
                Snapshot logging mode. Diff mode improves performance. Default: full
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={config.debugSnapshots}
                  onChange={(e) => handleFieldUpdate('debugSnapshots', e.target.checked)}
                  aria-describedby="debugSnapshots-help"
                />
                Force Debug Snapshots
              </label>
              <div id="debugSnapshots-help" className={styles.helpText}>
                Override snapshot mode to always use full snapshots. Default: false
              </div>
            </div>

            <div className={styles.field}>
              <label htmlFor="snapshotCompression">Snapshot Compression</label>
              <select
                id="snapshotCompression"
                value={config.snapshotCompression}
                onChange={(e) => handleFieldUpdate('snapshotCompression', e.target.value as 'none' | 'gzip')}
                aria-describedby="snapshotCompression-help"
              >
                <option value="none">No Compression</option>
                <option value="gzip">Gzip Compression</option>
              </select>
              <div id="snapshotCompression-help" className={styles.helpText}>
                Compress snapshot logs. Gzip reduces console size by ~70%. Default: none
              </div>
            </div>
          </section>

          {/* AI Instructions */}
          <section className={styles.section}>
            <h3>AI Instructions (Prompt P)</h3>
            
            <div className={styles.field}>
              <label htmlFor="promptP">AI Behavioral Prompt</label>
              <textarea
                id="promptP"
                rows={4}
                value={config.promptP}
                onChange={(e) => handleFieldUpdate('promptP', e.target.value)}
                aria-describedby="promptP-help"
                placeholder="Enter instructions for AI players..."
              />
              <div id="promptP-help" className={styles.helpText}>
                Instructions that guide AI player behavior and strategy. Default: empty
              </div>
            </div>
          </section>
        </form>

        {/* Hot-reload URL for development */}
        {isDirty && (
          <div className={styles.devSection}>
            <h4>🔧 Development Tools</h4>
            <div className={styles.field}>
              <label htmlFor="hotReloadUrl">Hot-reload URL</label>
              <input
                id="hotReloadUrl"
                type="text"
                value={getHotReloadUrl()}
                readOnly
                className={styles.readOnlyField}
                onClick={(e) => (e.target as HTMLInputElement).select()}
                aria-describedby="hotReloadUrl-help"
              />
              <div id="hotReloadUrl-help" className={styles.helpText}>
                URL with current config encoded for rapid development testing
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

export default ConfigEditor; 