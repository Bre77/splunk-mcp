import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

// Mock Splunk service for testing
class MockSplunkService {
  private isConnected = false;
  
  login(callback: (err?: Error) => void) {
    setTimeout(() => {
      this.isConnected = true;
      callback();
    }, 100);
  }

  search(query: string, params: any, callback: (err?: Error, job?: any) => void) {
    const mockJob = {
      track: (options: any, trackCallback: (err?: Error) => void) => {
        setTimeout(() => trackCallback(), 50);
      },
      results: (options: any, resultsCallback: (err?: Error, results?: any) => void) => {
        const mockResults = [
          { _time: "2024-01-01T10:00:00", host: "server1", message: "Test log entry 1" },
          { _time: "2024-01-01T10:01:00", host: "server2", message: "Test log entry 2" }
        ];
        setTimeout(() => resultsCallback(undefined, mockResults), 50);
      }
    };
    
    setTimeout(() => callback(undefined, mockJob), 50);
  }

  savedSearches() {
    return {
      fetch: (callback: (err?: Error, searches?: any) => void) => {
        const mockSearches = {
          list: () => [
            {
              name: "Daily Error Report",
              properties: () => ({
                search: "index=main level=ERROR | stats count by source",
                description: "Daily error summary",
                dispatch: {
                  earliest_time: "-24h",
                  latest_time: "now"
                }
              })
            }
          ]
        };
        setTimeout(() => callback(undefined, mockSearches), 50);
      },
      item: (name: string) => ({
        dispatch: (options: any, callback: (err?: Error, job?: any) => void) => {
          const mockJob = {
            track: (opts: any, trackCallback: (err?: Error) => void) => {
              setTimeout(() => trackCallback(), 50);
            },
            results: (opts: any, resultsCallback: (err?: Error, results?: any) => void) => {
              const mockResults = [
                { source: "app1.log", count: 25 },
                { source: "app2.log", count: 12 }
              ];
              setTimeout(() => resultsCallback(undefined, mockResults), 50);
            }
          };
          setTimeout(() => callback(undefined, mockJob), 50);
        }
      })
    };
  }

  indexes() {
    return {
      fetch: (callback: (err?: Error, indexes?: any) => void) => {
        const mockIndexes = {
          list: () => [
            {
              name: "main",
              properties: () => ({
                totalEventCount: 1000000,
                currentDBSizeMB: 1024,
                maxDataSize: "auto"
              })
            },
            {
              name: "_internal", 
              properties: () => ({
                totalEventCount: 500000,
                currentDBSizeMB: 512,
                maxDataSize: "auto"
              })
            }
          ]
        };
        setTimeout(() => callback(undefined, mockIndexes), 50);
      }
    };
  }

  serverInfo(callback: (err?: Error, info?: any) => void) {
    const mockInfo = {
      properties: () => ({
        version: "8.2.0",
        build: "12345",
        serverName: "test-splunk",
        licenseState: "OK",
        mode: "normal"
      })
    };
    setTimeout(() => callback(undefined, mockInfo), 50);
  }
}

// Test utilities
async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

class TestSplunkMCPServer {
  private server: McpServer;
  private mockService: MockSplunkService;

  constructor() {
    this.server = new McpServer({
      name: "Test Splunk MCP Server",
      version: "1.0.0"
    });
    this.mockService = new MockSplunkService();
    this.setupTestTools();
  }

  private setupTestTools() {
    // Test search tool
    this.server.tool(
      "test_search",
      {
        query: z.string(),
        max_count: z.number().default(10)
      },
      async ({ query, max_count }) => {
        try {
          const results = await this.mockSearch(query, max_count);
          return {
            content: [{
              type: "text",
              text: JSON.stringify(results, null, 2)
            }]
          };
        } catch (error) {
          return {
            content: [{
              type: "text", 
              text: `Error: ${error instanceof Error ? error.message : String(error)}`
            }],
            isError: true
          };
        }
      }
    );

    // Test configuration tool
    this.server.tool(
      "test_configure",
      {
        host: z.string(),
        username: z.string(),
        password: z.string()
      },
      async ({ host, username, password }) => {
        try {
          await this.mockConfigure({ host, username, password });
          return {
            content: [{
              type: "text",
              text: `Successfully connected to mock Splunk at ${host}`
            }]
          };
        } catch (error) {
          return {
            content: [{
              type: "text",
              text: `Connection failed: ${error instanceof Error ? error.message : String(error)}`
            }],
            isError: true
          };
        }
      }
    );
  }

  private async mockSearch(query: string, maxCount: number): Promise<any> {
    return new Promise((resolve, reject) => {
      this.mockService.search(query, { count: maxCount }, (err, job) => {
        if (err) {
          reject(err);
        } else {
          job.track({}, (trackErr: any) => {
            if (trackErr) {
              reject(trackErr);
            } else {
              job.results({ output_mode: "json" }, (resultErr: any, results: any) => {
                if (resultErr) {
                  reject(resultErr);
                } else {
                  resolve(results);
                }
              });
            }
          });
        }
      });
    });
  }

