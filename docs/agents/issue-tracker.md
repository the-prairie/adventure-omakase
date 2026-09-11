# Issue Tracker: GitHub

Issues and product work items for this repository live in GitHub Issues for `the-prairie/adventure-omakase`.
Use the connected GitHub integration for issue operations when it is available.
Use the `gh` CLI as a fallback, and verify that it is authenticated as `the-prairie` before any write.

## Conventions

- Create, read, list, comment on, label, and close issues in `the-prairie/adventure-omakase`.
- Resolve a bare issue reference such as `#42` against this repository.
- Include comments and labels when fetching a ticket for implementation or review.
- Publish specs and tickets as GitHub issues when a skill says to publish to the issue tracker.

## Pull Requests As A Triage Surface

External pull requests are not an incoming request surface.
Review pull requests through the normal pull request workflow rather than the issue triage state machine.

## Wayfinding

A wayfinding map is one GitHub issue labelled `wayfinder:map` with child issues as its tickets.
Use GitHub sub-issues and native issue dependencies when available.
Fall back to task-list links and explicit `Blocked by: #<number>` lines only when those native features are unavailable.
