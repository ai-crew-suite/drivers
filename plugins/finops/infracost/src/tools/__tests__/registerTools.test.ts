/*
 * Copyright 2026 The AI Crew Suite Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { describe, expect, it, vi } from 'vitest';
import { ComplianceDriver } from '@ai-crew-suite/plugin-kernel-node';
import { createComplianceTools } from '../registerTools';

const createMockDriver = (overrides: Partial<ComplianceDriver> = {}): ComplianceDriver => ({
  providerId: 'mock',
  evaluatePolicy: vi.fn().mockResolvedValue({ policyId: 'test', passed: true }),
  checkPermission: vi.fn().mockResolvedValue({ allowed: true }),
  validateArchitecture: vi.fn().mockResolvedValue({ valid: true }),
  estimateCost: vi.fn().mockResolvedValue({ estimated: false }),
  ...overrides,
});

const createMockLogger = () => ({
  debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(), child: vi.fn().mockReturnThis(),
});

const ctx = {
  logger: createMockLogger() as never,
  identity: 'test-user',
  runId: 'test-run',
  signal: new AbortController().signal,
};

describe('createComplianceTools', () => {
  it('registers the expected stable tool IDs', () => {
    const tools = createComplianceTools({ driver: createMockDriver(), logger: createMockLogger() as never });
    expect(tools.map(t => t.id)).toEqual([
      'compliance.policy.evaluate',
      'compliance.permission.check',
      'compliance.architecture.validate',
      'compliance.cost.estimate',
    ]);
  });

  it('marks all tools as read', () => {
    const tools = createComplianceTools({ driver: createMockDriver(), logger: createMockLogger() as never });
    for (const tool of tools) {
      expect(tool.effect).toBe('read');
    }
  });

  it('compliance.policy.evaluate delegates to driver', async () => {
    const driver = createMockDriver();
    const tools = createComplianceTools({ driver, logger: createMockLogger() as never });
    const tool = tools.find(t => t.id === 'compliance.policy.evaluate')!;
    await tool.invoke({ policyId: 'p1', input: { x: 1 } }, ctx);
    expect(driver.evaluatePolicy).toHaveBeenCalledWith({ policyId: 'p1', input: { x: 1 } });
  });
});