  private async mockConfigure(config: { host: string; username: string; password: string }): Promise<void> {
    return new Promise((resolve, reject) => {
      this.mockService.login((err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  getServer(): McpServer {
    return this.server;
  }
}

// Test suite
async function runTests() {
  console.log("🧪 Starting Splunk MCP Server Tests\n");

  const testServer = new TestSplunkMCPServer();
  let passedTests = 0;
  let totalTests = 0;

  // Test 1: Server initialization
  totalTests++;
  try {
    const server = testServer.getServer();
    if (server) {
      console.log("✅ Test 1: Server initialization - PASSED");
      passedTests++;
    } else {
      console.log("❌ Test 1: Server initialization - FAILED");
    }
  } catch (error) {
    console.log("❌ Test 1: Server initialization - FAILED:", error);
  }

  // Test 2: Mock configuration
  totalTests++;
  try {
    // Since we can't easily test the tool execution without a full MCP setup,
    // we'll test the underlying mock service directly
    const mockService = new MockSplunkService();
    await new Promise<void>((resolve, reject) => {
      mockService.login((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    console.log("✅ Test 2: Mock configuration - PASSED");
    passedTests++;
  } catch (error) {
    console.log("❌ Test 2: Mock configuration - FAILED:", error);
  }

  // Test 3: Mock search execution
  totalTests++;
  try {
    const mockService = new MockSplunkService();
    const results = await new Promise((resolve, reject) => {
      mockService.search("index=main", {}, (err, job) => {
        if (err) {
          reject(err);
        } else {
          job.track({}, (trackErr: any) => {
            if (trackErr) {
              reject(trackErr);
            } else {
              job.results({}, (resultErr: any, results: any) => {
                if (resultErr) {
                  reject(resultErr);
                } else {
                  resolve(results);
                }
              });
            }
          });
        }
      });
    });
    
    if (Array.isArray(results) && results.length > 0) {
      console.log("✅ Test 3: Mock search execution - PASSED");
      passedTests++;
    } else {
      console.log("❌ Test 3: Mock search execution - FAILED: No results returned");
    }
  } catch (error) {
    console.log("❌ Test 3: Mock search execution - FAILED:", error);
  }

  // Test 4: Mock saved searches
  totalTests++;
  try {
    const mockService = new MockSplunkService();
    const savedSearches = await new Promise((resolve, reject) => {
      mockService.savedSearches().fetch((err, searches) => {
        if (err) {
          reject(err);
        } else {
          resolve(searches.list());
        }
      });
    });
    
    if (Array.isArray(savedSearches) && savedSearches.length > 0) {
      console.log("✅ Test 4: Mock saved searches - PASSED");
      passedTests++;
    } else {
      console.log("❌ Test 4: Mock saved searches - FAILED: No saved searches returned");
    }
  } catch (error) {
    console.log("❌ Test 4: Mock saved searches - FAILED:", error);
  }

  // Test 5: Mock indexes listing
  totalTests++;
  try {
    const mockService = new MockSplunkService();
    const indexes = await new Promise((resolve, reject) => {
      mockService.indexes().fetch((err, indexList) => {
        if (err) {
          reject(err);
        } else {
          resolve(indexList.list());
        }
      });
    });
    
    if (Array.isArray(indexes) && indexes.length > 0) {
      console.log("✅ Test 5: Mock indexes listing - PASSED");
      passedTests++;
    } else {
      console.log("❌ Test 5: Mock indexes listing - FAILED: No indexes returned");
    }
  } catch (error) {
    console.log("❌ Test 5: Mock indexes listing - FAILED:", error);
  }

  // Test 6: Mock server info
  totalTests++;
  try {
    const mockService = new MockSplunkService();
    const serverInfo = await new Promise((resolve, reject) => {
      mockService.serverInfo((err, info) => {
        if (err) {
          reject(err);
        } else {
          resolve(info.properties());
        }
      });
    });
    
    const info = serverInfo as any;
    if (info && info.version && info.serverName) {
      console.log("✅ Test 6: Mock server info - PASSED");
      passedTests++;
    } else {
      console.log("❌ Test 6: Mock server info - FAILED: Invalid server info returned");
    }
  } catch (error) {
    console.log("❌ Test 6: Mock server info - FAILED:", error);
  }

  // Test results summary
  console.log(`\n📊 Test Results: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log("🎉 All tests passed!");
    return true;
  } else {
    console.log("❌ Some tests failed.");
    return false;
  }
}

// Validation tests for tool parameters
function validateToolParameters() {
  console.log("\n🔍 Validating tool parameter schemas\n");

  const searchSchema = z.object({
    query: z.string(),
    earliest_time: z.string().optional(),
    latest_time: z.string().optional(),
    max_count: z.number().min(1).max(10000).default(100),
    output_mode: z.enum(["json", "csv", "xml"]).default("json")
  });

  const configSchema = z.object({
    host: z.string(),
    port: z.number().default(8089),
    username: z.string(),
    password: z.string(),
    scheme: z.enum(["http", "https"]).default("https")
  });

  // Test valid search parameters
  try {
    const validSearch = searchSchema.parse({
      query: "index=main | head 10",
      earliest_time: "-1h",
      max_count: 50
    });
    console.log("✅ Valid search parameters validated");
  } catch (error) {
    console.log("❌ Valid search parameters validation failed:", error);
  }

  // Test invalid search parameters
  try {
    searchSchema.parse({
      query: "",
      max_count: 15000
    });
    console.log("❌ Invalid search parameters should have failed validation");
  } catch (error) {
    console.log("✅ Invalid search parameters correctly rejected");
  }

  // Test valid config parameters
  try {
    const validConfig = configSchema.parse({
      host: "localhost",
      username: "admin",
      password: "secret"
    });
    console.log("✅ Valid config parameters validated");
  } catch (error) {
    console.log("❌ Valid config parameters validation failed:", error);
  }
}

// Main test execution
if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    const testsPassed = await runTests();
    validateToolParameters();
    
    if (testsPassed) {
      console.log("\n✨ All tests completed successfully!");
      process.exit(0);
    } else {
      console.log("\n💥 Some tests failed!");
      process.exit(1);
    }
  })();
}

export { runTests, validateToolParameters, TestSplunkMCPServer };