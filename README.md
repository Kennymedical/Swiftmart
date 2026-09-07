# SwiftMart — Setup (Feed Milestone)

## 1. Install
```bash
npm install
```

## 2. Supabase project
```bash
npx supabase init          # if not already a Supabase project
npx supabase link --project-ref <your-project-ref>
npx supabase db push       # applies supabase/migrations/0001_init.sql
```

## 3. Deploy Edge Functions & set their secrets
```bash
npx supabase functions deploy pay verify-payment send-otp wallet-fund wallet-transfer \
  resolve-account create-virtual-account

npx supabase secrets set \
  PAYSTACK_SECRET_KEY=sk_test_xxx \
  PAYSTACK_DVA_PREFERRED_BANK=wema-bank \
  TERMII_API_KEY=xxx \
  TERMII_SENDER_ID=SwiftMart \
  FRONTEND_URL=http://localhost:3000
```
In the Paystack dashboard, set the webhook URL to:
`https://<your-project-ref>.functions.supabase.co/verify-payment`

## 4. Env vars
```bash
cp .env.example .env.local
```
Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from your Supabase project settings.

## 5. Run
```bash
npm run dev   # http://localhost:3000
```

## What's built in this milestone
- **Feed homepage** (`app/(feed)/page.tsx`) — server-rendered, fetches posts with author/vendor/attached-product joined, plus this viewer's like/save/follow state in one batch of queries (not N+1 per post)
- **`PostCard`** — header (avatar, name, Follow button that hides on your own posts), body (text + optional image + optional attached product), footer (Like/Comment/Share/Save, all wired to real Supabase mutations with optimistic UI)
- **`StoryBar`** — create-story tile + one tile per vendor with an active (non-expired) story
- **`FollowButton`** — reusable, used by PostCard and reusable later on vendor/profile pages
- **`BottomNav`** — mobile tab bar with a live unread-notification badge
- **Wallet UI** (`/wallet`, `/wallet/fund`, `/wallet/send`, `/wallet/history`) — `WalletCard`, real Paystack top-up, P2P transfer to another SwiftMart user or a bank account (with live account-name resolution), paginated transaction history
- **Dedicated Virtual Account creation** (`create-virtual-account` function) — on first visit to `/wallet`, creates a real Paystack Customer + DVA for the user and stores the account number/bank on their wallet row. The webhook (`verify-payment`) was extended to recognize `charge.success` events coming from a direct bank transfer to that DVA (channel `dedicated_nuban`) and credit the matching wallet by `paystack_customer_code` — this is a genuinely different code path from the `/pay` and `/wallet-fund` flows, since a DVA transfer arrives with no `metadata.purpose` to branch on.

## Known gaps (next milestones)
- Post creation UI (`/post/create`) isn't built yet — posts currently need to be inserted directly for testing
- Comment section is inline/basic — no editing, deletion, or pagination yet
- `Share` increments a counter and copies a link; no actual share-sheet integration
- Bank-transfer payouts (`wallet-transfer`'s external-bank branch) debit the wallet optimistically on Paystack's synchronous "transfer initiated" response; reconciling an async `transfer.failed` webhook to reverse that debit isn't built yet
- DVA creation requires Paystack's Dedicated NUBAN feature to be enabled on the account and a verified phone on the user — if either isn't true, the wallet page shows why instead of silently failing
