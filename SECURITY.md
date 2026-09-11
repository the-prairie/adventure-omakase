# Security

## Reporting

Do not open a public issue for a suspected vulnerability or exposed credential.
Use GitHub's private vulnerability reporting for this repository or contact a repository owner privately.

## Repository policy

- Never commit credentials, tokens, personal data, or production extracts.
- Keep server secrets unprefixed and inaccessible to client bundles.
- Treat logs and test fixtures as potentially publishable artifacts.
- Use synthetic data in tests and documentation.
- Validate untrusted input at process and network boundaries.
- Keep GitHub Actions pinned to immutable commit SHAs.

If a secret is exposed, revoke and rotate it before removing it from history.
