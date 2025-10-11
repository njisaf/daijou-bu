#!/usr/bin/env node

/**
 * Convert initialRules.md to initialRules.json
 * 
 * This script parses the canonical markdown ruleset and generates
 * a machine-readable JSON version for the game engine.
 * 
 * Usage: node scripts/convert-rules.cjs
 */

const fs = require('fs');
const path = require('path');

/**
 * Parse a rule section from markdown text
 * @param {string} ruleText - The markdown text for a single rule
 * @returns {object|null} - Parsed rule object or null if invalid
 */
function parseRule(ruleText) {
  // Match pattern: ### 101 — Title
  const titleMatch = ruleText.match(/^### (\d+) — (.+)$/m);
  if (!titleMatch) return null;
  
  const id = parseInt(titleMatch[1], 10);
  const title = titleMatch[2].trim();
  
  // Extract the rule text (everything after the title until the next section or end)
  const lines = ruleText.split('\n');
  const titleLineIndex = lines.findIndex(line => line.startsWith(`### ${id} —`));
  
  if (titleLineIndex === -1) return null;
  
  // Get text from the line after title until we hit another ### or end
  const textLines = [];
  for (let i = titleLineIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('### ') || line.startsWith('## ')) break;
    if (line.trim()) {
      textLines.push(line.trim());
    }
  }
  
  const text = textLines.join(' ').trim();
  
  // Determine mutability based on series (100s are immutable, 200s+ are mutable)
  const mutable = id >= 200;
  
  return {
    id,
    text: text || title, // Use title as fallback if no text found
    mutable
  };
}

/**
 * Convert initialRules.md to JSON format
 */
function convertRulesToJson() {
  const markdownPath = path.join(__dirname, '..', 'initialRules.md');
  const jsonPath = path.join(__dirname, '..', 'src', 'assets', 'initialRules.json');
  
  // Ensure assets directory exists
  const assetsDir = path.dirname(jsonPath);
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }
  
  // Read the markdown file
  if (!fs.existsSync(markdownPath)) {
    console.error('❌ initialRules.md not found');
    process.exit(1);
  }
  
  const markdownContent = fs.readFileSync(markdownPath, 'utf8');
  
  // Split into rule sections using the ### pattern
  const ruleSections = markdownContent.split(/(?=### \d+)/);
  
  const rules = [];
  
  for (const section of ruleSections) {
    if (!section.trim() || !section.includes('###')) continue;
    
    const rule = parseRule(section);
    if (rule) {
      rules.push(rule);
    }
  }
  
  // Sort rules by ID
  rules.sort((a, b) => a.id - b.id);
  
  // Validate we have the expected rules
  const expectedImmutableCount = 16; // Rules 101-116 (excluding 100 which is added dynamically)
  const expectedMutableCount = 13;   // Rules 201-213
  
  const immutableRules = rules.filter(r => !r.mutable);
  const mutableRules = rules.filter(r => r.mutable);
  
  console.log(`📊 Parsed ${rules.length} rules total:`);
  console.log(`   • ${immutableRules.length} immutable rules (100-series)`);
  console.log(`   • ${mutableRules.length} mutable rules (200+ series)`);
  
  if (immutableRules.length !== expectedImmutableCount) {
    console.warn(`⚠️  Expected ${expectedImmutableCount} immutable rules, found ${immutableRules.length}`);
  }
  
  if (mutableRules.length !== expectedMutableCount) {
    console.warn(`⚠️  Expected ${expectedMutableCount} mutable rules, found ${mutableRules.length}`);
  }
  
  // Write JSON file
  const jsonContent = JSON.stringify(rules, null, 2);
  fs.writeFileSync(jsonPath, jsonContent, 'utf8');
  
  console.log(`✅ Successfully converted rules to ${jsonPath}`);
  console.log(`📄 Generated ${jsonContent.length} bytes of JSON`);
  
  return rules;
}

// Run the conversion if this script is executed directly
if (require.main === module) {
  try {
    convertRulesToJson();
  } catch (error) {
    console.error('❌ Conversion failed:', error.message);
    process.exit(1);
  }
}

module.exports = { convertRulesToJson, parseRule }; 