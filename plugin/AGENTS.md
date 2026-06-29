# Canopy Circle Plugin — Developer Guide

This plugin extends the Canopy TypeScript template with on-chain social-fi transactions.

## Quick Commands

```bash
make build-all   # Full build (proto → descriptors → TypeScript)
make run         # Start the plugin
make dev         # Start with hot reload
make clean       # Remove dist/ and node_modules/
```

## Adding a New Transaction Type

1. Add the message to `proto/tx.proto`
2. Add state types to `proto/social.proto` if needed
3. Run `make build-proto` to regenerate TypeScript bindings
4. Add `Check*` method to `Contract` class in `src/contract/contract.ts`
5. Add `Deliver*` static method to `ContractAsync` class
6. Add the type URL to `ContractConfig.supportedTransactions` and `transactionTypeUrls`
7. Add a case to `FromAny()` in `src/contract/plugin.ts`
8. Register a custom state prefix byte in `ContractConfig.customStatePrefixes` (must be > 15)

## State Key Convention

```typescript
// Always use JoinLenPrefix for composing keys — it encodes each segment
// as [length][bytes], preventing accidental prefix collisions
KeyForProfile(addr) = JoinLenPrefix([20], addr)          // single segment
KeyForPost(id)      = JoinLenPrefix([21], Buffer.from(id))
KeyForFollow(a, b)  = JoinLenPrefix([25], a, b)          // composite key
```

## Custom RPC

Add new endpoints in `src/contract/rpc.ts`. Use `plugin.queryState(0, {...})` for
detached, read-only state queries (not tied to any block lifecycle).

```typescript
const [resp, err] = await plugin.queryState(0, {
  keys: [{ queryId: randQueryId(), key: KeyForProfile(addr) }],
});
const [profile] = Unmarshal(resp?.results?.[0]?.entries?.[0]?.value, types.Profile);
```

## References

- [Canopy TypeScript Plugin Template](https://github.com/canopy-network/canopy/tree/main/plugin/typescript)
- [Canopy AGENTS.md](https://raw.githubusercontent.com/canopy-network/canopy/main/AGENTS.md)
- [Plugin Architecture](https://github.com/canopy-network/canopy/blob/main/plugin/typescript/TUTORIAL.md)
