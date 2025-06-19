import express from 'express';
import cors from 'cors';
import { writeFileSync, appendFileSync, existsSync } from 'fs';

const app = express();
const PORT = process.env.PORT || 3000;
const logFile = './mcp_remote.log';

// Initialize log file
if (!existsSync(logFile)) {
  writeFileSync(logFile, '');
}

// Logging function
function log(message, data = null) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}`;
  
  if (data) {
    const logWithData = `${logEntry}\nData: ${JSON.stringify(data, null, 2)}\n${'='.repeat(80)}\n`;
    appendFileSync(logFile, logWithData);
    console.log(logWithData);
  } else {
    const simpleLog = `${logEntry}\n`;
    appendFileSync(logFile, simpleLog);
    console.log(simpleLog);
  }
}

// Calculator functions
const calculator = {
  add: (a, b) => a + b,
  subtract: (a, b) => a - b,
  multiply: (a, b) => a * b,
  divide: (a, b) => {
    if (b === 0) throw new Error("Division by zero is not allowed");
    return a / b;
  }
};

// Tools definition - MCP 스펙에 맞게 개선
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

// Server capabilities - MCP 스펙 준수
const serverCapabilities = {
  tools: { 
    listChanged: true 
  },
  logging: {},
  resources: {},
  prompts: {}
};

// Enhanced CORS for MCP
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: false
}));

app.use(express.json({ limit: '10mb' }));

// MCP server info headers
app.use((req, res, next) => {
  res.setHeader('X-MCP-Server', 'calculator-server/1.0.0');
  res.setHeader('X-MCP-Protocol-Version', '2024-11-05');
  res.setHeader('Cache-Control', 'no-cache');
  next();
});

// Log all requests
app.use((req, res, next) => {
  log(`📡 ${req.method} ${req.url}`, {
    headers: req.headers,
    body: req.body,
    query: req.query
  });
  next();
});

// GET / - Server info (Claude URL Integration에서 먼저 호출)
app.get('/', (req, res) => {
  const response = {
    name: "Calculator MCP Server",
    version: "1.0.0",
    protocol: "mcp/2024-11-05",
    status: "ready",
    capabilities: serverCapabilities,
    // Claude URL Integration이 tools를 인식할 수 있도록 명시적으로 제공
    availableTools: tools.map(tool => ({
      name: tool.name,
      description: tool.description
    })),
    endpoints: {
      initialize: "POST /initialize",
      tools_list: "POST /tools/list", 
      tools_call: "POST /tools/call",
      notifications: "POST / (with method field)"
    },
    instructions: "Use POST /tools/list to get detailed tool schemas, then POST /tools/call to execute tools",
    message: "Calculator MCP Server - Ready for remote integration"
  };
  
  log("📤 Sending server info", response);
  res.json(response);
});

// POST /initialize - MCP initialization
app.post('/initialize', (req, res) => {
  log("🔥 Processing initialize request", req.body);
  
  const response = {
    jsonrpc: "2.0",
    id: req.body.id,
    result: {
      protocolVersion: "2024-11-05",
      capabilities: serverCapabilities,
      serverInfo: {
        name: "calculator-server",
        version: "1.0.0"
      },
      instructions: "Calculator MCP server with add, subtract, multiply, divide tools. Use tools/list to get available tools."
    }
  };
  
  log("🚀 Sending initialize response", response);
  res.json(response);
});

// POST /tools/list - List available tools
app.post('/tools/list', (req, res) => {
  log("🛠️ Processing tools/list request", req.body);
  
  const response = {
    jsonrpc: "2.0",
    id: req.body.id || 1,
    result: {
      tools: tools
    }
  };
  
  log("📤 Sending tools/list response", response);
  res.json(response);
});

// POST /tools/call - Execute tool
app.post('/tools/call', (req, res) => {
  log("⚡ Processing tools/call request", req.body);
  
  const { name, arguments: args } = req.body.params || {};
  
  try {
    let result;
    
    switch (name) {
      case "add":
        result = calculator.add(args.a, args.b);
        log(`➕ Addition: ${args.a} + ${args.b} = ${result}`);
        break;
      case "subtract":
        result = calculator.subtract(args.a, args.b);
        log(`➖ Subtraction: ${args.a} - ${args.b} = ${result}`);
        break;
      case "multiply":
        result = calculator.multiply(args.a, args.b);
        log(`✖️ Multiplication: ${args.a} × ${args.b} = ${result}`);
        break;
      case "divide":
        result = calculator.divide(args.a, args.b);
        log(`➗ Division: ${args.a} ÷ ${args.b} = ${result}`);
        break;
      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    const response = {
      jsonrpc: "2.0",
      id: req.body.id,
      result: {
        content: [
          {
            type: "text",
            text: `The result is: ${result}`
          }
        ]
      }
    };
    
    log("✅ Tool call successful", { tool: name, result, response });
    res.json(response);
    
  } catch (error) {
    log(`❌ Tool call error for ${name}`, { error: error.message });
    
    const errorResponse = {
      jsonrpc: "2.0",
      id: req.body.id,
      result: {
        content: [
          {
            type: "text",
            text: `Error: ${error.message}`
          }
        ],
        isError: true
      }
    };
    
    res.json(errorResponse);
  }
});

// Generic MCP endpoint (fallback)
app.post('/', (req, res) => {
  const { method } = req.body || {};
  
  log(`📥 Generic MCP request: ${method}`, req.body);
  
  switch (method) {
    case 'initialize':
      return app._router.handle({ ...req, url: '/initialize', method: 'POST' }, res);
    case 'tools/list':
      return app._router.handle({ ...req, url: '/tools/list', method: 'POST' }, res);
    case 'tools/call':
      return app._router.handle({ ...req, url: '/tools/call', method: 'POST' }, res);
    case 'notifications/initialized':
      log("🎉 Received notifications/initialized - Server is ready for tool requests");
      // 성공적인 초기화 응답과 함께 도구 사용 가능 힌트 제공
      res.status(200).json({
        status: "initialized",
        message: "Server initialized successfully. Tools are available via tools/list endpoint.",
        capabilities: serverCapabilities,
        nextSteps: "Call tools/list to get available tools"
      });
      break;
    default:
      log(`❓ Unknown method: ${method}`);
      res.status(404).json({
        jsonrpc: "2.0",
        id: req.body.id,
        error: {
          code: -32601,
          message: `Method not found: ${method}`
        }
      });
  }
});

// 도구 목록을 직접 가져올 수 있는 GET 엔드포인트 추가
app.get('/tools', (req, res) => {
  log("🛠️ GET /tools - Direct tools access");
  res.json({
    tools: tools,
    message: "Available calculator tools",
    usage: "Use POST /tools/call with tool name and arguments"
  });
});

// Health check 엔드포인트
app.get('/health', (req, res) => {
  res.json({
    status: "healthy",
    server: "calculator-server",
    version: "1.0.0",
    capabilities: serverCapabilities,
    toolsAvailable: tools.length
  });
});

// Start server
app.listen(PORT, () => {
  log(`🚀 Calculator MCP Remote Server started`);
  log(`📍 Server running on http://localhost:${PORT}`);
  log(`🔗 Use this URL for Claude integration: http://localhost:${PORT}`);
  console.log(`
🎯 Calculator MCP Remote Server
📍 Server: http://localhost:${PORT}
📊 Logs: ./mcp_remote.log
📋 Tools: add, subtract, multiply, divide

🔧 For Claude URL Integration:
   URL: http://localhost:${PORT}
   
📚 Available endpoints:
   GET  /        - Server info
   GET  /tools   - Tools list (direct access)
   GET  /health  - Health check
   POST /        - MCP protocol endpoints
  `);
});
