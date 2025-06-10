import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function runSplunkMCPExample() {
  // Create a client transport that connects to our Splunk MCP server
  const transport = new StdioClientTransport({
    command: "node",
    args: ["../dist/index.js"]
  });

  // Create the MCP client
  const client = new Client(
    {
      name: "splunk-mcp-example-client",
      version: "1.0.0"
    }
  );

  try {
    // Connect to the server
    await client.connect(transport);
    console.log("Connected to Splunk MCP Server");

    // Step 1: Configure Splunk connection
    console.log("\n1. Configuring Splunk connection...");
    const configResult = await client.callTool({
      name: "configure",
      arguments: {
        host: "localhost",
        port: 8089,
        username: "admin",
        password: "changeme",
        scheme: "https"
      }
    });
    console.log("Configuration result:", configResult.content[0].text);

    // Step 2: Check connection status
    console.log("\n2. Checking connection status...");
    const statusResource = await client.readResource({
      uri: "splunk://status"
    });
    console.log("Connection status:", statusResource.contents[0].text);

    // Step 3: Get server info
    console.log("\n3. Getting server information...");
    const serverInfo = await client.readResource({
      uri: "splunk://info"
    });
    console.log("Server info:", serverInfo.contents[0].text);

    // Step 4: List available indexes
    console.log("\n4. Listing available indexes...");
    const indexesResult = await client.callTool({
      name: "list_indexes",
      arguments: {}
    });
    console.log("Available indexes:", indexesResult.content[0].text);

    // Step 5: Run a simple search
    console.log("\n5. Running a simple search...");
    const searchResult = await client.callTool({
      name: "search",
      arguments: {
        query: "index=_internal | head 10",
        earliest_time: "-1h",
        latest_time: "now",
        max_count: 10,
        output_mode: "json"
      }
    });
    console.log("Search results:", searchResult.content[0].text);

    // Step 6: List saved searches
    console.log("\n6. Listing saved searches...");
    const savedSearchesResult = await client.callTool({
      name: "list_saved_searches",
      arguments: {}
    });
    console.log("Saved searches:", savedSearchesResult.content[0].text);

    // Step 7: Example of error analysis search
    console.log("\n7. Running error analysis search...");
    const errorSearchResult = await client.callTool({
      name: "search",
      arguments: {
        query: "index=_internal log_level=ERROR | stats count by component | sort -count",
        earliest_time: "-4h",
        latest_time: "now",
        max_count: 20,
        output_mode: "json"
      }
    });
    console.log("Error analysis results:", errorSearchResult.content[0].text);

    // Step 8: Example of performance monitoring search
    console.log("\n8. Running performance monitoring search...");
    const perfSearchResult = await client.callTool({
      name: "search",
      arguments: {
        query: "index=_internal source=*metrics.log* | stats avg(cpu_seconds) as avg_cpu by host",
        earliest_time: "-1h",
        latest_time: "now",
        max_count: 50,
        output_mode: "json"
      }
    });
    console.log("Performance monitoring results:", perfSearchResult.content[0].text);

  } catch (error) {
    console.error("Error:", error);
  } finally {
    // Clean up
    await client.close();
    console.log("\nDisconnected from Splunk MCP Server");
  }
}

// Example of how to handle specific search scenarios
async function runSpecificSearchExamples(client: Client) {
  console.log("\n=== Specific Search Examples ===");

  // Security monitoring
  try {
    console.log("\n🔒 Security: Failed login attempts");
    const securityResult = await client.callTool({
      name: "search",
      arguments: {
        query: 'index=main sourcetype=linux_secure "Failed password" | stats count by src_ip | sort -count',
        earliest_time: "-24h",
        max_count: 25
      }
    });
    console.log(securityResult.content[0].text);
  } catch (error) {
    console.log("Security search failed:", error);
  }

  // Web access analysis
  try {
    console.log("\n🌐 Web: Top pages by hits");
    const webResult = await client.callTool({
      name: "search",
      arguments: {
        query: 'index=main sourcetype=access_combined | stats count by uri_path | sort -count',
        earliest_time: "-1h",
        max_count: 10
      }
    });
    console.log(webResult.content[0].text);
  } catch (error) {
    console.log("Web access search failed:", error);
  }

  // System performance
  try {
    console.log("\n📊 System: CPU utilization");
    const sysResult = await client.callTool({
      name: "search",
      arguments: {
        query: 'index=os sourcetype=cpu | stats avg(pctUser) as avg_cpu_user, avg(pctSystem) as avg_cpu_system by host',
        earliest_time: "-30m",
        max_count: 20
      }
    });
    console.log(sysResult.content[0].text);
  } catch (error) {
    console.log("System performance search failed:", error);
  }
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  runSplunkMCPExample()
    .then(() => console.log("\nExample completed successfully"))
    .catch((error) => {
      console.error("Example failed:", error);
      process.exit(1);
    });
}

export { runSplunkMCPExample };