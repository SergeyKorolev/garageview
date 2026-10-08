# Garageview guides (Hugo)

One Hugo project, ten initial articles and seven translations per article. Public URLs are `/{locale}/guides/{slug}/`. Rails continues to own the localized homepages and the application. No separate CMS, database or Hugo server is needed in production.

## Edit and publish from code

1. Edit Markdown in `blog/content/guides/`. Files with the same basename and language suffix are translations, for example `define-car-requirements.en.md` and `.pl.md`.
2. Keep the same `translationKey` across translations. Front matter uses JSON (supported natively by Hugo) for title, description, date, lastmod, weight, translationKey and draft. Add `image` (a path inside `blog/assets/`), translated `imageAlt` and `imageCaption`, and three translated `takeaways`. The body is Markdown. Update `lastmod` for substantive revisions; retain the original publication date.
3. Add all seven versions together: en, de, fr, es, it, pl, uk. Set `draft: true` across the whole family while writing. Production builds exclude drafts and future-dated content. The build rejects incomplete translated sets.
4. Build with Hugo 0.165.0 and `bundle exec ruby bin/build-guides`. Set `HUGO_BIN=/path/to/hugo` if needed. The build validates metadata and links, then copies only guide routes and assets into Rails `public/`. Never copy Hugo's whole output into `public/`: that would overwrite Rails homepage routes.
5. Run `bundle exec rspec spec/requests/guides_spec.rb spec/requests/landing_pages_spec.rb`, `npx tsc --noEmit` and `npm run build`. Review the rendered pages before publishing.
6. Commit the source changes and deploy with the existing Kamal workflow. Docker builds the guides automatically. A content change therefore follows the same review and release process as code.

The Linux installer is `sh bin/install-hugo /path/to/bin`; it downloads the pinned official release and checks SHA-256. On macOS, use Hugo's official release package. The runtime image contains generated HTML, not the Hugo executable. Build output is ignored by Git.

## Content and layout

- Templates: `blog/layouts/`; styling: `blog/assets/guides.css` and `blog/assets/reading.css`.
- Original illustrations: `blog/assets/illustrations/`. Each topic has one SVG reused by its seven translations, with localized alt text and captions. Keep illustrations free of language-specific text. They depict concepts, not actual vehicles, inspection findings or marketplace inventory.
- Article pages include reading times, key takeaways and a native collapsible table of contents. Use descriptive H2/H3 headings. Keep comparison tables compact; use a vertical list for a wide blank worksheet so it remains usable on phones.
- Shared translated UI labels: `blog/i18n/`.
- Language index metadata: `blog/content/guides/_index.{locale}.md`.
- `weight` controls the initial reading order. Use descriptive titles and unique summaries.
- Use ordinary Markdown links and headings. Raw HTML in Markdown is disabled. The template supplies the sole H1.
- Articles identify Garageview as publisher and disclose AI assistance. They contain suggested workflows, not independent vehicle tests. Do not invent expert review, marketplace partnerships, search volumes or vehicle condition claims.
- Expansion is about practical substance: worked examples, evidence checks, seller questions and reusable worksheets. Label fictional examples clearly, check arithmetic, preserve unknowns, and distinguish quoted claims from verified observations. Avoid padding and unsupported rankings. Translate the complete article rather than publishing shorter summaries in some languages.
- Maintain both new and used car coverage. Check current product support before describing a capability. Web imports support mobile.de, AutoScout24 and Otomoto; direct Chrome-extension save controls currently support mobile.de.
- Guides contain no tracking scripts or external fonts. Their links into the app use its existing authentication flow.

## Search and routing

Generated pages have self-canonicals and reciprocal hreflang links, including English x-default. `public/guides-sitemap.xml` is regenerated from actual built pages and advertised in robots.txt alongside the existing homepage sitemap. Nothing from private user collections is published.

Rails static-file middleware serves the built HTML before application routing. Missing guide URLs return 404 instead of opening the SPA. Check this in the production smoke test as well as Rails request tests. Assets are fingerprinted and scoped to `/guides-assets/`.

## Initial article families

1. Where to find new and used cars in Europe
2. Choosing between mobile.de, AutoScout24 and Otomoto
3. Defining car requirements
4. New versus used offers
5. Comparing equipment
6. Organizing a shortlist
7. Questions for sellers
8. Reading listings and spotting unknowns
9. Choosing together
10. Using AI during a car search
