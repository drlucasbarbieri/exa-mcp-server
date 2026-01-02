# CLAUDE.md - Exa MCP Server

## Repository Overview

This repository contains the **Exa MCP Server**, a Model Context Protocol (MCP) server that provides AI assistants with access to Exa AI's search capabilities. It enables real-time web search, code search, company research, LinkedIn search, web crawling, and deep research through standardized MCP tools.

**Key Information:**
- **Language**: TypeScript (ES2022, Node16 modules)
- **Framework**: MCP SDK (`@modelcontextprotocol/sdk`)
- **Build Tool**: Smithery CLI (`@smithery/cli`)
- **Package Name**: `exa-mcp-server`
- **Current Version**: 3.0.9
- **License**: MIT
- **Node Version**: >=18.0.0

## Architecture

### Directory Structure

```
exa-mcp-server/
├── src/
│   ├── index.ts              # Main server entry point, tool registration
│   ├── types.ts              # TypeScript type definitions for Exa API
│   ├── tools/                # Individual tool implementations
│   │   ├── config.ts         # API configuration constants
│   │   ├── webSearch.ts      # Web search tool
│   │   ├── exaCode.ts        # Code context search tool
│   │   ├── companyResearch.ts
│   │   ├── crawling.ts
│   │   ├── linkedInSearch.ts
│   │   ├── deepResearchStart.ts
│   │   └── deepResearchCheck.ts
│   └── utils/
│       └── logger.ts         # Logging utilities
├── .smithery/                # Build output (gitignored)
│   ├── stdio/                # STDIO transport build
│   └── shttp/                # HTTP transport build
├── .claude-plugin/           # Claude Code plugin configuration
│   └── marketplace.json
├── package.json              # NPM package configuration
├── tsconfig.json            # TypeScript compiler configuration
├── server.json              # MCP server metadata
├── Dockerfile               # Docker containerization
└── README.md                # User-facing documentation
```

### Core Components

#### 1. **Main Server (`src/index.ts`)**

The entry point that:
- Exports the `configSchema` (Zod schema for configuration validation)
- Exports `stateless = true` flag (indicates server has no persistent state)
- Defines the `availableTools` registry with default enabled/disabled states
- Implements the default export function that creates and configures the MCP server
- Registers tools based on configuration
- Registers MCP prompts and resources
- Integrates Agnost analytics tracking

**Key Pattern:**
```typescript
export default function ({ config }: { config: z.infer<typeof configSchema> }) {
  const server = new McpServer({
    name: "exa-search-server",
    title: "Exa",
    version: "3.0.9"
  });

  // Register tools conditionally
  if (shouldRegisterTool('web_search_exa')) {
    registerWebSearchTool(server, normalizedConfig);
  }

  return server.server;
}
```

#### 2. **Tool Implementations (`src/tools/`)**

Each tool follows a consistent pattern:
- Exported function `register[ToolName]Tool(server, config)`
- Uses `server.tool()` to register with MCP
- Defines Zod schema for parameters
- Implements async handler function
- Uses request-scoped logging
- Returns standardized response format

**Tool Registration Pattern:**
```typescript
export function registerWebSearchTool(server: McpServer, config?: { exaApiKey?: string }): void {
  server.tool(
    "tool_name",           // Tool identifier
    "Description",         // Tool description for AI
    {
      param: z.string().describe("Parameter description")
    },
    {
      readOnlyHint: true,  // Tool doesn't modify state
      destructiveHint: false,
      idempotentHint: true // Same input = same output
    },
    async ({ param }) => {
      // Implementation
      return {
        content: [{
          type: "text" as const,
          text: "Result text"
        }]
      };
    }
  );
}
```

#### 3. **Type Definitions (`src/types.ts`)**

Defines TypeScript interfaces for:
- **Exa API Request Types**: `ExaSearchRequest`, `ExaCrawlRequest`, `ExaCodeRequest`, `DeepResearchRequest`
- **Exa API Response Types**: `ExaSearchResponse`, `DeepResearchCheckResponse`, `ExaCodeResponse`
- **Internal Tool Types**: `SearchArgs`

