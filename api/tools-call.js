function log(message, data = null) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}`;
  
  if (data) {
    console.log(`${logEntry}\nData:`, JSON.stringify(data, null, 2));
  } else {
    console.log(logEntry);
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

export default function handler(req, res) {
  // Enhanced CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  log("⚡ Processing tools/call request", req.body);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'POST') {
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
      
      log("✅ Tool call successful", { tool: name, result });
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
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
