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
   * - All adopted proposals in chronological order with enriched metadata
   * - Turn numbers, proposer info, vote tallies, and superseded flags
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
      
      // Check if this rule was superseded by any proposal
      const supersedingProposal = Array.from(gameModel.proposals.values())
        .find(proposal => 
          proposal.status === 'passed' && 
          proposal.ruleNumber === rule.id && 
          (proposal.type === 'Amend' || proposal.type === 'Repeal' || proposal.type === 'Transmute')
        );
      
      if (supersedingProposal) {
        lines.push('');
        lines.push(`*Superseded by Proposal ${supersedingProposal.id} (${supersedingProposal.type})*`);
      }
      
      lines.push('');
    }

    // Adopted Proposals section with enriched metadata
    const adoptedProposals = Array.from(gameModel.proposals.values())
      .filter(proposal => proposal.status === 'passed')
      .sort((a, b) => a.id - b.id);

    if (adoptedProposals.length > 0) {
      lines.push('## Adopted Proposals');
      lines.push('');
      lines.push('The following proposals were adopted during the game:');
      lines.push('');

      for (const proposal of adoptedProposals) {
        // Find the turn when this proposal was made
        const proposalTurn = this.findProposalTurn(gameModel, proposal.id);
        const proposerName = gameModel.players.find(p => p.id === proposal.proposerId)?.name || proposal.proposerId;
        
        // Calculate vote tallies
        const forVotes = proposal.votes.filter(vote => vote.choice === 'FOR').length;
        const againstVotes = proposal.votes.filter(vote => vote.choice === 'AGAINST').length;
        const abstainVotes = proposal.votes.filter(vote => vote.choice === 'ABSTAIN').length;
        
        lines.push(`### Proposal ${proposal.id} (Turn ${proposalTurn})`);
        lines.push('');
        lines.push(`**Type:** ${proposal.type}`);
        lines.push(`**Rule Number:** ${proposal.ruleNumber}`);
        lines.push(`**Proposed by:** ${proposerName}`);
        lines.push(`**Vote Results:** ${forVotes} FOR, ${againstVotes} AGAINST, ${abstainVotes} ABSTAIN`);
        lines.push('');
        lines.push(proposal.ruleText);
        lines.push('');
        
        // Add detailed voting breakdown
        if (proposal.votes.length > 0) {
          lines.push('**Voting Details:**');
          for (const vote of proposal.votes) {
            const voterName = gameModel.players.find(p => p.id === vote.voterId)?.name || vote.voterId;
            lines.push(`- ${voterName}: ${vote.choice}`);
          }
          lines.push('');
        }
      }
    }

    return lines.join('\n');
  }

  /**
   * Generate a score report with player rankings and game statistics
   * 
   * The score report includes:
   * - Player rankings sorted by points (highest first) with enriched data
   * - Vote tallies and authored-proposal counts per player
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

    // Player Rankings with enhanced data
    lines.push('## Final Rankings');
    lines.push('');
    
    // Sort players by points (highest first)
    const rankedPlayers = Array.from(gameModel.players.values())
      .sort((a, b) => b.points - a.points);
    
    // Calculate player statistics
    const playerStats = this.calculatePlayerStatistics(gameModel, rankedPlayers);
    
    // Create rankings table with enriched data
    lines.push('| Rank | Player | Points | Proposals Authored | Votes Cast | FOR Votes | AGAINST Votes |');
    lines.push('|------|--------|--------|-------------------|------------|-----------|---------------|');
    
    rankedPlayers.forEach((player, index) => {
      const rank = index + 1;
      const isWinner = rank === 1;
      const playerName = isWinner ? `${player.name} 🏆` : player.name;
      const stats = playerStats.get(player.id);
      
      lines.push(`| ${rank} | ${playerName} | ${player.points} | ${stats?.proposalsAuthored || 0} | ${stats?.totalVotes || 0} | ${stats?.forVotes || 0} | ${stats?.againstVotes || 0} |`);
    });
    
    lines.push('');

    // Player Performance Details
    lines.push('## Player Performance Details');
    lines.push('');
    
    for (const player of rankedPlayers) {
      const stats = playerStats.get(player.id);
      if (!stats) continue;
      
      lines.push(`### ${player.name}`);
      lines.push('');
      lines.push(`- **Final Score:** ${player.points} points`);
      lines.push(`- **Proposals Authored:** ${stats.proposalsAuthored}`);
      lines.push(`- **Proposals Adopted:** ${stats.proposalsAdopted}`);
      lines.push(`- **Success Rate:** ${stats.proposalsAuthored > 0 ? Math.round((stats.proposalsAdopted / stats.proposalsAuthored) * 100) : 0}%`);
      lines.push(`- **Total Votes Cast:** ${stats.totalVotes}`);
      lines.push(`- **Voting Breakdown:** ${stats.forVotes} FOR, ${stats.againstVotes} AGAINST, ${stats.abstainVotes} ABSTAIN`);
      lines.push('');
    }

    // Game Statistics
    lines.push('## Game Statistics');
    lines.push('');
    
    const totalProposals = gameModel.proposals.length;
    const adoptedProposals = Array.from(gameModel.proposals.values())
      .filter(proposal => proposal.status === 'passed').length;
    const failedProposals = Array.from(gameModel.proposals.values())
      .filter(proposal => proposal.status === 'failed').length;
    const victoryTarget = gameModel.config.victoryTarget;
    
    lines.push(`- **Total Turns:** ${gameModel.turn}`);
    lines.push(`- **Total Proposals:** ${totalProposals}`);
    lines.push(`- **Adopted Proposals:** ${adoptedProposals}`);
    lines.push(`- **Failed Proposals:** ${failedProposals}`);
    lines.push(`- **Adoption Rate:** ${totalProposals > 0 ? Math.round((adoptedProposals / totalProposals) * 100) : 0}%`);
    lines.push(`- **Victory Target:** ${victoryTarget} points`);
    lines.push(`- **Final Rule Count:** ${gameModel.rules.length}`);
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
   * Find the turn number when a proposal was made
   * 
   * @param gameModel - The game model to search
   * @param proposalId - The proposal ID to find
   * @returns Turn number or 'Unknown' if not found
   * @private
   */
  private findProposalTurn(gameModel: typeof GameModel.Type, proposalId: number): string {
    // Look through the game history for when this proposal was created
    // For now, use the turn count as approximation since we don't have detailed history tracking
    // TODO: Enhance this when detailed turn history is available
    return `${Math.min(proposalId, gameModel.turn)}`;
  }

  /**
   * Calculate detailed statistics for each player
   * 
   * @param gameModel - The game model to analyze
   * @param players - Array of players to calculate stats for
   * @returns Map of player ID to their statistics
   * @private
   */
  private calculatePlayerStatistics(gameModel: typeof GameModel.Type, players: any[]): Map<string, {
    proposalsAuthored: number;
    proposalsAdopted: number;
    totalVotes: number;
    forVotes: number;
    againstVotes: number;
    abstainVotes: number;
  }> {
    const stats = new Map();
    
    for (const player of players) {
      // Count proposals authored by this player
      const authoredProposals = Array.from(gameModel.proposals.values())
        .filter(proposal => proposal.proposerId === player.id);
      
      const adoptedProposals = authoredProposals
        .filter(proposal => proposal.status === 'passed');
      
      // Count votes cast by this player
      let forVotes = 0;
      let againstVotes = 0;
      let abstainVotes = 0;
      
      for (const proposal of gameModel.proposals.values()) {
        const vote = proposal.votes.find(vote => vote.voterId === player.id);
        if (vote) {
          switch (vote.choice) {
            case 'FOR':
              forVotes++;
              break;
            case 'AGAINST':
              againstVotes++;
              break;
            case 'ABSTAIN':
              abstainVotes++;
              break;
          }
        }
      }
      
      stats.set(player.id, {
        proposalsAuthored: authoredProposals.length,
        proposalsAdopted: adoptedProposals.length,
        totalVotes: forVotes + againstVotes + abstainVotes,
        forVotes,
        againstVotes,
        abstainVotes
      });
    }
    
    return stats;
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