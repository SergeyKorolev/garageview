# [Garageview.ai](https://garageview.ai)

**Let’s build the best platform for comparing and choosing cars—together.**

Collect new and used car listings from **mobile.de, AutoScout24 and Otomoto** in one place. Compare your shortlist and choose with more confidence.

[Try Garageview](https://garageview.ai) · [Watch demo](https://www.youtube.com/watch?v=-SxWbA7cpR4) · [Buying guides](https://garageview.ai/en/guides/) · [Share an idea](https://github.com/SergeyKorolev/garageview/discussions)

## What you can do

- Compare prices, mileage and equipment.
- Organize collections, keep notes and share cars with others.
- Use AI analysis to explore options and prepare seller questions.
- Save mobile.de listings with the Chrome extension, or paste links from all three marketplaces into the web app.

Available in English, German, French, Spanish, Italian, Polish and Ukrainian. Garageview is independent of the marketplaces it supports.

## Screenshots

**Your car collection**

![Garageview collection showing car photos, prices, mileage and seller details](public/screens/grid.png)

**Compare cars side by side**

![Garageview comparison table showing prices, specifications and equipment across shortlisted cars](public/screens/compare.png)

## Contribute

Bring your ideas, code, design skills, translations or car-buying experience. You don’t need to write code to help.

[Report a problem](https://github.com/SergeyKorolev/garageview/issues), join a discussion, or open a pull request. See [CONTRIBUTING.md](CONTRIBUTING.md) to get started.

## Run locally

Requires Ruby **3.3.10**, Node **24.14.0**, Docker Compose and native build tools.

```sh
cp .env.example .env
docker compose up -d db redis
bin/setup
npm run build
npm run build:css
bin/dev
```

Open [localhost:3000/en](http://localhost:3000/en) and [create a local account](http://localhost:3000/users/sign_up). Live imports and AI features require your own API credentials; demo data and core collection screens do not.

[Demo data, tests and architecture](docs/development.md) · [Editing guides](blog/README.md) · [Self-hosting](docs/self-hosting.md) · [Security](SECURITY.md)

## License

[MIT](LICENSE). Third-party material retains its own rights; see [NOTICE.md](NOTICE.md).
