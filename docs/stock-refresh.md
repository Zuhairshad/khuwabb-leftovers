# Keeping stock and prices fresh

The site's prices, variants and stock come from a snapshot taken at the last
deploy (`scripts/sync-shopify.mjs`, run on every build). If you change a
product or its stock in Shopify, the site won't show it until the next
deploy. This webhook makes Shopify trigger that deploy automatically, so
changes show up on their own within a few minutes — no need to redeploy by
hand.

## One-time setup

### 1. Create a Vercel Deploy Hook

In Vercel: **Project → Settings → Git → Deploy Hooks**. Create a hook, name
it (e.g. "Shopify stock refresh"), set the branch to `main`, and copy the
URL it gives you. Keep this tab open — you'll paste the URL in the next step.

### 2. Add Vercel environment variables

In Vercel: **Project → Settings → Environment Variables** (set these for
**Production**):

| Variable | Value |
|---|---|
| `SHOPIFY_WEBHOOK_SECRET` | the signing key from Shopify, step 3 below |
| `VERCEL_DEPLOY_HOOK_URL` | the URL from step 1 |

Optional, only needed if rapid edits in Shopify are triggering more builds
than you'd like:

| Variable | Value |
|---|---|
| `VERCEL_API_TOKEN` | a token from **Vercel → Account Settings → Tokens**, scoped to the team this project is in |
| `VERCEL_TEAM_ID` | the team's ID, if the project is under a team |

With the token set, the webhook checks whether a production build is already
queued before starting another one, which keeps a burst of Shopify edits
down to one or two builds instead of one per edit.

### 3. Create the Shopify webhooks

In Shopify admin: **Settings → Notifications**, scroll down to **Webhooks**,
and click **Create webhook**. Create one webhook per event below (repeat
"Create webhook" for each):

- Product creation
- Product update
- Product deletion
- Inventory level update

For each one, set:
- **Format**: JSON
- **URL**: `https://khuwabb-export-factory-leftovers.vercel.app/api/shopify-webhook`
  (once the real domain is connected, change it to `https://<real domain>/api/shopify-webhook`)
- **Webhook API version**: 2026-10 (matches `SHOPIFY_API_VERSION` in
  `lib/shopify-config.mjs` — if that file is ever bumped to a newer version,
  update these webhooks to match)

The signing key used to verify these webhooks is shown near the bottom of
the **Notifications** page, under "Webhooks" — copy it into
`SHOPIFY_WEBHOOK_SECRET` in Vercel (step 2).

### 4. Redeploy once

After adding the environment variables, trigger one normal deploy (e.g. push
a commit, or redeploy from the Vercel dashboard) so the new env vars take
effect. After that, the webhook is live.

## Testing it

**From Shopify:** on the Webhooks page, open a webhook you created and use
**Send test notification**. Shopify will show whether the delivery
succeeded; a successful delivery means the signature and endpoint are wired
up correctly (whether or not it actually starts a build depends on the
30-second grouping and queued-build check described below).

**From the command line:** `scripts/test-webhook.mjs` sends a signed sample
request to the endpoint directly:

```
SHOPIFY_WEBHOOK_SECRET=<the secret> node scripts/test-webhook.mjs https://khuwabb-export-factory-leftovers.vercel.app/api/shopify-webhook
```

Add `--bad-signature` to confirm the endpoint correctly rejects a request
that isn't really from Shopify (it should respond 401).

**Logs:** Vercel → your project → **Logs**, filter by path
`/api/shopify-webhook`, to see each webhook delivery and whether it
triggered a build, was skipped, or failed.

## What to expect

- Stock and prices refresh roughly 1–3 minutes after a change in Shopify
  (a 30-second wait to group edits, then a normal build).
- Rapid edits (e.g. updating stock on several variants at once) collapse
  into one or two builds, not one per edit.
- Checkout itself always uses Shopify's live stock, regardless of how stale
  the site's snapshot is — so a customer can never buy something that's
  actually out of stock, even in the few minutes before the next build picks
  up a change.
- Each triggered build uses Vercel build minutes, so very frequent Shopify
  changes mean more build minutes used.
