// MCP Calculator Server - HTTP Transport Only (No SSE)
// Optimized for mcp-remote compatibility

import { v4 as uuidv4 } from 'uuid';

// Calculator functions
function add(a, b) { return a + b; }
function subtract(a, b) { return a - b; }
function multiply(a, b) { return a * b; }
function divide(a, b) {
  if (b === 0) throw new Error("Division by zero");
  return a / b;
}

// Tool definitions
const tools = [
  {
    name: "add",
    description: "Add two numbers together",
    inputSchema: {
      type: "object",
      properties: {
        a: { type: "number", description: "First number" },
        b: { type: "number", description: "Second number" }
      },
      required: ["a", "b"]
    }
  },
  {
    name: "subtract", 
    description: "Subtract second number from first number",
    inputSchema: {
      type: "object",
      properties: {
        a: { type: "number", description: "First number" },
        b: { type: "number", description: "Second number" }
      },
      required: ["a", "b"]
    }
  },
  {
    name: "multiply",
    description: "Multiply two numbers together", 
    inputSchema: {
      type: "object",
      properties: {
        a: { type: "number", description: "First number" },
        b: { type: "number", description: "Second number" }
      },
      required: ["a", "b"]
    }
  },
  {
    name: "divide",
    description: "Divide first number by second number",
    inputSchema: {
      type: "object",
      properties: {
        a: { type: "number", description: "Dividend" },
        b: { type: "number", description: "Divisor (cannot be zero)" }
      },
      required: ["a", "b"]
    }
  }
];

// Session management
const sessions = new Map();

class MCPSession {
  constructor(id) {
    this.id = id;
    this.initialized = false;
    this.createdAt = new Date().toISOString();
    this.protocolVersion = "2025-06-18";
  }

  markInitialized() {
    this.initialized = true;
  }
}

// Handle JSON-RPC requests
function handleJsonRpc(body, sessionId) {
  const { jsonrpc, id, method, params } = body;
  
  console.log(`Processing ${method} for session ${sessionId}`);
  
  if (jsonrpc !== "2.0") {
    return {
      jsonrpc: "2.0",
      id: id || null,
      error: { code: -32600, message: "Invalid Request" }
    };
  }

  try {
    switch (method) {
      case "initialize":
        const session = new MCPSession(sessionId);
        session.protocolVersion = params?.protocolVersion || "2025-06-18";
        sessions.set(sessionId, session);
        
        console.log(`Session created: ${sessionId}`);
        
        return {
          jsonrpc: "2.0",
          id,
          result: {
            protocolVersion: "2025-06-18",
            capabilities: {
              tools: { 
                listChanged: true
              }
            },
            serverInfo: {
              name: "Calculator MCP Server",
              version: "2.0.0",
              description: "HTTP-only MCP calculator server"
            }
          }
        };

      case "tools/list":
        const listSession = sessions.get(sessionId);
        if (!listSession) {
          return {
            jsonrpc: "2.0",
            id,
            error: { code: -32002, message: "Session not found" }
          };
        }
        
        return {
          jsonrpc: "2.0",
          id,
          result: { tools }
        };

      case "tools/call":
        const toolSession = sessions.get(sessionId);
        if (!toolSession) {
          return {
            jsonrpc: "2.0",
            id,
            error: { code: -32002, message: "Session not found" }
          };
        }
        
        const { name, arguments: args } = params;
        console.log(`Tool called: ${name}`, args);
        
        let result;
        switch (name) {
          case "add":
            result = add(args.a, args.b);
            break;
          case "subtract":
            result = subtract(args.a, args.b);
            break;
          case "multiply":
            result = multiply(args.a, args.b);
            break;
          case "divide":
            result = divide(args.a, args.b);
            break;
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
        
        return {
          jsonrpc: "2.0",
          id,
          result: {
            content: [
              {
                type: "text",
                text: `${result}`
              }
            ],
            isError: false
          }
        };

      case "notifications/initialized":
        const currentSession = sessions.get(sessionId);
        if (currentSession) {
          currentSession.markInitialized();
          console.log(`Session initialized: ${sessionId}`);
        }
        return null; // Notifications don't return responses

      case "ping":
        return {
          jsonrpc: "2.0", 
          id,
          result: { status: "pong" }
        };

      default:
        return {
          jsonrpc: "2.0",
          id,
          error: { code: -32601, message: `Method not found: ${method}` }
        };
    }
  } catch (error) {
    console.error(`Error processing request: ${error.message}`);
    return {
      jsonrpc: "2.0",
      id,
      error: { code: -32603, message: "Internal error", data: error.message }
    };
  }
}

export default function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, MCP-Session-Id, MCP-Protocol-Version');
  res.setHeader('MCP-Protocol-Version', '2025-06-18');
  res.setHeader('X-MCP-Server', 'calculator-server/2.0.0');

  console.log(`${req.method} /api/mcp-http`);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({
      jsonrpc: "2.0",
      error: { code: -32601, message: "Only POST method allowed" }
    });
    return;
  }

  // Get or create session ID
  let sessionId = req.headers['mcp-session-id'] || uuidv4();
  res.setHeader('MCP-Session-Id', sessionId);

  const body = req.body;
  console.log('Request body:', body);
  
  const response = handleJsonRpc(body, sessionId);
  
  if (response === null) {
    res.status(204).end();
  } else {
    res.json(response);
  }
}
