# FinOps Provider Notes

## Planned Agentic Workflow Plugins Consuming Compliance Sibling Plugins

The following proposed agentic workflow plugins consume this plugin:

- `scaffolder-ai-guardrail-agent`: FinOps / Cost Accounting Database and similar are queried by the agent to evaluate the projected monthly cloud burn rate based on selected compute and storage parameters.

## Common FinOps Platforms

In the Spotify Backstage ecosystem, FinOps (Cloud Cost Management) is one of the fastest-growing categories of integration. Because engineers natively use Backstage to see the services they own, bringing cost optimization directly into the IDP helps companies "shift cost left" into the daily development lifecycle.

The most common FinOps platforms and plugins used with Backstage fall into three major buckets:

### 1. Vendor & Community Aggregator Plugins

These plugins natively fetch and compile multi-cloud spending metrics directly within the Backstage Entity catalog pages.

- **[InfraWallet (by Electrolux Group)](https://roadie.io/backstage/plugins/infra-wallet/)** A highly popular open-source aggregator plugin. It pulls cost reports from **AWS, Azure, Google Cloud, Confluent Cloud, Datadog, Elastic, GitHub, and MongoDB Atlas**. It normalizes the data so engineers can track monthly trends broken down by specific team or service boundaries right inside the catalog.
- **[Harness Cloud Cost Management](https://roadie.io/backstage/plugins/harness-cloud-cost-management/)** Harness provides a formal Backstage plugin that links a Backstage service component to a "Harness Perspective". It displays overview cards directly inside the service tabs, highlighting granular environment spend alongside **idle resource auto-stopping recommendations** and anomaly detection.
- **[Infracost](https://roadie.io/backstage/plugins/vee-code-infracost/)** Rather than tracking historical bills, Infracost focuses on *predictive* costs. The community-maintained plugin allows engineers to see exactly how much a generated or modified Terraform/Infrastructure-as-Code manifest will increase the cloud bill *before* launching it.
- **[Kubecost](https://roadie.io/backstage/plugins/kubecost/)** For containerized workloads, the Kubecost plugin maps cost attribution metrics directly to Kubernetes deployments. It surfaces namespace, cluster, and aggregate container utilization data straight to service owners.

### 2. The Core Built-In Solution

- **Cost Insights (Originally by Spotify)** This is Backstage’s native open-source cost framework. It doesn't fetch cloud data out of the box; instead, it provides a standardized frontend UI layout and backend API client interface. Organizations write custom data connectors (clients) to connect this plugin directly to their cloud billing data lakes (like AWS Cur, GCP BigQuery, or Snowflake).

### 3. Emerging Multi-Cloud FinOps Data Warehouses

In larger enterprises (such as Databricks and major financial institutions), the trend is moving away from proprietary vendor plugins toward querying a centralized data plane aligned with the open-source **FOCUS (FinOps Open Cost & Usage Specification)** standard.

- **Databricks Lakebase / Unity Catalog:** Engineering and data teams use Backstage to marry the *software ownership graph* (who owns what service) with *cloud cost usage files* processed inside a unified data lake.
- **Vantage / CloudZero / Finout:** These standalone developer-friendly FinOps platforms don't always rely on fixed individual UI plugins. Instead, teams leverage their open APIs to pass cost data blocks dynamically into customized Backstage dashboards using simple iframe cards or standard plugin wrappers.

### Direct Comparison Overview

| FinOps Platform / Plugin | Focus Area            | Data Ingestion Method             | Best For                                           |
| ------------------------ | --------------------- | --------------------------------- | -------------------------------------------------- |
| **InfraWallet**          | Multi-SaaS & Cloud    | Aggregated API Polling            | Multi-vendor clarity out-of-the-box                |
| **Infracost**            | Predictive Guardrails | Pull Request / IaC Static Linting | Catching expensive errors before deployment        |
| **Harness CCM**          | Active Optimization   | SaaS Platform Synchronizer        | Automatic idling/stopping suggestions              |
| **Kubecost**             | K8s / Containers      | Cluster PromQL & Annotations      | Microservice resource breakdown                    |
| **Cost Insights**        | Core Custom Framework | Bespoke internal data endpoints   | Large engineering teams with a custom billing lake |
