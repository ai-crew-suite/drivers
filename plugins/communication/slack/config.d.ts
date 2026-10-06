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

export interface Config {
  ai?: {
    integrations?: {
      communication?: {
        /**
         * Slack driver configuration. Activated when
         * `ai.integrations.communication.provider` is set to `slack`.
         */
        slack?: {
          /**
           * Slack bot user OAuth token.
           * @visibility secret
           */
          token: string;
          /**
           * Slack Web API base URL. Defaults to `https://slack.com/api`.
           */
          apiBaseUrl?: string;
          /**
           * Workspace domain used to build message deep links, such as
           * `my-org.slack.com`.
           */
          workspaceDomain?: string;
        };
      };
    };
  };
}
