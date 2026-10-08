# Garageview

A car-buying workspace for collecting new and used car listings, comparing a shortlist, and preparing questions with AI assistance.

[Try Garageview](https://garageview.ai) · [Buying guides](https://garageview.ai/en/guides/) · [Contributing](CONTRIBUTING.md) · [Roadmap](ROADMAP.md)

## What it does

- Collect listings from mobile.de, AutoScout24 and Otomoto in one workspace.
- Compare available prices, mileage and equipment, keep notes, and share collections.
- Use optional AI analysis and research to explore your shortlist. Verify claims with sellers and independent inspections.
- Save mobile.de listings with the Chrome extension. AutoScout24 and Otomoto links can be added through the web app.
- Use the interface and buying guides in English, German, French, Spanish, Italian, Polish and Ukrainian.

Garageview is an independent project, not affiliated with these marketplaces. Listings and third-party services remain subject to their owners' terms.

## Local development

Requirements: Ruby **3.3.10**, Node **24.14.0**, PostgreSQL **16**, Redis **7**, and a C/C++ build toolchain for native Ruby gems. Ruby and Node versions are also recorded in `.ruby-version` and `.node-version`. Docker Compose can run PostgreSQL and Redis; the application runs on your host.

```sh
cp .env.example .env
docker compose up -d db redis
bin/setup
npm run build
npm run build:css
bin/dev
```

Open http://localhost:3000/en. Register locally at http://localhost:3000/users/sign_up, then sign in at `/users/sign_in`. Google sign-in is optional and requires your own OAuth credentials. Never use production credentials to contribute.

For a sample collection, register a local user first, then run:

```sh
DEMO_USER_EMAIL=you@example.com bin/rails runner db/demo.rb
```

The demo uses fictional listings and creates no accounts or passwords. It makes no scraper or AI calls. Core collection screens can be developed without paid services; imports, AI, live maps and email integrations may require network access or your own service credentials. The automated test suite mocks external HTTP requests.

Development email stays in memory unless Mailtrap sandbox credentials are configured. To create an optional local admin, set `SEED_ADMIN_EMAIL` and a unique `SEED_ADMIN_PASSWORD` in `.env`, then run `bin/rails db:seed`. There is no default admin account.

### Buying guides

Guides are built with Hugo **0.165.0**. Install that version from the official Hugo releases and run:

```sh
bundle exec ruby bin/build-guides
```

Linux CI uses `sh bin/install-hugo /path/to/bin`. See [the guide authoring workflow](blog/README.md). Generated guides are not committed; without this build, local guide routes have no generated content.

## Checks

Use a separate test database, never a production database:

```sh
RAILS_ENV=test DATABASE_URL=postgresql://garageview:password@localhost:5432/garageview_test bin/rails db:prepare
RAILS_ENV=test DATABASE_URL=postgresql://garageview:password@localhost:5432/garageview_test bundle exec rspec
npx vitest run
npx tsc --noEmit
bin/rubocop
bin/brakeman --no-pager
bin/scan-secrets
```

Build the guides before running request tests. `bin/scan-secrets` requires Gitleaks 8.30.1; it checks history and the current tracked files, with values redacted. CI installs the pinned scanner automatically.

## Architecture

Rails 8.1 serves a React 19 / TypeScript application and a session-authenticated JSON API. PostgreSQL stores collections; Sidekiq and Redis process background work. Hugo builds static multilingual guides.

| Area | Location |
| --- | --- |
| API and access control | `app/controllers/api/`, `app/models/` |
| Marketplace integrations and AI | `app/services/`, `app/jobs/` |
| React interface and translations | `app/javascript/` |
| Chrome extension | `chrome-extension/` |
| Articles and guide templates | `blog/` |
| Backend / frontend tests | `spec/`, `app/javascript/__tests__/` |

## Deployment and security

This repository does not automatically deploy contributors' changes to Garageview.ai. Self-hosting requires your own infrastructure, domain, service accounts and secrets; see [deployment notes](docs/self-hosting.md). Hosted production access is separate from project contribution.

Report vulnerabilities privately using [SECURITY.md](SECURITY.md). Please do not post credentials, personal collections or customer data in issues or PRs.

## License

The release license is pending the owner's selection. Until a LICENSE file is added, this preparation snapshot does not grant an open-source license. Third-party dependencies retain their own licenses.
