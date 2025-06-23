// MCP Calculator Server - Simple POST endpoint for Claude Desktop
// This is a simplified version that only handles HTTP POST requests (no SSE)

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

// Handle JSON-RPC requests
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
        return {
          jsonrpc: "2.0",
          id,
          result: {
            protocolVersion: "2024-11-05",
            capabilities: {
              tools: { 
                listChanged: true,
                supportsProgress: false
              }
            },
            serverInfo: {
              name: "Calculator MCP Server",
              version: "1.0.0",
              description: "Mathematical calculator with 4 operations"
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
        
        return {
          jsonrpc: "2.0",
          id,
          result: {
            content: [
              {
                type: "text",
                text: `${result}`
              }
            ]
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
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
  res.setHeader('X-MCP-Server', 'calculator-server/1.0.0');
  res.setHeader('X-MCP-Protocol-Version', '2024-11-05');

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
  
  // Support batch requests
  if (Array.isArray(body)) {
    const responses = body.map(request => handleJsonRpc(request)).filter(r => r !== null);
    res.json(responses);
  } else {
    const response = handleJsonRpc(body);
    
    // If response is null (notification), send 204 No Content
    if (response === null) {
      res.status(204).end();
    } else {
      res.json(response);
    }
  }
}
