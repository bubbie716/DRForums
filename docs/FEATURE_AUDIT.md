# District Roleplay Feature Audit

Audit based on the live codebase: `prisma/schema.prisma`, `src/app/**`, `src/lib/**`, `src/components/**`, `.github/workflows/ci.yml`, and `package.json`. Classifications: ✅ Fully implemented · 🟡 Partially implemented · ❌ Missing.

---

## 1. Authentication & Accounts

### Implemented ✅
- Username/password registration (`/register`, `src/app/api/auth/register/route.ts`)
- Username/password login (`/login`, `src/app/api/auth/login/route.ts`)
- Logout (`/api/auth/logout`)
- Session cookies (`dr_session`, HTTP-only, 7-day expiry) backed by DB `Session` model (`src/lib/auth.ts`)
- Session invalidation via `sessionVersion` on password change
- Ban-aware auth: active bans invalidate sessions and block login (`src/lib/bans.ts`, login route)
- Self-service password change (`/settings`, `/api/settings/change-password`)
- Admin password reset for users (`user.resetPassword`, `src/lib/admin/user-actions.ts`)
- Registration can be disabled site-wide (`registrationEnabled` setting enforced on page + API)
- Current user endpoint (`/api/auth/me`)
- Access denied page (`/access-denied`)

### Partial 🟡
- Legacy `User.role` enum (`USER` / `MODERATOR` / `ADMIN`) still exists alongside AppRole system; `ADMIN` still grants bypass paths parallel to permissions (`src/lib/forumAccess.ts`, `src/lib/admin/auth.ts`)

### Missing ❌
- Email-based registration or login
- Email password recovery / self-service reset
- 2FA / MFA
- OAuth / social login
- Account deletion (self-service)
- Username change

---

## 2. Minecraft Integration

### Implemented ✅
- In-game verification flow: plugin posts to `/api/minecraft/verification-code` with UUID + username + code (`src/lib/minecraft-verification.ts`)
- One-time codes (`DRP-######`, 10-minute expiry) stored in `MinecraftVerificationCode`
- Settings page code entry + link flow (`LinkMinecraftForm`, `/api/settings/link-minecraft`)
- UUID + username stored on `User` (`minecraftUuid`, `minecraftUsername`, `minecraftLinkedAt`)
- Minecraft head avatars via Minotar (`src/lib/minecraft-head.ts`, `UserAvatar` fallback)
- Posting gate: unlinked users cannot post unless bypass role or `MINECRAFT_VERIFICATION_REQUIRED=false` (`src/lib/auth.ts`)
- Admin can unlink Minecraft (`user.unlinkMinecraft`)
- API key auth for plugin (`MINECRAFT_PLUGIN_API_KEY`)
- Rate limiting on verification API

### Partial 🟡
- Verification requires external Minecraft plugin; no Mojang API lookup in-app
- Tourist role can browse but not post; Citizen+ and staff bypass Minecraft requirement (`src/lib/system-roles.ts`)

### Missing ❌
- Automatic role grant on link (Citizen assignment may be manual/separate — not a full auto-onboarding pipeline in code reviewed)
- Skin/body rendering beyond head avatars

---

## 3. Forum System

