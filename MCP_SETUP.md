# MCP Setup Guide for Splunk MCP Server

This guide explains how to configure and use the Splunk MCP Server with various MCP clients.

## Prerequisites

- Node.js 18+ installed
- Access to a Splunk instance
- Valid Splunk credentials with search permissions

## Installation

1. Build the server:
```bash
pnpm install
pnpm run build
```

2. Test the installation:
```bash
pnpm run test
```

## MCP Client Configuration

### Claude Desktop

Add this configuration to your Claude Desktop `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "splunk": {
      "command": "node",
      "args": ["/path/to/splunk-mcp/dist/index.js"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

### Continue.dev

Add to your Continue configuration:

```json
{
  "mcpServers": [
    {
      "name": "splunk",
      "command": "node",
      "args": ["/path/to/splunk-mcp/dist/index.js"]
    }
  ]
}
```

### Cline/VSCode

Add to your Cline settings:

```json
{
  "cline.mcpServers": {
    "splunk": {
      "command": "node",
      "args": ["/path/to/splunk-mcp/dist/index.js"]
    }
  }
}
```

### Generic MCP Client

For any MCP client using stdio transport:

```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({
  command: "node",
  args: ["/path/to/splunk-mcp/dist/index.js"]
});

const client = new Client({
  name: "my-client",
  version: "1.0.0"
});

await client.connect(transport);
```

## First Time Setup

1. **Configure Splunk Connection**

Once connected to the MCP server, you must configure your Splunk connection first:

```json
{
  "tool": "configure",
  "arguments": {
    "host": "your-splunk-server.com",
    "port": 8089,
    "username": "your-username",
    "password": "your-password",
    "scheme": "https"
  }
}
```

2. **Test Connection**

Check if the connection is working:

```json
{
  "resource": "splunk://status"
}
```

3. **Get Server Information**

Retrieve server details:

```json
{
  "resource": "splunk://info"
}
```

## Common Use Cases

### Security Monitoring

Search for failed login attempts:
```json
{
  "tool": "search",
  "arguments": {
    "query": "index=main sourcetype=linux_secure \"Failed password\" | stats count by src_ip | sort -count",
    "earliest_time": "-24h",
    "max_count": 25
  }
}
```

### Performance Analysis

Monitor CPU usage:
```json
{
  "tool": "search",
  "arguments": {
    "query": "index=os sourcetype=cpu | stats avg(pctUser) as avg_cpu by host",
    "earliest_time": "-1h",
    "max_count": 50
  }
}
```

### Error Analysis

Find application errors:
```json
{
  "tool": "search",
  "arguments": {
    "query": "index=main level=ERROR | stats count by source | sort -count",
    "earliest_time": "-4h",
    "latest_time": "now"
  }
}
```

### Web Access Logs

Analyze web traffic:
```json
{
  "tool": "search",
  "arguments": {
    "query": "index=main sourcetype=access_combined | stats count by uri_path | sort -count",
    "earliest_time": "-1h",
    "max_count": 20
  }
}
```

## Advanced Configuration

### Environment Variables

You can use environment variables for configuration:

```bash
export SPLUNK_HOST=your-splunk-server.com
export SPLUNK_PORT=8089
export SPLUNK_USERNAME=admin
export SPLUNK_PASSWORD=your-password
export SPLUNK_SCHEME=https
```

### Custom Time Formats

Splunk supports various time formats:

- Relative: `-1h`, `-24h`, `-7d`
- Snap to time: `-1h@h`, `-1d@d`
- Absolute: `2024-01-01T00:00:00`, `01/01/2024:00:00:00`

### Output Formats

Choose the appropriate output format for your needs:

- `json`: Structured data, best for programmatic use
- `csv`: Tabular data, good for spreadsheets
- `xml`: Legacy format, use only if required

## Troubleshooting

### Connection Issues

1. **Cannot connect to Splunk server**
   - Verify host and port are correct
   - Check network connectivity
   - Ensure Splunk management port (8089) is accessible

2. **Authentication failed**
   - Verify username and password
   - Check account is not locked
   - Ensure account has search permissions

3. **SSL/TLS errors**
   - Try using `http` instead of `https` for testing
   - Check certificate validity
   - Verify SSL configuration

### Search Issues

1. **Search timeout**
   - Reduce time range
   - Add more specific filters
   - Increase search timeout in Splunk

2. **No results returned**
   - Verify index names and data availability
   - Check time range covers expected data
   - Test search in Splunk Web interface first

3. **Permission denied**
   - Verify user has access to specified indexes
   - Check role-based access controls
   - Ensure search quota is not exceeded

### Performance Optimization

1. **Slow searches**
   - Use specific time ranges
   - Add index filters early in search
   - Limit result counts appropriately

2. **Memory issues**
   - Reduce max_count parameter
   - Use summary indexes for large datasets
   - Consider search acceleration

## Security Best Practices

1. **Credential Management**
   - Never hardcode credentials
   - Use environment variables or secure vaults
   - Rotate credentials regularly

2. **Network Security**
   - Use HTTPS in production
   - Implement network segmentation
   - Monitor access logs

3. **Access Control**
   - Use least-privilege accounts
   - Implement role-based access
   - Audit search activities

4. **Input Validation**
   - Validate search queries
   - Sanitize user inputs
   - Implement rate limiting

## Monitoring and Logging

The server logs important events to stderr:

- Connection attempts
- Search executions
- Error conditions
- Performance metrics

Monitor these logs for operational insights and troubleshooting.

## Support

For issues and questions:

1. Check the troubleshooting section above
2. Review Splunk server logs
3. Test searches directly in Splunk Web
4. Verify MCP client configuration
5. Check network connectivity and permissions