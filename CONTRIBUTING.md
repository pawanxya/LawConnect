# Contributing to LawConnect

## Local workflow

1. Create a focused branch from `main`.
2. Keep frontend, backend, and documentation changes scoped to the feature.
3. Run the smallest relevant checks before opening a pull request.
4. Explain behavior changes and any required environment variables.

## Checks

```bash
cd frontend
npm run build
npm run lint

cd ../backend
node --check src/server.js
```

For booking, payment, authentication, or realtime changes, include manual verification steps in the pull request description.

## Code conventions

- Use the existing ESM style in Node.js code.
- Reuse existing API clients, middleware, models, and UI primitives.
- Keep secrets in local `.env` files only.
- Add documentation when changing a user-facing workflow or setup requirement.
