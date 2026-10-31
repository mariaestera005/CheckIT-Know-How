# Company Product Knowledge Base

A team web app where you upload product documents (PDF, Word, spreadsheets, changelogs). The app reads them, pulls out products, versions and changes, and builds a searchable knowledge base you can browse and ask questions about.

## What users can do
- **Sign in** with email and password. Everyone on the team shares one company knowledge base. The first user becomes admin and can invite or remove teammates.
- **Upload documents**: drag and drop PDF, DOCX, XLSX/CSV or changelog files. Each file shows a status: uploaded, processing, ready, or failed.
- **Automatic extraction**: AI reads each file and records:
  - Products (name, description, category)
  - Versions and release dates
  - Change history entries (date, version, type such as added, changed, fixed or removed, and a summary)
  - A link back to the source document for every fact
- **Browse**: a products list, then a product page with an overview, a version timeline and the source documents.
- **Search**: meaning-based search across every document section ("When did we change the pricing model?").
- **Ask AI**: a chat that answers from the knowledge base and cites the documents it used.
- **Edit**: fix or delete extracted entries by hand.
- **Email watcher**: connect one company Gmail inbox. Every few minutes the AI reads new emails, plus their attached documents, and finds product changes such as new versions, fixes or spec updates. It then updates the knowledge base and links each change back to the email it came from. An "Email updates" page lists what it changed, so you can approve, edit or undo each change. You can turn on auto-apply for confident changes.

## Pages
- `/` public landing page with a sign-in button
- `/auth` sign in and sign up
- `/dashboard` stats, recent uploads, recent changes
- `/documents` upload and document list
- `/products` and `/products/$id` with the timeline
- `/search` search and Ask AI
- `/team` admin-only team management

## Design
A clean, editorial "archive" look: warm off-white paper background, deep ink-green accent, serif headings with a mono font for versions and dates. Not the default purple look.

## Technical details
- Lovable Cloud provides auth, the database, private file storage (a `documents` bucket) and server functions.
- Tables: `profiles`, `user_roles` (separate table, `has_role` function), `documents`, `document_chunks` (pgvector embeddings), `products`, `product_versions`, `change_entries` (each with `source_document_id`). Grants plus RLS let signed-in team members read; admins manage roles.
- Processing pipeline in a server function: extract the text (PDF/DOCX parsing that runs on the Worker, SheetJS for spreadsheets, plain text for changelogs), split it into chunks, embed with `google/gemini-embedding-2`, then extract structured data with `openai/gpt-6-astra` using a strict JSON schema, and finally merge it into products, versions and changes, removing duplicates by product name and version.
- Ask AI uses vector retrieval plus the chat model, with citations.
- Large or scanned PDFs: text-based files only at first; scanned-image OCR can be added later.
- Email: Gmail connector (the builder's shared inbox; Outlook works too if preferred). A scheduled job (pg_cron calls `/api/public/email-sync`, which checks for a secret) uses Gmail `history.list` from the stored `historyId`. It processes a small batch per run, holds a database lock, and records processed message IDs so no email is handled twice. It pauses on AI credit errors. Extracted changes go to an `email_change_proposals` table with a confidence score, and once applied they write `change_entries` with `source_email_id`. Page `/email-updates`.
