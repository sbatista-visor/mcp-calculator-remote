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
  res.setHeader('X-MCP-Initialized', 'true');

  log(`🔥 ${req.method} /api/initialize - Processing initialize request`, req.body);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'POST') {
    // 완전한 MCP 초기화 응답
    const response = {
      jsonrpc: "2.0",
      id: req.body?.id || "init",
      result: {
        // 프로토콜 버전
        protocolVersion: "2024-11-05",
        
        // 서버 정보
        serverInfo: {
          name: "Calculator MCP Server",
          version: "1.0.0",
          description: "A mathematical calculator server supporting basic arithmetic operations"
        },
        
        // 서버 능력
        capabilities: {
          tools: { 
            listChanged: true,
            supportsProgress: false 
          },
          logging: {
            level: "info"
          },
          resources: {},
          prompts: {}
        },
        
        // 초기화 완료 표시
        initialized: true,
        
        // 사용 가능한 도구들
        availableTools: [
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
        ],
        
        // 다음 단계 안내
        nextActions: {
          toolsList: "/api/tools-list",
          toolsCall: "/api/tools-call"
        },
        
        // 준비 완료 상태
        status: "ready",
        message: "Calculator MCP Server initialized successfully. Ready to perform mathematical operations."
      }
    };
    
    log("🚀 Sending complete initialize response", response);
    res.json(response);
  } else {
    res.status(405).json({ 
      jsonrpc: "2.0",
      id: req.body?.id || null,
      error: {
        code: -32601,
        message: "Method not allowed"
      }
    });
  }
}
