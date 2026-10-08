# Roadmap and contribution ideas

This is a proposed direction, not a release-date commitment. Maintain a useful car-buying workflow across all seven interface languages and cover both new and used vehicles.

Near-term priorities are reliable marketplace imports, a smooth contributor setup, accessible comparison screens and clear distinctions between seller claims and AI suggestions. Please discuss new marketplace adapters before implementing them: permissions, provider cost, fixtures and maintenance all matter.

## Starter issue drafts

These are scoped candidates to turn into GitHub issues after checking they remain relevant. Difficulty and `good first issue` labels should be assigned after maintainer triage.

| Task | Starting point | Acceptance criteria |
| --- | --- | --- |
| Explain missing mileage in comparisons | `app/javascript/components/views/CompareView.tsx` | Unknown mileage is distinguishable from zero; cover en/de/fr/es/it/pl/uk and a component test. |
| Cover optional equipment missing from Otomoto data | `app/services/normalizers/otomoto.rb`, `spec/services/` | Synthetic fixture with missing equipment normalizes safely; focused regression test; no network calls. |
| Cover AutoScout24 missing price | `app/services/normalizers/autoscout24.rb`, `spec/services/` | Missing price stays unknown; a genuinely free/zero value is not invented; synthetic fixtures. |
| Improve keyboard focus in the add-car dialog | `app/javascript/components/collections/AddCarModal.tsx` | Reproduce any gap; keyboard-only open, submit, dismiss and return-focus work; test relevant behavior. |
| Clarify unsupported marketplace links | `app/services/listing_source.rb`, add-car UI | Unsupported URLs show an actionable localized explanation without starting a paid import. |
| Review Polish buying-guide terminology | `blog/content/guides/*.pl.md` | Native-language corrections preserve factual meaning and source links; guide build passes. |
| Review Ukrainian interface translations | `app/javascript/i18n/` | Document concrete corrections, preserve interpolation keys and verify affected screens. |
| Document extension local installation | `chrome-extension/` | Fresh user can load the unpacked extension, select local endpoint and save a synthetic/test listing; no production account needed. |
| Add an empty-state comparison explanation | `app/javascript/components/views/CompareView.tsx` | Explain how to add candidates before comparing; localized copy and narrow UI test. |
| Verify setup on a clean Linux environment | `README.md`, `bin/setup` | Record OS and prerequisites, fix reproducible setup errors, run mocked tests without paid-provider credentials. |

For broader work: make self-hosted domains configurable, improve import observability without storing sensitive responses, and expand marketplace coverage through independently tested adapters.