### Implemented ✅
- Category → Forum → Thread → Post hierarchy (`prisma/schema.prisma`)
- Forum index with stats, latest post, scroll restore (`src/app/page.tsx`, `src/lib/forum/queries.ts`)
- Category/forum visibility (`isVisible`) and forum lock (`isLocked`)
- Thread creation with BBCode content + optional poll (`/forum/[slug]/new`, `src/lib/forum/actions.ts`)
- Thread replies with `replyToPostId` support
- Quote replies in threads (`QuoteReplyContext`, `src/lib/quoteParser.ts`, `QuoteReplyButton`)
- BBCode rendering for all post content (`RenderedContent`, `src/lib/bbcode.ts`)
- @mentions in posts with autocomplete (`MentionTextarea`, `mentions/actions.ts`)
- Thread view counts (`recordThreadView`, `ThreadViewRecorder`)
- Post permalinks (`CopyPermalinkButton`)
- Pinned threads (`isPinned`, `toggleThreadPin`)
- Locked threads (`isLocked`, `toggleThreadLock`, `ModThreadControls`)
- Post reactions: 👍 ❤️ 🔥 👎 💀 🥀 (`PostReaction`, `PostReactions`)
- Per-role forum permissions matrix (`ForumRolePermission`: view, read, create, reply, view-other-threads, moderate)
- Access presets: public, read-only, staff-only, applications, hidden (`src/lib/forum-access-presets.ts`)
- Own-thread-only forums (e.g. form submissions) — `canViewOtherThreads` logic in `forumAccess.ts`
- Founder/System Administrator full forum access bypass (`userHasAdminRole` → `FULL_FORUM_ACCESS`)
- Forum scroll position persistence when returning home (`src/lib/forum/scrollRestore.ts`)
- Breadcrumbs with scroll restore

### Partial 🟡
- Hidden categories/forums (`isVisible: false`) still excluded from public index even for admins unless search “include hidden” or admin tools (`getForumBySlug` returns 404 for hidden forums on public routes)
- `forum.thread.editOwn` / `forum.thread.deleteOwn` permissions exist in definitions + Citizen role but **no server actions or UI**
- `forum.thread.move`, `forum.post.editAny`, `forum.post.deleteAny` marked “Future” in permission definitions
- Thread slug exists in schema but routing is primarily by thread ID (`/thread/[id]`)
- Search uses Prisma `contains`, not full-text search

### Missing ❌
- Edit own thread / post
- Delete own thread / post
- Moderator delete/edit any post UI
- Move thread between forums
- Thread tagging / labels
- Thread subscriptions / watch
- Soft-delete / trash for posts
- Rich attachments on posts (images only via BBCode `[img]` URLs)
- Thread sorting/filtering on forum page beyond default order
- Report/flag content

---

## 4. Direct Messages

### Implemented ✅
- Private conversations (1:1 and group) (`Conversation`, `ConversationParticipant`, `Message`)
- Compose new conversation (`/messages/new`)
- Inbox (`/messages`) with unread state via `lastReadAt`
- Conversation thread view (`/messages/[conversationId]`)
- Reply with quote support (`replyToMessageId`, `QuoteReplyContext`)
- Message reactions (same reaction types as posts)
- @mentions in DMs stored in `Mention` table
- BBCode in messages
- User signatures on DMs when enabled (`UserSignature` in `MessageThread`)
- Soft-delete conversation from inbox (`deletedAt` on participant)
- Site-wide DM toggle (`dmsEnabled`)
- Ban blocks DM actions
- Permalinks for messages
- Unread badge in header (`MessagesUnreadBadge`)

### Partial 🟡
- `dm.deleteOwn` permission defined but individual message deletion not implemented
- DM mentions stored; no separate DM push/email notification channel
- Forum notifications live on `/messages?tab=notifications` (combined inbox UX)

### Missing ❌
- Edit sent messages
- Delete individual messages
- Block users
- DM search
- Read receipts beyond `lastReadAt` aggregate
- File attachments in DMs

---

## 5. Polls

### Implemented ✅
- Polls attached to threads (`Poll`, `PollOption`, `PollVote`)
- Create poll on new thread when `pollsEnabled` + `poll.create` permission
- Single or multiple choice (`allowMultiple`)
- Optional close date (`closesAt`) with auto-close logic (`src/lib/poll/status.ts`)
- Anonymous vs visible voting (`isAnonymous`)
- Vote/unvote/revote flows (`src/lib/poll/actions.ts`)
- Poll UI on thread (`PollCard`, `PollModControls`)
- Staff can close/reopen/delete polls (`poll.closeAny`)
- Poll creation logged in moderation log
- Site toggle (`pollsEnabled`, default **off**)

### Partial 🟡
- Polls default disabled in site settings
- No standalone polls outside threads
- No poll results export

### Missing ❌
- Edit poll after creation
- Poll templates
- Ranked-choice voting

