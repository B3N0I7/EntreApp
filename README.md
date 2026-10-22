# sv

Everything you need to build a Svelte project, powered by [`sv`](https://github.com/sveltejs/cli).

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```sh
# create a new project
npx sv create my-app
```

To recreate this project with the same configuration:

```sh
# recreate this project
npx sv@1.1.1 create --template minimal --types ts --add prettier eslint vitest="usages:unit,component" playwright="demo:yes" --install npm entre-app
```

## Adding features

Add features to your project with `sv add`:

```sh
npx sv add
```

For example, to add Tailwind CSS:

```sh
npx sv add tailwindcss
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```sh
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```sh
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.

## Persistence and accounts

The app uses Vercel Functions as a small serverless API and Google Apps Script to access the `Historique` sheet. No separate server or database is required. The Apps Script source is in `scripts/apps-script.gs`.

### Google Apps Script setup

1. Open the spreadsheet-bound Apps Script project and replace its code with `scripts/apps-script.gs`.
2. In **Project Settings → Script properties**, add:
   - `APP_SHARED_SECRET`: a random secret of at least 32 bytes.
   - `PIN_PEPPER`: a different random secret of at least 32 bytes.
   - `BOOTSTRAP_PROF_PIN`: Prof's initial 6–12 digit PIN.
3. Run `initializeAccounts()` once from the Apps Script editor and authorize access to the spreadsheet. This stores Prof's PIN hash and deletes `BOOTSTRAP_PROF_PIN`; students' PINs are then set by Prof in the app.
4. Deploy as a **Web app**, executing as the spreadsheet owner and allowing access to anyone. The endpoint accepts only requests signed by the Vercel secret; do not remove this check or expose the secrets in client code.
5. Copy the deployed `/exec` URL.

The sheet must be named `Historique`, with exactly these headers in row 1: `date`, `userId`, `module`, `score`, `erreurs`.

### Vercel configuration

Set these private environment variables in the Vercel project (and in a local `.env` copied from `.env.example`):

- `SESSION_SECRET`: random secret, at least 32 bytes.
- `APPS_SCRIPT_URL`: the deployed Apps Script `/exec` URL.
- `APPS_SCRIPT_SHARED_SECRET`: the same value as `APP_SHARED_SECRET` in Apps Script.

For example, generate a secret locally with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`. Use separate values for `SESSION_SECRET`, `APP_SHARED_SECRET`, and `PIN_PEPPER`. Never commit real values or put them in `PUBLIC_*` variables.

The fixed accounts are the 13 learners and `prof`; there is no registration page. Prof provisions or resets PINs in **Administration**. Guest sessions do not write history. Vercel Hobby currently includes Functions within monthly quotas at no charge and is limited to personal, non-commercial use; confirm that this usage is eligible under Vercel's current terms.

After configuring both deployments, test login as Prof, set a learner PIN, complete an exercise as that learner, verify the row in `Historique`, then confirm that guest mode creates no row.
