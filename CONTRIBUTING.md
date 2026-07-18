<div align="center">

# 🤝 Contributing to CityBrain AI

![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen) ![Contract](https://img.shields.io/badge/runtime%20contract-must%20stay%20compatible-blue)

</div>

Thanks for helping improve CityBrain AI. This guide covers the workflow expected for all contributions.

---

## Workflow

| Step | Action |
|---|---|
| 1 | Create a feature branch |
| 2 | Keep changes additive and compatible with the existing runtime contract |
| 3 | Add or update tests for any behavior change |
| 4 | Run backend tests and the frontend build before opening a PR |

---

## 1. Create a Feature Branch

Branch off from `main` rather than committing directly to it.

```bash
git checkout -b feature/your-change-name
```

## 2. Keep Changes Additive and Contract-Compatible

Changes should extend the existing runtime contract rather than break it. Avoid altering existing request/response shapes, agent interfaces, or shared `IncidentState` fields in ways that would break existing consumers.

## 3. Add or Update Tests

Any behavior change should come with corresponding test coverage — new tests for new behavior, updated tests for changed behavior.

## 4. Run Checks Before Opening a PR

Both of the following must pass locally before a PR is opened:

- **Backend tests**
- **Frontend build**

---

<div align="center">

*Every contribution should leave the runtime contract as stable — or more stable — than it found it.*

</div>