#### 4. **Configuration (`src/tools/config.ts`)**

Centralized API configuration:
```typescript
export const API_CONFIG = {
  BASE_URL: 'https://api.exa.ai',
  ENDPOINTS: {
    SEARCH: '/search',
    RESEARCH_TASKS: '/research/v0/tasks',
    CONTEXT: '/context'
  },
  DEFAULT_NUM_RESULTS: 8,
  DEFAULT_MAX_CHARACTERS: 2000
} as const;
```

#### 5. **Logging (`src/utils/logger.ts`)**

Provides structured logging:
- `log(message)`: Simple logging to stderr
- `createRequestLogger(requestId, toolName)`: Request-scoped logger with methods:
  - `start(query)`: Log request start
  - `log(message)`: Log information
  - `error(error)`: Log errors
  - `complete()`: Log successful completion

**Logs are sent to stderr** to avoid interfering with MCP protocol on stdout.

## Development Workflow

### Setup

```bash
# Clone repository
git clone https://github.com/exa-labs/exa-mcp-server.git
cd exa-mcp-server

# Install dependencies
npm install

# Set API key
export EXA_API_KEY="your-api-key-here"
```

### Build Commands

```bash
# Build both transports (stdio + shttp)
npm run build

# Build stdio only (for local NPX usage)
npm run build:stdio

# Build shttp only (for HTTP/SSE deployment)
npm run build:shttp

# Watch mode for development
npm run watch

# Development mode with Smithery CLI
npm run dev

# Test with MCP Inspector
npm run inspector
```

### Build Output

Smithery CLI compiles TypeScript to CommonJS bundles:
- **`.smithery/stdio/index.cjs`**: STDIO transport (for local execution)
- **`.smithery/shttp/index.cjs`**: HTTP/SSE transport (for hosted deployment)

The stdio build includes a shebang (`#!/usr/bin/env node`) and is executable.

### Testing Locally

```bash
# Run directly with npx
npx exa-mcp-server

# With specific tools enabled
npx exa-mcp-server tools=web_search_exa,get_code_context_exa

# With debug logging
npx exa-mcp-server debug=true
```

### Development with Smithery CLI

```bash
# Interactive development mode
npx @smithery/cli dev

# This starts a local server and provides:
# - Hot reload on file changes
# - Interactive testing interface
# - Request/response inspection
```

## Code Conventions

### TypeScript Configuration

```json
{
  "target": "ES2022",
  "module": "Node16",
  "moduleResolution": "Node16",
  "strict": true
}
```

**Important:**
- Use `.js` extensions in import statements (even for `.ts` files)
- Node16 module resolution for ESM compatibility
- Strict type checking enabled

### Import Style

```typescript
// Always use .js extension (TypeScript requirement for Node16 modules)
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { API_CONFIG } from "./config.js";
import { createRequestLogger } from "../utils/logger.js";
```

### Error Handling Pattern

All tool implementations follow this error handling pattern:

```typescript
try {
  // Create fresh axios instance per request
  const axiosInstance = axios.create({
    baseURL: API_CONFIG.BASE_URL,
    headers: {
      'x-api-key': config?.exaApiKey || process.env.EXA_API_KEY || ''
    },
    timeout: 25000
  });

  // Make API call
  const response = await axiosInstance.post(endpoint, requestData);

  // Validate response
  if (!response.data) {
    return { content: [{ type: "text", text: "No results found" }] };
  }

  return { content: [{ type: "text", text: response.data.context }] };

} catch (error) {
  logger.error(error);

  if (axios.isAxiosError(error)) {
    const statusCode = error.response?.status || 'unknown';
    const errorMessage = error.response?.data?.message || error.message;
    return {
      content: [{ type: "text", text: `Error (${statusCode}): ${errorMessage}` }],
      isError: true
    };
  }

  return {
    content: [{ type: "text", text: `Error: ${String(error)}` }],
    isError: true
  };
}
```

