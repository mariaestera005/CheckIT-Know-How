<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- Server-only logic lives in `src/backend/*.server.ts`; `src/backend/kb.functions.ts` exposes it via `createServerFn` with dynamic imports — keeps AI keys and admin client out of the browser bundle.
- Pure business rules (dedupe keys, date/version normalization) live in `src/backend/kb-rules.ts` with tests in `src/tests/kb-rules.test.ts` — testable without network.
- AI calls go through `src/backend/ai.server.ts` only (Lovable AI Gateway; chat via Responses API, embeddings 3072-dim stored in pgvector with halfvec HNSW index) — one place to change models.
- Documents are parsed server-side (unpdf, fflate for DOCX, SheetJS) from private storage bucket `documents` — same pipeline for every source.
- The Outlook/Teams watcher is a prototype over mock messages in table `emails` (`channel` = outlook|teams); every finding is stored in `email_change_proposals` and immediately applied via `applyProposalRow` (one apply path for automatic and manual), and people can undo it — swap in real Microsoft connectors later without changing this flow.
- Search and Ask AI retrieve from document chunks, messages and past change entries through `src/backend/search.server.ts` (`match_document_chunks`, `match_messages`, `match_change_entries`); messages and changes are embedded lazily (admin client) the first time a search runs after they arrive — one retrieval path, no extra background job. Ask AI answers with a suggested solution and relevant history, citing every source.
- Content renewal is computed from `documents.renewed_at` by `renewalStatus` in `kb-rules.ts` (period is a constant there); no scheduled job — reminders are derived on read in the Documents page and flagged to Ask AI as OUTDATED sources.
- Roles live in `user_roles` checked with `has_role`; the first signup becomes admin via the `handle_new_user` trigger.
- Prototype has no required login: `_authenticated` auto-signs visitors into a shared demo account via `startDemoSession` (admin magic-link token, `src/backend/demo.functions.ts`); `/auth` stays available for real accounts; team-changing functions reject the demo account — keeps the real team safe from anonymous visitors.
- Email sign-up has confirmation switched off (auth setting `auto_confirm_email`) and there is no password-reset flow — prototype choice so new accounts work instantly without email links.
- The "Who to ask" hierarchy is static demo data in `src/frontend/lib/people.ts` (each person has a `managerId`); the page builds the tree from it — prototype choice, move to a table if people need to edit it.
- Code is split by role: `src/frontend/` (components, hooks, browser helpers, styles), `src/backend/` (server functions, `*.server.ts`, shared business rules), `src/tests/` (all tests + setup); `src/routes/`, `src/integrations/`, and the `start.ts`/`server.ts`/`router.tsx` entry files stay at the `src/` root because the framework and generated backend client require those paths — keeps the repo easy to navigate for collaborators.
