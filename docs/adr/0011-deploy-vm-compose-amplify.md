# 0011. Deployment: VM with Docker Compose, web on Amplify

- Status: accepted
- Date: 2026-11-08
- Deciders: project owner

## Context and problem statement

The deployed shop is a showcase; it must be cheap.

## Considered options

- ECS / EKS + RDS
- Everything on Vercel / Render
- One VM with Docker Compose + Amplify for web

## Decision

Services, Postgres and RabbitMQ on one small VM with Docker Compose (prod profile, TLS via Caddy); `web` on AWS Amplify Hosting (fallback: Vercel). Images in GHCR, deployed by tag.

## Consequences

- Low cost; the same Compose files as locally.
- No managed-database backups — acceptable for a study project, noted in the runbook.
