import JSZip from 'jszip';
import type { GameModel } from '../models/GameModel';

/**
 * Package data returned by createGamePackage method
 * Contains the ZIP blob, filename, contents list, metadata, and size
 */
interface GamePackageData {
  /** The ZIP file as a Blob for download */
  blob: Blob;
  /** Generated filename with timestamp */
  filename: string;
  /** List of files included in the package */
  contents: string[];
  /** Game metadata for reference */
  metadata: GamePackageMetadata;
  /** Package size in bytes */
  size: number;
}

/**
 * Metadata extracted from the game state for package reference
 * Provides key statistics about the completed game
 */
interface GamePackageMetadata {
  /** Whether the game reached completion */
  gameCompleted: boolean;
  /** Number of players in the game */
  totalPlayers: number;
  /** Number of rules in the game */
  totalRules: number;
  /** Total number of proposals made */
  totalProposals: number;
  /** Number of proposals that were adopted */
  adoptedProposals: number;
  /** Name of the winning player */
  winner: string | null;
  /** Final score of the winner */
  finalScore: number;
}

/**
 * Size estimates for package contents
 * Helps developers understand space requirements
 */
interface PackageSizeEstimate {
  /** Estimated size of RULEBOOK.md in bytes */
  rulebook: number;
  /** Estimated size of SCORE_REPORT.md in bytes */
  scoreReport: number;
  /** Total estimated package size in bytes */
  total: number;
}

/**
 * GamePackager handles the creation of downloadable ZIP packages
 * containing the final game state as markdown documents.
 * 
 * This class is responsible for:
 * - Generating a comprehensive rulebook with all rules and adopted proposals
 * - Creating a score report with player rankings and game statistics
 * - Packaging both documents into a downloadable ZIP file
 * - Validating that games are ready for packaging
 * - Managing download URLs and cleanup
 * 
 * The generated package serves as a permanent record of the completed game,
 * suitable for sharing, archiving, or analysis.
 */
export class GamePackager {
  /**
   * Generate a comprehensive rulebook in markdown format
   * 
   * The rulebook includes:
   * - All initial rules sorted by ID
   * - All adopted proposals in chronological order
   * - Proper markdown formatting with headers and emphasis
   * 
   * @param gameModel - The completed game model
   * @returns Markdown string containing the complete rulebook
   */
  generateRulebook(gameModel: typeof GameModel.Type): string {
    const lines: string[] = [];
    
    // Header
    lines.push('# Proof-Nomic Game Rulebook');
    lines.push('');
    lines.push('This document contains all rules that governed the completed game.');
    lines.push('');

    // Initial Rules section
    lines.push('## Initial Rules');
    lines.push('');
    
    // Sort rules by ID for consistent ordering
    const sortedRules = Array.from(gameModel.rules.values()).sort((a, b) => a.id - b.id);
    
    for (const rule of sortedRules) {
      lines.push(`### Rule ${rule.id}`);
      lines.push('');
      lines.push(rule.text);
      lines.push('');
      lines.push(`*${rule.mutable ? 'Mutable' : 'Immutable'}*`);
      lines.push('');
    }

    // Adopted Proposals section
    const adoptedProposals = Array.from(gameModel.proposals.values())
      .filter(proposal => proposal.status === 'passed')
      .sort((a, b) => a.id - b.id);

    if (adoptedProposals.length > 0) {
      lines.push('## Adopted Proposals');
      lines.push('');
      lines.push('The following proposals were adopted during the game:');
      lines.push('');

      for (const proposal of adoptedProposals) {
        lines.push(`### Proposal ${proposal.id}`);
        lines.push('');
        lines.push(`**Type:** ${proposal.type}`);
        lines.push(`**Rule Number:** ${proposal.ruleNumber}`);
        lines.push(`**Proposed by:** ${proposal.proposerId}`);
        lines.push('');
        lines.push(proposal.ruleText);
        lines.push('');
      }
    }

    return lines.join('\n');
  }

