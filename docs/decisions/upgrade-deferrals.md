# Upgrade deferrals

Active version pins and the upstream conditions that need to change before they can be lifted.
Delete entries from this file the moment they're resolved.

## Node.js: major 24

- **Pin:** `renovate.json` allows `node` (`mise.toml` and `engines.node`) only below 25.
- **Why:** Vercel rejects any Node.js major it doesn't build (`BUILD_UTILS_NODE_VERSION_INVALID`);
  it lists 22.x and 24.x in its
  [supported versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions).
- **Revisit when:** Vercel lists Node.js 26.x. Then remove the rule, and Renovate reopens the major
  update.
