import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useGame } from './GameProvider';
import { GamePackager } from '../packaging/GamePackager';
import styles from './DownloadRulebook.module.css';

/**
 * Download Rulebook component for generating and downloading game packages
 * 
 * Appears when game phase === 'completed' and provides:
 * - ZIP download of RULEBOOK.md and SCORE_REPORT.md
 * - Package size information
 * - Download status and progress
 * 
 * @see daijo-bu_architecture.md Section 7 for packaging specification
 */
const DownloadRulebook: React.FC = observer(() => {
  const { gameModel } = useGame();
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [packageInfo, setPackageInfo] = useState<{
    filename: string;
    size: number;
    contents: string[];
  } | null>(null);

  // Only show when game is completed
  if (gameModel.phase !== 'completed') {
    return null;
  }

  const handleDownload = async () => {
    setIsGenerating(true);
    
    try {
      const packager = new GamePackager();
      
      // Validate game before packaging
      packager.validateGameForPackaging(gameModel);
      
      // Generate the package
      const packageData = await packager.createGamePackage(gameModel);
      
      // Create download URL
      const url = packager.createDownloadUrl(packageData);
      setDownloadUrl(url);
      
      // Store package info for display
      setPackageInfo({
        filename: packageData.filename,
        size: packageData.size,
        contents: packageData.contents
      });
      
      // Trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = packageData.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up URL after a delay
      setTimeout(() => {
        packager.revokeDownloadUrl(url);
        setDownloadUrl(null);
      }, 1000);
      
    } catch (error) {
      console.error('Failed to generate download:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      alert(`Failed to generate download: ${errorMessage}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.header}>
          <h3 className={styles.title}>📦 Game Complete!</h3>
          <p className={styles.subtitle}>
            Download your complete game archive with rulebook and score report.
          </p>
        </div>

        <div className={styles.gameStats}>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Winner</span>
            <span className={styles.statValue}>
              {gameModel.winner ? `${gameModel.winner.name} 👑` : 'No winner'}
            </span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Total Turns</span>
            <span className={styles.statValue}>{gameModel.turn + 1}</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Proposals</span>
            <span className={styles.statValue}>{gameModel.proposals.length}</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Adopted</span>
            <span className={styles.statValue}>
              {gameModel.proposals.filter(p => p.status === 'passed').length}
            </span>
          </div>
        </div>

        <div className={styles.actions}>
          <button
            onClick={handleDownload}
            disabled={isGenerating}
            className={styles.downloadButton}
          >
            {isGenerating ? (
              <>
                <span className={styles.spinner}></span>
                Generating...
              </>
            ) : (
              <>
                📄 Download Game Archive
              </>
            )}
          </button>

          {packageInfo && (
            <div className={styles.packageInfo}>
              <div className={styles.infoItem}>
                <strong>Filename:</strong> {packageInfo.filename}
              </div>
              <div className={styles.infoItem}>
                <strong>Size:</strong> {formatFileSize(packageInfo.size)}
              </div>
              <div className={styles.infoItem}>
                <strong>Contains:</strong> {packageInfo.contents.join(', ')}
              </div>
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <p className={styles.hint}>
            The archive includes a complete rulebook with all adopted proposals
            and a detailed score report with final standings.
          </p>
        </div>
      </div>
    </div>
  );
});

export default DownloadRulebook; 