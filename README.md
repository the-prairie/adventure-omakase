# Adventure Omakase

A travel experiment about leaving room for discovery without making a group move as one unit. The shared fieldbook lets friends propose an outing, join part of it, save discoveries and meet again later.

## Inspect the actual application

The default branch is a project entry point. The source is currently on the **unmerged** [Cloudflare friends integration branch](https://github.com/the-prairie/adventure-omakase/tree/codex/cloudflare-friends-integration), reviewed in [PR #1](https://github.com/the-prairie/adventure-omakase/pull/1).

Start with that branch's README, `docs/audits/CURRENT_STATUS.md`, and `apps/friends/docs/OPERATIONS.md`. They distinguish the traveler fieldbook from the preserved native-first foundation and identify setup and verification limits.

```sh
git clone --branch codex/cloudflare-friends-integration https://github.com/the-prairie/adventure-omakase.git
cd adventure-omakase
```

The branch documents its pinned Node/pnpm requirements, local D1/R2 setup and tests. It is a prototype under review; this entry point does not claim fresh deployment or browser acceptance. Use synthetic travel data when evaluating it, and do not run deployment commands merely to inspect the project.

Lauren Zary directs the travel concept, interaction design and iterative requirements with AI-assisted implementation. The repository retains its framework dependencies and implementation notes; it is not a claim of sole manual authorship. The interesting constraint is optional participation: a shared plan should support different energy levels and independent choices rather than treating every invitation as a commitment.