### Logging Pattern

Every tool should implement request-scoped logging:

```typescript
const requestId = `tool_name-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
const logger = createRequestLogger(requestId, 'tool_name');

logger.start(query);          // Log start
logger.log("Sending request"); // Log progress
logger.complete();             // Log success
logger.error(error);           // Log errors
```

### API Key Handling

API keys are retrieved with this priority:
1. `config.exaApiKey` (passed from configuration)
2. `process.env.EXA_API_KEY` (environment variable)
3. Empty string (will cause API error)

```typescript
const apiKey = config?.exaApiKey || process.env.EXA_API_KEY || '';
```

## Adding New Tools

To add a new Exa tool to the server:

### Step 1: Define Types (if needed)

Add request/response types to `src/types.ts`:

```typescript
export interface MyNewToolRequest {
  query: string;
  options?: string[];
}

export interface MyNewToolResponse {
  results: string[];
  metadata: Record<string, any>;
}
```

### Step 2: Create Tool File

Create `src/tools/myNewTool.ts`:

```typescript
import { z } from "zod";
import axios from "axios";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { API_CONFIG } from "./config.js";
import { MyNewToolRequest, MyNewToolResponse } from "../types.js";
import { createRequestLogger } from "../utils/logger.js";

export function registerMyNewTool(server: McpServer, config?: { exaApiKey?: string }): void {
  server.tool(
    "my_new_tool_exa",
    "Clear description of what this tool does for the AI assistant",
    {
      query: z.string().describe("Parameter description"),
      options: z.array(z.string()).optional().describe("Optional parameter")
    },
    {
      readOnlyHint: true,      // Does this tool read data?
      destructiveHint: false,  // Does this tool modify/delete data?
      idempotentHint: true    // Same input always produces same output?
    },
    async ({ query, options }) => {
      const requestId = `my_new_tool_exa-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const logger = createRequestLogger(requestId, 'my_new_tool_exa');

      logger.start(query);

      try {
        const axiosInstance = axios.create({
          baseURL: API_CONFIG.BASE_URL,
          headers: {
            'accept': 'application/json',
            'content-type': 'application/json',
            'x-api-key': config?.exaApiKey || process.env.EXA_API_KEY || ''
          },
          timeout: 25000
        });

        const request: MyNewToolRequest = {
          query,
          options
        };

        logger.log("Sending request to Exa API");

        const response = await axiosInstance.post<MyNewToolResponse>(
          '/my-endpoint',
          request
        );

        logger.log("Received response from Exa API");

        if (!response.data) {
          logger.log("Warning: Empty response");
          return {
            content: [{
              type: "text" as const,
              text: "No results found"
            }]
          };
        }

        const result = {
          content: [{
            type: "text" as const,
            text: JSON.stringify(response.data, null, 2)
          }]
        };

        logger.complete();
        return result;

      } catch (error) {
        logger.error(error);

        if (axios.isAxiosError(error)) {
          const statusCode = error.response?.status || 'unknown';
          const errorMessage = error.response?.data?.message || error.message;

          logger.log(`Axios error (${statusCode}): ${errorMessage}`);
          return {
            content: [{
              type: "text" as const,
              text: `Error (${statusCode}): ${errorMessage}`
            }],
            isError: true
          };
        }

        return {
          content: [{
            type: "text" as const,
            text: `Error: ${error instanceof Error ? error.message : String(error)}`
          }],
          isError: true
        };
      }
    }
  );
}
```

### Step 3: Register in Main Server

In `src/index.ts`:

1. Import the registration function:
```typescript
import { registerMyNewTool } from "./tools/myNewTool.js";
```

2. Add to `availableTools` registry:
```typescript
const availableTools = {
  'my_new_tool_exa': {
    name: 'My New Tool',
    description: 'Brief description',
    enabled: false  // Default to disabled
  },
  // ... other tools
};
```

3. Register conditionally:
```typescript
if (shouldRegisterTool('my_new_tool_exa')) {
  registerMyNewTool(server, normalizedConfig);
  registeredTools.push('my_new_tool_exa');
}
```

### Step 4: Update Documentation

Update `README.md` to document the new tool in the "Available Tools" section.

### Step 5: Test

```bash
# Build
npm run build

# Test with your new tool enabled
npx exa-mcp-server tools=my_new_tool_exa

# Or test all tools
npx exa-mcp-server tools=web_search_exa,get_code_context_exa,my_new_tool_exa
```

## Configuration System

### Configuration Schema

Defined in `src/index.ts`:

```typescript
export const configSchema = z.object({
  exaApiKey: z.string().optional(),
  enabledTools: z.union([z.array(z.string()), z.string()]).optional(),
  tools: z.union([z.array(z.string()), z.string()]).optional(),
  debug: z.boolean().default(false)
});
```

### Configuration Sources

1. **Environment Variables**: `EXA_API_KEY`
2. **URL Parameters** (for HTTP transport): `?exaApiKey=xxx&tools=tool1,tool2`
3. **JSON Configuration** (for local MCP clients): See `smithery-example.json`

### Tool Selection Logic

The server uses this priority:
1. If `config.tools` or `config.enabledTools` is provided → use only those tools
2. Otherwise → use default enabled tools from `availableTools` registry

Default enabled tools:
- `web_search_exa`
- `get_code_context_exa`

All other tools are disabled by default and must be explicitly enabled.

### Configuration Examples

**Claude Desktop Config (Local NPX):**
```json
{
  "mcpServers": {
    "exa": {
      "command": "npx",
      "args": ["-y", "exa-mcp-server", "tools=web_search_exa,get_code_context_exa"],
      "env": {
        "EXA_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

**Cursor/Claude Code (Remote HTTP):**
```json
{
  "mcpServers": {
    "exa": {
      "type": "http",
      "url": "https://mcp.exa.ai/mcp?tools=web_search_exa,get_code_context_exa",
      "headers": {}
    }
  }
}
```

## Dependencies

### Production Dependencies

- **`@modelcontextprotocol/sdk`** (^1.12.1): MCP protocol implementation
- **`agnost`** (^0.1.3): Analytics tracking for MCP usage
- **`axios`** (^1.7.8): HTTP client for Exa API requests
- **`zod`** (^3.22.4): Schema validation and type inference

### Development Dependencies

- **`@smithery/cli`** (^1.4.4): Build tool for MCP servers (compiles TS to CJS bundles)
- **`@types/node`** (^20.11.24): Node.js type definitions
- **`tsx`** (^4.7.0): TypeScript execution
- **`typescript`** (^5.3.3): TypeScript compiler

### Why Smithery CLI?

Smithery CLI is used instead of plain `tsc` because it:
- Bundles all dependencies into single `.cjs` files
- Handles multiple transport types (stdio, HTTP/SSE)
- Optimizes for MCP server deployment
- Adds proper shebang and makes executables

## Deployment

### NPM Package

Published as `exa-mcp-server` on npm:

```bash
npm install -g exa-mcp-server
```

The package includes:
- Compiled `.smithery/` directory
- `package.json` with `bin` entry pointing to `.smithery/stdio/index.cjs`

### Docker Deployment

The `Dockerfile` uses multi-stage build:

1. **Builder stage**: Install deps, copy source, run `npm run build`
2. **Runner stage**: Copy compiled code, install production deps only

```bash
# Build image
docker build -t exa-mcp-server .

# Run container
docker run -e EXA_API_KEY=your-key-here -p 3000:3000 exa-mcp-server
```

### Remote HTTP Server

Exa hosts a public MCP server at `https://mcp.exa.ai/mcp` using the SHTTP transport.

Users can connect without installing anything:
```json
{
  "type": "http",
  "url": "https://mcp.exa.ai/mcp?tools=web_search_exa,get_code_context_exa",
  "headers": {}
}
```

## MCP Integration

### Prompts

The server registers MCP prompts to help users get started:

- **`web_search_help`**: Example web search prompt
- **`code_search_help`**: Example code search prompt

These appear in MCP clients as suggested prompts.

### Resources

The server exposes resources:

- **`exa://tools/list`**: JSON list of all tools with enabled status

Clients can fetch this resource to discover available tools.

### Stateless Flag

```typescript
export const stateless = true;
```

This tells MCP clients the server has no persistent state across requests, allowing for optimizations like connection pooling.

## Testing and Debugging

### Enable Debug Logging

```bash
# Via environment
DEBUG=true npx exa-mcp-server

# Via parameter
npx exa-mcp-server debug=true
```

Debug logs show:
- Server initialization
- Tool registration
- Request/response flow
- API interactions

### Using MCP Inspector

```bash
npm run inspector
```

This starts the MCP Inspector, a web UI for testing MCP servers interactively.

### Direct API Testing

You can test Exa API endpoints directly:

```bash
curl -X POST https://api.exa.ai/search \
  -H "x-api-key: your-key" \
  -H "content-type: application/json" \
  -d '{"query":"AI news","numResults":5,"contents":{"text":true}}'
```

### Common Issues

1. **"No API key" error**: Set `EXA_API_KEY` environment variable
2. **Tool not found**: Check tool is in `enabledTools` list
3. **Build errors**: Ensure Node.js >=18 and clean install (`rm -rf node_modules && npm install`)
4. **Import errors**: Verify all imports use `.js` extension

## Git Workflow

### Branching Strategy

- **Main branch**: Production-ready code
- **Feature branches**: Named `claude/feature-description-[session-id]`

### Commit Conventions

Follow conventional commit style:
- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `refactor:` - Code refactoring
- `chore:` - Build/tooling changes

### Version Bumping

Version is synchronized in:
- `package.json` → `version`
- `server.json` → `version`
- `src/index.ts` → `McpServer` version
- `.claude-plugin/marketplace.json` → plugin version

Update all when releasing.

## Key Files Reference

| File | Purpose | Edit Frequency |
|------|---------|----------------|
| `src/index.ts` | Main server, tool registration | Medium - when adding tools |
| `src/types.ts` | Type definitions | Medium - when adding tool types |
| `src/tools/*.ts` | Tool implementations | High - when adding/updating tools |
| `src/tools/config.ts` | API configuration | Low - only for new endpoints |
| `src/utils/logger.ts` | Logging utilities | Low - stable utility |
| `package.json` | Dependencies, scripts, metadata | Medium - version bumps, deps |
| `tsconfig.json` | TypeScript configuration | Low - rarely changes |
| `server.json` | MCP server metadata | Low - version syncing only |
| `README.md` | User documentation | High - document features |
| `.claude-plugin/marketplace.json` | Claude Code plugin config | Low - metadata only |

## Best Practices for AI Assistants

### When Working on This Codebase

1. **Always read before editing**: Use Read tool on files before making changes
2. **Follow the tool pattern**: Use existing tools as templates for new ones
3. **Test locally**: Run `npm run build` and test with `npx` before committing
4. **Update all version references**: When bumping version, update all 4 files
5. **Use proper imports**: Always include `.js` extension in imports
6. **Log appropriately**: Use the logger utility, never `console.log` directly
7. **Handle errors properly**: Follow the established error handling pattern
8. **Validate with Zod**: Define schemas for all tool parameters
9. **Document new tools**: Update README.md when adding tools
10. **Keep tools focused**: Each tool should do one thing well

### When Adding Features

1. Check if it should be a new tool or modification to existing tool
2. Review Exa API documentation for new endpoints
3. Add TypeScript types first
4. Implement tool following the pattern
5. Register in main server
6. Test with various inputs
7. Update documentation

### When Fixing Bugs

1. Identify which tool/component is affected
2. Check logs for error details
3. Review error handling in that tool
4. Add additional logging if needed
5. Test fix locally before committing
6. Consider if other tools have same issue

---

**Last Updated**: 2026-01-02
**For Questions**: Refer to MCP docs at https://modelcontextprotocol.io or Exa docs at https://docs.exa.ai
