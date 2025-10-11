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

    // Prompt P Banner
    if (gameModel.config.promptP) {
      lines.push('---');
      lines.push('');
      lines.push('## 🎯 Prompt P (AI Instructions)');
      lines.push('');
      lines.push('*The following instructions guided AI player behavior throughout this game:*');
      lines.push('');
      lines.push('```');
      lines.push(gameModel.config.promptP);
      lines.push('```');
      lines.push('');
      lines.push('---');
      lines.push('');
    }

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
   * Generate game-stats.json file content
   * 
   * Creates a comprehensive JSON file containing structured game statistics
   * for programmatic analysis and archival purposes. This includes detailed
   * player performance metrics, proposal analytics, and game flow data.
   * 
   * @param gameModel - The completed game model
   * @returns JSON string containing structured game statistics
   */
  generateGameStatsFile(gameModel: typeof GameModel.Type): string {
    const metadata = this.extractMetadata(gameModel);
    const playerStats = this.calculatePlayerStatistics(gameModel, Array.from(gameModel.players.values()));
    
    // Convert player stats to JSON-friendly format
    const playersData = Array.from(gameModel.players.values()).map(player => {
      const stats = playerStats.get(player.id);
      return {
        id: player.id,
        name: player.name,
        icon: player.icon,
        finalPoints: player.points,
        proposalsAuthored: stats?.proposalsAuthored || 0,
        proposalsAdopted: stats?.proposalsAdopted || 0,
        successRate: stats?.proposalsAuthored ? (stats.proposalsAdopted / stats.proposalsAuthored) : 0,
        totalVotes: stats?.totalVotes || 0,
        forVotes: stats?.forVotes || 0,
        againstVotes: stats?.againstVotes || 0,
        abstainVotes: stats?.abstainVotes || 0,
        votingParticipation: gameModel.proposals.length > 0 ? (stats?.totalVotes || 0) / gameModel.proposals.length : 0
      };
    });

    // Analyze proposal patterns
    const proposalsByType = Array.from(gameModel.proposals.values()).reduce((acc, proposal) => {
      acc[proposal.type] = (acc[proposal.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const adoptedProposalsByType = Array.from(gameModel.proposals.values())
      .filter(p => p.status === 'passed')
      .reduce((acc, proposal) => {
        acc[proposal.type] = (acc[proposal.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    // Calculate game duration and pace metrics
    const proposals = Array.from(gameModel.proposals.values());
    const gameDurationMinutes = proposals.length > 0 ? 
      Math.round((Math.max(...proposals.map(p => p.timestamp)) - Math.min(...proposals.map(p => p.timestamp))) / (1000 * 60)) : 0;
    
    const gameStats = {
      metadata: {
        gameCompleted: metadata.gameCompleted,
        gameVersion: "1.0.0", // Could be pulled from package.json in future
        generatedAt: new Date().toISOString(),
        gameDurationMinutes: gameDurationMinutes,
        totalTurns: gameModel.turn
      },
      players: {
        count: metadata.totalPlayers,
        winner: metadata.winner,
        finalScore: metadata.finalScore,
        data: playersData.sort((a, b) => b.finalPoints - a.finalPoints) // Sort by points descending
      },
      rules: {
        initialRuleCount: gameModel.rules.length,
        finalRuleCount: gameModel.rules.length, // Could track modifications in future
        immutableRules: Array.from(gameModel.rules.values()).filter(r => !r.mutable).length,
        mutableRules: Array.from(gameModel.rules.values()).filter(r => r.mutable).length
      },
      proposals: {
        total: metadata.totalProposals,
        adopted: metadata.adoptedProposals,
        failed: metadata.totalProposals - metadata.adoptedProposals,
        adoptionRate: metadata.totalProposals > 0 ? metadata.adoptedProposals / metadata.totalProposals : 0,
        byType: proposalsByType,
        adoptedByType: adoptedProposalsByType,
        averageVotesPerProposal: metadata.totalProposals > 0 ? 
          Array.from(gameModel.proposals.values()).reduce((sum, p) => sum + p.votes.length, 0) / metadata.totalProposals : 0
      },
      performance: {
        turnsPerHour: gameDurationMinutes > 0 ? (gameModel.turn / (gameDurationMinutes / 60)) : 0,
        proposalsPerTurn: gameModel.turn > 0 ? metadata.totalProposals / gameModel.turn : 0,
        participationRate: playersData.length > 0 ? 
          playersData.reduce((sum, p) => sum + p.votingParticipation, 0) / playersData.length : 0
      },
      configuration: {
        victoryTarget: gameModel.config.victoryTarget,
        hasPromptP: !!gameModel.config.promptP,
        snapshotMode: gameModel.config.snapshotMode || 'off',
        snapshotCompression: gameModel.config.snapshotCompression || 'none'
      }
    };

    return JSON.stringify(gameStats, null, 2);
  }

  /**
   * Generate README snippet for replay instructions
   * 
   * Creates a markdown snippet explaining how to use the downloaded game package
   * for replay, analysis, or educational purposes. This provides user-friendly
   * instructions for working with the archived game data.
   * 
   * @param gameModel - The completed game model
   * @returns Markdown content explaining how to use the package
   */
  generateReadmeSnippet(gameModel: typeof GameModel.Type): string {
    const metadata = this.extractMetadata(gameModel);
    const lines: string[] = [];
    
    lines.push('# Proof-Nomic Game Archive');
    lines.push('');
    lines.push(`This package contains the complete archived data from a Proof-Nomic game completed on ${new Date().toLocaleDateString()}.`);
    lines.push('');
    
    // Game Summary
    lines.push('## Game Summary');
    lines.push('');
    lines.push(`- **Winner:** ${metadata.winner || 'No winner'} (${metadata.finalScore} points)`);
    lines.push(`- **Total Players:** ${metadata.totalPlayers}`);
    lines.push(`- **Total Turns:** ${gameModel.turn}`);
    lines.push(`- **Rules:** ${metadata.totalRules} total`);
    lines.push(`- **Proposals:** ${metadata.totalProposals} total, ${metadata.adoptedProposals} adopted`);
    lines.push(`- **Victory Target:** ${gameModel.config.victoryTarget} points`);
    lines.push('');
    
    // Package Contents
    lines.push('## Package Contents');
    lines.push('');
    lines.push('This archive contains the following files:');
    lines.push('');
    lines.push('- **`RULEBOOK.md`** - Complete rulebook with all initial rules and adopted proposals');
    lines.push('- **`SCORE_REPORT.md`** - Final player rankings and detailed game statistics');
    lines.push('- **`game-stats.json`** - Structured data file for programmatic analysis');
    if (gameModel.config.promptP) {
      lines.push('- **`PROMPT_P.txt`** - AI behavioral instructions used during the game');
    }
    lines.push('- **`README.md`** - This instruction file');
    lines.push('');
    
    // How to Use
    lines.push('## How to Use This Archive');
    lines.push('');
    
    lines.push('### For Game Analysis');
    lines.push('- Open `SCORE_REPORT.md` for human-readable game statistics');
    lines.push('- Import `game-stats.json` into analysis tools or spreadsheets');
    lines.push('- Review `RULEBOOK.md` to understand the complete rule set');
    lines.push('');
    
    lines.push('### For Educational Purposes');
    lines.push('- Use `RULEBOOK.md` as a reference for rule evolution patterns');
    lines.push('- Study player strategies through proposal and voting patterns in `SCORE_REPORT.md`');
    if (gameModel.config.promptP) {
      lines.push('- Examine AI behavior guidelines in `PROMPT_P.txt`');
    }
    lines.push('');
    
    lines.push('### For Research');
    lines.push('- Parse `game-stats.json` for quantitative analysis of game dynamics');
    lines.push('- Compare proposal success rates across different player types');
    lines.push('- Analyze voting patterns and alliance formations');
    lines.push('');
    
    lines.push('## Replay Instructions');
    lines.push('');
    lines.push('While this archive cannot be directly "replayed" like a video game save file,');
    lines.push('you can recreate the game flow by:');
    lines.push('');
    lines.push('1. **Setting up a new Daijo-bu game** with the same initial rules (see `RULEBOOK.md`)');
    lines.push('2. **Configuring players** to match the original setup (names and icons in `game-stats.json`)');
    lines.push('3. **Following the proposal sequence** documented in `RULEBOOK.md` "Adopted Proposals" section');
    if (gameModel.config.promptP) {
      lines.push('4. **Using the same Prompt P** (available in `PROMPT_P.txt`) for AI players');
    }
    lines.push('');
    
    lines.push('## Technical Details');
    lines.push('');
    lines.push('- **Game Platform:** Daijo-bu Proof-Nomic v1.0');
    lines.push('- **Archive Format:** ZIP package with structured markdown and JSON');
    lines.push(`- **Generated:** ${new Date().toISOString()}`);
    lines.push('- **File Encoding:** UTF-8');
    lines.push('');
    
    lines.push('## Questions or Issues?');
    lines.push('');
    lines.push('If you have questions about this archive or encounter issues with the data,');
    lines.push('please refer to the Daijo-bu documentation or contact the development team.');
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('*This archive was automatically generated by the Daijo-bu game platform.*');
    
    return lines.join('\n');
  }

  /**
   * Generate the PROMPT_P.txt file content
   * 
   * Creates a plain text file containing the Prompt P instructions that guided
   * AI player behavior during the game. This serves as an archival record of
   * the AI behavioral guidance for future reference.
   * 
   * @param gameModel - The completed game model
   * @returns Plain text content for PROMPT_P.txt file
   */
  generatePromptPFile(gameModel: typeof GameModel.Type): string {
    const lines: string[] = [];
    
    lines.push('PROMPT P - AI PLAYER INSTRUCTIONS');
    lines.push('===================================');
    lines.push('');
    lines.push('This document contains the Prompt P instructions that guided AI player');
    lines.push('behavior throughout the Proof-Nomic game. These instructions were provided');
    lines.push('to each AI agent before they made proposals or cast votes.');
    lines.push('');
    lines.push('Game Information:');
    lines.push(`- Date: ${new Date().toISOString().split('T')[0]}`);
    lines.push(`- Total Turns: ${gameModel.turn}`);
    lines.push(`- Total Players: ${gameModel.players.length}`);
    lines.push(`- Victory Target: ${gameModel.config.victoryTarget} points`);
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('PROMPT P CONTENT:');
    lines.push('');
    lines.push(gameModel.config.promptP || 'No Prompt P was provided for this game.');
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('This prompt was automatically injected into every AI agent request');
    lines.push('as part of the system context, ensuring consistent behavioral guidance');
    lines.push('throughout the game session.');
    
    return lines.join('\n');
  }

  /**
   * Create a complete game package as a downloadable ZIP file
   * 
   * The package contains:
   * - RULEBOOK.md with all rules and adopted proposals
   * - SCORE_REPORT.md with rankings and statistics
   * - game-stats.json with structured data for analysis
   * - README.md with replay instructions and package info
   * - PROMPT_P.txt with AI behavioral guidance (if available)
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
    const gameStats = this.generateGameStatsFile(gameModel);
    const readmeSnippet = this.generateReadmeSnippet(gameModel);

    // Create ZIP file using JSZip
    const zip = new JSZip();
    zip.file('RULEBOOK.md', rulebook);
    zip.file('SCORE_REPORT.md', scoreReport);
    zip.file('game-stats.json', gameStats);
    zip.file('README.md', readmeSnippet);

    // Track contents for metadata
    const contents = ['RULEBOOK.md', 'SCORE_REPORT.md', 'game-stats.json', 'README.md'];

    // Add PROMPT_P.txt if Prompt P is available
    if (gameModel.config.promptP) {
      const promptPContent = this.generatePromptPFile(gameModel);
      zip.file('PROMPT_P.txt', promptPContent);
      contents.push('PROMPT_P.txt');
    }

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
      contents,
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