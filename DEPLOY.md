# DEPLOY — TURNOVER (procedura ripetibile)

Obiettivo: ogni aggiornamento segue **sempre** gli stessi passi, senza edit manuali.

## Aggiornamento standard
```bash
git add .
git commit -m "descrizione"
git push

npm run deploy
```
`npm run deploy` esegue in ordine (definito in package.json):
1. `npm run stamp`  → genera `design/buildInfo.ts` (version/build/commit/branch/data da git)
2. `npm run verify` → **GATE**: 9 controlli statici. Se uno fallisce → **exit 1 → deploy bloccato**.
3. `expo export --clear` → build web in `dist/`
4. `wrangler pages deploy dist --project-name turnover` → Cloudflare Pages

> Se `verify` fallisce, il deploy NON parte: si corregge prima. Niente "funziona in locale ma non online".

## Gate pre-deploy (`npm run verify`)
Script: `scripts/verify.mjs`. Controlli:
1. TypeScript (0 errori reali)
2. Import/parse (0 import rotti)
3. Dipendenze circolari (0)
4. Route (ogni router.push/replace risolvibile)
5. Provider order + hook-dentro-provider (previene `useStore must be used within StoreProvider`)
6. Dead button (0 Pressable senza onPress)
7. onPress vuoti (0)
8. BlurView pointerEvents (previene i tap morti su web/PWA — regressione "pulsante elimina")
9. Navigazione (ogni schermata full-page ha un'uscita/back)

## Regressioni codificate (FASE 7)
Ogni bug storico è ora un controllo permanente in `verify.mjs`:
- **StoreProvider/hook fuori provider** → check 5
- **Pulsante elimina morto su web (BlurView)** → check 8
- **Schermata staff non cliccabile (overlay)** → check 8
- **Schermate senza back** → check 9
- **Route rotte / cold start** → check 4
- **Dipendenze circolari** → check 3

## Versione (FASE 6)
`design/buildInfo.ts` è **generato** da `npm run stamp` (mai a mano) e mostrato in **Account → Informazioni App** (versione, build, commit, data).

## Note ambiente
- `expo export` e `wrangler` richiedono Node + dipendenze installate (`npm ci`) e login wrangler (`wrangler login`) una tantum.
- `dist/` è l'output statico per Cloudflare Pages (SPA). Verificare che il progetto Pages usi `dist` come cartella di build.