---

## 6. Forms

### Implemented ✅
- Admin form builder (`FormBuilder.tsx`, `/admin/forms/new`, `/admin/forms/[id]/edit`)
- Field types: SHORT_TEXT, LONG_TEXT, NUMBER, DROPDOWN, CHECKBOX, RADIO, DATE
- Each form auto-linked to a dedicated forum subcategory
- Reviewer roles per form (`FormReviewerRole`)
- Forum permissions synced for submitter vs reviewer visibility (`syncFormForumPermissions`)
- Public submission at `/forms/[slug]` (`PublicFormRenderer`)
- Submission creates thread + `FormSubmission` record (`submitForm`)
- Staff review workflow: PENDING / ACCEPTED / DENIED / CLOSED
- Review posts message to submission thread + `FORM_SUBMISSION_REVIEWED` notification
- Admin submission list + detail review UI
- Permissions: `form.create`, `form.edit`, `form.delete`, `form.respond`, `form.viewResponses`, `form.manageResponses`
- Site toggle (`formsEnabled`, default **off**)
- Forms cannot be deleted if submissions exist (must close instead)

### Partial 🟡
- `/forms` index redirects to home — no public forms directory
- `isFormPubliclyVisible()` always returns true — no per-form role visibility yet (`src/lib/form/visibility.ts` is a stub)
- Closed forms / locked forums / hidden forums still block submission even for admins
- `requiresLogin` on form model exists; enforcement depends on auth checks in submit flow

### Missing ❌
- Public forms listing page
- Per-form audience/role restrictions (beyond reviewer roles)
- File upload fields
- Conditional/logic fields
- Applicant dashboard (“my submissions” page)

---

## 7. Roles & Permissions

### Implemented ✅
- Custom `AppRole` system with slug, color, priority, system flag
- System roles: Founder, System Administrator, Moderator, Citizen, Tourist (`src/lib/system-roles.ts`)
- Granular permissions (~40 keys) in `PERMISSION_DEFINITIONS`
- Role ↔ permission assignments (`RolePermission`)
- User ↔ role assignments (`UserRole`) with assigner tracking
- Display role (highest-priority role shown on posts/profiles)
- Permission checks via `hasPermission`, `hasAnyPermission`, `requireAdminPermission`
- Critical admin permission guards
- Forum-level role permissions separate from global permissions
- Founder + System Administrator get all permissions (seeded)
- Role assign/remove creates forum notifications + moderation logs
- Admin role CRUD + reorder (`/admin/roles`)
- Permission-grouped role editor UI

### Partial 🟡
- Some permissions are placeholders only (thread move, edit/delete any post)
- Legacy `User.role` ADMIN still bypasses some checks alongside AppRole
- `markdownEnabled` / `bbcodeEnabled` settings exist but are not permission-gated or enforced

### Missing ❌
- Per-user permission overrides (only role-based)
- Temporary/timed role grants
- Permission audit diff UI

---

## 8. Admin Panel

### Implemented ✅
- Dashboard with stats (`/admin`)
- User management: search, detail, role assign/remove, password reset, profile reset, Minecraft unlink, ban from detail
- Ban management: create, lift, detail, timed bans
- Role management: CRUD, permissions, reorder
- Forum management: categories + forums CRUD, visibility, lock, sort order, role access presets
- Form management: builder, submissions, review
- Site settings: name, tagline, feature toggles, profile rules
- Maintenance mode page
- Staff moderation log search (`/admin/logs`)
- Permission-gated sidebar navigation
- Unsaved-changes banner on admin forms

### Partial 🟡
- No inline post/thread moderation from admin (must use thread page pin/lock)
- Site settings UI omits `markdownEnabled` / `bbcodeEnabled` despite DB keys

### Missing ❌
- Site-wide announcement/banner management (beyond maintenance)
- Media/upload library admin
- Analytics dashboard
- Bulk user operations
- Email templates / notification settings admin

---

## 9. Bans & Moderation

