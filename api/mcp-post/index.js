// MCP Calculator Server - 2025-06-18 Specification Compliant
// HTTP POST endpoint for Claude Desktop compatibility

// Calculator functions
function add(a, b) { return a + b; }
function subtract(a, b) { return a - b; }
function multiply(a, b) { return a * b; }
function divide(a, b) {
  if (b === 0) throw new Error("Division by zero");
  return a / b;
}

// Tool definitions - 2025-06-18 compliant
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

// Handle JSON-RPC requests - 2025-06-18 specification
function handleJsonRpc(body) {
  const { jsonrpc, id, method, params } = body;
  
  console.log(`Processing request: ${method}`, { id, params });
  
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
        // 2025-06-18 specification compliance
        return {
          jsonrpc: "2.0",
          id,
          result: {
            protocolVersion: "2025-06-18", // Updated to latest version
            capabilities: {
              tools: { 
                listChanged: true
              }
            },
            serverInfo: {
              name: "Calculator MCP Server",
              version: "2.0.0",
              description: "Mathematical calculator with 4 operations - MCP 2025-06-18 compliant"
            }
          }
        };

      case "tools/list":
        return {
          jsonrpc: "2.0",
          id,
          result: { tools }
        };

      case "tools/call":
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
        
        // 2025-06-18 supports structured tool output
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
        // Notifications don't return a response
        return null;

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
  // CORS headers with MCP 2025-06-18 compliance
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, MCP-Protocol-Version');
  res.setHeader('X-MCP-Server', 'calculator-server/2.0.0');
  res.setHeader('MCP-Protocol-Version', '2025-06-18'); // Required header

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

  // Handle JSON-RPC messages
  const body = req.body;
  
  console.log('Request body:', body);
  
  // 2025-06-18 removed batch support, so only single requests
  if (Array.isArray(body)) {
    res.status(400).json({
      jsonrpc: "2.0",
      error: { code: -32600, message: "Batch requests not supported in MCP 2025-06-18" }
    });
    return;
  }
  
  const response = handleJsonRpc(body);
  
  // If response is null (notification), send 204 No Content
  if (response === null) {
    res.status(204).end();
  } else {
    res.json(response);
  }
}
