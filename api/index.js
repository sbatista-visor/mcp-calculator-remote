import { writeFileSync, appendFileSync, existsSync } from 'fs';

// Logging function for Vercel
function log(message, data = null) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}`;
  
  if (data) {
    console.log(`${logEntry}\nData:`, JSON.stringify(data, null, 2));
  } else {
    console.log(logEntry);
  }
}

export default function handler(req, res) {
  // Enhanced CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('X-MCP-Server', 'calculator-server/1.0.0');
  res.setHeader('X-MCP-Protocol-Version', '2024-11-05');
  res.setHeader('Cache-Control', 'no-cache');

  log(`📡 ${req.method} /api/index`, {
    userAgent: req.headers['user-agent'],
    body: req.body,
    query: req.query
  });

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // MCP 프로토콜 요청 처리
  if (req.method === 'POST' && req.body?.method) {
    const { method, id } = req.body;
    
    log(`📥 MCP request: ${method}`, req.body);
    
    switch (method) {
      case 'notifications/initialized':
        log("🎉 Received notifications/initialized - Server is ready for tool requests");
        res.status(200).json({
          status: "initialized",
          message: "Server initialized successfully. Tools are available.",
          capabilities: {
            tools: { listChanged: true },
            logging: {},
            resources: {},
            prompts: {}
          },
          nextSteps: "Server is ready for tool calls"
        });
        return;
        
      default:
        log(`❓ Unknown method: ${method}`);
        res.status(404).json({
          jsonrpc: "2.0",
          id: id,
          error: {
            code: -32601,
            message: `Method not found: ${method}`
          }
        });
        return;
    }
  }

  // GET 또는 일반 POST 요청 시 서버 정보 반환
  const tools = [
    { 
      name: "add", 
      description: "Add two numbers together",
      inputSchema: {
        type: "object",
        properties: {
          a: { type: "number", description: "The first number to add" },
          b: { type: "number", description: "The second number to add" }
        },
        required: ["a", "b"],
        additionalProperties: false
      }
    },
    { 
      name: "subtract", 
      description: "Subtract the second number from the first",
      inputSchema: {
        type: "object",
        properties: {
          a: { type: "number", description: "The number to subtract from" },
          b: { type: "number", description: "The number to subtract" }
        },
        required: ["a", "b"],
        additionalProperties: false
      }
    },
    { 
      name: "multiply", 
      description: "Multiply two numbers together",
      inputSchema: {
        type: "object",
        properties: {
          a: { type: "number", description: "The first number to multiply" },
          b: { type: "number", description: "The second number to multiply" }
        },
        required: ["a", "b"],
        additionalProperties: false
      }
    },
    { 
      name: "divide", 
      description: "Divide the first number by the second",
      inputSchema: {
        type: "object",
        properties: {
          a: { type: "number", description: "The dividend (number to be divided)" },
          b: { type: "number", description: "The divisor (number to divide by)" }
        },
        required: ["a", "b"],
        additionalProperties: false
      }
    }
  ];

  const response = {
    name: "Calculator MCP Server",
    version: "1.0.0",
    protocol: "mcp/2024-11-05",
    status: "ready",
    capabilities: {
      tools: { listChanged: true },
      logging: {},
      resources: {},
      prompts: {}
    },
    // Claude URL Integration이 tools를 인식할 수 있도록 명시적으로 제공
    availableTools: tools.map(tool => ({
      name: tool.name,
      description: tool.description
    })),
    endpoints: {
      initialize: "/api/initialize",
      tools_list: "/api/tools-list", 
      tools_call: "/api/tools-call",
      notifications: "POST / (with method field)"
    },
    instructions: "Use POST /api/tools-list to get detailed tool schemas, then POST /api/tools-call to execute tools",
    deployment: "Vercel",
    message: "Calculator MCP Server - Ready for remote integration",
    timestamp: new Date().toISOString()
  };
  
  log("📤 Sending enhanced server info", response);
  res.json(response);
}