import client from './client.js'

export const templatesApi = {
  // List pipeline templates from examples/ directory
  list: () => client.get('/templates').then(r => r.data),
}

export const serversApi = {
  // List available MCP servers from servers/ directory
  list: () => client.get('/servers').then(r => r.data),
  // List all tools from all servers
  tools: () => client.get('/tools').then(r => r.data),
}

export const configApi = {
  getMode: () => client.get('/config/mode').then(r => r.data),
}
