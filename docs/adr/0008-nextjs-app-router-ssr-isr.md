# 0008. Next.js App Router with SSR / ISR for SEO

- Status: accepted
- Date: 2026-11-08
- Deciders: project owner

## Context and problem statement

The shop must be findable by search engines when deployed; product and category pages need server-rendered HTML, metadata and structured data.

## Considered options

- SPA (React + Vite)
- Static export
- Next.js App Router with SSR / ISR

## Decision

`web` on Next.js App Router: server components for catalog pages, ISR with on-demand revalidation for product pages, `metadata`, canonical URLs, JSON-LD `Product`, sitemap.

## Consequences

- Pages are crawlable and fast; price changes reach pages via revalidation (TASK-18).
- Server rendering couples `web` to gateway availability — caching mitigates it.
