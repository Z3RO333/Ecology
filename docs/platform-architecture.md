# EcoTracker Platform Architecture

## Goal

Split the product into three isolated security areas:

1. `/tablet`: operational recycling entry, optimized for PWA/kiosk use.
2. `/dashboard`: internal management and analytics.
3. `/fornecedor`: supplier document submission and status tracking.

UI route protection is not enough. Every Server Action, Route Handler, data-access
function, and file download must repeat authentication, role, and resource ownership
checks.

## Identity strategy

### Internal users

Keep Microsoft Entra ID for employees. The application role is not inferred from the
email domain. It is assigned from the application user registry.

The current bootstrap supports these environment variables until the transactional
database is connected:

```env
APP_ADMIN_EMAILS=admin@example.com
APP_MANAGER_EMAILS=manager@example.com
APP_OPERATIONAL_EMAILS=operator@example.com
```

Once at least one list is configured, unlisted internal users are denied.

### Tablet devices

Set `TABLET_ACCESS_KEY` to require a device PIN/key. A successful entry creates a
signed, HTTP-only, 30-day cookie scoped to `/tablet`. Leave this variable unset only
during the migration period; that preserves the existing public tablet behavior.

The production evolution should replace the shared key with one record per device:
`device_id`, hashed secret, name, active flag, last_seen_at, and revoked_at.

### Suppliers

Recommended login: Microsoft Entra External ID with email one-time passcode. The
identity provider proves control of the mailbox; the application must still check the
normalized email against `supplier_allowed_emails` on every session creation.

Do not store supplier passwords in this application. Do not grant access merely
because an external identity was successfully authenticated.

## Authorization matrix

| Capability | Admin | Manager | Operational | Supplier |
| --- | --- | --- | --- | --- |
| View analytics dashboard | Yes | Yes | No | No |
| View recycling history | Yes | Yes | No | No |
| Create recycling record | Yes | Yes | Yes | No |
| Manage internal users | Yes | No | No | No |
| Manage suppliers | Yes | Yes | No | No |
| Review supplier documents | Yes | Yes | No | No |
| Submit supplier documents | No | No | No | Yes |
| View own supplier submissions | No | No | No | Yes |

`lib/access-control.ts` is the code source of truth for this matrix.

## Data architecture

- Databricks remains the analytical store for recycling records and aggregates.
- Azure Database for PostgreSQL stores users, suppliers, permissions, submissions,
  statuses, protocols, and audit events.
- Azure Blob Storage stores PDFs in a private container. The database stores only
  metadata and the blob key.
- Azure Communication Services Email sends transactional status notifications.

Files must never be exposed by permanent public URLs. Downloads go through an
authorized Route Handler or use a short-lived, read-only user-delegation SAS.

## Supplier workflow

Allowed status transitions:

```text
draft -> submitted
submitted -> under_review | correction_requested | rejected | approved
under_review -> correction_requested | rejected | approved
correction_requested -> submitted
approved -> archived
rejected -> archived
```

Every transition writes an immutable `submission_events` row containing actor,
timestamp, previous status, new status, reason, and request IP.

Protocol format:

```text
ECO-YYYYMMDD-XXXXXXXX
```

The random suffix must come from a cryptographically secure generator and have a
unique database constraint. The protocol is generated only after the submission and
all file metadata are committed.

## Upload rules

- Accept PDF by default.
- Validate extension, browser MIME type, and file signature (`%PDF-`).
- Default limits: 15 MB per file, 5 files, 50 MB total per submission.
- Generate storage keys server-side; never use the original filename as a path.
- Store original filename only as display metadata after stripping control characters.
- Calculate SHA-256 for traceability and duplicate detection.
- Add malware scanning before documents become available to reviewers.
- Upload into a quarantine prefix, then move/promote after validation.

## Ownership rules

- Supplier queries always include the authenticated `supplier_id`.
- A submission ID received from the client is never sufficient authorization.
- Internal reviewers use `supplier-documents:review`.
- Operational tablet identities cannot query supplier tables or blob routes.
- File download authorization is checked against the parent submission before access.

## Audit requirements

Record:

- actor user/device ID and role;
- supplier ID when applicable;
- action and entity ID;
- UTC timestamp plus display timezone;
- source IP and user agent;
- previous and new status;
- upload SHA-256, byte size, MIME type, and blob key;
- notification request/result IDs.

Avoid storing access tokens, OTPs, document contents, or full signed storage URLs in
logs.

## Delivery phases

1. RBAC and route isolation: implemented foundation.
2. PostgreSQL schema and application user/supplier registry.
3. Entra External ID supplier login with email OTP and allowlist check.
4. Private Blob upload, validation, protocol generation, and supplier history.
5. Administrative review queue and status transitions.
6. Transactional email notifications and delivery webhooks.
7. Device registry, rate limiting, malware scanning, observability, and retention jobs.

