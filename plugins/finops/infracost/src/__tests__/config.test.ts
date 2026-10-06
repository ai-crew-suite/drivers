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
import { mockServices } from '@backstage/backend-test-utils';
import { describe, expect, it } from 'vitest';
import { readComplianceConfig } from '../config';

const configWith = (data: object) => mockServices.rootConfig({ data });

describe('readComplianceConfig', () => {
  it('reads a registered driver identifier', () => {
    const config = configWith({
      ai: { integrations: { compliance: { provider: 'opa' } } },
    });
    const result = readComplianceConfig(config);
    expect(result).toEqual({ provider: 'opa' });
  });

  it('throws when config is missing', () => {
    expect(() => readComplianceConfig(configWith({}))).toThrow(
      /ai\.integrations\.compliance configuration to be set/,
    );
  });

  it('throws when the provider is missing', () => {
    const config = configWith({ ai: { integrations: { compliance: {} } } });
    expect(() => readComplianceConfig(config)).toThrow(/provider to be set/);
  });
});
