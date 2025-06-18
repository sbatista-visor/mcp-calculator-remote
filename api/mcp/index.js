// Complete MCP HTTP Transport Implementation
// Single endpoint for all MCP communication: /api/mcp

import { v4 as uuidv4 } from 'uuid';

// Enhanced Session management with initialization state
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

// Session state class (log 함수 정의 후 이동)
class MCPSession {
  constructor(id) {
    this.id = id;
    this.initialized = false;  // 핵심: 초기화 상태 추적
    this.toolsReady = false;   // tools/list 호출 가능 상태
    this.createdAt = new Date().toISOString();
    this.protocolVersion = "2024-11-05";
    this.capabilities = {};
    this.clientInfo = {};
  }

  markInitialized() {
    this.initialized = true;
    this.toolsReady = true;  // notifications/initialized 후 tools 준비 완료
    log(`🟢 Session ${this.id} fully initialized and ready for tools/list`);
  }

  isReady() {
    return this.initialized && this.toolsReady;
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

// MCP Server capabilities - 학습한 대로 tools만 명확히 선언
const strictCapabilities = {
  tools: { 
    listChanged: true
  }
  // 다른 모든 capabilities 제거하여 클라이언트가 tools/list를 반드시 호출하도록 강제
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
  
  // Check if this is a notification (no id field)
  const isNotification = !('id' in body);
  
  log(`🔍 Processing ${isNotification ? 'notification' : 'request'}: ${method}`, { id, params });
  
  // Validate JSON-RPC 2.0
  if (jsonrpc !== "2.0") {
    if (isNotification) return null; // Don't respond to invalid notifications
    return {
      jsonrpc: "2.0",
      id: id || null,
      error: { code: -32600, message: "Invalid Request" }
    };
  }

  try {
    switch (method) {
      case "initialize":
        // Create new session with proper state management
        const session = new MCPSession(sessionId);
        session.protocolVersion = params?.protocolVersion || "2024-11-05";
        session.capabilities = params?.capabilities || {};
        session.clientInfo = params?.clientInfo || {};
        
        sessions.set(sessionId, session);
        
        log(`📋 NEW SESSION CREATED: ${sessionId}`, {
          clientInfo: session.clientInfo,
          protocolVersion: session.protocolVersion
        });
        
        const initResponse = {
          jsonrpc: "2.0",
          id,
          result: {
            protocolVersion: "2024-11-05",
            capabilities: strictCapabilities,  // 학습한 대로 엄격한 capabilities
            serverInfo: {
              name: "Calculator MCP Server",
              version: "1.0.0",
              description: "Mathematical calculator with 4 operations"
            }
          }
        };
        
        log(`🔍 STRICT CAPABILITIES SENT:`, strictCapabilities);
        log(`📤 Initialize response sent`, initResponse);
        
        return initResponse;

      case "tools/list":
        const session = sessions.get(sessionId);
        if (!session) {
          log(`❌ tools/list request for unknown session: ${sessionId}`);
          return {
            jsonrpc: "2.0",
            id,
            error: { code: -32002, message: "Session not found" }
          };
        }
        
        if (!session.isReady()) {
          log(`❌ tools/list called before initialization complete for session: ${sessionId}`);
          return {
            jsonrpc: "2.0",
            id,
            error: { 
              code: -32002, 
              message: "Request before initialization complete",
              data: {
                initialized: session.initialized,
                toolsReady: session.toolsReady
              }
            }
          };
        }
        
        log(`🔧 ✅ Tools list requested for READY session: ${sessionId}`);
        
        const toolsResponse = {
          jsonrpc: "2.0",
          id,
          result: { tools }
        };
        
        log(`🔧 ✅ Tools list response sent:`, toolsResponse);
        return toolsResponse;

      case "tools/call":
        const toolSession = sessions.get(sessionId);
        if (!toolSession || !toolSession.isReady()) {
          log(`❌ tools/call before initialization complete for session: ${sessionId}`);
          return {
            jsonrpc: "2.0",
            id,
            error: { code: -32002, message: "Request before initialization complete" }
          };
        }
        
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

      // 핵심 수정: notifications/initialized 처리 강화
      case "notifications/initialized":
        const currentSession = sessions.get(sessionId);
        if (currentSession) {
          currentSession.markInitialized();  // 상태 변경!
          log(`📢 INITIALIZATION COMPLETE! Session ${sessionId} ready for tools/list`);
        } else {
          log(`❌ notifications/initialized for unknown session: ${sessionId}`);
        }
        // Notifications MUST NOT return a response according to JSON-RPC 2.0
        return null;

      case "prompts/list":
        log(`📝 Prompts list requested - REDIRECTING TO TOOLS!`);
        log(`🚫 Rejecting prompts/list and forcing tools/list instead!`);
        
        // Return error suggesting tools instead
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
        
      case "ping":
        log(`🏓 Ping received`);
        return {
          jsonrpc: "2.0",
          id,
          result: { status: "pong" }
        };

      default:
        log(`❓ Unknown method: ${method}`, { id, params });
        if (isNotification) return null; // Don't respond to unknown notifications
        return {
          jsonrpc: "2.0",
          id,
          error: { code: -32601, message: `Method not found: ${method}` }
        };
    }
  } catch (error) {
    log(`❌ Error processing request: ${error.message}`);
    if (isNotification) return null; // Don't respond to notification errors
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
  
  // IMMEDIATE method logging for POST requests
  if (req.method === 'POST' && req.body) {
    log(`🔍 IMMEDIATE METHOD CHECK: ${req.body.method || 'NO_METHOD'}`);
    log(`🔍 IMMEDIATE BODY CHECK:`, req.body);
  }

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Get or create session ID (MCP spec: Mcp-Session-Id header)
  let sessionId = req.headers['mcp-session-id']; // Read from request header (lowercase)
  
  // 다양한 헤더 형식 시도
  if (!sessionId) {
    sessionId = req.headers['x-session-id'] || req.headers['session-id'] || req.headers['sessionid'];
    if (sessionId) {
      log(`🔍 Found session ID in alternative header: ${sessionId}`);
    }
  }
  
  const isInitialize = req.body?.method === 'initialize';
  
  if (isInitialize) {
    // Always create new session for initialize requests
    sessionId = uuidv4();
    log(`🆕 Creating new session for initialize: ${sessionId}`);
  } else if (!sessionId) {
    // Non-initialize requests without session ID should be rejected
    log(`❌ Missing session ID for non-initialize request`);
    res.status(400).json({
      jsonrpc: "2.0",
      error: {
        code: -32600,
        message: "Missing Mcp-Session-Id header. Initialize session first."
      }
    });
    return;
  } else {
    // Verify session exists
    if (!sessions.has(sessionId)) {
      log(`❌ Invalid session ID: ${sessionId}`);
      res.status(404).json({
        jsonrpc: "2.0", 
        error: {
          code: -32002,
          message: "Session not found. Please initialize a new session."
        }
      });
      return;
    }
    log(`✅ Using existing session: ${sessionId}`);
  }
  
  // Always set session header in response
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
      
      // If response is null (notification), send 204 No Content
      if (response === null) {
        log(`📢 Notification processed - no response sent`);
        res.status(204).end();
      } else {
        log(`📤 Single response sent`, response);
        res.json(response);
      }
    }
  } else if (req.method === 'GET') {
    // GET 요청에서도 세션 ID 재확인 (헤더에서 추출)
    if (!sessionId) {
      sessionId = req.headers['mcp-session-id'];
      log(`🔍 GET request - extracted session ID: ${sessionId}`);
    }
    
    // 세션 ID가 여전히 없으면 에러
    if (!sessionId) {
      log(`❌ GET request missing session ID completely`);
      res.status(400).json({
        error: "Missing Mcp-Session-Id header for SSE stream"
      });
      return;
    }
    
    // 세션 존재 확인
    if (!sessions.has(sessionId)) {
      log(`❌ GET request - invalid session ID: ${sessionId}`);
      res.status(404).json({
        error: "Session not found for SSE stream"
      });
      return;
    }
    
    // SSE stream for server-to-client communication
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Mcp-Session-Id', sessionId);
    
    log(`📡 SSE stream opened for session: ${sessionId}`);
    
    // Send initial connection event with session info
    res.write(`data: ${JSON.stringify({
      jsonrpc: "2.0",
      method: "server/ready",
      params: { 
        sessionId,
        status: "connected",
        serverInfo: {
          name: "Calculator MCP Server",
          version: "1.0.0"
        },
        availableTools: ["add", "subtract", "multiply", "divide"]
      }
    })}\n\n`);
    
    // Send tools announcement
    res.write(`data: ${JSON.stringify({
      jsonrpc: "2.0", 
      method: "tools/available",
      params: {
        tools: ["add", "subtract", "multiply", "divide"],
        message: "Calculator tools are ready for use"
      }
    })}\n\n`);
    
    // Shorter keepalive to avoid Vercel timeout
    const keepAlive = setInterval(() => {
      res.write(`data: ${JSON.stringify({
        jsonrpc: "2.0",
        method: "ping",
        params: { timestamp: new Date().toISOString(), sessionId }
      })}\n\n`);
    }, 25000); // 25 seconds instead of 30
    
    // Auto-close after 45 seconds to avoid Vercel timeout
    const autoClose = setTimeout(() => {
      clearInterval(keepAlive);
      res.write(`data: ${JSON.stringify({
        jsonrpc: "2.0",
        method: "server/closing",
        params: { 
          reason: "timeout_prevention",
          sessionId,
          message: "Session remains active. Reconnect if needed."
        }
      })}\n\n`);
      res.end();
      log(`⏰ SSE stream auto-closed for session: ${sessionId}`);
    }, 45000);
    
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
