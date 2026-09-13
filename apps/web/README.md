# HYDROLAND web application

Mobile-first bilingual role workspace for the six HYDROLAND audiences:

1. Diver/customer
2. Instructor
3. Dive centre
4. Boat owner/marine operator
5. Companies and government organizations
6. Main administration

## Run

```bash
npm run dev -w @hydroland/web
```

The UI uses `/api/v1` by default. Set `window.HYDROLAND_API_URL` before `app.js` when the API is hosted on another origin. A safe preview state remains available when the API is offline.

## Quality checks

```bash
npm run test -w @hydroland/web
npm run build -w @hydroland/web
```

The application includes RTL/LTR direction switching, keyboard focus states, responsive layouts, reduced-motion support, a PWA manifest and offline shell caching.
