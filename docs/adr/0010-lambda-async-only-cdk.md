# 0010. AWS Lambda for asynchronous work only; IaC with AWS CDK

- Status: accepted
- Date: 2026-11-08
- Deciders: project owner

## Context and problem statement

The project should use AWS Lambda for experience, but cold starts and cloud latency must not slow down user requests, and the stack must run fully locally.

## Considered options

- Services on Lambda
- No cloud at all
- Async side jobs on Lambda, provisioned by CDK

## Decision

Lambdas only for asynchronous side work: `notify`, `thumbnails`, `revalidate`, `sitemap`. Events reach AWS through `cloud-bridge` → SQS; locally the bridge is off and Mailpit / MinIO replace SES / S3. Infrastructure in AWS CDK (TypeScript); CI deploys via OIDC.

## Consequences

- User requests never wait on a Lambda; local runs need no AWS.
- Real Lambda / SQS / SES / EventBridge / CDK experience.
- AWS free-plan clock — AWS work is scheduled late (TASK-15).