### Implemented ✅
- Forum bans (`Ban` model) with reason, internal note, expiry, lift reason
- Permanent and timed bans (preset durations + custom)
- Ban on login blocked with formatted message
- Active ban invalidates all sessions immediately
- Ban banner for logged-in banned users (`BanBanner`)
- Admin ban create/lift with moderation logging
- Thread pin/lock moderation on thread page
- Poll mod controls (close/reopen/delete)
- Form submission review moderation
- Comprehensive moderation log (~40 action types) with searchable admin UI
- Forum notifications for: mentions, replies, reactions, role changes, form reviews

### Partial 🟡
- Bans labeled “forum ban” but effect is **site-wide** (all posting, DMs, login)
- No per-forum bans
- No shadowban / mute-only mode
- No IP ban

### Missing ❌
- Delete/hide posts or threads as moderator
- Warning/strike system (before ban)
- Moderation queue
- User report workflow
- Audit log export

---

## 10. Search

### Implemented ✅
- Global search page (`/search`)
- Search types: all, threads, posts, users
- Filters: forum, category, date range, sort (relevance/newest/oldest)
- Permission-aware results (hidden forums, own-thread-only filtering)
- Snippet highlighting (`search/snippets.ts`)
- Header search bar (`GlobalSearchBar`)
- User search by username, Minecraft name, UUID-like strings
- Admin-only “include hidden” toggle for search
- Rate limiting (30 req/min per user/IP)
- Custom avatars in search results (`UserAvatar`)

### Partial 🟡
- “Relevance” is basic substring match, not ranked full-text
- No search within DMs
- No search within form submission answers
- No saved searches

### Missing ❌
- PostgreSQL full-text / Elasticsearch-style indexing
- Search autocomplete beyond @mentions
- Advanced operators (author:, forum:, date:)

---

## 11. Profiles & Customization

### Implemented ✅
- Public profile page (`/profile/[username]`): avatar, banner, bio (BBCode), role badge, join date, Minecraft username, recent posts
- Custom avatar upload with crop modal (256×256 output)
- Custom banner upload with crop (960×240 output)
- Bio editing with BBCode editor + unsaved-changes banner
- Signature (BBCode) on posts and DMs, toggle on/off
- Global site settings gate each feature (avatars, banners, bios, signatures, max bio length)
- Local storage (`public/uploads/`) or Vercel Blob when `BLOB_READ_WRITE_TOKEN` set
- Admin profile reset (clear avatar/banner/bio/signature)
- `UserAvatar` with Minecraft head fallback site-wide

### Partial 🟡
- Profile stats limited to recent posts feed (no post count, reaction stats, etc.)
- No profile privacy controls
- No “last seen” / online status

### Missing ❌
- Profile cover video
- Follow/friend system
- Profile activity tab (threads started, reactions received)
- User-editable display name separate from username

---

## 12. Settings System

### Implemented ✅
- DB-backed `SiteSetting` key/value store (`src/lib/settings.ts`)
- Helpers: `getSetting`, `getSettingBoolean`, `getSettingNumber`, `getAllSettings`
- Admin site settings form for:
  - Site name, tagline
  - Registration, DMs, polls, forms toggles
  - Profile customization rules
- Separate maintenance settings page
- Maintenance middleware redirect (`src/middleware.ts`)
- User settings page: password, Minecraft link, profile, signature
- Unsaved-changes protection on settings forms

### Partial 🟡
- `markdownEnabled` and `bbcodeEnabled` keys seeded with defaults but **not exposed in admin UI and not enforced** — BBCode always active
- No settings versioning/history beyond moderation logs

### Missing ❌
- User notification preferences
- Theme/dark mode setting
- Locale/timezone preferences
- Email notification settings (no email system)

---

## 13. Mobile Support

### Implemented ✅
- Responsive Tailwind layout throughout (`sm:`, `md:`, `lg:` breakpoints)
- Mobile hamburger navigation (`HeaderNavigation.tsx`)
- Touch-friendly button heights (`min-h-11`)
- Safe-area inset on home scroll anchor
- Mobile-friendly crop modal, forms, admin tables (horizontal scroll where needed)
- Visual viewport-aware dropdown positioning

