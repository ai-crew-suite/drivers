# Drivers Plugins Testing Strategy

## Local Integration Tests

If devs are writing local Vitest integration tests using `startTestBackend`, you shouldn't use a standalone WireMock container. Backstage natively supports **MSW (Mock Service Worker)** for this exact use case. It globally intercepts standard outbound `fetch` requests across all plugins.

You can inject global test hooks in your `packages/backend/src/setupTests.ts` (or equivalent test setup file):

```typescript
import { registerMswTestHooks } from '@backstage/backend-test-utils';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

// 1. Define the MSW server instance
export const server = setupServer(
  // Global fallbacks / catch-alls (optional)
  // These catch any requests you didn't explicitly mock via mswServer.use()
  http.get('https://github.com', () => {
    return new HttpResponse('Keep it simple.', { status: 200 });
  })
);

// 2. Register Backstage's lifecycle hooks
// This automatically runs server.listen() before tests and server.close() after tests.
registerMswTestHooks(server);

```

`vitest.config.ts`

```typescript
test: { setupFiles: ['src/setupTests.ts'] }
```

## Multi-Endpoint Test Pattern

Here is how you write a clean test suite using the modern backend system (`@backstage/backend-plugin-api`) and dynamic MSW interception:

```typescript
import { startTestBackend, mockServices } from '@backstage/backend-test-utils';
import { http, HttpResponse } from 'msw';
import request from 'supertest';

// 1. Import your modern backend plugin feature
import myModernPlugin from '../src/plugin'; 

// 2. Import the global MSW server instance from your setupTests file
import { server as mswServer } from '../setupTests'; 

describe('Modern Plugin Integration Test Suite', () => {
  
  // Clean up dynamic overrides after every single test block
  afterEach(() => {
    mswServer.resetHandlers();
  });

  it('should successfully fetch, transform, and map PagerDuty incident data', async () => {
    // 3. Define runtime-specific endpoints for this test case
    mswServer.use(
      http.get('https://mocked-pagerduty.internal', () => {
        return HttpResponse.json({
          incidents: [
            { id: 'PD-99', status: 'acknowledged', summary: 'Database latency spike' }
          ]
        }, { status: 200 });
      })
    );

    // 4. Stand up the modern backend container with custom mock configurations
    const { server } = await startTestBackend({
      features: [
        myModernPlugin,
        // Override the core root config service to pass your custom app-config.yaml settings
        mockServices.rootConfig.factory({
          data: {
            myModernPlugin: {
              // Points your plugin to the specific domain MSW is intercepting
              baseUrl: 'https://mocked-pagerduty.internal',
              apiToken: 'fake-secret-token-123',
            },
          },
        }),
      ],
    });

    // 5. Query your internal Backstage plugin endpoint via supertest
    const response = await request(server)
      .get('/api/my-modern-plugin/incidents')
      .expect(200);

    // 6. Assert that your backend processed the MSW data correctly
    expect(response.body).toEqual({
      success: true,
      items: [
        { incidentId: 'PD-99', state: 'acknowledged', text: 'Database latency spike' }
      ]
    });
  });

  it('should gracefully handle downstream 404 errors from PagerDuty', async () => {
    // Overriding the exact same endpoint to return a different status for error paths
    mswServer.use(
      http.get('https://mocked-pagerduty.internal', () => {
        return new HttpResponse(null, { status: 404 });
      })
    );

    const { server } = await startTestBackend({
      features: [
        myModernPlugin,
        mockServices.rootConfig.factory({
          data: {
            myModernPlugin: {
              baseUrl: 'https://mocked-pagerduty.internal',
              apiToken: 'fake-secret-token-123',
            },
          },
        }),
      ],
    });

    const response = await request(server)
      .get('/api/my-modern-plugin/incidents')
      .expect(404);

    expect(response.body.error.message).toContain('PagerDuty upstream resource not found');
  });
});

```

- **`mockServices.rootConfig.factory`:** This allows you to construct app configuration strictly scoped to this test execution. Your plugin reads this configuration natively using Backstage's `coreConfigService` dependency injection.
- **Hermetic Tests:** By modifying the target URLs dynamically (`https://mocked-pagerduty.internal`), you guarantee that tests running concurrently never accidentally bleed mock definitions or stomp on real internal domains.