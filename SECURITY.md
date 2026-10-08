# Security policy

Only the current `main` branch is maintained; there are no supported long-term release branches yet.

## Report privately

Once GitHub private vulnerability reporting is enabled, use the repository Security tab → Report a vulnerability. Until that option is available, contact the maintainer through the contact link on https://garageview.ai/en/privacy. Do not open a public issue containing an exploit, credential, private collection link or personal data.

Include the affected revision, impact, reproduction steps with synthetic data, and suggested mitigations. Never include a working secret. No response-time or bounty commitment is currently offered.

## If a secret is committed

Revoke or rotate it with the provider first. Removing a line or rewriting history does not invalidate a credential. Review affected logs and accounts, then coordinate cleanup of branches, tags, pull-request references, artifacts and clones. Keep findings private until exposure is contained.

## Development and deployment

Keep `.env`, Rails master keys and `.kamal/secrets` local or in a secret manager. Never reuse the local Compose database password outside loopback development. CI tests use disposable credentials only. Deployment is intentionally separate from public contribution CI.

Gitleaks checks are preventive controls, not proof that every possible secret or personal detail has been detected. Review screenshots, fixtures, binary files and generated assets before publishing them.