### Partial 🟡
- No dedicated mobile-only layouts; desktop-first forum tables
- BBCode editor toolbar is dense on small screens

### Missing ❌
- PWA (no manifest, service worker, install prompt)
- Native app wrappers
- Offline support
- Push notifications

---

## 14. Security & Rate Limiting

### Implemented ✅
- bcrypt password hashing
- HTTP-only session cookies
- CSP headers (`next.config.ts`)
- X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy
- BBCode HTML sanitization (strips scripts, unsafe URLs, event handlers)
- Ban enforcement on all major write paths
- Permission checks on server actions
- Forum access checks before content display
- Rate limiting on: login, register, password change, Minecraft verify API, search
- Plugin API key for Minecraft webhook
- Session version invalidation on password change
- Prisma schema readiness guard on startup

### Partial 🟡
- Rate limiting is **in-memory only** — not shared across instances (`src/lib/rate-limit.ts` notes Redis/KV TODO)
- No rate limiting on forum post/reply/DM server actions
- CSP allows `'unsafe-inline'` scripts in production
- Legacy ADMIN role bypass reduces permission-system purity

### Missing ❌
- CSRF tokens (relies on SameSite cookies + server actions)
- Account lockout after failed logins (only IP rate limit)
- Security headers like HSTS (not in `next.config.ts`)
- Automated security scanning in CI
- Content Security audit for admin-uploaded images

---

## 15. Storage / Uploads

### Implemented ✅
- Profile avatars: `public/uploads/avatars/` locally
- Profile banners: `public/uploads/banners/` locally
- Vercel Blob fallback when `BLOB_READ_WRITE_TOKEN` set (`@vercel/blob`)
- File type validation (PNG/JPG/WebP) + magic-byte detection
- Size limits: 2MB avatar, 5MB banner
- Old upload cleanup on replace/delete
- BBCode `[img]` allows `/uploads/` paths and HTTPS URLs
- Next.js Image remote patterns for Minotar + Vercel Blob

### Partial 🟡
- No post-attached file uploads (URL-only via BBCode)
- No virus scanning
- No CDN configuration beyond Vercel defaults

### Missing ❌
- Admin media library
- Upload moderation/approval queue
- Attachment storage for forms or DMs
- Image optimization pipeline for user uploads

---

## 16. Developer / Infrastructure

### Implemented ✅
- **Stack:** Next.js 15 App Router, React 19, TypeScript, Tailwind CSS 4, Prisma 6, PostgreSQL
- **Migrations:** Prisma migrations in `prisma/migrations/`
- **Seed:** `prisma/seed.ts` + `seed-permissions.ts`
- **Scripts:** dev, build (`prisma generate && next build`), lint, db:migrate, db:seed, db:studio
- **CI:** GitHub Actions on push/PR to `main` — `npm ci`, `prisma generate`, `lint`, `build` (`.github/workflows/ci.yml`)
- **Vercel integrations:** Blob storage optional; image remote patterns configured
- **Env vars:** `DATABASE_URL`, `BLOB_READ_WRITE_TOKEN`, `MINECRAFT_PLUGIN_API_KEY`, `MINECRAFT_VERIFICATION_REQUIRED`, etc. (`.env.example`)
- **Middleware:** Maintenance mode routing
- **Server actions + API routes** pattern throughout

### Partial 🟡
- No deploy workflow in repo (manual/Vercel Git integration assumed)
- No automated tests in CI or `package.json`
- `db:baseline` script for migration resolve (deployment helper)

### Missing ❌
- Unit/integration/e2e test suite
- Staging environment config in repo
- Redis/cache layer
- Background job system (email, digest notifications)
- Observability (Sentry, structured logging) in codebase
- API documentation / OpenAPI

---

## 17. Missing Features / Obvious Gaps

