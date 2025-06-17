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
  res.setHeader('X-MCP-Transport', 'http');
  res.setHeader('X-MCP-Ready', 'true');

  log(`📡 ${req.method} /api/index - ${req.headers['user-agent']}`);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // POST 요청 시 MCP 표준에 맞는 JSON-RPC 2.0 응답
  if (req.method === 'POST') {
    // MCP 초기화 플로우를 위한 응답
    const mcpResponse = {
      jsonrpc: "2.0",
      id: req.body?.id || "handshake",
      result: {
        // MCP 서버 정보
        serverInfo: {
          name: "Calculator MCP Server",
          version: "1.0.0"
        },
        // MCP 프로토콜 버전
        protocolVersion: "2024-11-05",
        // 지원하는 기능들
        capabilities: {
          tools: { listChanged: true },
          logging: {},
          resources: {},
          prompts: {}
        },
        // 초기화 완료를 알리는 플래그
        initialized: false,
        // 다음 단계 지시
        nextStep: {
          method: "initialize",
          endpoint: "/api/initialize",
          required: true
        }
      }
    };
    
    log("📤 Sending MCP discovery response", mcpResponse);
    res.json(mcpResponse);
    return;
  }

  // GET 요청 시 상세한 서버 정보 반환
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
  
  log("📤 Sending full server info", response);
  res.json(response);
}
