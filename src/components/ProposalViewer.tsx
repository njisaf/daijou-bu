import React from 'react';
import { observer } from 'mobx-react-lite';
import ReactMarkdown from 'react-markdown';
import { useGame } from './GameProvider';
import styles from './ProposalViewer.module.css';

/**
 * Proposal Viewer component for displaying current proposal markdown
 * 
 * Shows:
 * - Current proposal being considered
 * - Proposal details (proposer, type, rule number)
 * - Vote counts and status
 * - Formatted markdown content
 * 
 * @see daijo-bu_architecture.md Section 4 for proposal viewer specification
 */
const ProposalViewer: React.FC = observer(() => {
  const { gameModel } = useGame();

  // Get the most recent proposal
  const currentProposal = gameModel.proposals.length > 0 
    ? gameModel.proposals[gameModel.proposals.length - 1]
    : null;

  if (!currentProposal) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <h3>No Proposals Yet</h3>
          <p>Waiting for the first proposal to be made...</p>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#ff9800';
      case 'passed': return '#4caf50';
      case 'failed': return '#f44336';
      default: return '#666';
    }
  };

  const formatProposalMarkdown = (proposal: typeof currentProposal) => {
    return `# Proposal ${proposal.id}

**Type:** ${proposal.type}  
**Rule Number:** ${proposal.ruleNumber}  
**Proposed by:** ${proposal.proposerId}  

## Rule Text

${proposal.ruleText}`;
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Current Proposal</h3>
        <div 
          className={styles.status}
          style={{ backgroundColor: getStatusColor(currentProposal.status) }}
        >
          {currentProposal.status.toUpperCase()}
        </div>
      </div>

      <div className={styles.content}>
        <div className={`${styles.proposalContent} ${styles.markdown}`}>
          <ReactMarkdown>
            {formatProposalMarkdown(currentProposal)}
          </ReactMarkdown>
        </div>

        {currentProposal.votes.length > 0 && (
          <div className={styles.voting}>
            <h4>Voting Progress</h4>
            <div className={styles.voteStats}>
              <div className={styles.voteStat}>
                <span className={styles.voteLabel}>FOR</span>
                <span className={styles.voteCount}>{currentProposal.forVotes}</span>
              </div>
              <div className={styles.voteStat}>
                <span className={styles.voteLabel}>AGAINST</span>
                <span className={styles.voteCount}>{currentProposal.againstVotes}</span>
              </div>
              <div className={styles.voteStat}>
                <span className={styles.voteLabel}>ABSTAIN</span>
                <span className={styles.voteCount}>{currentProposal.abstainVotes}</span>
              </div>
            </div>

            <div className={styles.voteDetails}>
              {currentProposal.votes.map((vote, index) => (
                <div key={index} className={styles.vote}>
                  <span className={styles.voter}>{vote.voterId}</span>
                  <span className={`${styles.choice} ${styles[vote.choice.toLowerCase()]}`}>
                    {vote.choice}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {gameModel.proposals.length > 1 && (
        <div className={styles.footer}>
          <div className={styles.proposalHistory}>
            Total Proposals: {gameModel.proposals.length} | 
            Passed: {gameModel.proposals.filter(p => p.status === 'passed').length} | 
            Failed: {gameModel.proposals.filter(p => p.status === 'failed').length}
          </div>
        </div>
      )}
    </div>
  );
});

export default ProposalViewer; 