| Gap | Status |
|-----|--------|
| Edit/delete own posts or threads | ❌ Permissions exist, zero implementation |
| Moderator post removal | ❌ |
| Move thread between forums | ❌ Permission stub only |
| Email notifications | ❌ No email system at all |
| Email password recovery | ❌ |
| Markdown renderer (setting exists) | ❌ |
| `bbcodeEnabled` setting enforcement | 🟡 Always on |
| Public forms directory | ❌ `/forms` redirects home |
| Per-form visibility rules | 🟡 Stub always public |
| Full-text search | ❌ Substring only |
| Automated tests | ❌ |
| Production-grade rate limiting | 🟡 In-memory |
| PWA / push notifications | ❌ |
| Report/flag content | ❌ |
| Thread subscriptions | ❌ |
| User blocking | ❌ |
| Applicant “my submissions” view | ❌ |

---

## 18. Technical Debt / Risks

| Risk | Evidence | Severity |
|------|----------|----------|
| **Giant BBCodeEditor** (2,701 lines) | `src/components/forum/BBCodeEditor.tsx` | High — hard to maintain/test |
| **Permission stubs** | `forum.thread.move`, `forum.post.editAny`, etc. in definitions but unused | Medium — confusing for admins |
| **Dual role systems** | Legacy `User.role` + `AppRole` | Medium — bypass inconsistencies |
| **In-memory rate limits** | `src/lib/rate-limit.ts` | High in multi-instance deploy |
| **Unwired settings** | `markdownEnabled`, `bbcodeEnabled` in DB, not in UI/runtime | Low — dead config |
| **Ban naming vs behavior** | “Forum ban” = site-wide | Medium — operator confusion |
| **Hidden forum admin access** | Full-access roles bypass role matrix but not `isVisible` on public routes | Medium |
| **No tests** | No test deps, CI doesn't run tests | High for production confidence |
| **Search scalability** | `contains` on large tables | Medium at scale |
| **Form visibility stub** | `visibility.ts` returns true always | Low until needed |
| **Large files** | `bbcode.ts` (1,082), `FormBuilder.tsx` (954), `forum/actions.ts` (557) | Medium |

---

# Executive Summary

### 1. What stage is this forum at?

**Near-production Beta** (strong Beta, not yet production-hardened).

It is well past MVP: forums, RBAC, DMs, polls, forms, search, profiles, Minecraft verification, admin tooling, notifications, and BBCode are all real and wired. It lacks core content-editing workflows, automated tests, and production infrastructure patterns (distributed rate limiting, full-text search) expected for a confident public launch.

### 2. Biggest missing features

1. **Edit/delete posts and threads** (permissions defined, no implementation)
2. **Moderator content removal tools** (beyond pin/lock)
3. **Email / notification delivery** (in-app notifications exist; no email)
4. **Automated test coverage**
5. **Production rate limiting** (posts/DMs unrate-limited; in-memory limits elsewhere)

### 3. Biggest technical risks

1. **No tests** — regressions likely as features grow
2. **In-memory rate limiting** — ineffective on Vercel multi-instance
3. **BBCodeEditor monolith** — highest complexity hotspot
4. **Dual auth/role systems** (legacy ADMIN + AppRole) — permission edge cases
5. **Substring search** — will degrade with data volume

### 4. Recommended next 5 features to build

1. **Edit/delete own posts** — table-stakes forum feature; permissions already exist
2. **Moderator delete/hide post** — completes moderation loop
3. **Distributed rate limiting** (Vercel KV / Redis) on auth + write endpoints
4. **Automated test suite** — at minimum auth, permissions, forum access, form submit
5. **Thread move UI** — permission already stubbed; completes admin mod workflow

### 5. Overall rating: **7 / 10**

**Strengths:** Broad, cohesive feature set; strong RBAC + forum permission model; polished BBCode editor; forms/polls/DMs/profiles/admin are genuinely built, not vaporware.

**Weaknesses:** Missing edit/delete (critical for any live forum), no tests, production infra gaps, and several settings/permissions that exist on paper but aren’t wired.

---

*Generated from codebase audit, June 2025.*
