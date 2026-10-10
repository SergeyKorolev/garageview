# Contributing to Garageview

Help build the best platform for comparing and choosing cars. Whether you are searching for your next car or improving the software, your experience can help other buyers.

Share ideas and car-buying workflows in [Discussions](https://github.com/SergeyKorolev/garageview/discussions), report reproducible problems in [Issues](https://github.com/SergeyKorolev/garageview/issues), or contribute code, design, translations and documentation. No coding experience is needed to share useful feedback.

For code contributions, start with the README setup and a focused improvement. For larger changes, explain the user problem and proposed approach in a discussion before implementation. Maintainers review contributions; production access is not required.

## Your first pull request

1. Fork the repository and create a branch from `main`.
2. Reproduce the issue using fictional data. Describe your intended fix on the issue so work is not duplicated.
3. Keep the change focused. Follow existing Ruby and TypeScript conventions.
4. Add meaningful tests when behavior changes. Run the checks relevant to your change and report exactly which passed or could not run.
5. Open a PR describing the problem, resulting behavior and validation. Include screenshots for interface changes, using synthetic data.

All user-facing changes must cover en, de, fr, es, it, pl and uk. Ask for translation review when needed; do not claim native-language review you have not received. Guide changes follow `blog/README.md`.

## Credentials and data

Use `.env.example` with your own optional service accounts. Never commit `.env`, Rails master keys, deployment secrets, production exports, real customer records, private share links or paid-provider responses containing personal information. Use synthetic fixtures. Run `bin/scan-secrets` before submitting. Suspected exposures belong in the private process in SECURITY.md.

PR CI runs without production credentials. Do not add `pull_request_target` workflows that execute untrusted contributor code, or grant workflows write permissions without a specific reviewed reason.

## Useful contributions

Accessibility, clear import failures, marketplace parser fixtures, translations, test coverage for meaningful edge cases, and documentation from a fresh-install experience are particularly useful. Choose an improvement that matters to you and explain how it helps car buyers. Contributions generated with AI receive the same review and testing requirements as any other work; check correctness and rights to included material.

## Working together

Be respectful and specific. Critique code and ideas, not people. Harassment, discriminatory language, sharing others' private information and spam are not welcome. Maintainers may moderate discussions or close contributions that do not follow these expectations. Report conduct concerns through the private contact described in SECURITY.md.

## Contribution license

By submitting a contribution for inclusion in Garageview, you agree to license it under the project's [MIT License](LICENSE). You retain copyright in your contribution; no copyright assignment is required. Only submit work you have the right to contribute, and identify any third-party material and its license.
