# Agent Development Rules

## Absolute Requirements

### NEVER Use Mock Data
- Do NOT create mock data generators under any circumstances
- Do NOT create fake/simulated data for testing or demonstration
- Do NOT suggest using mock data as a workaround
- Do NOT create test fixtures with artificial data
- If real data cannot be accessed, document the limitation clearly
- Do NOT implement fallback mock data in production code
- Do NOT create sample/dummy data files

### NEVER Use Emojis
- No emojis in source code files
- No emojis in markdown documentation
- No emojis in log messages or console output
- No emojis in comments
- No emojis in error messages
- No emojis in configuration files
- No decorative Unicode characters
- Keep all output professional and text-only

## Development Standards

### Data Sources
- Only use real, production data sources
- Only connect to authentic APIs and services
- Only query actual blockchain networks
- Document all data access limitations
- If data access is blocked, find the real solution or clearly state the blocker

### Code Quality
- Production-grade implementations only
- No temporary workarounds
- No placeholder code
- Real authentication and error handling
- Proper API integration without shortcuts

### Communication
- Professional technical writing
- Clear, direct language
- Focus on facts and actionable solutions
- No decorative formatting
- No casual language or informal symbols