  /**
   * Generate a score report with player rankings and game statistics
   * 
   * The score report includes:
   * - Player rankings sorted by points (highest first)
   * - Trophy emoji for the winner
   * - Comprehensive game statistics
   * - Markdown table formatting for readability
   * 
   * @param gameModel - The completed game model  
   * @returns Markdown string containing the score report
   */
  generateScoreReport(gameModel: typeof GameModel.Type): string {
    const lines: string[] = [];
    
    // Header
    lines.push('# Score Report');
    lines.push('');
    lines.push('Final standings and statistics for the completed Proof-Nomic game.');
    lines.push('');

    // Player Rankings
    lines.push('## Final Rankings');
    lines.push('');
    
    // Sort players by points (highest first)
    const rankedPlayers = Array.from(gameModel.players.values())
      .sort((a, b) => b.points - a.points);
    
    // Create rankings table
    lines.push('| Rank | Player | Points |');
    lines.push('|------|--------|--------|');
    
    rankedPlayers.forEach((player, index) => {
      const rank = index + 1;
      const isWinner = rank === 1;
      const playerName = isWinner ? `${player.name} 🏆` : player.name;
      lines.push(`| ${rank} | ${playerName} | ${player.points} |`);
    });
    
    lines.push('');

    // Game Statistics
    lines.push('## Game Statistics');
    lines.push('');
    
    const totalProposals = gameModel.proposals.length;
    const adoptedProposals = Array.from(gameModel.proposals.values())
      .filter(proposal => proposal.status === 'passed').length;
    const victoryTarget = gameModel.config.victoryTarget;
    
    lines.push(`- Total Turns: ${gameModel.turn}`);
    lines.push(`- Total Proposals: ${totalProposals}`);
    lines.push(`- Adopted Proposals: ${adoptedProposals}`);
    lines.push(`- Victory Target: ${victoryTarget} points`);
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Create a complete game package as a downloadable ZIP file
   * 
   * The package contains:
   * - RULEBOOK.md with all rules and adopted proposals
   * - SCORE_REPORT.md with rankings and statistics
   * - Metadata about the game state
   * 
   * @param gameModel - The completed game model
   * @returns Promise that resolves to package data including the ZIP blob
   */
  async createGamePackage(gameModel: typeof GameModel.Type): Promise<GamePackageData> {
    // Validate the game is ready for packaging
    this.validateGameForPackaging(gameModel);

    // Generate the content files
    const rulebook = this.generateRulebook(gameModel);
    const scoreReport = this.generateScoreReport(gameModel);

    // Create ZIP file using JSZip
    const zip = new JSZip();
    zip.file('RULEBOOK.md', rulebook);
    zip.file('SCORE_REPORT.md', scoreReport);

    // Generate the ZIP blob
    const blob = await zip.generateAsync({ type: 'blob' });

    // Create metadata
    const metadata = this.extractMetadata(gameModel);

    // Generate filename with timestamp
    const timestamp = this.formatTimestamp(Date.now());
    const filename = `proof-nomic-game-${timestamp}.zip`;

    return {
      blob,
      filename,
      contents: ['RULEBOOK.md', 'SCORE_REPORT.md'],
      metadata,
      size: blob.size
    };
  }

  /**
   * Create a download URL for a package blob
   * 
   * This creates a temporary URL that can be used to trigger downloads
   * in the browser. Remember to revoke the URL after use to prevent memory leaks.
   * 
   * @param packageData - The package data containing the blob
   * @returns Temporary download URL
   */
  createDownloadUrl(packageData: GamePackageData): string {
    return URL.createObjectURL(packageData.blob);
  }

  /**
   * Revoke a download URL to prevent memory leaks
   * 
   * Call this after the download has been triggered or is no longer needed
   * to free up browser memory.
   * 
   * @param url - The URL to revoke (returned from createDownloadUrl)
   */
  revokeDownloadUrl(url: string): void {
    URL.revokeObjectURL(url);
  }

  /**
   * Validate that a game is ready for packaging
   * 
   * Ensures the game meets all requirements:
   * - Game must be completed
   * - Game must have players
   * - Game must have rules
   * 
   * @param gameModel - The game model to validate
   * @throws Error if validation fails
   */
  validateGameForPackaging(gameModel: typeof GameModel.Type): void {
    if (gameModel.phase !== 'completed') {
      throw new Error('Game must be completed before packaging');
    }

    if (gameModel.players.length === 0) {
      throw new Error('Game must have players to be packaged');
    }

    if (gameModel.rules.length === 0) {
      throw new Error('Game must have rules to be packaged');
    }
  }

  /**
   * Estimate the size of package contents before creation
   * 
   * Provides rough estimates based on content length.
   * Useful for UI feedback or storage planning.
   * 
   * @param gameModel - The game model to estimate for
   * @returns Size estimates in bytes
   */
  estimatePackageSize(gameModel: typeof GameModel.Type): PackageSizeEstimate {
    const rulebook = this.generateRulebook(gameModel);
    const scoreReport = this.generateScoreReport(gameModel);
    
    // Estimate bytes as roughly 1 byte per character (UTF-8 may vary)
    const rulebookSize = new Blob([rulebook]).size;
    const scoreReportSize = new Blob([scoreReport]).size;
    
    return {
      rulebook: rulebookSize,
      scoreReport: scoreReportSize,
      total: rulebookSize + scoreReportSize
    };
  }

  /**
   * Format a timestamp for use in filenames
   * 
   * Creates a filesystem-safe timestamp string in ISO-like format
   * but with hyphens instead of colons for cross-platform compatibility.
   * 
   * @param timestamp - Timestamp in milliseconds
   * @returns Formatted timestamp string (YYYY-MM-DD_HH-mm-SS)
   */
  formatTimestamp(timestamp: number): string {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
  }

  /**
   * Extract metadata from the game model
   * 
   * Creates a summary object with key game statistics
   * for inclusion in the package data.
   * 
   * @param gameModel - The game model to extract from
   * @returns Metadata object with game statistics
   * @private
   */
  private extractMetadata(gameModel: typeof GameModel.Type): GamePackageMetadata {
    const adoptedProposals = Array.from(gameModel.proposals.values())
      .filter(proposal => proposal.status === 'passed').length;
    
    const winner = gameModel.winner;
    
    return {
      gameCompleted: gameModel.phase === 'completed',
      totalPlayers: gameModel.players.length,
      totalRules: gameModel.rules.length,
      totalProposals: gameModel.proposals.length,
      adoptedProposals,
      winner: winner ? winner.name : null,
      finalScore: winner ? winner.points : 0
    };
  }
} 