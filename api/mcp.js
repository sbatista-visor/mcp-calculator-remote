// Stateless MCP server for Vercel - No session management needed
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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cache-Control');
  res.setHeader('X-MCP-Server', 'calculator-server/1.0.0');
  res.setHeader('X-MCP-Protocol-Version', '2024-11-05');

  log(`🌐 ${req.method} /api/mcp`, {
    userAgent: req.headers['user-agent'],
    contentType: req.headers['content-type'],
    body: req.body,
    query: req.query
  });

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // GET: SSE 연결 시작 (간단화)
  if (req.method === 'GET') {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    log(`📡 SSE stream starting`);
    
    // 초기 연결 확인 메시지
    res.write(`data: ${JSON.stringify({
      jsonrpc: "2.0",
      method: "notifications/message",
      params: {
        level: "info",
        message: "SSE connection established"
      }
    })}\n\n`);
    
    return;
  }

  // POST: MCP 프로토콜 메시지 처리 (세션 없이)
  if (req.method === 'POST') {
    const { method, params, id } = req.body;
    
    log(`📥 MCP request: ${method}`, req.body);
    
    switch (method) {
      case 'initialize':
        log("🔥 Processing initialize request", req.body);
        
        const initResponse = {
          jsonrpc: "2.0",
          id: id,
          result: {
            protocolVersion: "2024-11-05",
            capabilities: {
              tools: { listChanged: true },
              logging: {},
              resources: {},
              prompts: {}
            },
            serverInfo: {
              name: "calculator-server",
              version: "1.0.0"
            },
            instructions: "Calculator MCP server - stateless version"
          }
        };
        
        log("✅ Initialize successful");
        res.json(initResponse);
        return;
        
      case 'tools/list':
        log("🛠️ Processing tools/list request", req.body);
        
        const toolsResponse = {
          jsonrpc: "2.0",
          id: id,
          result: {
            tools: [
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
            ]
          }
        };
        
        log("📤 Sending tools list with 4 tools");
        res.json(toolsResponse);
        return;
        
      case 'tools/call':
        log("⚡ Processing tools/call request", req.body);
        const { name, arguments: args } = params || {};
        
        try {
          let result;
          
          switch (name) {
            case "add":
              result = args.a + args.b;
              log(`➕ Addition: ${args.a} + ${args.b} = ${result}`);
              break;
            case "subtract":
              result = args.a - args.b;
              log(`➖ Subtraction: ${args.a} - ${args.b} = ${result}`);
              break;
            case "multiply":
              result = args.a * args.b;
              log(`✖️ Multiplication: ${args.a} × ${args.b} = ${result}`);
              break;
            case "divide":
              if (args.b === 0) throw new Error("Division by zero is not allowed");
              result = args.a / args.b;
              log(`➗ Division: ${args.a} ÷ ${args.b} = ${result}`);
              break;
            default:
              throw new Error(`Unknown tool: ${name}`);
          }

          const callResponse = {
            jsonrpc: "2.0",
            id: id,
            result: {
              content: [
                {
                  type: "text",
                  text: `The result is: ${result}`
                }
              ]
            }
          };
          
          log(`✅ Tool call successful: ${name} = ${result}`);
          res.json(callResponse);
        } catch (error) {
          log(`❌ Tool call error for ${name}`, { error: error.message });
          
          res.json({
            jsonrpc: "2.0",
            id: id,
            result: {
              content: [
                {
                  type: "text",
                  text: `Error: ${error.message}`
                }
              ],
              isError: true
            }
          });
        }
        return;
        
      case 'notifications/initialized':
        log("🎉 Received notifications/initialized - Server ready!");
        res.status(200).end();
        return;
        
      case 'notifications/cancelled':
        log("⚠️ Received notifications/cancelled - Request was cancelled");
        res.status(200).end();
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

  // 기본 정보 응답
  res.json({
    name: "Calculator MCP Server",
    version: "1.0.0",
    protocol: "mcp/2024-11-05",
    transport: "SSE",
    status: "ready",
    capabilities: {
      tools: { listChanged: true }
    },
    availableTools: ["add", "subtract", "multiply", "divide"],
    message: "Calculator MCP Server - Stateless version for Vercel"
  });
}