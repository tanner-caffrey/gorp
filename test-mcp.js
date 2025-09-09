#!/usr/bin/env node

// Simple test script to verify MCP server endpoints
const http = require('http');

const MCP_PORT = 3001;
const BASE_URL = `http://localhost:${MCP_PORT}`;

async function testEndpoint(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: MCP_PORT,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Testing MCP Server Endpoints...\n');

  try {
    // Test health endpoint
    console.log('1. Testing /health endpoint...');
    const health = await testEndpoint('/health');
    console.log(`   Status: ${health.status}`);
    console.log(`   Response:`, health.data);
    console.log('');

    // Test tools list endpoint
    console.log('2. Testing /tools endpoint...');
    const tools = await testEndpoint('/tools');
    console.log(`   Status: ${tools.status}`);
    console.log(`   Available tools: ${tools.data.tools?.length || 0}`);
    if (tools.data.tools) {
      tools.data.tools.forEach(tool => {
        console.log(`   - ${tool.name}: ${tool.description}`);
      });
    }
    console.log('');

    console.log('✅ MCP Server tests completed!');
    console.log(`🌐 Server is running on ${BASE_URL}`);
    console.log('📡 Available endpoints:');
    console.log('   GET  /health - Health check');
    console.log('   GET  /tools - List available tools');
    console.log('   POST /tools/:toolName - Execute specific tool');
    console.log('   POST /call-tool - MCP-style tool call');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('💡 Make sure the Discord bot is running and the MCP server is started');
  }
}

runTests();
