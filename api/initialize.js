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

  log("🔥 Processing initialize request", req.body);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'POST') {
    const response = {
      jsonrpc: "2.0",
      id: req.body.id,
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
        instructions: "Calculator MCP server with add, subtract, multiply, divide tools"
      }
    };
    
    log("🚀 Sending initialize response", response);
    res.json(response);
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
