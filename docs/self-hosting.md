# Self-hosting and deployment

The README covers local development. Running a public instance also requires operating PostgreSQL, Redis, background workers, HTTPS, backups, authentication and service accounts. There is no production support SLA.

## Infrastructure

Use your own server, container registry and domain. The public `config/deploy.yml` expects `DEPLOY_HOST`, `DEPLOY_DOMAIN`, `DEPLOY_IMAGE` and `DEPLOY_REGISTRY_USERNAME`; it deliberately has no default Garageview infrastructure. Copy `.kamal/secrets.sample` to the ignored `.kamal/secrets` and supply your own credentials. Never commit the filled file. Build the Docker image using the included Dockerfile; it also builds the guides.

Provision PostgreSQL and Redis privately. Configure `DATABASE_URL`, `REDIS_URL`, `SECRET_KEY_BASE`, and any service keys required by enabled features. Generate fresh credentials for your installation; do not request Garageview.ai's master key. If you choose to use Rails encrypted credentials, generate your own encrypted file and master key, and keep the key outside Git. Environment variables are used for the integrations currently implemented.

Set Google OAuth origins and callback URLs to your domain. Configure outbound email and the Mailtrap template identifiers used by the mail services. Check branding, mailer sender, CORS, extension host permissions and hard-coded public share URLs before using a different domain; these are not all configurable yet. Self-hosting is currently a developer workflow, not a fully automated product.

## Production ownership

Public contribution CI does not deploy and has read-only repository permissions. Keep Garageview.ai deployment secrets in the private operational repository or a protected deployment system. Require a reviewed revision and explicit release action. Do not copy old GitHub Actions secrets wholesale into the new public repository.

The Compose file is for local development only. Its published ports bind to loopback and its database password is intentionally disposable. Do not expose it as a production database.
