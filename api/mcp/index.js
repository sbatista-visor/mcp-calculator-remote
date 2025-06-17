// Complete MCP HTTP Transport Implementation
// Single endpoint for all MCP communication: /api/mcp

import { v4 as uuidv4 } from 'uuid';

// Session management
const sessions = new Map();

// Logging function
function log(message, data = null) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}`;
  
  if (data) {
    console.log(`${logEntry}\nData:`, JSON.stringify(data, null, 2));
  } else {
    console.log(logEntry);
  }
}

// Calculator functions
function add(a, b) { return a + b; }
function subtract(a, b) { return a - b; }
function multiply(a, b) { return a * b; }
function divide(a, b) {
  if (b === 0) throw new Error("Division by zero");
  return a / b;
}

// MCP Server capabilities
const serverInfo = {
  name: "Calculator MCP Server",
  version: "1.0.0"
};

const capabilities = {
  tools: { 
    listChanged: true,
    supportsProgress: false,
    count: 4
  },
  logging: {},
  resources: { 
    subscribe: false, 
    listChanged: true,
    count: 1
  }
  // Temporarily disable prompts to force tools/list first
  // prompts: { listChanged: true }
};

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

// Handle JSON-RPC requests
function handleJsonRpc(body, sessionId) {
  const { jsonrpc, id, method, params } = body;
  
  log(`🔍 Processing method: ${method}`, { id, params });
  
  // Validate JSON-RPC 2.0
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
        // Initialize session
        sessions.set(sessionId, {
          id: sessionId,
          protocolVersion: params?.protocolVersion || "2024-11-05",
          capabilities: params?.capabilities || {},
          clientInfo: params?.clientInfo || {}
        });
        
        log(`📋 Session initialized: ${sessionId}`, params);
        
        const initResponse = {
          jsonrpc: "2.0",
          id,
          result: {
            protocolVersion: "2024-11-05",
            capabilities,  // Use the global capabilities variable
            serverInfo: {
              name: "Calculator MCP Server",
              version: "1.0.0",
              description: "A mathematical calculator supporting add, subtract, multiply, divide operations"
            },
            instructions: "🧮 Calculator MCP Server Ready! Available tools: add, subtract, multiply, divide. Server will respond to both tools/list requests and direct calculation requests.",
            
            // Include preview of available features (tools only)
            preview: {
              tools: ["add", "subtract", "multiply", "divide"],
              resources: ["calculator://help"]
            },
            
            // Include basic tool info directly in initialize for immediate use
            availableTools: {
              add: "Add two numbers together",
              subtract: "Subtract second number from first",
              multiply: "Multiply two numbers together", 
              divide: "Divide first number by second"
            }
          }
        };
        
        log(`🔍 INITIALIZE RESPONSE CAPABILITIES:`, capabilities);
        log(`📤 Full initialize response:`, initResponse);
        
        return initResponse;

      case "tools/list":
        log(`🔧 Tools list requested`);
        return {
          jsonrpc: "2.0",
          id,
          result: { tools }
        };

      case "prompts/list":
        log(`📝 Prompts list requested - REDIRECTING TO TOOLS!`);
        log(`🚫 Rejecting prompts/list and forcing tools/list instead!`);
        
        // Instead of returning prompts, return an error that suggests tools
        return {
          jsonrpc: "2.0",
          id,
          error: {
            code: -32601,
            message: "Prompts not supported. Use 'tools/list' instead to get calculator tools: add, subtract, multiply, divide",
            data: {
              suggestion: "tools/list",
              availableTools: ["add", "subtract", "multiply", "divide"]
            }
          }
        };

      case "resources/list":
        log(`📦 Resources list requested`);
        return {
          jsonrpc: "2.0",
          id,
          result: { 
            resources: [
              {
                uri: "calculator://help",
                name: "Calculator Help",
                description: "Help documentation for the calculator",
                mimeType: "text/plain"
              }
            ]
          }
        };

      case "resources/read":
        log(`📖 Resource read requested`, params);
        if (params?.uri === "calculator://help") {
          return {
            jsonrpc: "2.0",
            id,
            result: {
              contents: [
                {
                  uri: "calculator://help",
                  mimeType: "text/plain",
                  text: "Calculator MCP Server Help\n\nAvailable tools:\n- add: Add two numbers\n- subtract: Subtract two numbers\n- multiply: Multiply two numbers\n- divide: Divide two numbers\n\nUsage: Call tools with parameters {a: number, b: number}"
                }
              ]
            }
          };
        } else {
          return {
            jsonrpc: "2.0",
            id,
            error: { code: -32602, message: "Invalid resource URI" }
          };
        }

      case "tools/call":
        const { name, arguments: args } = params;
        log(`⚡ Tool called: ${name}`, args);
        
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
                text: `The result is: ${result}`
              }
            ]
          }
        };

      // Add support for other common MCP methods
      case "notifications/initialized":
        log(`📢 Initialized notification received`);
        log(`🔔 SERVER REMINDER: Client should call tools/list to get 4 calculator tools!`);
        return {
          jsonrpc: "2.0",
          id,
          result: {
            status: "ready",
            message: "⚠️ Calculator server ready! 4 tools available: add, subtract, multiply, divide",
            nextAction: "tools/list",
            toolCount: 4,
            availableEndpoints: ["tools/list", "tools/call"],
            // Include tools directly to ensure Claude gets them
            previewTools: [
              { name: "add", description: "Add two numbers" },
              { name: "subtract", description: "Subtract two numbers" },
              { name: "multiply", description: "Multiply two numbers" },
              { name: "divide", description: "Divide two numbers" }
            ]
          }
        };
        
      case "ping":
        log(`🏓 Ping received`);
        return {
          jsonrpc: "2.0",
          id,
          result: { status: "pong" }
        };

      default:
        log(`❓ Unknown method: ${method}`, { id, params });
        return {
          jsonrpc: "2.0",
          id,
          error: { code: -32601, message: `Method not found: ${method}` }
        };
    }
  } catch (error) {
    log(`❌ Error processing request: ${error.message}`);
    return {
      jsonrpc: "2.0",
      id,
      error: { code: -32603, message: "Internal error", data: error.message }
    };
  }
}

export default function handler(req, res) {
  // Enhanced CORS for MCP
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, mcp-session-id');
  res.setHeader('X-MCP-Server', 'calculator-server/1.0.0');
  res.setHeader('X-MCP-Protocol-Version', '2024-11-05');

  log(`🌐 ${req.method} /api/mcp - ${req.headers['user-agent']} - Content-Type: ${req.headers['content-type']}`);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Get or create session ID
  let sessionId = req.headers['mcp-session-id'];
  if (!sessionId || req.body?.method === 'initialize') {
    // Always create new session for initialize requests
    sessionId = uuidv4();
  }
  res.setHeader('Mcp-Session-Id', sessionId);

  if (req.method === 'POST') {
    // Handle JSON-RPC messages
    const body = req.body;
    
    log(`📨 Request body:`, body);
    
    // Support batch requests
    if (Array.isArray(body)) {
      const responses = body.map(request => handleJsonRpc(request, sessionId));
      log(`📦 Batch response sent`, responses);
      res.json(responses);
    } else {
      const response = handleJsonRpc(body, sessionId);
      log(`📤 Single response sent`, response);
      res.json(response);
    }
  } else if (req.method === 'GET') {
    // SSE stream for server-to-client communication
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Mcp-Session-Id', sessionId);
    
    log(`📡 SSE stream opened for session: ${sessionId}`);
    
    // Send initial connection event
    res.write(`data: ${JSON.stringify({
      jsonrpc: "2.0",
      method: "server/ready",
      params: { sessionId }
    })}\n\n`);
    
    // Shorter keepalive to avoid Vercel timeout
    const keepAlive = setInterval(() => {
      res.write(`data: ${JSON.stringify({
        jsonrpc: "2.0",
        method: "ping",
        params: { timestamp: new Date().toISOString() }
      })}\n\n`);
    }, 25000); // 25 seconds instead of 30
    
    // Auto-close after 50 seconds to avoid Vercel timeout
    const autoClose = setTimeout(() => {
      clearInterval(keepAlive);
      res.write(`data: ${JSON.stringify({
        jsonrpc: "2.0",
        method: "server/closing",
        params: { reason: "timeout_prevention" }
      })}\n\n`);
      res.end();
      log(`⏰ SSE stream auto-closed for session: ${sessionId}`);
    }, 50000);
    
    // Cleanup on client disconnect
    req.on('close', () => {
      clearInterval(keepAlive);
      clearTimeout(autoClose);
      log(`🔌 SSE stream closed for session: ${sessionId}`);
    });
  } else {
    res.status(405).json({
      jsonrpc: "2.0",
      error: { code: -32601, message: "Method not allowed" }
    });
  }
}
