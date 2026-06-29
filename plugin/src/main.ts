import { StartPlugin, DefaultConfig, initializeContract } from './contract/plugin.js';
import { Contract, ContractConfig, ContractAsync } from './contract/contract.js';
import { StartRPCServer } from './contract/rpc.js';

// Initialize the contract references to avoid circular dependencies
initializeContract(Contract, ContractConfig, ContractAsync);

// start the plugin and capture the running instance for custom RPC use
const plugin = StartPlugin(DefaultConfig());

// start the plugin's own HTTP server exposing social-fi query endpoints
StartRPCServer(plugin);

process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));
