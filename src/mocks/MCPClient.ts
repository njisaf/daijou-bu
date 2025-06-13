import { getGameConfig } from '../config';
import { type GameSnapshot } from './MockMCPService';

/**
 * MCP Error class for handling HTTP request failures
 * Contains detailed context for debugging failed requests
 */
export class MCPError extends Error {
  public readonly playerId: string;
  public readonly endpoint: string;
  public readonly phase: string;
  public readonly requestBody: any;
  public readonly response?: Response;
  public readonly statusCode?: number;

  constructor(
    message: string,
    playerId: string,
    endpoint: string,
    phase: string,
    requestBody: any,
    response?: Response
  ) {
    super(message);
    this.name = 'MCPError';
    this.playerId = playerId;
    this.endpoint = endpoint;
    this.phase = phase;
    this.requestBody = requestBody;
    this.response = response;
    this.statusCode = response?.status;
  }
}

/**
 * Response types for MCP endpoints
 */
export interface ProposeResponse {
  proposalMarkdown: string;
}

export interface VoteResponse {
  vote: 'FOR' | 'AGAINST' | 'ABSTAIN';
}

/**
 * HTTP client wrapper for MCP (Model Control Protocol) servers
 * 
 * Provides timeout handling, error context, and standardized request/response
 * format for communicating with LLM MCP servers.
 * 
 * @see devbot_kickoff_prompt.md Section 5 for MCP API contract
 */
export class MCPClient {
  private readonly timeoutMs: number;

  constructor() {
    const config = getGameConfig();
    this.timeoutMs = config.timeoutMs;
  }

  /**
   * Calls the /propose endpoint on an MCP server
   * 
   * @param endpoint - The base URL of the MCP server
   * @param playerId - ID of the player making the request
   * @param promptP - The prompt text for proposal generation
   * @param gameSnapshot - Current game state
   * @returns Promise resolving to proposal markdown
   * @throws MCPError on timeout or HTTP error
   */
  async propose(
    endpoint: string,
    playerId: string,
    promptP: string,
    gameSnapshot: GameSnapshot
  ): Promise<string> {
    const requestBody = {
      promptP,
      gameSnapshot
    };

    try {
      const response = await this.makeRequest(
        `${endpoint}/propose`,
        'POST',
        requestBody,
        playerId,
        'proposal'
      );

      const data = await response.json() as ProposeResponse;
      
      if (!data.proposalMarkdown || typeof data.proposalMarkdown !== 'string') {
        throw new MCPError(
          'Invalid response: missing or invalid proposalMarkdown field',
          playerId,
          endpoint,
          'proposal',
          requestBody,
          response
        );
      }

      return data.proposalMarkdown;
    } catch (error) {
      if (error instanceof MCPError) {
        throw error;
      }
      
      throw new MCPError(
        `Failed to get proposal from ${endpoint}: ${error}`,
        playerId,
        endpoint,
        'proposal',
        requestBody
      );
    }
  }

  /**
   * Calls the /vote endpoint on an MCP server
   * 
   * @param endpoint - The base URL of the MCP server
   * @param playerId - ID of the player making the request
   * @param proposalMarkdown - The proposal to vote on
   * @param gameSnapshot - Current game state
   * @returns Promise resolving to vote choice
   * @throws MCPError on timeout or HTTP error
   */
  async vote(
    endpoint: string,
    playerId: string,
    proposalMarkdown: string,
    gameSnapshot: GameSnapshot
  ): Promise<'FOR' | 'AGAINST' | 'ABSTAIN'> {
    const requestBody = {
      proposalMarkdown,
      gameSnapshot
    };

    try {
      const response = await this.makeRequest(
        `${endpoint}/vote`,
        'POST',
        requestBody,
        playerId,
        'voting'
      );

      const data = await response.json() as VoteResponse;
      
      const validVotes = ['FOR', 'AGAINST', 'ABSTAIN'] as const;
      if (!data.vote || !validVotes.includes(data.vote)) {
        throw new MCPError(
          `Invalid response: vote must be one of ${validVotes.join(', ')}`,
          playerId,
          endpoint,
          'voting',
          requestBody,
          response
        );
      }

      return data.vote;
    } catch (error) {
      if (error instanceof MCPError) {
        throw error;
      }
      
      throw new MCPError(
        `Failed to get vote from ${endpoint}: ${error}`,
        playerId,
        endpoint,
        'voting',
        requestBody
      );
    }
  }

  /**
   * Makes an HTTP request with timeout handling
   * 
   * @private
   * @param url - Full URL to request
   * @param method - HTTP method
   * @param body - Request body (will be JSON stringified)
   * @param playerId - Player ID for error context
   * @param phase - Game phase for error context
   * @returns Promise resolving to Response
   * @throws MCPError on timeout or HTTP error
   */
  private async makeRequest(
    url: string,
    method: string,
    body: any,
    playerId: string,
    phase: string
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new MCPError(
          `HTTP ${response.status}: ${response.statusText}`,
          playerId,
          url,
          phase,
          body,
          response
        );
      }

      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new MCPError(
          `Request timeout after ${this.timeoutMs}ms`,
          playerId,
          url,
          phase,
          body
        );
      }
      
      throw error;
    }
  }

  /**
   * Validates that an endpoint URL is reachable
   * 
   * @param endpoint - The MCP server endpoint to validate
   * @returns Promise resolving to true if reachable
   * @throws MCPError if unreachable
   */
  async validateEndpoint(endpoint: string): Promise<boolean> {
    try {
      const response = await this.makeRequest(
        `${endpoint}/health`,
        'GET',
        {},
        'system',
        'validation'
      );
      
      return response.ok;
    } catch (error) {
      if (error instanceof MCPError) {
        throw error;
      }
      
      throw new MCPError(
        `Endpoint validation failed: ${error}`,
        'system',
        endpoint,
        'validation',
        {}
      );
    }
  }
} 