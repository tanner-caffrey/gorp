import express from 'express';
import cors from 'cors';
import { DiscordTools } from './discordTools';
import { TOOL_DEFINITIONS, executeTool } from './tools';

export class DiscordMCPHttpServer {
  private app: express.Application;
  private discordTools: DiscordTools;
  private port: number;

  constructor(discordClient: any, port: number = 3001) {
    this.app = express();
    this.port = port;
    this.discordTools = new DiscordTools(discordClient);
    
    this.setupMiddleware();
    this.setupRoutes();
  }


  private setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json());
  }

  private setupRoutes() {
    // Add this route at the beginning of setupRoutes()
    this.app.post('/', async (req, res) => {
        // Add logging to see what Letta is sending
        console.log('MCP Request received:', JSON.stringify(req.body, null, 2));
        
        // Handle MCP initialization or tool calls from root
        const { method, params, id } = req.body;
        // ... rest of your code

      try {
        let result;

        switch (method) {
          case 'initialize':
            // Handle MCP initialization
            result = {
              protocolVersion: '2025-06-18',
              capabilities: {
                tools: {}
              },
              serverInfo: {
                name: 'discord-mcp-server',
                version: '1.0.0'
              }
            };
            break;
          case 'notifications/initialized':
            // Handle initialization notification - no response needed
            console.log('MCP client initialized successfully');
            return res.status(200).json({});
            break;
          case 'tools/list':
            // Return the tools list
            result = { tools: TOOL_DEFINITIONS };
            break;
          case 'tools/call':
            const { name, arguments: args } = params;
            result = await executeTool(name, args, this.discordTools);
            break;
          default:
            // Only send error response if there's an id (not for notifications)
            if (id !== undefined) {
              return res.status(400).json({
                jsonrpc: '2.0',
                error: { code: -32601, message: `Method not found: ${method}` },
                id
              });
            } else {
              return res.status(400).json({ error: `Method not found: ${method}` });
            }
        }

        // Only send response if there's an id (not for notifications)
        if (id !== undefined) {
          res.json({
            jsonrpc: '2.0',
            result,
            id
          });
        } else {
          res.status(200).json({});
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        // Only send error response if there's an id (not for notifications)
        if (id !== undefined) {
          res.json({
            jsonrpc: '2.0',
            error: { code: -32603, message: errorMessage },
            id
          });
        } else {
          res.status(500).json({ error: errorMessage });
        }
      }
    });

    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ status: 'ok', service: 'discord-mcp-server' });
    });

    // List available tools
    this.app.get('/tools', (req, res) => {
      res.json({ tools: TOOL_DEFINITIONS });
    });

    // Execute tool
    this.app.post('/tools/:toolName', async (req, res) => {
      const { toolName } = req.params;
      const args = req.body;

      try {
        const result = await executeTool(toolName, args, this.discordTools);
        res.json(result);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ 
          error: `Error executing tool ${toolName}: ${errorMessage}` 
        });
      }
    });

    // MCP-style tool call endpoint
    this.app.post('/call-tool', async (req, res) => {
      const { name, arguments: args } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Tool name is required' });
      }

      try {
        const result = await executeTool(name, args, this.discordTools);
        res.json(result);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ 
          error: `Error executing tool ${name}: ${errorMessage}`,
          isError: true 
        });
      }
    });
  }

  async start() {
    return new Promise<void>((resolve) => {
      this.app.listen(this.port, () => {
        console.log(`🌐 MCP Discord HTTP server running on port ${this.port}`);
        console.log(`📡 Available endpoints:`);
        console.log(`   GET  /health - Health check`);
        console.log(`   GET  /tools - List available tools`);
        console.log(`   POST /tools/:toolName - Execute specific tool`);
        console.log(`   POST /call-tool - MCP-style tool call`);
        resolve();
      });
    });
  }
}
