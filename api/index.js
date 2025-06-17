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

  log(`📡 ${req.method} /api/index - ${req.headers['user-agent']}`);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const tools = [
    { name: "add", description: "Add two numbers together" },
    { name: "subtract", description: "Subtract second number from first number" },
    { name: "multiply", description: "Multiply two numbers together" },
    { name: "divide", description: "Divide first number by second number" }
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
    tools,
    endpoints: {
      initialize: "/api/initialize",
      tools_list: "/api/tools-list", 
      tools_call: "/api/tools-call"
    },
    deployment: "Vercel",
    message: "Calculator MCP Server - Ready for remote integration",
    timestamp: new Date().toISOString()
  };
  
  log("📤 Sending server info", response);
  res.json(response);
}
