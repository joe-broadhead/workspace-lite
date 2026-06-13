# Test Seam Pattern

Tests in this directory use a **test seam at the proxy boundary** to verify tool behavior without network calls.

## Pattern

1. **`TestProxyClient`** — a fake proxy client that records all calls and returns pre-configured responses.
2. **`test-helpers.ts`** — factory functions (`okResponse`, `errResponse`, `listResponse`) for quick fixture creation.

## Usage

```typescript
import { TestProxyClient } from '../shared/src/test-proxy-client.js'
import { okResponse, errResponse } from '../shared/src/test-helpers.js'

const client = new TestProxyClient()
client.addResponse('fileGet', okResponse({ id: 'abc', name: 'test.txt' }))
const result = await client.callProxy('fileGet', { fileId: 'abc' })
// assert result.success, inspect callLog, verify params
```

## Benefits

- No network, no credentials, no Google API quotas consumed.
- Deterministic: every response is explicitly queued.
- Call log enables verifying which actions were called and with what parameters.
- Each test controls the exact sequence of responses for multi-call scenarios.
