import { createMcpHandler } from "@vercel/mcp-adapter";
import { z } from "zod";

const handler = createMcpHandler(
  (server) => {
    // Add Calculator Tool
    server.tool(
      "add",
      "Add two numbers together",
      {
        a: z.number().describe("The first number to add"),
        b: z.number().describe("The second number to add"),
      },
      async ({ a, b }) => {
        const result = a + b;
        console.log(`➕ Addition: ${a} + ${b} = ${result}`);
        return {
          content: [
            {
              type: "text",
              text: `The result is: ${result}`,
            },
          ],
        };
      }
    );

    // Subtract Tool
    server.tool(
      "subtract", 
      "Subtract the second number from the first",
      {
        a: z.number().describe("The number to subtract from"),
        b: z.number().describe("The number to subtract"),
      },
      async ({ a, b }) => {
        const result = a - b;
        console.log(`➖ Subtraction: ${a} - ${b} = ${result}`);
        return {
          content: [
            {
              type: "text", 
              text: `The result is: ${result}`,
            },
          ],
        };
      }
    );

    // Multiply Tool
    server.tool(
      "multiply",
      "Multiply two numbers together", 
      {
        a: z.number().describe("The first number to multiply"),
        b: z.number().describe("The second number to multiply"),
      },
      async ({ a, b }) => {
        const result = a * b;
        console.log(`✖️ Multiplication: ${a} × ${b} = ${result}`);
        return {
          content: [
            {
              type: "text",
              text: `The result is: ${result}`,
            },
          ],
        };
      }
    );

    // Divide Tool
    server.tool(
      "divide",
      "Divide the first number by the second",
      {
        a: z.number().describe("The dividend (number to be divided)"),
        b: z.number().describe("The divisor (number to divide by)"),
      },
      async ({ a, b }) => {
        if (b === 0) {
          throw new Error("Division by zero is not allowed");
        }
        const result = a / b;
        console.log(`➗ Division: ${a} ÷ ${b} = ${result}`);
        return {
          content: [
            {
              type: "text",
              text: `The result is: ${result}`,
            },
          ],
        };
      }
    );
  },
  {
    // Server options
    serverInfo: {
      name: "calculator-server",
      version: "1.0.0",
    },
  },
  {
    // Vercel MCP Adapter configuration
    basePath: "/api",
    maxDuration: 60,
    verboseLogs: true,
    disableSSE: true,  // Disable SSE to avoid Redis requirement
  }
);

export { handler as GET, handler as POST };
