# Splunk MCP Server

A Model Context Protocol (MCP) server that provides Splunk search capabilities to LLM applications. This server allows you to execute Splunk searches, manage saved searches, and retrieve Splunk server information through a standardized MCP interface.

## Features

- **Search Execution**: Run arbitrary Splunk searches with configurable time ranges and result limits
- **Saved Search Management**: List and execute saved searches
- **Index Information**: Retrieve information about available Splunk indexes
- **Server Status**: Get Splunk server information and connection status
- **Flexible Output**: Support for JSON, CSV, and XML output formats
- **Time Range Control**: Specify earliest and latest times for searches

## Installation

1. Clone or download this repository
2. Install dependencies:

```bash
pnpm install
```

3. Build the project:

```bash
pnpm run build
```

## Configuration

Before using the server, you need to configure your Splunk connection. Use the `configure` tool to set up the connection:

```typescript
// Example configuration
{
  "host": "your-splunk-server.com",
  "port": 8089,
  "username": "your-username", 
  "password": "your-password",
  "scheme": "https"
}
```

## Usage

### Running the Server

Start the MCP server using stdio transport:

```bash
pnpm run start
```

For development with hot reload:

```bash
pnpm run dev
```

### Available Tools

#### 1. Configure Connection (`configure`)

Set up the Splunk connection parameters.

**Parameters:**
- `host` (string): Splunk server hostname or IP
- `port` (number, default: 8089): Splunk management port
- `username` (string): Splunk username
- `password` (string): Splunk password
- `scheme` (string, default: "https"): Connection scheme (http/https)

#### 2. Search (`search`)

Execute a Splunk search query.

**Parameters:**
- `query` (string): The Splunk search query to execute
- `earliest_time` (string, optional): Earliest time for the search (e.g., '-1h', '-24h@h', '2023-01-01T00:00:00')
- `latest_time` (string, optional): Latest time for the search (e.g., 'now', '2023-01-01T23:59:59')
- `max_count` (number, default: 100): Maximum number of results to return (1-10000)
- `output_mode` (string, default: "json"): Output format (json/csv/xml)

**Example:**
```json
{
  "query": "index=main error | head 10",
  "earliest_time": "-1h",
  "latest_time": "now",
  "max_count": 50,
  "output_mode": "json"
}
```

#### 3. List Saved Searches (`list_saved_searches`)

Retrieve all saved searches from the Splunk instance.

**Parameters:** None

#### 4. Run Saved Search (`run_saved_search`)

Execute a saved search by name.

**Parameters:**
- `name` (string): Name of the saved search to run
- `earliest_time` (string, optional): Override earliest time
- `latest_time` (string, optional): Override latest time

#### 5. List Indexes (`list_indexes`)

Get information about available Splunk indexes.

**Parameters:** None

### Available Resources

#### 1. Connection Status (`splunk://status`)

Check the current connection status to Splunk.

#### 2. Server Info (`splunk://info`)

Retrieve detailed information about the Splunk server including version, build, and license information.

## Examples

### Basic Search

```json
{
  "tool": "search",
  "arguments": {
    "query": "index=main sourcetype=access_combined | head 100",
    "earliest_time": "-1d",
    "latest_time": "now"
  }
}
```

### Error Analysis

```json
{
  "tool": "search", 
  "arguments": {
    "query": "index=main level=ERROR | stats count by source | sort -count",
    "earliest_time": "-4h",
    "max_count": 20
  }
}
```

### Running a Saved Search

```json
{
  "tool": "run_saved_search",
  "arguments": {
    "name": "Daily Error Report",
    "earliest_time": "-24h"
  }
}
```

## Security Considerations

- Store Splunk credentials securely and never commit them to version control
- Use HTTPS when connecting to Splunk servers in production
- Limit search privileges appropriately for the Splunk user account
- Consider implementing rate limiting for search requests
- Validate and sanitize search queries to prevent injection attacks

## Error Handling

The server provides detailed error messages for common issues:

- Connection failures to Splunk
- Invalid search syntax
- Authentication errors
- Missing saved searches
- Network timeouts

## Development

### Project Structure

```
splunk-mcp/
├── src/
│   └── index.ts          # Main server implementation
├── dist/                 # Compiled JavaScript
├── config.example.json   # Configuration example
├── package.json
├── tsconfig.json
└── README.md
```

### Building

```bash
pnpm run build
```

### Running in Development

```bash
pnpm run dev
```

## MCP Client Integration

To use this server with an MCP client, configure it as follows:

```json
{
  "mcpServers": {
    "splunk": {
      "command": "node",
      "args": ["path/to/splunk-mcp/dist/index.js"]
    }
  }
}
```

## Dependencies

- `@modelcontextprotocol/sdk`: MCP TypeScript SDK
- `splunk-sdk`: Official Splunk SDK for JavaScript
- `zod`: Schema validation
- `typescript`: TypeScript compiler

## License

ISC

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Troubleshooting

### Connection Issues

1. Verify Splunk server is accessible
2. Check credentials and permissions
3. Ensure the management port (default 8089) is accessible
4. Verify SSL/TLS settings match your Splunk configuration

### Search Issues

1. Test searches directly in Splunk Web interface first
2. Check search syntax and time ranges
3. Verify index permissions for the user account
4. Monitor Splunk search job limits

### Performance

- Use specific time ranges to limit search scope
- Implement result limits appropriate for your use case
- Consider using summary indexes for frequently accessed data
- Monitor Splunk resource usage when running intensive searches