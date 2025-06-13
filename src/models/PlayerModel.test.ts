import { describe, it, expect } from 'vitest';
import { PlayerModel, createPlayer } from './PlayerModel';

describe('PlayerModel', () => {
  it('should create a player with initial zero points', () => {
    const player = createPlayer({
      id: 'player1',
      name: 'Alice',
      icon: '🤖',
      llmEndpoint: 'http://localhost:3001'
    });

    expect(player.id).toBe('player1');
    expect(player.name).toBe('Alice');
    expect(player.icon).toBe('🤖');
    expect(player.llmEndpoint).toBe('http://localhost:3001');
    expect(player.points).toBe(0);
  });

  it('should allow awarding points', () => {
    const player = createPlayer({
      id: 'player2',
      name: 'Bob',
      icon: '🔥',
      llmEndpoint: 'http://localhost:3002'
    });

    player.awardPoints(10);
    expect(player.points).toBe(10);

    player.awardPoints(5);
    expect(player.points).toBe(15);
  });

  it('should allow deducting points', () => {
    const player = createPlayer({
      id: 'player3',
      name: 'Charlie',
      icon: '⚡',
      llmEndpoint: 'http://localhost:3003'
    });

    player.awardPoints(20);
    expect(player.points).toBe(20);

    player.deductPoints(5);
    expect(player.points).toBe(15);

    player.deductPoints(10);
    expect(player.points).toBe(5);
  });

  it('should not allow points to go below zero', () => {
    const player = createPlayer({
      id: 'player4',
      name: 'Diana',
      icon: '🌟',
      llmEndpoint: 'http://localhost:3004'
    });

    player.deductPoints(10);
    expect(player.points).toBe(0);
  });

  it('should reset points to zero', () => {
    const player = createPlayer({
      id: 'player5',
      name: 'Eve',
      icon: '💎',
      llmEndpoint: 'http://localhost:3005'
    });

    player.awardPoints(50);
    expect(player.points).toBe(50);

    player.resetPoints();
    expect(player.points).toBe(0);
  });

  it('should check if player has won (100 points)', () => {
    const player = createPlayer({
      id: 'player6',
      name: 'Frank',
      icon: '🏆',
      llmEndpoint: 'http://localhost:3006'
    });

    expect(player.hasWon).toBe(false);

    player.awardPoints(99);
    expect(player.hasWon).toBe(false);

    player.awardPoints(1);
    expect(player.hasWon).toBe(true);

    player.awardPoints(10);
    expect(player.hasWon).toBe(true);
  });

  it('should provide player summary', () => {
    const player = createPlayer({
      id: 'player7',
      name: 'Grace',
      icon: '🚀',
      llmEndpoint: 'http://localhost:3007'
    });

    player.awardPoints(42);
    
    const summary = player.summary;
    expect(summary).toContain('Grace');
    expect(summary).toContain('🚀');
    expect(summary).toContain('42');
  });

  it('should validate required fields', () => {
    expect(() => createPlayer({
      id: '',
      name: 'Test',
      icon: '🤖',
      llmEndpoint: 'http://localhost:3000'
    })).toThrow();

    expect(() => createPlayer({
      id: 'test',
      name: '',
      icon: '🤖',
      llmEndpoint: 'http://localhost:3000'
    })).toThrow();

    expect(() => createPlayer({
      id: 'test',
      name: 'Test',
      icon: '',
      llmEndpoint: 'http://localhost:3000'
    })).toThrow();

    expect(() => createPlayer({
      id: 'test',
      name: 'Test',
      icon: '🤖',
      llmEndpoint: ''
    })).toThrow();
  });

  it('should validate endpoint URL format', () => {
    expect(() => createPlayer({
      id: 'test',
      name: 'Test',
      icon: '🤖',
      llmEndpoint: 'not-a-url'
    })).toThrow();

    expect(() => createPlayer({
      id: 'test',
      name: 'Test',
      icon: '🤖',
      llmEndpoint: 'ftp://invalid-protocol.com'
    })).toThrow();
  });

  it('should accept valid HTTP and HTTPS endpoints', () => {
    const httpPlayer = createPlayer({
      id: 'http-player',
      name: 'HTTP Player',
      icon: '🌐',
      llmEndpoint: 'http://localhost:3000'
    });

    const httpsPlayer = createPlayer({
      id: 'https-player',
      name: 'HTTPS Player',
      icon: '🔒',
      llmEndpoint: 'https://api.example.com/llm'
    });

    expect(httpPlayer.llmEndpoint).toBe('http://localhost:3000');
    expect(httpsPlayer.llmEndpoint).toBe('https://api.example.com/llm');
  });

  it('should serialize to JSON correctly', () => {
    const player = createPlayer({
      id: 'json-test',
      name: 'JSON Test',
      icon: '📝',
      llmEndpoint: 'http://localhost:3000'
    });

    player.awardPoints(25);

    const json = JSON.parse(JSON.stringify(player));
    expect(json.id).toBe('json-test');
    expect(json.name).toBe('JSON Test');
    expect(json.icon).toBe('📝');
    expect(json.llmEndpoint).toBe('http://localhost:3000');
    expect(json.points).toBe(25);
  });
}); 