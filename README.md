# CheckIT

A company knowledge base built from product documents, their change history, and Outlook/Teams messages. An AI reads new messages, updates the knowledge base automatically, and answers questions with cited sources.

Live prototype: https://checkit-knowhow.lovable.app

## Folder structure

```text
.
├── src/
│   ├── frontend/          # Everything the browser shows
│   │   ├── components/    #   shared UI pieces (kb-ui.tsx) + ui/ primitives
│   │   ├── hooks/         #   React hooks
│   │   ├── lib/           #   browser helpers (demo login, people list, utils)
│   │   └── styles.css     #   theme + galaxy design tokens
│   ├── backend/           # Server-only logic
│   │   ├── *.functions.ts #   server functions called by the pages
│   │   ├── *.server.ts    #   AI, search, document parsing, Outlook/Teams watcher
│   │   └── kb-rules.ts    #   pure business rules (renewal, dedupe, versions)
│   ├── tests/             # All automated tests + setup
│   ├── routes/            # Pages (frontend) — must stay here for file-based routing
│   ├── integrations/      # Generated database/auth client — do not edit
│   ├── router.tsx         # App entry files — must stay at src/ root
│   ├── start.ts
│   └── server.ts
├── supabase/              # Database migrations + backend config
├── public/                # Static files (favicon, robots.txt)
├── .env.example           # Template of required settings (copy to .env)
└── package.json, bun.lock, vite.config.ts, tsconfig.json, ...  # tooling
```

## Pages

| Page | File |
| --- | --- |
| Overview | `src/routes/_authenticated/dashboard.tsx` |
| Documents | `src/routes/_authenticated/documents.tsx` |
| Search & Ask AI | `src/routes/_authenticated/search.tsx` |
| Outlook & Teams | `src/routes/_authenticated/inbox.tsx` |
| Who to ask | `src/routes/_authenticated/people.tsx` |
| Team | `src/routes/_authenticated/team.tsx` |
| Sign in | `src/routes/auth.tsx` |

## Getting started

```sh
git clone <this-repository-url>
cd <repository-name>
cp .env.example .env   # fill in the values
bun install
bun run dev
```

Run tests:

```sh
bunx vitest run
```

## Built with

TanStack Start, React, TypeScript, Tailwind CSS, Lovable Cloud, Lovable AI.
