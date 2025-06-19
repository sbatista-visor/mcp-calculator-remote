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

  log("🛠️ Processing tools/list request", req.body);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'POST') {
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
      jsonrpc: "2.0", 
      id: req.body.id || 1,
      result: {
        tools: tools
      }
    };
    
    log("📤 Sending enhanced tools/list response with 4 tools", response);
    res.json(response);
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}