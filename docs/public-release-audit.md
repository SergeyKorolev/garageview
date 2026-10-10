# Public release preparation — 2026-10-08

## Scope and result

Prepared a new Git repository from the current application, with no parent commits, tags, old pull-request references or deployment secrets. The original repository remains private. The repository remains private. On 2026-10-10, the owner selected the MIT License, now included in LICENSE with matching README and contribution terms.

Gitleaks 8.30.1 with its default rules scanned the original fetched branches, tags and 44 pull-request heads (264 reachable commits). Initial findings were translation keys, a Ruby token-expiry expression and an unused generated Devise key in a comment. The comment was removed from the new snapshot. Two narrowly scoped rule exceptions cover only the exact non-secret translation values and Ruby expression; there are no blanket path exclusions or secret baselines.

An additional local exact-value check compared 17 available credential values against 1,696 historical blobs and found no matches. Values were not copied into the release or this report. GitHub issue/PR bodies (44) and issue comments (20) were scanned with no findings. The original repository had no release assets or Actions artifacts at audit time. Historical Actions logs and unreachable server-side objects were not audited; they remain in the private repository and are not migrated.

The source snapshot scan reported zero findings. Encrypted production credentials, internal planning/operational documents, infrastructure identifiers and the old packaged extension ZIP were excluded. Only source files, public assets and contributor documentation are included. Provider validity was not tested, and no credential was rotated because none was confirmed exposed by these checks. Automated scanning cannot prove the absence of every possible secret.

## Contributor preparation

- Replaced the placeholder README; added CONTRIBUTING, SECURITY, issue/PR templates and scoped roadmap tasks.
- Added fictional, idempotent demo listings that need no scraper or AI credentials.
- Removed the fixed development admin password; made admin creation explicitly opt-in.
- Fixed setup to use the npm lockfile; bound local Compose services to loopback.
- Made development email work without Mailtrap credentials.
- Added a verified, pinned Gitleaks CI job and a local scanning command.
- Removed production deployment from public CI and production defaults from the deployment template.
- Updated the new snapshot to Rails 8.1.4 after Brakeman flagged Rails 8.0 as unsupported. The live deployment was not changed.

## Validation

- Backend: 441 examples, zero failures, one existing pending example, using an isolated database and no Rails master key.
- Frontend: 144 tests passed; TypeScript, JS and CSS builds passed.
- Hugo: all 77 guide pages across seven languages built and validated.
- Brakeman 8.1.0: zero warnings on Rails 8.1.4. The initial remote scan required updating the scanner from 8.0.5; the requirement was retained.
- RuboCop: 207 files inspected, no offenses.
- Fresh development boot without private keys, no default admin, and repeatable demo loading passed.
- Secret scan: zero findings in the release snapshot.

## Before changing visibility

License selection is complete: MIT (2026-10-10). Confirm rights to artwork and third-party material described in NOTICE.md. Run the remote workflows on the exact initial commit and enable GitHub private vulnerability reporting, secret scanning, push protection and branch protection where the account supports them. On the new private repository, GitHub returned HTTP 403 for branch protection, HTTP 422 for built-in secret scanning, and HTTP 404 for private vulnerability reporting. Re-check these features after changing visibility. Gitleaks CI is active, Discussions are enabled, and the new repository has no Actions secrets.

Do not migrate production secrets, old branches, tags, PRs, Actions logs, customer data or private notes into the new repository. No public visibility change is included in this preparation.
