# Development reference

Start with the [README setup](../README.md). Install Ruby 3.3.10, Node 24.14.0 and a C/C++ build toolchain for native gems. Docker Compose supplies PostgreSQL 16 and Redis 7; Rails and the frontend build tools run on your host.

Register at http://localhost:3000/users/sign_up and sign in at http://localhost:3000/users/sign_in. Google sign-in is optional and requires your own OAuth credentials. Use local credentials, never production secrets.

## Demo data and optional services

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

Linux CI uses `sh bin/install-hugo /path/to/bin`. See [the guide authoring workflow](../blog/README.md). Generated guides are not committed; without this build, local guide routes have no generated content.

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

