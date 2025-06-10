#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import splunkjs from "splunk-sdk";
const { Service } = splunkjs;
type SplunkService = InstanceType<typeof Service>;

interface SplunkConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  scheme: string;
}

class SplunkMCPServer {
  private server: McpServer;
  private splunkService: SplunkService | null = null;

  constructor() {
    this.server = new McpServer({
      name: "Splunk MCP Server",
      version: "1.0.0"
    });

    this.setupTools();
    this.setupResources();
  }

  private setupTools() {
    // Search tool for running Splunk searches
    this.server.tool(
      "search",
      {
        query: z.string().describe("The Splunk search query to execute"),
        earliest_time: z.string().optional().describe("Earliest time for the search (e.g., '-1h', '-24h@h', '2023-01-01T00:00:00')"),
        latest_time: z.string().optional().describe("Latest time for the search (e.g., 'now', '2023-01-01T23:59:59')"),
        max_count: z.number().min(1).max(10000).default(100).describe("Maximum number of results to return"),
        output_mode: z.enum(["json", "csv", "xml"]).default("json").describe("Output format for results")
      },
      async ({ query, earliest_time, latest_time, max_count, output_mode }) => {
        try {
          if (!this.splunkService) {
            throw new Error("Splunk service not initialized. Please configure connection first.");
          }

          const searchParams: any = {
            search: query.startsWith("search") ? query : `search ${query}`,
            output_mode: output_mode,
            count: max_count
          };

          if (earliest_time) {
            searchParams.earliest_time = earliest_time;
          }
          if (latest_time) {
            searchParams.latest_time = latest_time;
          }

          const searchJob = await this.runSearch(searchParams);
          const results = await this.getSearchResults(searchJob, output_mode);

          return {
            content: [{
              type: "text",
              text: typeof results === "string" ? results : JSON.stringify(results, null, 2)
            }]
          };
        } catch (error) {
          return {
            content: [{
              type: "text",
              text: `Error executing search: ${error instanceof Error ? error.message : String(error)}`
            }],
            isError: true
          };
        }
      }
    );

    // Configure connection tool
    this.server.tool(
      "configure",
      {
        host: z.string().describe("Splunk server hostname or IP"),
        port: z.number().default(8089).describe("Splunk management port"),
        username: z.string().describe("Splunk username"),
        password: z.string().describe("Splunk password"),
        scheme: z.enum(["http", "https"]).default("https").describe("Connection scheme")
      },
      async ({ host, port, username, password, scheme }) => {
        try {
          const config: SplunkConfig = { host, port, username, password, scheme };
          await this.configureSplunkConnection(config);
          
          return {
            content: [{
              type: "text",
              text: `Successfully connected to Splunk at ${scheme}://${host}:${port}`
            }]
          };
        } catch (error) {
          return {
            content: [{
              type: "text",
              text: `Failed to connect to Splunk: ${error instanceof Error ? error.message : String(error)}`
            }],
            isError: true
          };
        }
      }
    );

    // List saved searches tool
    this.server.tool(
      "list_saved_searches",
      {},
      async () => {
        try {
          if (!this.splunkService) {
            throw new Error("Splunk service not initialized. Please configure connection first.");
          }

          const savedSearches = await this.getSavedSearches();
          
          return {
            content: [{
              type: "text",
              text: JSON.stringify(savedSearches, null, 2)
            }]
          };
        } catch (error) {
          return {
            content: [{
              type: "text",
              text: `Error listing saved searches: ${error instanceof Error ? error.message : String(error)}`
            }],
            isError: true
          };
        }
      }
    );

    // Get indexes tool
    this.server.tool(
      "list_indexes",
      {},
      async () => {
        try {
          if (!this.splunkService) {
            throw new Error("Splunk service not initialized. Please configure connection first.");
          }

          const indexes = await this.getIndexes();
          
          return {
            content: [{
              type: "text",
              text: JSON.stringify(indexes, null, 2)
            }]
          };
        } catch (error) {
          return {
            content: [{
              type: "text",
              text: `Error listing indexes: ${error instanceof Error ? error.message : String(error)}`
            }],
            isError: true
          };
        }
      }
    );

    // Run saved search tool
    this.server.tool(
      "run_saved_search",
      {
        name: z.string().describe("Name of the saved search to run"),
        earliest_time: z.string().optional().describe("Override earliest time"),
        latest_time: z.string().optional().describe("Override latest time")
      },
      async ({ name, earliest_time, latest_time }) => {
        try {
          if (!this.splunkService) {
            throw new Error("Splunk service not initialized. Please configure connection first.");
          }

          const results = await this.runSavedSearch(name, earliest_time, latest_time);
          
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
              text: `Error running saved search: ${error instanceof Error ? error.message : String(error)}`
            }],
            isError: true
          };
        }
      }
    );
  }

  private setupResources() {
    // Connection status resource
    this.server.resource(
      "connection_status",
      "splunk://status",
      async () => ({
        contents: [{
          uri: "splunk://status",
          text: this.splunkService ? "Connected" : "Not connected"
        }]
      })
    );

    // Server info resource
    this.server.resource(
      "server_info",
      "splunk://info",
      async () => {
        try {
          if (!this.splunkService) {
            throw new Error("Splunk service not initialized");
          }

          const info = await this.getServerInfo();
          return {
            contents: [{
              uri: "splunk://info",
              text: JSON.stringify(info, null, 2)
            }]
          };
        } catch (error) {
          return {
            contents: [{
              uri: "splunk://info",
              text: `Error getting server info: ${error instanceof Error ? error.message : String(error)}`
            }]
          };
        }
      }
    );
  }

  private async configureSplunkConnection(config: SplunkConfig): Promise<void> {
    return new Promise((resolve, reject) => {
      this.splunkService = new Service({
        host: config.host,
        port: config.port,
        username: config.username,
        password: config.password,
        scheme: config.scheme,
        version: "8.0"
      });

      this.splunkService.login((err?: Error) => {
        if (err) {
          this.splunkService = null;
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  private async runSearch(searchParams: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.splunkService) {
        reject(new Error("Splunk service not initialized"));
        return;
      }

      this.splunkService.search(searchParams.search, searchParams, (err?: Error, job?: any) => {
        if (err) {
          reject(err);
        } else {
          resolve(job);
        }
      });
    });
  }

  private async getSearchResults(job: any, outputMode: string): Promise<any> {
    return new Promise((resolve, reject) => {
      job.track({}, (err: any) => {
        if (err) {
          reject(err);
        } else {
          job.results({ output_mode: outputMode }, (err: any, results: any) => {
            if (err) {
              reject(err);
            } else {
              resolve(results);
            }
          });
        }
      });
    });
  }

  private async getSavedSearches(): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.splunkService) {
        reject(new Error("Splunk service not initialized"));
        return;
      }

      this.splunkService.savedSearches().fetch((err?: Error, savedSearches?: any) => {
        if (err) {
          reject(err);
        } else {
          const searches = savedSearches?.list().map((search: any) => ({
            name: search.name,
            search: search.properties().search,
            description: search.properties().description,
            earliest_time: search.properties().dispatch?.earliest_time,
            latest_time: search.properties().dispatch?.latest_time
          }));
          resolve(searches);
        }
      });
    });
  }

  private async getIndexes(): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.splunkService) {
        reject(new Error("Splunk service not initialized"));
        return;
      }

      this.splunkService.indexes().fetch((err?: Error, indexes?: any) => {
        if (err) {
          reject(err);
        } else {
          const indexList = indexes?.list().map((index: any) => ({
            name: index.name,
            totalEventCount: index.properties().totalEventCount,
            currentDBSizeMB: index.properties().currentDBSizeMB,
            maxDataSize: index.properties().maxDataSize
          }));
          resolve(indexList);
        }
      });
    });
  }

  private async runSavedSearch(name: string, earliestTime?: string, latestTime?: string): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.splunkService) {
        reject(new Error("Splunk service not initialized"));
        return;
      }

      this.splunkService.savedSearches().fetch((err?: Error, savedSearches?: any) => {
        if (err) {
          reject(err);
          return;
        }

        const savedSearch = savedSearches?.item(name);
        if (!savedSearch) {
          reject(new Error(`Saved search '${name}' not found`));
          return;
        }

        const dispatchOptions: any = {};
        if (earliestTime) dispatchOptions.earliest_time = earliestTime;
        if (latestTime) dispatchOptions.latest_time = latestTime;

        savedSearch.dispatch(dispatchOptions, (err: any, job: any) => {
          if (err) {
            reject(err);
          } else {
            job.track({}, (err: any) => {
              if (err) {
                reject(err);
              } else {
                job.results({ output_mode: "json" }, (err: any, results: any) => {
                  if (err) {
                    reject(err);
                  } else {
                    resolve(results);
                  }
                });
              }
            });
          }
        });
      });
    });
  }

  private async getServerInfo(): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.splunkService) {
        reject(new Error("Splunk service not initialized"));
        return;
      }

      this.splunkService.serverInfo((err?: Error, info?: any) => {
        if (err) {
          reject(err);
        } else {
          const props = info?.properties();
          resolve({
            version: props?.version,
            build: props?.build,
            serverName: props?.serverName,
            licenseState: props?.licenseState,
            mode: props?.mode
          });
        }
      });
    });
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Splunk MCP Server started");
  }
}

async function main() {
  const server = new SplunkMCPServer();
  await server.start();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error("Server error:", error);
    process.exit(1);
  });
}