# 0021. The gateway declares each service endpoint it exposes and forwards it, passing the service's answers through

- Status: proposed
- Date: 2026-11-20
- Deciders: project owner

## Context and problem statement

TASK-4 (`specs/004-catalog-model/`) gives catalog-service an admin API of 24 endpoints
(brands, categories with attributes, products). The services are internal; api-gateway
is the only door from outside, and the one TASK-7 will guard with sign-in and roles. So
the admin API must be reachable through the gateway, documented there (ADR 0014), and
must answer exactly as the catalog does: a `400` that names every invalid spec, `404`,
`409`, the `412` / `428` of conditional requests, the `ETag` of every entity. Identity
and orders will expose their APIs the same way, so the rule outlives this task.

## Considered options

- A blind reverse proxy (`/api/v1/admin/catalog/*` → catalog-service)
- A typed client method and response DTO per endpoint, as `listCategories()` of TASK-2
- Every endpoint declared in a gateway controller with the shared DTOs, forwarded
  through one generic `forward()` of the service's client

## Decision

**Declared endpoints, one generic forward.** The gateway has a controller method per
service endpoint (`/api/v1/admin/catalog/...` = the catalog's `/admin/...`), with the
shared request DTOs of `shared/dto`, its summary, answers and auth requirement — so the
gateway's OpenAPI lists the whole public contract and the gateway validates input before
any call. Each method calls `CatalogClient.forward(method, { path, query, body,
ifMatch })`, which:

- sends the method, the path (ids checked as UUIDs, slugs encoded as one segment), the
  defined query values, the JSON body, `If-Match` for changes of an existing entity and
  the correlation id;
- answers a `2xx` with the service's status, body and `ETag`;
- answers a `4xx` as the service's answer: same status, `detail` and `errors[]`, written
  again by the gateway's problem filter, so `instance` is the path the client called;
- turns a `5xx` or an unusable body into `502`, no answer in time into `503`, as for
  every upstream call (TASK-2).

Admin responses are passed on as the service sends them; they are not checked against
the response DTOs. The public list keeps its check (TASK-2): there the gateway is the
boundary to anonymous clients and strips any field the shared contract does not declare.
The admin API is the service's own contract to its operators, covered by the service's
tests; checking it again in the gateway would mean class-validator decorators on every
response DTO for no new guarantee.

Why not a blind proxy: the gateway's OpenAPI would be empty, invalid input would cross
into the service, and TASK-7 would have to guard paths it knows nothing about. Why not
a typed method per endpoint: 24 copies of the same plumbing, and each one could pass the
service's `4xx` on differently.

## Consequences

- A new endpoint of a service is exposed by one controller method in the gateway with
  the shared DTOs; nothing else changes. The same holds for identity and orders.
- Input is validated twice (gateway and service) by the same DTOs: the gateway refuses
  early, the service stays safe when called directly.
- The gateway is coupled to the service's paths; a renamed path changes both. The
  gateway tests list every forwarded route against a stub, and one integration test
  follows a request from the gateway to the database.
- Revisit when an endpoint needs more than forwarding (aggregating two services, a
  different public shape): it then gets its own typed client method.
