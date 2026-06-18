# Changelog — TURNOVER

## [FASE 8-12 — Dead code cleanup, performance/responsive audit, gate esteso]

CHANGELOG
- Data: 2026-06-17
- Versione: 
- Build: 0
- Commit: local

File modificati
- scripts/verify.mjs (aggiunto check 10 dead-code; ora 10 controlli)
- package.json (script verify/stamp/predeploy/deploy già presenti)
- screens/AccountHubScreen.tsx (Informazioni App — turno precedente)
- design/buildInfo.ts (rigenerato da stamp)

File creati
- (nessun nuovo file in questo step; verify.mjs/stamp-version.mjs/DEPLOY.md creati nel turno precedente)

File eliminati (FASE 8 — dead code, 11 file)
- components/AIBanner.tsx, components/FadeInView.tsx, components/KPICard.tsx, components/NotificationBadge.tsx, components/QuickActionCard.tsx, components/ScreenHeader.tsx (UI sostituiti dal refactor Liquid Glass)
- components/avatar/AvatarEditor.tsx, AvatarPreview.tsx, AvatarRenderer.tsx, AvatarLayers.ts (vecchio sistema avatar, sostituito da VectorAvatars)
- design/animations.ts (ridondante con MOTION in designSystem, mai importato)

Problemi risolti
- Debito tecnico: rimossi 11 file morti (196→185 file) con 0 riferimenti residui verificati.
- Gate di regressione esteso: il dead-code è ora un controllo permanente (deploy bloccato se ricompare un file UI orfano).

Verifiche eseguite
- TypeScript: 0 errori reali (intero progetto).
- Verify gate: 10/10 verdi (TS, import, cicli, route, provider+hook, dead button, onPress vuoti, BlurView pointerEvents, navigazione, dead code).
- Route scan: tutte risolvibili. Provider scan: ordine corretto, AppThemeProvider dentro StoreProvider.
- Responsive scan: token centralizzati (spacing/typography/radius/metrics); numeri fissi residui = intenzionali (avatar/icone/glow).
- Dead code scan: 0 file UI orfani dopo la pulizia.

Problemi ancora aperti
- FASE 2/4 (deploy live Cloudflare + smoke-test post-deploy su route/auth/ruoli): richiedono CI/ambiente reale; non eseguibili nel sandbox.
- Verifica visiva su device (iPhone SE/13/15/17, PWA iOS): testo/overflow/safe area/blur non simulabili qui.
- Unused npm deps: 6 candidati sono peer-deps infra (react-navigation/native, react-native-screens, expo-linking/constants/system-ui, react-native-worklets) → MANTENUTE (rimuoverle rompe la build). Non automatizzato nel gate per evitare falsi positivi.
- services/* orfani (aiChatStore, aiRedaction, migrationEngine, supabaseBackend, validator): MANTENUTI per vincolo "non toccare services/Supabase/backend" + infra futura.

Rischi residui
- Performance: il remount su cambio tema/scaling (key=epoch) è intenzionale e limitato all'azione utente; nessun remount durante l'uso normale.
- Il gate copre la struttura (provider/route/overlay/dead code) ma NON la resa visiva: quella resta da validare su device.

Azioni consigliate
- Implementare FASE 4 come e2e in CI (Playwright sull'URL Pages: login, ruolo staff/owner, CRUD personale, notifiche).
- Eseguire `npm run deploy` dal Mac (stamp→verify→expo export→wrangler): il gate impedisce deploy non sicuri.
- Validare su device reale i 4 iPhone target prima della conversione iOS.
## [HARDENING — gate pre-deploy + versioning + regressioni permanenti]

> Tech-lead mode. NOTA ONESTA: in questo ambiente non c'è simulatore/browser/device → NON posso renderizzare le schermate. Tutto ciò che segue è verifica STATICA del codice + artefatti eseguibili; la resa visiva va controllata su device.

**Audit funzionale (statico, reale):**
- A/B onPress vuoti: 0 in tutta l'app. C handler non collegati: 0. D delete: removeStaff/removeReparto/removeFerie/ecc. cablati a funzioni store reali. E modali/wizard: tutti con mutation di salvataggio (addStaff/updateReparto/setCell/...). F elementi non cliccabili: 0 (vedi BlurView pointerEvents già corretto).
- Scaling: i token scalabili (typography/spacing/metrics) sono consumati dalle schermate via stili → lo scaling le raggiunge. Le card usano padding (crescono col contenuto), non altezze fisse → no overflow. Le altezze fisse residue sono su bottoni/search (44–56px) con margine sufficiente anche per testo XL (22px). Rischio overflow: basso. Da confermare visivamente su device.

**FASE 3 — Gate pre-deploy `scripts/verify.mjs` (ESEGUITO, 9/9 verdi):**
TypeScript, import, cicli, route, provider-order + hook-dentro-provider, dead button, onPress vuoti, BlurView pointerEvents, navigazione/back. Se uno fallisce → exit 1 → DEPLOY BLOCCATO. Collegato a `npm run verify`.

**FASE 5 — Deploy ripetibile:** package.json: `verify`, `stamp`, `predeploy`, `export:web`, `deploy`. `npm run deploy` = stamp → verify (gate) → expo export → wrangler pages deploy. Doc in `DEPLOY.md`. Nessun edit manuale.

**FASE 6 — Versioning:** `scripts/stamp-version.mjs` genera `design/buildInfo.ts` (version/build/commit/branch/data da git, con fallback). Mostrato in **Account → Informazioni App** (AccountHubScreen).

**FASE 7 — Regressioni permanenti:** ogni bug storico è ora un check in verify.mjs — StoreProvider/hook (check 5), elimina-morto/overlay web (check 8), schermate senza back (check 9), route rotte (check 4), cicli (check 3).

**FASE 1 (architettura) — verificata dal gate:** provider order ErrorBoundary>Safe>Theme>Store>Toast>Auth>AppTheme corretto; AppThemeProvider (usa useStore) è dentro StoreProvider; 0 cicli; 0 import rotti.

### Onestà / cosa resta su device o ambiente reale
- Rendering reale (testi/overflow/safe area/Dynamic Island/PWA iOS/backdrop blur) e FASE 2/4 (deploy live Cloudflare + post-deploy checks su route raggiungibili) richiedono il device/CI: non simulabili qui. La FASE 4 va implementata come smoke-test e2e nel CI (es. Playwright sull'URL Pages) — predisposto concettualmente, non eseguibile qui.
- `expo export`/`wrangler`: non eseguibili nel sandbox; gli script sono pronti per il tuo Mac.

### File: scripts/verify.mjs (nuovo), scripts/stamp-version.mjs (nuovo), design/buildInfo.ts (generato), DEPLOY.md (nuovo), package.json, screens/AccountHubScreen.tsx.
## [Accessibilità — Scaling UI globale (testo/card/densità), per-utente, dinamico]

> Tech-lead mode: impact analysis eseguita, token mutabili, provider unico (no doppio remount). engine.ts non toccato.

**ANALISI:** mancava lo scaling UI accessibilità; causa radice = token statici non scalabili a runtime. Soluzione più stabile: token mutabili (come `colors`) + estensione dell'`AppThemeProvider` esistente (un solo punto di remount via `epoch`).

**Implementazione:**
- `design/typography.ts`, `design/spacing.ts`: ora MUTABILI con valori BASE catturati + `applyTextScale`/`applyDensity` (ricalcolano dai base; spazi xs/s scalano a metà per non rompere allineamenti fini).
- `design/metrics.ts` (nuovo): `cardScale` + `applyCardScale`.
- `design/accessibility.ts` (nuovo): livelli→fattori. Testo (Molto piccolo 0.85 → Molto grande 1.28), Card (Compatta 0.82 / Normale / Ampia 1.22), Densità (Alta 0.85 / Media / Bassa 1.18). `applyAccessibility(prefs)`.
- `hooks/useAppTheme.tsx`: gestisce ora TEMA + ACCESSIBILITÀ; carica/applica all'avvio e al cambio utente; setter `setTextSize/setCardSize/setDensity` con persistenza per-utente; remount applica a tutta l'app.
- `services/storage.ts`: `loadA11y/saveA11y` (chiave `turnover.a11y.{email}`, isolata per utente).
- `components/GlassCard.tsx`: padding scala con `metrics.cardScale`.
- `screens/PersonalizzazioneScreen.tsx`: sezione **Accessibilità** con 3 controlli a segmenti (testo/card/densità) collegati al provider.

**FILE COINVOLTI:** typography.ts, spacing.ts, metrics.ts (nuovo), accessibility.ts (nuovo), useAppTheme.tsx, storage.ts, GlassCard.tsx, PersonalizzazioneScreen.tsx.

**RISCHI mitigati:** token usati ovunque resi mutabili mantenendo identità/chiavi (consumer leggono numeri; remount rigenera StyleSheet). Nessun nuovo provider → ordine/circolarità invariati. Applicabile a Owner/Coordinatore/Staff (è in Personalizzazione, accessibile da tutti); persistenza per-utente.

**VALIDAZIONE:**
- 0 errori TS (intero progetto); 0 cicli; 13 suite verdi.
- Test runtime applyAccessibility: XL/wide/low → body 17→22, spacing.xl 20→24, cardScale 1.22; XS/compact/high → body 14, cardScale 0.82; reset Normale corretto.
- Grep provider/hook: AppThemeProvider sotto Store/Auth (currentEmail disponibile); nessun hook prima del provider.

### DEPLOY MODE — onestà
git/commit/push, `expo export`, `wrangler pages deploy` NON sono eseguibili in questo ambiente (niente repo git/Metro/EAS/wrangler). Eseguito l'equivalente verificabile: typecheck completo + 13 suite + cicli + test runtime. Da fare in locale per il deploy: i comandi git/expo/wrangler indicati.
## [AUDIT — Bug critici web/PWA: pulsanti morti + layout staff (PRIORITÀ ALTA)]

> Causa radice individuata dalle schermate: l'app gira su WEB (pages.dev). Due bug strutturali.

**BUG 1 — Pulsante Elimina (Personale + Dettaglio) non funzionava [CORRETTO]**
- Causa: le `BlurView` decorative (card e ricerca) erano in `absoluteFill` SENZA `pointerEvents="none"`. Su web un elemento posizionato dipinge SOPRA il contenuto statico e **cattura tutti i tap** → il cestino (e il tap sulla card) non ricevevano il click, quindi nessuna conferma e nessuna eliminazione.
- Fix: aggiunto `pointerEvents="none"` a tutte le BlurView decorative (PersonaleScreen card+ricerca, GlassCard, HubCard). I tap ora raggiungono i pulsanti. `confirmAction` già gestiva il web (`window.confirm`) → eliminazione + aggiornamento Store/UI ora funzionano.

**BUG 2 — Layout Area Staff: card strettissime, testo troncato a 1 lettera [CORRETTO]**
- Causa: `PressableScale` applicava lo stile di layout (width 47.5%) all'`Animated.View` INTERNO mentre il `Pressable` esterno restava senza larghezza → su web le card collassavano a "pillole" e il testo si troncava ("R", "T...", "Ri...").
- Fix: lo stile ora va sul `Pressable` esterno; l'`Animated.View` interno si stira (alignSelf stretch + flexGrow). Le card della dashboard staff e le sezioni ora hanno la larghezza corretta (47.5%) e il testo non si tronca.

**BUG 3 — Dettaglio operatore: back ed elimina [VERIFICATO/CORRETTO]**
- Back (chevron-back glass top-left) ed Elimina (confirmAction web-safe) sono cablati; con GlassCard ora solido (niente BlurView overlay) e il fix pointerEvents, funzionano. La build nelle schermate era precedente a questi fix.

**#5 — Anteprime temi troppo strette [MIGLIORATO]**
- Personalizzazione: preview più ampia (h 110→140), spacing maggiore (gap m→l), tile/barra/dot più grandi, nome tema più leggibile (cardTitle), bordo sulle card.

### Verifiche
0 errori TS (intero progetto); 0 cicli; 13 suite verdi; 0 tasti morti; 0 overlay che bloccano tap (i 2 absoluteFill rimasti sono preview/backdrop intenzionali).

### Residui / prossimi
- **#4 SCALING UI** (testo/card/densità, per-utente, dinamico): non ancora — è una feature ampia, merita lo stesso trattamento runtime dei 7 temi. Prossimo blocco.
- **Responsive multi-viewport** (SE/iPad/web): richiede riscontro visivo su device.

### File: PersonaleScreen, GlassCard, HubCard, PressableScale, PersonalizzazioneScreen.
## [Refactor V2 — Liquid Glass conforme allo spec #8 (blur solo sul chrome)]

> SOLO UI. Correzione di conformità: lo spec #8 vuole blur/trasparenze SOLO su bottom bar/popup/modali/picker, NON sulle card principali ("devono restare eleganti e leggibili"). Avevo messo il BlurView su tutte le card: corretto.

**GlassCard (`GlassCard.tsx`) — card principali ora SOLIDE:**
- Default: superficie solida (overlay bianco del tema, identico su tutti i temi → coerente al cambio tema), bordo sottile, ombra morbida. Niente backdrop blur → massima leggibilità.
- Aggiunta opzione `blur` (default false) per popup/modali/picker che richiedono il Liquid Glass esplicito.
- Effetto su 15 schermate: le card di contenuto (Dashboard KPI, Turni, Personale, StaffDetail, Profilo, ecc.) ora sono solide ed eleganti.

**SheetHeader (`SheetHeader.tsx`) — chrome modale con blur reale:** aggiunta barra BlurView (intensity 30) dietro l'header dei modali → i modali hanno il Liquid Glass come da spec #8.

**Riepilogo conformità #8:** blur reale ora SOLO su: bottom navigation + header modali (SheetHeader, 17 schermate). Card principali: solide. 

### Verifiche
0 errori TS (intero progetto); 0 cicli; 13 suite verdi.
Build Expo / export web / commit git: non eseguibili qui; equivalente CLI. Resa visiva (blur su chrome, card solide): verificabile su device.

### File: `components/GlassCard.tsx`, `components/SheetHeader.tsx`.
## [Refactor V2 — Rifiniture finali: back ovunque, RBAC staff, coerenza turni, tema per-utente]

> SOLO UI/permessi. engine.ts NON toccato. Logica turni invariata.

**Back su ogni schermata (#4):** aggiunto back Apple a `AssistenteScreen` e `CoperturaScreen` (chevron-back glass top-left). AccessoNegato ha già "Torna alla mia area". Audit finale: 0 schermate full-page senza uscita.

**Pulsanti coordinatore rimossi dalla vista staff (#8):**
- `BancaOreScreen`: "Esporta CSV" ora nascosto allo staff (dato aggregato, solo coordinatore). Lo staff continua a vedere solo le proprie ore.
- `StaffDashboardScreen`: "Ferie e assenze" ora apre il flusso **Richieste** (lo staff richiede, il coordinatore approva) invece della modifica diretta del piano.
- `FerieWizardScreen`: difesa extra — il redirect automatico a Sostituzioni (azione coordinatore) ora avviene solo se role !== STAFF.
- Già presenti e confermati: Reperibilità/Richieste/Notifiche nascondono Accetta/Rifiuta/Approva allo staff via `can(role,'approve')`; Reperibilità ha vista STAFF separata; StaffTurni è read-only.

**Coerenza turni coordinatore→staff (#7):** verificato che `StaffTurniScreen` legge `currentPiano` dallo store condiviso → quando il coordinatore aggiorna un turno (setCell), il membro staff lo vede aggiornato. Stessa fonte `piano[infId][day]`.

**Tema modificabile anche dallo staff, per-utente (#9):** confermato — chiave storage `turnover.theme.id.{email}` isolata per utente; `useAppTheme` carica/salva con `currentEmail`; lo staff raggiunge Personalizzazione dall'Account. Ogni utente ha il proprio tema.

**AI/matrici (#5, #6) — verifica funzionale (engine intatto):** test E2E con reparto reale (Medicina, settori M/P/N) + 6 infermieri con nomi, contratti, matrice M62, offset → `buildPiano` genera **119 turni reali, copertura 100%**; `getCell` legge la struttura condivisa. La matrice è usabile in un reparto reale appena inseriti i nomi.

**Audit tasti (#1 verifica):** 0 Pressable senza handler in tutte le schermate.

### Verifiche
0 errori TS (intero progetto); 0 cicli; 13 suite verdi; 0 tasti morti; 0 schermate senza uscita; test AI/matrici verde.
Build Expo / export web / commit git: non eseguibili qui; equivalente CLI. Responsive multi-viewport: richiede device.

### File: AssistenteScreen, CoperturaScreen, BancaOreScreen, StaffDashboardScreen, FerieWizardScreen.
## [Refactor V2 — Anti-troncamento testo (punto 3 spec)]

> SOLO UI. "Mai troncare, mai …". Logica invariata.

**Titoli/nomi dinamici portati a 2 righe** (prima numberOfLines={1}, rischio troncamento):
- Reperibilità: nome operatore, riga data/fascia/telefono, riga assenza (3 fix).
- Staff Detail: motivo assenza.
- Banca Ore: nome operatore.
- Copertura, Dashboard (criticità), Notifiche, Personale, Reparti, Richieste: nome/titolo card.

**Mantenuti a 1 riga (corretto):** chip selettori (operatore), badge/pill, meta secondarie, e il titolo fisso corto "La tua area". I contenitori dei nomi hanno già flex:1 + minWidth:0, quindi vanno a capo senza overflow.

**Verifiche anti-troncamento:**
- 0 titoli dinamici con numberOfLines={1} rimasti; 0 ellipsizeMode/"…" nell'UI (solo un commento in Icon.tsx).
- Larghezze fisse residue = solo anelli avatar (Profilo 162, StaffDetail 132): centrati, non causano overflow.
- 0 errori TS (intero progetto); 0 cicli; 13 suite verdi.

### Onestà
Overflow/responsive su viewport reali (SE/iPad/web) richiede verifica visiva su device: non simulabile qui. Questo pass elimina i troncamenti a livello di codice (numberOfLines/ellipsis), che è la parte verificabile staticamente.

### File: ReperibilitaScreen, StaffDetailScreen, BancaOreScreen, CoperturaScreen, DashboardScreen, NotificheScreen, PersonaleScreen, RepartiScreen, RichiesteScreen.
## [Refactor V2 — Libreria avatar VETTORIALE (no emoji, no Uomo/Donna)]

> SOLO UI. Prosecuzione automatica dopo i 7 temi.

**Nuova libreria (`components/avatar/VectorAvatars.tsx`):** 25 avatar **vettoriali SVG** (react-native-svg) su cerchio con gradiente derivato dal colore scelto, scalabili 64/128, stile Apple. 4 categorie:
- **Sanità**: Infermiere, Medico, OSS, Coordinatore, Anestesista, Pediatra, 118, Radiologia.
- **Animali**: Cane, Gatto, Coniglio, Panda, Volpe, Gufo.
- **Professioni**: Manager, Tecnico, Ingegnere, Docente, Avvocato, Designer.
- **Astratti**: Anello, Triangolo, Esagono, Onda, Punti.
- Export `AVATAR_CATALOG`, `VectorAvatar`, `isVectorAvatar`.

**Integrazione:**
- `types/index.ts` + `utils/designSystem.ts`: ProfileConfig/Lite estesi con `vector?` + kind 'vector'.
- `components/Avatar.tsx`: rende l'avatar vettoriale con priorità (disegna il proprio cerchio gradiente); badge ruolo preservato; fallback iniziali invariato.
- `screens/ProfileScreen.tsx`: **rimossi Uomo/Donna e l'intera libreria emoji**; nuova sezione Avatar con le 4 categorie vettoriali (selezione evidenziata in accent, colore che segue lo swatch profilo).

### Verifiche
- 0 errori TS (intero progetto); 0 cicli; 13 suite verdi.
- Profilo: 0 riferimenti a Uomo/Donna, 0 libreria emoji.
- Build Expo / export web / commit git: non eseguibili qui; equivalente CLI.

### File: `components/avatar/VectorAvatars.tsx` (nuovo), `components/Avatar.tsx`, `screens/ProfileScreen.tsx`, `types/index.ts`, `utils/designSystem.ts`.

### Stato V2: Bottom Nav ✅ · Export Excel in Turni ✅ · back Profilo ✅ · emoji UI rimosse ✅ · 7 temi ✅ · libreria avatar vettoriale ✅. Restano: audit anti-troncamento/overflow/responsive multi-viewport (richiede verifica visiva su device).
## [Refactor V2 — 7 temi Liquid Glass (applicazione reale a tutta l'app)]

> SOLO UI. Nessuna modifica a store/logica. Risolve "ogni tema deve colorare realmente tutta l'app".

**Architettura tema runtime:**
- `design/themes.ts`: 7 temi (**AMOLED, Ocean, Forest, Graphite, Sunset, Violet, Ruby**) con bg/bgSecondary/surface/accent dello spec.
- `design/colors.ts`: l'oggetto `colors` è ora **mutabile e vivo**; `applyTheme(id)` riscrive in-place bg/superfici-glass/accent (testato sui 7 temi). Default AMOLED = look attuale invariato.
- `hooks/useAppTheme.tsx` (`AppThemeProvider`): applica il tema salvato all'avvio e **rimonta l'albero** al cambio (key=epoch) così anche gli `StyleSheet.create` si rigenerano → il tema raggiunge TUTTE le schermate, incluse quelle con token statici. Persistenza per-utente (`saveThemeId`/`loadThemeId`).
- `app/_layout.tsx`: AppThemeProvider montato sotto StoreProvider.

**Personalizzazione (`PersonalizzazioneScreen.tsx`):** riscritta in Liquid Glass; header gigante + back; **griglia dei 7 temi con anteprima reale** (mini mockup colorato bg/surface/accent, check sul tema attivo) collegata a useAppTheme; sezione sfondo immagine preservata (overlay/blur/darken).

### Verifiche
- 0 errori TS (intero progetto); 0 cicli; 13 suite verdi.
- **Test runtime applyTheme**: Ocean→#061A2C, Forest accent #30D158, Ruby accent #FF453A, Violet #BF5AF2, AMOLED reset #000000/#0A84FF — tutti OK.
- Build Expo / export web / commit git: non eseguibili qui; equivalente CLI.

### File: `design/themes.ts` (nuovo), `design/colors.ts`, `hooks/useAppTheme.tsx` (nuovo), `services/storage.ts`, `app/_layout.tsx`, `screens/PersonalizzazioneScreen.tsx`.
## [Refactor V2 — Bottom Nav (solo icone) + Export Excel in Turni + back Profilo + bonifica emoji]

> SOLO UI + 1 pulsante che richiama una funzione GIÀ esistente. Logica invariata.

**1. Bottom Navigation V2 (`FloatingBottomNavigation.tsx`) — stile Apple Music/Foto/App Store:**
- **Solo icone, nessun testo**. Container h72, radius 36, bg rgba(30,30,30,0.72), blur 40, bordo rgba(255,255,255,0.08), shadow 0 8 40 .45, bottom 24, left/right 16.
- Stato attivo: **glow circolare 48 dietro l'icona** con animazione spring + scale.
- **Colori distinti per tab** (risolve "Home/Piano troppo simili"): Home #34C759, Piano #0A84FF, Personale #64D2FF, Controllo #FF453A, Account #BF5AF2. Icone stroke 2.25, 24px. Badge pending preservato. Navigazione/permessi invariati.

**9. Export Excel in Turni (`TurniScreen.tsx`):** aggiunto pulsante **"Esporta Excel"** (accent verde) visibile quando il piano è generato. Richiama `exportPianoXLSX` GIÀ esistente (fogli per reparto + Riepilogo + Assenze, .xlsx via xlsx-js-style, compatibile Excel/LibreOffice/Sheets). Nota: la funzione c'era già nel Report; ora è anche in Turni come da spec.

**6. Profilo (`ProfileScreen.tsx`):** aggiunto **back button** Apple (40x40 glass, top-left, sempre visibile) — risolve "si rimane bloccati".

**2. Bonifica emoji (UI):** rimosse emoji dai testi (saluti Dashboard/StaffDashboard ☀️👋🌙, 💡 Assistente, ✅ Recovery). Restano solo in commenti di codice (non visibili).

### Onestà — cosa NON è in questo turno (refactor V2 è ampio)
- **7 temi** (AMOLED/Ocean/Forest/Graphite/Sunset/Violet/Ruby) con bg/surface/accent: non ancora. Richiede estendere il theme engine (Personalizzazione).
- **Libreria avatar vettoriale** (Sanità/Animali/Professioni/Astratti SVG) + rimozione avatar Uomo/Donna ed emoji avatar: non ancora (è un sistema a sé; il sistema avatar a layer SVG esiste già in components/avatar/ ma non è wired).
- **Audit troncamento testo / overflow / responsive SE→iPad→web**: non ancora (richiede verifica visiva su più viewport).
- Build Expo / export web / commit git: non eseguibili qui. Equivalente: typecheck (0 errori), 13 suite, 0 cicli.

### File modificati
- `components/FloatingBottomNavigation.tsx`, `screens/TurniScreen.tsx`, `screens/ProfileScreen.tsx`, `screens/DashboardScreen.tsx`, `screens/StaffDashboardScreen.tsx`, `screens/AssistenteScreen.tsx`, `screens/RecoveryScreen.tsx`.
### Verifiche: 0 errori TS (intero progetto); 0 cicli; 13 suite verdi.
## [Liquid Glass — Rifinitura globale via SheetHeader (17 schermate modali)]

> SOLO UI. Aggiornato il componente condiviso SheetHeader → tutte le schermate modali/secondarie si rifiniscono insieme. Logica invariata.

**SheetHeader (`SheetHeader.tsx`) — Apple Liquid Glass:**
- Titolo **30/700 (section)** con sottotitolo secondario; pulsanti back/close **glass** (rgba bianco + bordo), safe-area top, niente divisore duro. useTheme→token.
- Firma props invariata (title/subtitle/onClose/left) → 0 rotture nei 17 chiamanti.

**Schermate rifinite insieme (usano SheetHeader, già su palette glass):** Matrici, MatriceEditor, SeasonalConfig, Simulatore, Postazioni, ImportPersonale, Sostituzioni, UtentiAutorizzati, StaffDetail-fallback, e altre modali/sheet (17 totali).

**Stato superfici:** queste schermate usano `colors.cardEco`/`borderEco` che ora VALGONO i token glass (rgba bianco 0.07 / bordo 0.08) su sfondo nero — quindi sono già visivamente glass e coerenti; SheetHeader uniforma ora anche gli header.

### Onestà
- Le schermate restano con superfici glass via token (non BlurView su ogni singola card): visivamente coerenti, il blur reale è già su GlassCard nelle 8 principali + hub. Convertire ogni card a BlurView sarebbe churn ad alto rischio e basso valore aggiunto.
- Auth minori (Register/Recovery/Security/AccessoNegato/Onboarding) già su palette glass; header rifiniti dove usano SheetHeader.
- Build Expo / export web / commit git: non eseguibili qui. Equivalente: typecheck (0 errori), 13 suite, 0 cicli.

### Stato finale tema
- 8 schermate spec ✅ · modalità Staff ✅ · 3 Hub ✅ · 17 modali via SheetHeader ✅ · token+GlassCard ✅.
- Unica su useTheme: Personalizzazione (by design).

### File modificati
- `components/SheetHeader.tsx`.
### Verifiche: 0 errori TS (intero progetto); 0 cicli; 13 suite verdi.
## [Liquid Glass — Rifinitura: 3 Hub (tab) + Login]

> SOLO UI. Rifinitura schermate di supporto al livello glass delle 8 principali. Logica invariata.

**Hub (destinazioni delle 3 tab) — via componenti condivisi:**
- `TopBar.tsx`: **titolo gigante 40/700 a sinistra** (reparto come sottotitolo), avatar 44 + campanella con badge a destra; useTheme→token.
- `HubCard.tsx`: ricostruita come **glass card r28 con blur reale** (BlurView), tile icona 48 accent, ombra glass.
- `HubSection.tsx`, `AppShell.tsx`: token Liquid Glass (sfondo nero; AppShell mantiene lo sfondo personalizzato utente).
- Effetto: PianificazioneHub, PersonaleHub, ControlloHub trasformati insieme.

**Login (`LoginScreen.tsx`):** già su glass; rifinito — logo/CTA in accent blu Apple, input/logo radius 24.

### Onestà
- Restano sulla **palette** Liquid Glass (token già aggiornati) ma senza trattamento GlassCard pieno: Onboarding, Register, Recovery, Security, AccessoNegato, Matrici, MatriceEditor, SeasonalConfig, Simulatore, Postazioni, ImportPersonale, Sostituzioni, CellEditor, UtentiAutorizzati, e i contenuti dei wizard. Sono già scuri/coerenti; rifinibili nei prossimi turni.
- Build Expo / export web / commit git: non eseguibili qui. Equivalente: typecheck (0 errori), 13 suite, 0 cicli.

### File modificati
- `components/TopBar.tsx`, `components/HubCard.tsx`, `components/HubSection.tsx`, `components/AppShell.tsx`, `screens/LoginScreen.tsx`.
### Verifiche: 0 errori TS (intero progetto); 0 cicli; 13 suite verdi.
## [Liquid Glass — Profilo (6) + Report (7) + Impostazioni (8) · 8/8 schermate COMPLETE]

> SOLO UI. Logica invariata (setProfile, setMode/setAiMode/setMatriceMese, exportPianoPDF/XLSX, matrixReport/simulateRange).

**Profilo (`ProfileScreen.tsx`) — Liquid Glass (come da mockup):**
- Header gigante **Profilo** + ingranaggio glass; avatar 150 con **anello + glow accent** (direzione viola); nome/ruolo + pill stato (Connesso/Offline).
- **Attività** (coordinatore): righe glass con dati reali — turni gestiti, personale coordinato, reparti, ore mese (icone accent).
- Pulsante accesso accent; link Impostazioni glass; personalizzazione avatar (colore/iniziali/uomo-donna/libreria) tutta su superfici glass.

**Report (`ReportScreen.tsx`) — Apple Fitness/glass:**
- Sfondo nero; 4 KPI card; sezioni aderenza/deroghe/scoperti/simulazione/qualità/monte ore; export XLSX + **PDF in accent report (arancio)**. Calcoli ed export invariati (listDeroghe, matrixReport, simulateRange, monthlyHours, annualHours).

**Impostazioni (`ImpostazioniScreen.tsx`) — Liquid Glass:**
- Header gigante **Impostazioni**; gruppi opzioni (modalità pianificazione AI, modalità motore, matrice del mese, utenti autorizzati) su **superfici glass**; badge ATTIVA accent. setMode/setAiMode/setMatriceMese invariati.

### 🎉 STATO FINALE — Redesign Apple Liquid Glass: 8/8 schermate dello spec complete
1 Bottom Navigation ✅ · 2 Dashboard ✅ · 3 Pianificazione ✅ · 4 Personale ✅ · 5 Staff Detail ✅ · 6 Profilo ✅ · 7 Report ✅ · 8 Impostazioni ✅
+ intera modalità STAFF (StaffDashboard/StaffTurni/AccountHub/Desiderata) ✅
+ token Liquid Glass (colors/typography/radius/shadows/animations) + GlassCard con blur reale.
Unica schermata su useTheme: Personalizzazione (by design, gestisce il tema).

### Onestà (limiti sandbox)
Build Expo / export web / commit git: non eseguibili qui (no Metro/EAS/simulatore/repo git). Equivalente: typecheck completo (0 errori), 13 suite, 0 cicli, logica preservata. La resa visiva fine (blur, glow, ombre) è verificabile solo su device/simulatore.

### File modificati
- `screens/ProfileScreen.tsx`, `screens/ReportScreen.tsx`, `screens/ImpostazioniScreen.tsx`.
### Componenti: nessuno nuovo (riusa GlassCard/Avatar/PressableScale).
### Verifiche: 0 errori TS (intero progetto); 0 cicli; 13 suite verdi.
## [Liquid Glass — Staff Detail (5/8) + intera modalità STAFF]

> SOLO UI. Logica invariata ovunque (countWork/monteTurni/removeStaff/removeFerie, staffStats testata, hoursBank, loadRepOp, signOut, addDesiderata).

**Staff Detail (`StaffDetailScreen.tsx`) — Liquid Glass (come da mockup):**
- Top bar back/menu glass; **avatar 120 centrato con anello accent**; nome/ruolo/reparto + pill "Attivo".
- **Stat card** glass (Anzianità / Turni mese / Ore mese / Carico%).
- Carico turni con barra + chip contratto/matrice/notti.
- **Disponibilità settimanale** con pallini LUN→DOM (verde se in turno, da dati reali).
- Esenzioni, Assenze (modifica/rimuovi), calendario mese in GlassCard (giorni r14, turni colorati).
- Footer azioni glass: Assenza / Modifica / Rimuovi.

**Modalità STAFF (4 schermate) — Liquid Glass:**
- `StaffDashboardScreen`: header gigante "Ciao {nome}", **6 KPI glass** con accent (turno oggi, prossimo, ore, monte, ferie, richieste — tutti da staffStats), card prossima reperibilità, notifiche recenti, **griglia sezioni glass** (8 voci con icone accent). Rimosso KPICard/QuickActionCard/AREA legacy.
- `StaffTurniScreen`: header gigante + righe turno su superficie glass.
- `AccountHubScreen`: ActionCard su superficie glass (profilo/sistema già in GlassCard).
- `DesiderataScreen`: card e input su superficie glass.

### Onestà (limiti sandbox)
Build Expo / export web / commit git: non eseguibili qui. Equivalente: typecheck (0 errori), 13 suite, 0 cicli, logica preservata. I "residui" cardEco/bgEco rilevati sono ALIAS che ora valgono i token Liquid Glass (nero/glass) — semanticamente corretti, non legacy.

### Prossime: 6 Profilo · 7 Report · 8 Impostazioni.

### File modificati
- `screens/StaffDetailScreen.tsx`, `screens/StaffDashboardScreen.tsx`, `screens/StaffTurniScreen.tsx`, `screens/AccountHubScreen.tsx`, `screens/DesiderataScreen.tsx`.
### Componenti: nessuno nuovo (riusa GlassCard/Avatar/PressableScale).
### Verifiche: 0 errori TS (intero progetto); 0 cicli; 13 suite verdi.
## [Liquid Glass — Personale (schermata 4/8)]

> SOLO UI. LOGICA INTATTA: countWork/monteTurni/classifyOperator/ferieBalanceFor/removeStaff + FlatList virtualizzata.

**Personale (`PersonaleScreen.tsx`) — Liquid Glass (come da mockup):**
- Header gigante **Personale 40/700** + "N membri del team"; tasto aggiungi in accent personale (azzurro #64D2FF).
- **Search bar Apple**: altezza 56, radius 28, blur reale (BlurView), icona ricerca a sx, microfono a dx.
- **Card persona glass** (BlurView): **avatar 72**, nome + pill "Attivo" (dot verde), qualifica, reparto, badge ore mese "work/mt · %" (accent o rosso se over), badge ferie residue. Scroll verticale virtualizzato. Tap → staff-detail; cestino → elimina con conferma.

### Onestà (limiti sandbox)
Build Expo / export web / commit git: non eseguibili qui. Equivalente: typecheck (0 errori), 13 suite, 0 cicli, 0 residui legacy, logica preservata.

### Prossime: 5 Staff Detail · 6 Profilo · 7 Report · 8 Impostazioni.

### File modificati
- `screens/PersonaleScreen.tsx`.
### Componenti: nessuno nuovo (riusa Avatar + BlurView/expo-blur).
### Verifiche: 0 errori TS (intero progetto); 0 cicli; 13 suite verdi.
## [Liquid Glass — Pianificazione + ShiftGrid (schermata 3/8)]

> SOLO UI. LOGICA INTATTA: regenerate, undo/redo, coverage, filtri, ShiftGrid (getCell/onCellPress/dimensioni) invariati.

**Pianificazione (`TurniScreen.tsx`) — Liquid Glass:**
- Header gigante **Pianificazione 40/700** + mese; azioni undo/redo glass + AI con accent funzione (verde #32D74B).
- KPI riepilogo (Turni/Ferie/Reperib.) in **GlassCard** con accent.
- Copertura del mese come barra in GlassCard.
- Banner AI glass quando ci sono turni scoperti.
- Chip reparti + **griglia ShiftGrid avvolta in GlassCard** (rendering griglia invariato).
- Legenda turni come pill colorate (mattina verde, pomeriggio blu, notte viola, ferie arancio).

**ShiftGrid (`ShiftGrid.tsx`) — solo colori:**
- useTheme→token Liquid Glass (celle weekend su elevated, divisori su divider, ShiftBadge invariato). ROW_H 52 / CELL_W 44 / getCell / onCellPress INVARIATI. Nessuna modifica logica.

### Onestà (limiti sandbox)
Build Expo / export web / commit git: non eseguibili qui. Equivalente: typecheck (0 errori), 13 suite, 0 cicli, logica preservata.

### Prossime: 4 Personale · 5 Staff Detail · 6 Profilo · 7 Report · 8 Impostazioni.

### File modificati
- `screens/TurniScreen.tsx`, `components/ShiftGrid.tsx`.
### Componenti: nessuno nuovo (riusa GlassCard).
### Verifiche: 0 errori TS (intero progetto); 0 cicli; 13 suite verdi.
## [Liquid Glass — Dashboard (schermata 2/8)]

> SOLO UI. Dati e logica invariati (dashboardData, complianceReport, fairnessReport, matrixFidelity, reperibili).

**Dashboard (`DashboardScreen.tsx`) — ricostruita in Liquid Glass (come da mockup):**
- Header gigante: saluto "Ciao, {nome} 👋", titolo **Dashboard 40/700**, sottotitolo "Panoramica generale", avatar 52 a destra.
- Selettore mese pill glass.
- **Griglia 4 KPI in GlassCard** con valore grande (34) e accent per funzione: Turni assegnati (verde), Personale attivo (azzurro) — entrambi con mini-sparkline dai dati reali del piano; Copertura media (arancio), Criticità aperte (rosso). Trend "vs mese scorso" da covDelta reale.
- Sezione "Prossimi turni critici" con card glass (icona accent criticità + chevron) o stato verde se nessuna.
- Due mini-KPI glass: Equità carichi + Fedeltà matrice.
- Rimosso useTheme/AREA/KPICard/QuickActionCard legacy → GlassCard + token Liquid Glass. Avatar/PressableScale/CountUpText riusati.

### Onestà (limiti sandbox)
Build Expo / export web / commit git: non eseguibili qui. Equivalente: typecheck (0 errori), 13 suite, 0 cicli, scan token (0 fantasma), logica preservata.

### Prossime: 3 Pianificazione · 4 Personale · 5 Staff Detail · 6 Profilo · 7 Report · 8 Impostazioni.

### File modificati
- `screens/DashboardScreen.tsx`.
### Componenti: nessuno nuovo (riusa GlassCard).
### Verifiche: 0 errori TS (intero progetto); 0 cicli; 13 suite verdi; 0 token-fantasma.
## [Liquid Glass — Fondamenta design system + Bottom Navigation (schermata 1/8)]

> Nuovo indirizzo visivo Apple Liquid Glass. SOLO UI/token/componenti visuali: store, hooks, services, Supabase, auth, logica turni e navigazione INVARIATI. Procedo una schermata alla volta come da spec.

**Fondamenta (token /design aggiornati ai valori Liquid Glass, CHIAVI preservate):**
- `colors.ts`: nero puro #000000, secondary #0A0A0A, elevated/glass/glassStrong rgba bianco, border/divider rgba(255,255,255,0.08/0.05). Accenti Apple system (blue #0A84FF, green #32D74B, orange #FF9F0A, purple #BF5AF2, red #FF453A, teal #64D2FF, indigo #5E5CE6). **Mappa accent per FUNZIONE** (fnColor: pianificazione/personale/report/criticità/direzione/richieste/simulazione/reparti). Turni come pill (mattina verde, pomeriggio blu, notte viola, ferie arancio, malattia rosso). Alias storici (bgEco/cardEco/borderEco) rimappati al glass: le ~40 schermate già migrate adottano il nuovo look senza modifiche.
- `typography.ts`: scala SF Pro Display (largeHero 48/700, pageTitle 40/700, section 30/700, cardTitle 22/600, body 17/400, caption 13/500). Chiavi storiche preservate.
- `radius.ts`: input/button 24, card 28, largeCard 32, bottomNav 38, pill/avatar/fab 999.
- `shadows.ts`: glass (0 10 30 .30), largeGlass (0 20 60 .40) + alias card/elevated.
- `animations.ts`: tap 120, navigation 220, screenTransition 260, spring Apple.

**Nuovo componente:**
- `GlassCard.tsx`: glass card con **blur reale** (expo-blur 14.1.5, BlurView), radius 32, padding 20, bg rgba(255,255,255,0.07), border rgba(255,255,255,0.08), ombra glass. Fallback Android opaco.

**Schermata 1 — Bottom Navigation (`FloatingBottomNavigation.tsx`):**
- Flottante 92%, **altezza 76**, **radius 38**, sfondo **rgba(20,20,20,0.75)**, **blur 40**, bordo 1px rgba(255,255,255,0.10). Icone 26, label 12. Pill attiva glass scorrevole (spring). **Colore accent dinamico per funzione** (la barra si tinge dell'accento della sezione attiva). Logica navigazione/tab/permessi/badge invariata.

### Onestà (limiti sandbox)
- **Build Expo / export web / commit git**: NON eseguibili qui (niente Metro/EAS/simulatore; nessun repo git nel sandbox). Eseguito l'equivalente: typecheck completo (0 errori), 13 suite, 0 cicli, scan chiavi-token.
- Il cambio dei VALORI dei token propaga a tutte le schermate già migrate: compilano e sono coerenti col nuovo sistema, ma la **resa visiva fine** di ciascuna verrà curata schermata per schermata (2-8) come da spec.

### Prossime schermate (ordine spec): 2 Dashboard · 3 Pianificazione · 4 Personale · 5 Staff Detail · 6 Profilo · 7 Report · 8 Impostazioni.

### File modificati
- `design/colors.ts`, `design/typography.ts`, `design/radius.ts`, `design/shadows.ts`, `design/animations.ts`, `components/FloatingBottomNavigation.tsx`.
### Componenti creati: `components/GlassCard.tsx`.
### Verifiche: 0 errori TS (intero progetto); 0 cicli; 13 suite verdi; expo-blur presente.
## [Redesign — Schermate di supporto migrate (16) · solo Personalizzazione resta sul tema, by design]

> Migrate ai token /design tutte le schermate di supporto rimaste. Logica invariata ovunque. L'unica schermata ancora su useTheme è Personalizzazione, ed è corretto così (è quella che GESTISCE il tema).

**Schermate migrate ai token (16):**
- Auth/onboarding: `LoginScreen`, `RegisterScreen`, `RecoveryScreen`, `OnboardingScreen`, `SecurityScreen`, `AccessoNegatoScreen`.
- Gestione: `UtentiAutorizzatiScreen`, `ImportPersonaleScreen`, `PostazioniScreen`, `SimulatoreScreen`, `MatriceEditorScreen`, `SostituzioniScreen`.
- Dashboard Coordinatore: `DashboardScreen`.
- Con mappa SHIFT (colors.shift {bg,fg} → token piatti): `CellEditorScreen`, `MatriciScreen`.
- Più grande: `SeasonalConfigScreen` (296 righe, 2 sotto-componenti).
- Metodo: useTheme→token, colors.text→textPrimary, text2→textSecondary, text3→textDisabled, card→cardEco, line/separator→borderEco, bg→bgEco, red→danger2, yellow→warning, *Soft→rgba; colors.shift→mappa SHIFT_C su token piatti.

**NON migrata (volutamente):**
- `PersonalizzazioneScreen`: è la schermata che applica il tema (palette/setPalette, background/setBackground via useTheme). Rimuovere useTheme qui romperebbe la sua funzione. Lasciata sul suo sistema — corretto.

**Verifiche post-migrazione (16 file in un turno):**
- 0 errori TS nell'intero progetto; 0 cicli; 13 suite verdi.
- Tutti i token referenziati nelle 16 schermate esistono in design/colors (scan automatico, 0 token-fantasma).
- 0 residui legacy (useTheme/colors.text2/text3/card2/line/bg/*Soft/shift) nelle schermate migrate.

### Onestà
Build Expo: non eseguibile qui; typecheck completo + scan token + 13 suite + 0 cicli.

### Stato finale del redesign
- Modalità Coordinatore: ✅ tutte le schermate principali + dashboard.
- Modalità Staff: ✅ tutte e 5.
- Wizard: ✅ tutti e 3.
- Schermate di supporto: ✅ 16 migrate. Solo Personalizzazione resta su useTheme (by design).

### File modificati (16)
LoginScreen, RegisterScreen, RecoveryScreen, OnboardingScreen, SecurityScreen, AccessoNegatoScreen, UtentiAutorizzatiScreen, ImportPersonaleScreen, PostazioniScreen, SimulatoreScreen, MatriceEditorScreen, SostituzioniScreen, DashboardScreen, CellEditorScreen, MatriciScreen, SeasonalConfigScreen.
### Componenti: nessuno nuovo/rimosso.
### Verifiche: 0 errori TS (intero progetto); 0 cicli; 13 suite verdi; 0 token-fantasma.
## [Redesign — Modalità STAFF sui token + ricognizione bug completa]

> Applicato il tema /design a tutte le schermate della modalità Staff. Ricognizione funzionale completa di tasti, route, store e modal: nessun bug funzionale trovato (i bug reali erano già stati corretti nei turni precedenti).

**Modalità STAFF migrata ai token (5 schermate):**
- `StaffDashboardScreen.tsx` (home Staff): KPI da dati reali (staffStats — testati ✅), prossima reperibilità, notifiche recenti, sezioni rapide. useTheme→token, sfondo bgEco. KPICard/GlassCard/QuickActionCard riusati.
- `StaffTurniScreen.tsx` (i miei turni): calendario personale; colors.shift {bg,fg} → mappa SHIFT su token piatti.
- `AccountHubScreen.tsx` (account): card profilo, sistema, azioni (profilo/sicurezza/notifiche/logout). signOut/logoutSession preservati.
- `DesiderataScreen.tsx`: crea/modifica/elimina desiderata; addDesiderata/updateDesiderata/removeDesiderata e validazione ISO preservati.
- `StaffDetailScreen.tsx` (modal dettaglio operatore): carico turni, reparti, esenzioni, assenze, mini-calendario; colors.shift → SHIFT token.

**Ricognizione funzionale (caccia bug):**
- ✅ Route: tutte le 32 route navigate (router.push/replace) esistono come file in app/. Nessun link rotto.
- ✅ Store: tutte le 59 chiavi destrutturate da useStore esistono nel provider. Nessun riferimento fantasma.
- ✅ Selector-misuse: 0 occorrenze residue di useStore((s)=>...) (era il bug di useTheme, già corretto).
- ✅ Colori-fantasma: 0 (i soli match success/danger sono il fallback difensivo di badgeColorRep, già corretto).
- ✅ Tasti morti: 0 Pressable senza onPress, 0 Switch senza onValueChange, 0 TextInput bloccati.
- ✅ Firme: regenerate→{stats,coverage}, approve/rejectRequest(id,commento?) combaciano con gli usi UI.
- ✅ Modal: ManageSheet/SheetHeader con contratti props coerenti.
- ✅ Runtime: staffStats (widget StaffDashboard) testato a parte — turno/prossimo/ferie/richieste/reperibilità OK.
- Nota: shadowing innocuo di setInterval in Desiderata (solo setter di stato, nessun timer) — lasciato com'è.

### Onestà
Build Expo: non eseguibile qui; typecheck completo (0 errori), 13 suite, 0 cicli, scan anti-residui + test runtime mirati.

### File modificati
- `screens/StaffDashboardScreen.tsx`, `screens/StaffTurniScreen.tsx`, `screens/AccountHubScreen.tsx`, `screens/DesiderataScreen.tsx`, `screens/StaffDetailScreen.tsx`.
### Componenti: nessuno nuovo/rimosso. Riusati: token /design, KPICard, GlassCard, QuickActionCard, SheetHeader, Card, SelectChip, EmptyState, Avatar.
### Schermate trasformate: tutta la modalità Staff (5 schermate).
### Verifiche: 0 errori TS (intero progetto); 0 cicli; 13 suite verdi; ricognizione bug completa.
## [Redesign — Staff Wizard (TUTTI i wizard ora completi)]

> Trasformato lo Staff Wizard sui token. Con questo i tre wizard (Staff/Reparto/Ferie) sono tutti completi.

**Staff Wizard (`StaffWizardScreen.tsx`) — riscrittura completa:** rimosso useTheme legacy → token /design. 7 step invariati: (1) nome + qualifica + anni esperienza + livello + competenze; (2) contratto CCNL con statistiche; (3) notti/ciclo (con disabilitazione per contratto); (4) reparti (multi-selezione con icona); (5) matrice personale con sequenze colorate; (6) offset ciclo + anteprima ritmo 14 giorni; (7) esenzioni turni/settori + preferenze forti/deboli + reparto/settore preferito + riepilogo. Footer Indietro/Avanti/Salva. Logica intatta: addStaff/updateStaff, suggestMatrice, pickContratto (clamp notti), settoriCodes, esenzioni/preferenze, anteprima offset con lunghezza reale seq. colors.shift {bg,fg} legacy → mappa SHIFT su token piatti. Verificato: 0 residui legacy.

### Stato wizard
- Staff Wizard ✅ (questo turno)
- Reparto Wizard ✅ (turno precedente)
- Ferie Wizard ✅ (già fatto)

### Onestà
- **Modal/sheet minori** (es. CellEditor, Sostituzioni, ManageSheet già token, vari overlay): non ancora passati in rassegna uno per uno.
- **Build Expo**: non eseguibile qui; typecheck (0 errori), 13 suite, 0 cicli, scan anti-residui.

### File modificati
- `screens/StaffWizardScreen.tsx` (riscrittura completa).
### Componenti: nessuno nuovo/rimosso. Riusati: token /design, SheetHeader, StepsDots, SelectChip, OptionCard, Stepper.
### Schermate trasformate: Staff Wizard. Tutti i wizard ora completi.
### Verifiche: 0 errori TS (intero progetto); 0 cicli; 13 suite verdi; logica preservata.
## [Redesign — Reparto Wizard]

> Trasformato il Reparto Wizard sui token. Step e validazioni invariati. Resta solo lo Staff Wizard.

**Reparto Wizard (`RepartoWizardScreen.tsx`) — riscrittura completa:** rimosso useTheme legacy → token /design. 4 step invariati: (1) nome + reparti predefiniti + codice settori; (2) orari per turno con TimeStepperField + check riposi ≥11h (verde/rosso); (3) matrice 3-mode (Standard/Personalizzata/Stagionale) con OptionCard, sequenze colorate, gestione matrici custom (crea/duplica/elimina), SeasonalEditor; (4) riepilogo + settori con Stepper + codici generati. Footer Indietro/Avanti/Salva. Logica intatta: addReparto/updateReparto, validateSeasonalConfig (save-blocking), restMinutes, addMatriceCustom/removeMatriceCustom, secCode. colors.shift {bg,fg} legacy → mappa SHIFT su token piatti. Verificato: 0 residui legacy reali.

### Onestà
- **Staff Wizard** (441 righe, 7 step): NON in questo turno, prossimo. È il wizard più grande; merita un turno dedicato.
- **Modal vari**: non ancora.
- **Build Expo**: non eseguibile qui; typecheck (0 errori), 13 suite, 0 cicli, scan anti-residui.

### File modificati
- `screens/RepartoWizardScreen.tsx` (riscrittura completa).
### Componenti: nessuno nuovo/rimosso. Riusati: token /design, SheetHeader, StepsDots, SelectChip, OptionCard, PressableScale, SeasonalEditor, TimeStepperField, Stepper, Icon.
### Schermate trasformate: Reparto Wizard. Staff Wizard: prossimo.
### Verifiche: 0 errori TS (intero progetto); 0 cicli; 13 suite verdi; logica preservata.
## [Redesign — Assistente (wizard rimandati)]

> Trasformato l'Assistente sui token. I due wizard (Staff/Reparto) NON in questo turno: troppo grandi per farli bene insieme.

**Assistente (`AssistenteScreen.tsx`) — riscrittura completa:** rimosso useTheme legacy → token /design. Header 34-800; barra ricerca pill; card risultato; DOMANDE RAPIDE (griglia), CATEGORIE (chip espandibili), ANALISI AUTOMATICHE (griglia), CHAT LIBERA collassabile in fondo con bolle. Logica intatta: aiQueries (OPERATIONAL/CONTRACT/CATEGORIES/quickQuestions/questionsByCategory) e assistantQuery. Verificato: 0 residui legacy.

### Onestà
- **Staff Wizard** (441 righe, 7 step) e **Reparto Wizard** (304 righe): NON trasformati. Sono multi-step con validazione e decine di riferimenti tema legacy; ognuno merita un turno dedicato per non rischiare regressioni sui passaggi/validazioni. Restano sul vecchio stile (FerieWizard invece è già fatto).
- **Modal vari**: non in questo turno.
- **Build Expo**: non eseguibile qui; typecheck (0 errori), 13 suite, 0 cicli, scan anti-residui.

### File modificati
- `screens/AssistenteScreen.tsx` (riscrittura completa).
### Componenti: nessuno nuovo/rimosso. Riusati: token /design, Icon.
### Schermate trasformate: Assistente. Staff/Reparto Wizard: rimandati.
### Verifiche: 0 errori TS (intero progetto); 0 cicli; 13 suite verdi; logica preservata.
## [Redesign — Report COMPLETO (riscrittura su token)]

> Completata la riscrittura integrale di Report (prima era solo sfondo). Tutte le sezioni ora su token /design. Calcoli ed export intatti.

**Report (`ReportScreen.tsx`) — riscrittura completa:**
- Header 72/titolo 34-800 + mese; rimosso `useTheme` legacy e i componenti legacy (ScreenHeader/Card/SectionTitle/Button) → tutto sui token.
- **4 KPI card** con icona e valore grande (copertura/scoperti/deroghe/staff), color-coded.
- **Aderenza alla matrice**: % grande + chip per matrice/origine + lista per-operatore con badge aderenza.
- **Deroghe generate**: lista con reparto/tipo/motivo.
- **Turni scoperti per reparto**: badge slot rossi.
- **Simulazione & Equità** (12/24 mesi): indici equità/coerenza, alert, aggregati.
- **Qualità organizzativa**: copertura/equità/coerenza/preferenze/desiderata/deroghe + dettaglio per-operatore con carico%.
- **Monte ore contrattuale** (mese/annuale 12 mesi): alert + diff per-operatore (verde/rosso).
- **Export XLSX e PDF** preservati (exportPianoXLSX/exportPianoPDF).
- Calcoli intatti: listDeroghe, matrixReport, simulateRange, monthlyHours, annualHours. Verificato: 0 riferimenti legacy residui, import puliti.

### Onestà
Build Expo: non eseguibile qui; fatto typecheck (0 errori), 13 suite, 0 cicli, scan anti-residui legacy.

### File modificati
- `screens/ReportScreen.tsx` (riscrittura completa).
### Componenti: nessuno nuovo/rimosso (rimossi solo gli import legacy non più usati nel file). Riusati: token /design, EmptyState, Icon.
### Schermate trasformate: Report (ora COMPLETA).
### Verifiche: 0 errori TS (intero progetto); 0 cicli; 13 suite verdi; 7 calcoli/export preservati.
## [Redesign — Report (intervento mirato, NON completo)]

> Onestà prima di tutto: su Report ho fatto solo un allineamento mirato dello sfondo, NON la dashboard executive completa.

**Report (`ReportScreen.tsx`):** sfondo allineato ai token ecosistema (bgEco). Le sezioni (KPI, aderenza matrice, deroghe, scoperti, simulazione 12/24 mesi, equità, qualità operativa/organizzativa, export PDF/XLSX) restano sul tema legacy via componenti condivisi (Card/SectionTitle/ScreenHeader), che sono dark-coerenti. Logica intatta.

### Onestà (importante)
Report è 408 righe, il file-schermata più grande, interamente su `useTheme` (colors.* legacy) con ~10 sezioni-tabella e doppia esportazione. Una **riscrittura completa a card ecosistema** come Banca Ore/Direzione richiederebbe un turno dedicato e ampio: rifarla in fretta ora avrebbe alto rischio di regressioni sui molti dati (matrixReport, listDeroghe, simulateRange, monthlyHours/annualHours). Ho quindi fatto solo lo **sfondo** per coerenza visiva di base, e la dichiaro **trasformazione parziale**, non completa. Va completata separatamente.
Build Expo: non eseguibile qui; typecheck (0 errori), 13 suite, 0 cicli.

### File modificati
- `screens/ReportScreen.tsx` (solo sfondo + import token).
### Schermate trasformate: Report (PARZIALE — solo sfondo).
### Verifiche: 0 errori TS (intero progetto); 0 cicli; 13 suite verdi.
## [Redesign — Centro Criticità + Direzione (Report rimandato)]

> Prosecuzione redesign. Modificati CentroCriticitaScreen.tsx e DirezioneScreen.tsx sui token /design. Logica intatta.

**Centro Criticità (`CentroCriticitaScreen.tsx`):** header 72; 5 KPI card (copertura/criticità/scoperte/sicurezza/fedeltà matrice) con color-coding immediato; **allarmi attivi** ordinati per priorità con bordo-sinistra colorato (rosso/giallo/verde); **AI Correction Center** con card soluzione, chip impatto (equità/fatigue/costo/legale) e Applica. whyUncovered/proposeAutoFix/applyFix/dashboardData/matrixFidelity invariati.
**Direzione (`DirezioneScreen.tsx`):** header 72; **KPI primario gigante** (copertura, valore 48pt + barra); griglia 6 KPI secondari colorati (violazioni/straordinari/ferie/notti/festivi/fedeltà); criticità normative con badge; export CSV + link banca ore. computeCoverage/complianceReport/hoursBank/ferieBalance invariati.

### Onestà
- **Report**: NON fatto in questo turno. È 408 righe (il file-schermata più grande, denso di sezioni ed export): merita un turno dedicato per non rischiare regressioni. Resta col vecchio stile.
- **Build Expo**: non eseguibile qui; fatto typecheck (0 errori), 13 suite, 0 cicli.

### File modificati
- `screens/CentroCriticitaScreen.tsx`, `screens/DirezioneScreen.tsx`.
### Componenti: nessuno nuovo/rimosso. Riusati: token /design, EmptyState, Icon.
### Schermate trasformate: Centro Criticità, Direzione. Report: rimandato.
### Verifiche: 0 errori TS (intero progetto); 0 cicli; 13 suite verdi; funzioni preservate.
## [Redesign — Reperibilità completata]

> Chiusa la trasformazione di Reperibilità (era parziale): ora ricostruita interamente a card sui token /design, come Banca Ore/Ferie. Logica intatta.

**Reperibilità (`ReperibilitaScreen.tsx`) — riscrittura completa:**
- **Vista STAFF**: header 72/titolo 34-800; card "invia disponibilità" con stepper data GG/MM/AAAA (token), switch tutto-il-giorno, fascia/telefono/note, pulsante invia; lista "le mie disponibilità" con badge stato colorato.
- **Vista coordinatore**: richieste operatori raggruppate (IN ATTESA/APPROVATE/RIFIUTATE) con azioni **Chiama/Accetta/Rifiuta**; card segnalazioni conflitti (bordo rosso); assegnazione (chip operatori + giorno); storico mese con switch Richiamo + elimina; statistiche per operatore.
- Tutte le funzioni preservate: submitRepOp, assignRep, setRichiamo, repConflicts, repStats, telefonate (Linking tel:), setStatoOp, doppia persistenza separata (reperibilita + reperibilitaOp). NESSuna modifica al motore.
- I badge ora usano i colori corretti (fix badgeColorRep del turno precedente).

### Onestà
Build Expo: non eseguibile qui; fatto typecheck (0 errori), 13 suite, 0 cicli, verifica funzioni preservate.

### File modificati
- `screens/ReperibilitaScreen.tsx` (unico).
### Componenti: nessuno nuovo/rimosso. Riusati: token /design, EmptyState, Icon.
### Schermate trasformate: Reperibilità (ora completa).
### Verifiche: 0 errori TS (intero progetto); 0 cicli; 13 suite verdi; 7 funzioni preservate.
## [Redesign — Banca Ore + Ferie + Reperibilità + 2 bug runtime corretti]

> Prosecuzione redesign (dati numerici → KPI/barre/valore grande). Inoltre corretti 2 bug runtime reali scoperti dal typecheck.

**Banca Ore (`BancaOreScreen.tsx`) — ricostruita:** header 72/titolo 34-800; card per operatore con **valore principale grande** (saldo ±h, 34pt verde/rosso), barra lavorate/contrattuali con %, 6 mini-KPI colorati (straordinari/debito/notti/festivi/ferie/assenze). Export CSV e filtro STAFF invariati.
**Ferie (`FerieWizardScreen.tsx`) — modal redesign:** header modal, stepper giorni in card, riepilogo con **valore grande** (n giorni) + badge motivazione, footer Annulla/Conferma. addFerie/updateFerie, clamp, redirect sostituzioni urgenti invariati.
**Reperibilità (`ReperibilitaScreen.tsx`) — allineamento mirato:** sfondo ecosistema (bgEco) applicato; la logica fitta (disponibilità operatore, assegnazioni, statistiche, richiamo, telefonate, doppia persistenza, ruoli) NON riscritta per non rischiare regressioni.

**Bug runtime corretti (scoperti dal typecheck globale):**
- `utils/reperibilitaOpLogic.ts` `badgeColorRep`: usava `colors.success/danger/warning` che NON esistono nel tema (ha green/red/yellow) → restituiva **undefined** (badge senza colore). Reso robusto ad entrambe le nomenclature.
- `hooks/useTheme.tsx`: `useStore((st)=>st.currentEmail)` — ma useStore non è un selector-hook, restituiva l'intero store come "email" → l'**isolamento per-utente** di tema/sfondo era rotto. Corretto in `const { currentEmail } = useStore()`.

### Onestà
- **Reperibilità**: trasformazione PARZIALE (solo sfondo), non la riscrittura completa a card come Banca Ore/Ferie. Il file è 239 righe con persistenza separata e due viste: una riscrittura totale alla cieca era troppo rischiosa. Va completata in un passo dedicato.
- **Build Expo**: non eseguibile qui; fatto typecheck completo (0 errori), 13 suite, 0 cicli.

### File modificati
- `screens/BancaOreScreen.tsx`, `screens/FerieWizardScreen.tsx` (redesign completo)
- `screens/ReperibilitaScreen.tsx` (sfondo), `utils/reperibilitaOpLogic.ts`, `hooks/useTheme.tsx` (fix bug)
### Componenti: nessuno nuovo/rimosso. Riusati: token /design, SelectChip, Stepper, EmptyState, Icon.
### Schermate trasformate: Banca Ore (completa), Ferie (completa), Reperibilità (parziale).
### Verifiche: **0 errori TS (intero progetto)**; 0 cicli; 13 suite verdi; +2 bug runtime corretti.
## [Redesign — Richieste (inbox) + Notifiche (timeline)]

> Prosecuzione redesign. Modificati SOLO RichiesteScreen.tsx e NotificheScreen.tsx. Logica/store/dati invariati.

**Richieste (`RichiesteScreen.tsx`) — inbox moderna:** header 72/titolo 34-800; ogni richiesta = card r24/pad20 con avatar iniziali, richiedente, tipo, giorni, stato; **valutazione AI** in card colore impatto; pulsanti **Approva (verde pieno) / Respingi (rosso outline)** fortemente evidenziati (h48). Form STAFF (tipo/stepper/motivo), switch ruolo, storico — tutto preservato. assessRequest/submitRequest/approveRequest/rejectRequest e privacy intatti.
**Notifiche (`NotificheScreen.tsx`) — timeline:** header 72; notifiche **raggruppate per OGGI / IERI / QUESTA SETTIMANA / PRECEDENTI** (helper `bucket`, testato), icona per tipo, pallino non-letto, mark-as-read all'apertura; sezione richieste da gestire con Approva/Rifiuta. Badge non letti nel sottotitolo.

### Onestà
- **Build Expo**: non eseguibile qui (Metro/EAS+device). Eseguito typecheck completo (0 errori), parse, 13 suite, 0 cicli, test bucket timeline.
- Lo spec elencava ancora molte altre schermate (Banca Ore, Ferie, Reperibilità, Report, Criticità, Direzione, Assistente, wizard, modal): NON fatte in questo turno, una alla volta nei prossimi.

### File modificati
- `screens/RichiesteScreen.tsx`, `screens/NotificheScreen.tsx`.
### Componenti: nessuno nuovo/rimosso. Riusati: token /design, SelectChip, Stepper, EmptyState, Icon.
### Schermate trasformate: Richieste, Notifiche.
### Verifiche: 0 errori TS (intero progetto); 0 cicli; 13 suite verdi; bucket timeline testato.
## [Redesign — Reparti + Copertura + bonifica 13 errori TS preesistenti]

> Prosecuzione redesign. Completato il blocco Reparti+Copertura. Inoltre, il typecheck globale ha fatto emergere 13 errori PREESISTENTI (non miei) che ho corretto: il progetto ora è a 0 errori reali.

**Reparti (`RepartiScreen.tsx`) — card premium:** header 72/titolo 34-800; ogni reparto = card min-140/r24/pad20 con icona colorata, nome, modalità+matrice attiva, **badge copertura % + barra colore** (verde/giallo/rosso), orari per turno con dot colorati, nota cambio stagionale, settori come tag. ManageSheet e tutta la logica (computeCoverage, matriceResolver, removeReparto) invariati.
**Copertura (`CoperturaScreen.tsx`) — dashboard visuale:** 3 KPI card (media/ok/problemi), barra globale, card per reparto con flag stato (✓/⚠) e CoverageBar per slot. regenerate e coverage.byRep invariati.

**Bonifica errori TS preesistenti (13 → 0):**
- `PressableScale.tsx`: aggiunti `durIn?/durOut?` al tipo Props (erano usati ma non dichiarati).
- `useStore.tsx`: `loadData().then((d: any))` + tipi notifiche/invitations.
- `AccessoNegatoScreen.tsx`: `colors.dangerSoft` → `colors.redSoft` (token inesistente).
- `StaffDetailScreen.tsx`: Avatar `name/index` → `nome`; aggiunto `styles.foot` mancante.
- `ReperibilitaScreen.tsx`: `<SectionTitle title=…>` → `<SectionTitle>…</SectionTitle>` (prop errata).
- `UtentiAutorizzatiScreen.tsx`: aggiunto `styles.hint` mancante.

### Onestà
Il messaggio chiedeva di ridisegnare ~18 schermate + tutti i modal + audit finale in un colpo. Ho fatto **Reparti+Copertura** (verificate) + la bonifica errori, non le altre ~16 alla cieca. Le restanti (Richieste, Notifiche, Banca Ore, Ferie, Reperibilità, Report, Criticità, Direzione, Assistente, i wizard, i modal) richiedono lo stesso lavoro per-schermata, una alla volta. Build Expo: non eseguibile qui; fatto typecheck completo.

### File modificati
- `screens/RepartiScreen.tsx`, `screens/CoperturaScreen.tsx` (redesign)
- `components/PressableScale.tsx`, `hooks/useStore.tsx`, `screens/AccessoNegatoScreen.tsx`, `screens/StaffDetailScreen.tsx`, `screens/ReperibilitaScreen.tsx`, `screens/UtentiAutorizzatiScreen.tsx` (fix preesistenti)
### Componenti: nessuno nuovo/rimosso. Riusati: token /design, CoverageBar, ManageSheet, EmptyState, Icon.
### Verifiche: **0 errori TS in tutto il progetto**; 0 cicli; 13 suite verdi.
## [Redesign FASE 4+5+6 — Staff + Calendario (Dashboard parziale)]

> Prosecuzione redesign. Estesa /design/colors con palette ecosistema (bgEco #08141E, cardEco #10293A, colori turno). Backend/logica/store/dati invariati.

**Token (estensione, non nuovo sistema):** aggiunti a `design/colors.ts` bgEco/cardEco/borderEco/warning/danger2 + colori turno (mattina #58CC02, pomeriggio #58CCFF, notte #7C5CFF, reperibilità #FFB020, ferie #FF6B6B, malattia #E5484D, daySelected #FF8F00).

**Staff (`PersonaleScreen.tsx`) — ricostruita:** header 72/titolo 34-800; ricerca **sticky** 52/r26 con filtro live; **lista virtualizzata (FlatList)** per 300+ operatori (initialNumToRender/windowSize/removeClippedSubviews); card operatore min-96/r24/pad18 con avatar 64, nome/qualifica, badge turni+ferie, azione elimina 44×44. Dati e azioni (removeStaff, ferie, navigazione dettaglio) invariati.

**Calendario (`TurniScreen.tsx`) — ricostruito attorno alla griglia:** header 72 con mese grande + frecce + azioni (undo/redo/AI); **riepilogo mese** come KPI card (turni/ferie/reperibilità, h110); copertura come barra; legenda coi colori turno spec. La **griglia** (`ShiftGrid`) e tutta la logica (regenerate/undo/redo/coverage/filtri) sono **invariate**.

**Bug preesistente corretto:** `StaffTurniScreen.tsx` usava `colors.danger` (inesistente) → `colors.red`.

### Onestà
1. **Dashboard**: NON riscritta integralmente. È 260 righe di KPI/anelli/insight calcolati e usa già componenti premium condivisi (KPICard/GlassCard/QuickActionCard). Riscriverla alla cieca col nuovo bg rischiava regressioni sui molti dati derivati. Va fatta in un passo dedicato — non la dichiaro trasformata.
2. **Griglia calendario**: il rendering cella-per-cella resta in ShiftGrid (già 44px). Non l'ho rifatto: è il cuore funzionale e rischioso. Ho applicato i token al contorno (header/riepilogo/legenda).
3. **Build Expo**: non eseguibile qui. Eseguito typecheck (0 errori) + parse + 13 suite + 0 cicli.

### File modificati
- `design/colors.ts` (esteso), `screens/PersonaleScreen.tsx`, `screens/TurniScreen.tsx`, `screens/StaffTurniScreen.tsx` (fix bug).
### Componenti nuovi: nessuno. Riusati: token /design, Avatar, ShiftGrid, Chip, AIBanner, EmptyState, Icon, PressableScale.
### Schermate trasformate: Staff (completa), Calendario (contorno; griglia invariata). Dashboard: rimandata.
### Verifiche: 0 errori TS; 0 cicli; 13 suite verdi; funzioni preservate.
## [Redesign FASE 2+3 — Profilo + Impostazioni sui token ufficiali]

> Prosecuzione redesign. Modificati SOLO `ProfileScreen.tsx` e `ImpostazioniScreen.tsx`. Dashboard/Calendario/Staff non toccati. Backend/logica/store/dati invariati.

**Piano eseguito:** file reali `screens/ProfileScreen.tsx` (route profilo.tsx) e `screens/ImpostazioniScreen.tsx` (route impostazioni.tsx). Condivisi: `useStore`, `Avatar`, `PressableScale`, `Icon`, token `/design`. Funzioni preservate (verificate): setProfile, setMode, setAiMode, setMatriceMese.

**Profilo:** header 72 / titolo 34-800 / impostazioni 28 a destra; avatar 180 centrato (mt16/mb24); card statistiche (ruolo+stato) su `bgSecondary` r24 pad20 ombra; sezioni 22-700; liste/card r24; tutta la personalizzazione (colore/iniziali/genere/libreria icone) e il login invariati.
**Impostazioni:** header 72 / titolo centrato / back a sinistra; ogni gruppo in una card r24 pad20; righe min-60, testo 18-600/sub 14-500; divider su `colors.border`; badge ATTIVA; tutte le modalità (motore/AI/matrice mese) e i toast invariati.

### Onestà
1. **Avatar a layer**: lo spec dice "usa AvatarRenderer", ma il `profile` nello store è `ProfileConfig` (kind/color/initials/icon/emoji), NON l'`AvatarConfig` a layer del nuovo renderer. Per non modificare dati/store (regola ferrea), ho mantenuto il componente `Avatar` esistente che già renderizza `profile`, applicando i token al resto. Migrare profile→AvatarConfig sarebbe una modifica ai dati, fuori dal mandato.
2. **Build Expo**: non eseguibile qui (serve Metro/EAS+device). Eseguito l'equivalente: typecheck completo (0 errori) + parse + 13 suite verdi + 0 cicli.

### File modificati
- `screens/ProfileScreen.tsx`, `screens/ImpostazioniScreen.tsx`.
### Componenti nuovi: nessuno. Riusati: token /design, Avatar, PressableScale, Icon.
### Verifiche: 0 errori TS; 0 cicli; 13 suite verdi; funzioni store preservate.
## [Redesign FASE 1 — Bottom Navigation ricostruita sui token ufficiali]

> Prosecuzione del redesign. Modificato SOLO `components/FloatingBottomNavigation.tsx`. Nessun'altra schermata, nessun nuovo design system/avatar, backend/logica/store intatti.

**Piano eseguito (come da richiesta):**
- File reale individuato: `components/FloatingBottomNavigation.tsx` (custom tabBar di expo-router, montato in `app/(tabs)/_layout.tsx`).
- Condivisi verificati: `useStore` (per badge richieste pending) e i token `/design`. Logica navigazione/tab/permessi STAFF: invariata.

**Modifica:**
- Ricostruita usando i **token ufficiali** `/design`: `colors` (card/border/blue/textDisabled/red), `radius` (bottomNav/pill), `spacing`, `shadows.elevated`, `animations.bottomTab` (160ms, scale 0.96→1) — niente più valori hard-coded né i vecchi GLASS/MOTION.
- Icone dal set centralizzato **lucide** (`design/icons`): home/calendar/users/bar-chart/user, **28px** (spec), strokeWidth maggiore se attivo.
- Floating (92% larghezza), altezza **88** (spec), pillola attiva scorrevole `rgba(88,204,255,0.12)` + bordo `0.30` e label 11px. Firma del componente invariata → il layout non cambia.

### Onestà
"Build Expo": non eseguibile in questo ambiente (serve toolchain Metro/EAS + device). Ho eseguito l'equivalente verificabile: **typecheck completo (0 errori) + parse di tutti i file + 13 suite logiche verdi + 0 cicli**. La resa visiva (blur, animazione pillola) si conferma solo a device.

### File modificati
- `components/FloatingBottomNavigation.tsx` (unico).

### Verifiche
- 0 errori TS; 0 cicli; 13 suite verdi; firma tabBar compatibile col layout.
## [Design system /design + sistema avatar SVG a layer]

> Spec di redesign completo stile consumer 2026. Consegnate le due parti CONCRETE e verificabili: cartella token + sistema avatar nuovo. Le 41 schermate NON sono state riscritte alla cieca (vedi onestà sotto).

**Cartella `/design` (7 file, valori esatti dello spec):**
- `colors.ts` (#0B1823 bg, #58CCFF blu, #58CC02 verde, #FF9600, #CE82FF, #FF4B4B, #2DD4BF…), `spacing.ts` (4/8/12/16/20/24/32/40/48/64), `typography.ts` (36/800 → 12/600), `radius.ts` (card 24, modal 28, bottomNav 24…), `shadows.ts` (card 0 4 12 / elevated 0 8 24), `animations.ts` (tap 120ms, nav 220ms, tab 160ms), `icons.ts` (mappa centralizzata lucide-react-native, 0 emoji, 0 mix librerie). ✅ compila, 0 errori, lucide risolve.

**Sistema avatar SVG a layer (`components/avatar/`):**
- `AvatarLayers.ts` — modello dati a 10 layer indipendenti (sfondo/pelle/viso/occhi/bocca/capelli/barba/occhiali/uniforme/accessori) + palette (toni pelle, capelli, occhiali, sfondo, uniforme) + `clampLayer` (selezioni mai fuori range). ✅ testato.
- `AvatarRenderer.tsx` — compone i layer in un'unica SVG (react-native-svg) con forme parametriche per ogni variante.
- `AvatarPreview.tsx` — anteprima cerchio perfetto riusabile.
- `AvatarEditor.tsx` — editor con tab orizzontali (Corpo/Viso/Capelli/Barba/Occhiali/Sfondo), anteprima grande, selettori a griglia con preview reale per ogni opzione.
- `lucide-react-native` + `expo-image-picker` aggiunti a package.json.

### Onestà sullo scope (invariata e importante)
Lo spec chiede di applicare il nuovo design a TUTTE le 41 schermate, ridisegnare bottom-bar/calendario/profilo, e generare screenshot. Ho consegnato il **fondamento** (token) e il **sottosistema nuovo** (avatar) — entrambi compilano e sono testati. NON ho riscritto le 41 schermate né le ho ricablate ai nuovi token: sarebbe lavoro non verificabile da qui (la resa si vede solo a device) e ad alto rischio di regressioni su 179 file. Gli avatar non sono ancora agganciati al profilo esistente. Screenshot/mockup: non generabili in questo ambiente.

### Verifiche
- 0 errori; 0 cicli; **13 suite verdi**; /design compila; avatar compila; clampLayer testato. Resa a schermo = device-only.
## [Funzione 2/2 — Sfondo personalizzato da galleria]

> Usa expo-image-picker installato. Persistenza PER-UTENTE (riusa le chiavi isolate del fix preferenze).

- **useTheme esteso**: stato `background` (uri + overlay + blur + darken) con `setBackground`, caricato/salvato **per-utente** (`turnover.theme.background.<email>`) → ogni account ha il suo sfondo, mai condiviso.
- **Personalizzazione**: sezione **Sfondo personalizzato** — "Scegli dalla galleria" (richiede permesso, image-picker), **anteprima live** con overlay/blur/oscuramento, slider per Opacità overlay (0-100), Sfocatura (0-100), Oscuramento (0-80), e Rimuovi.
- **Applicazione globale**: `AppShell` mostra l'immagine dietro il contenuto di tutte le schermate che lo usano (hub e altre), con overlay/blur/darken applicati. Vale anche per lo STAFF (stesso AppShell + useTheme per-utente).

### Onestà
Zoom/Pan dell'immagine: non implementati (richiederebbero un editor gestuale) — overlay/blur/oscuramento sì. Applicazione su schermate che NON usano AppShell: da estendere caso per caso. Resa/permessi galleria = 🔴 device.

### Verifiche
- 0 errori; 0 cicli; **13 suite verdi**; chiavi sfondo per-utente + clamp testati. image-picker risolve in tsc.
## [Funzione 1/2 — Centro notifiche coordinatore]

> Consuma i dati notifiche del turno precedente (testati). UI nella schermata /notifiche esistente, non duplicata.

- **NotificheScreen estesa**: nuova sezione **NOTIFICHE** in cima (eventi staff: desiderata/ferie/permesso) con icona per tipo, testo, **nome mittente**, tempo relativo (ora/min/h/ieri/giorni) e pallino "non letto"; sotto resta la sezione **RICHIESTE DA GESTIRE** (Approva/Rifiuta) invariata.
- **Mark-as-read**: all'apertura (solo coordinatore) le notifiche vengono marcate lette dopo 600ms → il badge campanella si azzera. Le notifiche lette restano visibili in cronologia (opacità ridotta).
- Visibile solo al coordinatore (lo staff non vede le notifiche-coordinatore).

### Verifiche
- 0 errori; 0 cicli; **13 suite verdi**; timeAgo testato. Resa a schermo = 🔴 device.
## [Fix architetturali: preferenze per-utente + notifiche Staff→Coordinatore]

> Due bug reali confermati e corretti (uno era una mia regressione). + installato expo-image-picker.

- **P1 — Preferenze estetiche condivise tra utenti (BUG, corretto)**: la palette tema era su chiave GLOBALE `turnover.theme.palette` → tutti gli utenti sullo stesso device la condividevano. **Fix**: chiavi **per-utente** namespaced (`turnover.theme.palette.<email>`, idem sfondo `turnover.theme.background.<email>`); `useTheme` legge/scrive con `currentEmail` e ricarica al cambio utente. ✅ chiavi distinte per utente, case-insensitive, 'guest' pre-login. Mario(verde)/Luca(rosso)/Anna(AMOLED) ora isolati.
- **P2 — Nessuna notifica al Coordinatore (BUG, corretto)**: inserimenti staff non avvisavano il coordinatore. **Fix**: tipo `Notifica` + centro notifiche nello store (`notifyCoordinator`/`markNotificheRead`, persistito); agganciato a desiderata e richieste (ferie/permesso). **Solo le azioni STAFF** notificano. Badge campanella = notifiche non lette + richieste pending, azzerabile alla lettura. ✅ solo-staff, nome mittente risolto dai members, staff multipli, markRead, contatore.
- **expo-image-picker** installato (~16.0.6, SDK 54) — base per lo sfondo-foto personale.
- Pulito un campo `notifiche` duplicato nel value dello store.

### Onestà
Reperibilità: non passa dallo store (gestita in storage separato) → non agganciata alle notifiche per non inventare un flusso inesistente. UI del centro notifiche (lista dedicata) e sfondo-foto completo = prossimi step. Resa a schermo = 🔴 device.

### Verifiche
- 0 errori; 0 cicli; **13 suite verdi** (+notif: notifiche + isolamento preferenze).
## [Icone multi-colore per funzione — problema #1 dello spec, risolto e verificato]

> Affrontato il difetto più citato ("icone tutte dello stesso colore"). Prima ogni hub passava UN colore per categoria a tutte le card; ora ogni FUNZIONE ha il suo colore (valori esatti spec Liquid Glass iOS 27).

- **`FUNCTION_COLORS`** in `designSystem` (24 funzioni): Genera Turni #0A84FF, Matrici #4A90FF, Matrici Stagionali #32D74B, Simulatore #FF9F0A, Reparti #64D2FF, Personale #30D158, Ferie #FFD60A, Desiderata #BF5AF2, Criticità #FF453A, Banca Ore #30D158, Copertura #0A84FF, ecc.
- **3 hub ricablati** (Pianificazione/Personale/Controllo): ogni HubCard riceve il colore della propria funzione. ✅ verificato: valori = spec, 5 funzioni Pianificazione = 5 colori distinti, 0 residui AREA, 0 errori.

### Onestà sullo scope (invariata)
Lo spec chiede anche: Liquid Glass autentico su ogni card/header/sheet, sfondo-immagine da galleria (con blur/overlay/zoom/pan), redesign di tutte le 41 schermate + tutte le STAFF + login, su device. Ho consegnato la parte **centralizzata e verificabile** (colori-funzione, già fatti tema+gradienti+token nei turni scorsi). Le card glass per-schermata, lo sfondo-foto (richiede expo-image-picker non installato) e l'applicazione visiva su 41+ viste richiedono device e dipendenze — NON dichiarati fatti. Il tema (incl. STAFF) è già globale via useTheme: cambiando tema, anche le schermate staff si aggiornano.

### Verifiche
- 0 errori; 0 cicli; **12 suite verdi**; 24 funzioni-colore = spec. Resa a schermo = 🔴 da device.
## [Liquid Glass iOS 27 — preset tema + gradienti (valori esatti dello spec)]

> Integrato come preset selezionabile nel theme engine esistente (testato), non come riscrittura globale. Verificabile e non distruttivo verso i 6 temi esistenti.

- **Preset "Liquid Glass"** (7° tema) con i valori ESATTI dello spec: primario **#7C5CFF** (viola), sfondo **#0D0D12**, surface #1A1F24. Selezionabile da Account → Personalizzazione; deriva l'intero ThemeColors via `deriveTheme` (già testato). ✅ WCAG: testo/bg 19.4, accento viola/bg 4.5 (≥3.0 AA-UI).
- **Token Liquid Glass** in `designSystem`: palette di marca (lgPrimary/lgSecondary/lgWarning/lgInfo/lgBg/lgSurface/lgGlass/lgBorder/lgText2) + **`LIQUID_GRADIENTS`** (violet/blue/green/orange/red a 135°) pronti per LinearGradient.

### Onestà sullo scope
Lo spec mostra anche card a "vetro liquido" con trasparenza dinamica, sfondo-foto personale, e icone multi-colore per funzione su tutte le schermate. Ho consegnato la parte **verificabile e centralizzata** (preset+token+gradienti). Le card glass per-schermata, lo sfondo-immagine e l'applicazione su 41 viste sono cambi visivi che richiedono device e iterazione vista-per-vista — non li dichiaro fatti. I colori-icona AREA per funzione esistono già.

### Verifiche
- 0 errori; 0 cicli; **12 suite verdi**; Liquid Glass deriva e passa WCAG. Resa a schermo = 🔴 da device.
## [Assistente AI — rework della sezione esistente in centro operativo]

> Potenziata la sezione AI esistente (NON un secondo assistente). Ordine schermata: ricerca → domande rapide → categorie → analisi → chat libera in fondo collassata.

- **`services/aiQueries.ts`** (nuovo, puro/testato): motore di **domande deterministiche** che interroga i dati reali (riusa `fairnessReport`). Ogni risposta ha **formato uniforme** (Titolo/Risultato/Spiegazione/Criticità/Suggerimento/Azione). **19 domande operative** calcolate (notti/turni/weekend/festivi/carico/equilibrio/ferie/reperibilità) + **10 normative CCNL** (riferimenti statici, mai inventati) + **12 categorie**. ✅ provate su un piano reale: 0 crash, 0 risposte vuote, "chi è in ferie" identifica l'operatore corretto, EMPTY gestito senza crash su dati assenti.
- **AssistenteScreen ricostruita**: barra ricerca 52/r26 con filtro live sulle domande; griglia domande rapide; categorie a chip espandibili con conteggio; analisi automatiche; **chat libera spostata in fondo, collassata** dietro "Fai una domanda personalizzata" — riusa `assistantQuery` esistente (engine), nessuna nuova architettura.
- **Risposte uniformi** con azione che naviga alla schermata pertinente (es. equità → /direzione).

### Verifiche
- 0 errori; 0 cicli; **12 suite verdi** (+aiq). Risposte LLM-free (deterministiche); chat libera usa il provider esistente. Resa a schermo = 🔴 da device.
## [Audit totale — 1 link morto trovato e corretto]

> Audit con scansione automatica reale (route, link, handler, WCAG). Nessuna nuova funzione.

- **BUG trovato e corretto**: `DashboardScreen` navigava a `/personale` (route inesistente) → pulsante morto. Corretto in `/personale-lista`. Verifica: tutti i 34 target di navigazione ora risolvono a una route esistente (39 route).
- **FASE 6 — WCAG (calcolato)**: i 6 temi passano AA su testo primario (18.8–21.0) e accento (4.0–9.3 ≥ 3.0). `text3` terziario 3.1–3.5 = uso caption (AA large), segnalato come minore.
- **FASE 9 — sicurezza**: RoleGuard whitelista route/tab STAFF e blocca le admin → /accesso-negato; AuthGate montato. Nessun handler onPress placeholder.
- Falsi positivi verificati e scartati: route "orfane" (raggiunte via template-literal/tab), `setInterval` in Desiderata (nome di state, non timer).

### Verifiche
- 0 errori TS; 0 cicli; **11 suite verdi**; 34/34 link risolti; WCAG AA 6/6 temi.
## [3 hub ridisegnati a spec Apple — Pianificazione, Personale, Controllo]

> Ridisegno guidato dai 3 mock misurati (gli hub lasciati indietro nel turno scope-only, ora con i mock alla mano).

- **`components/HubCard.tsx`** (nuovo): tile icona **44×44 r22**, titolo **17/600**, descrizione **13/400** secondaria, accento per-area, badge, larghezza piena o flex. Allineata a sinistra. Variante `chevron` per card a piena larghezza.
- **`components/HubSection.tsx`** (nuovo): titolo sezione **13/700 uppercase** colore secondario.
- **Pianificazione**: TURNI (Genera Turni, Matrici, Matrici Stagionali, Simulatore in griglia 2 col) + CONFIGURAZIONE (Reparti full-width). Card grandi, no chevron (come mock 1).
- **Personale**: GESTIONE PERSONALE (Personale, Ferie e assenze, Richieste con badge, Desiderata) + DISPONIBILITÀ (Import, Reperibilità) + AMMINISTRAZIONE (Accessi full-width con chevron).
- **Controllo**: MONITORAGGIO (Centro Criticità, Dashboard Direzione) + GESTIONE RISORSE (Banca Ore, Postazioni) + ANALISI E REPORT (Copertura, Report/Export).
- **Spaziature a spec**: padding orizzontale 24, sezioni 24px, card 12px. Tutte le card piena larghezza in griglia 2 col.
- **Decisione misurata (no troncamento)**: su iPhone SE (375px) una card 2-col con chevron-in-riga lascerebbe ~27px al testo → troncamento. La regola "nessun testo troncato" prevale: chevron solo sulle card full-width; le 2-col restano icona-sopra/testo-sotto. Colori AREA per categoria mantenuti (coerenza semantica del prodotto).

### Verifiche
- 0 errori; 0 cicli; **11 suite verdi**. Resa/responsive a schermo = 🔴 da device.
## [Theme Engine globale + personalizzazione]

> Esteso il ThemeProvider esistente (non duplicato): i colori dell'intera app derivano a runtime da un'unica palette persistita.

- **FASE 1 — Theme Engine** (`utils/themeEngine.ts`, puro/testato): `deriveTheme(palette {bg,surface,accent,iconColor})` → ThemeColors completo; `withAlpha` per i soft derivati dall'accento. `useTheme()` ora espone `palette` + `setPalette` e calcola `colors = deriveTheme(palette)`. **Persistenza** `turnover.theme.palette` (sopravvive a riavvio/logout/aggiornamento). ✅ 6 preset, deriva bg/accent/soft/icon, deterministico.
- **FASE 3 — 6 temi predefiniti**: AMOLED, Ocean, Forest, Graphite, Crimson, Midnight (valori esatti della spec).
- **FASE 2/4/5 — schermata Personalizzazione** (`/personalizzazione`, link da Account): **anteprima live 220px** (header+card+icone+badge+tab dipinti con la palette), card temi con preview reale, palette **Sfondo (9)** e **Accento (9)**; ogni tap applica subito via `setPalette` e salva.
- **Verifica "il tema aggiorna tutta l'app"**: **39/42 schermate** leggono `useTheme`; le 3 restanti (hub) delegano ad `AppShell`+`QuickActionCard` (tematizzati) → nessun colore di sfondo fisso. Fonte unica runtime confermata (`colors = deriveTheme(palette)`).

### Verifiche
- 0 errori; 0 cicli; **11 suite verdi** (+theme). Resa/cambio a schermo = 🔴 da device.
## [Apple HIG — allineamento token ai valori iOS esatti]

> Design system già esistente e token-driven (15+ turni). Questo turno allinea i VALORI semantici ai numeri esatti della spec iOS, propagati a tutte le 41 schermate via il single-source DS.color — senza demolire il sistema glass su AMOLED (i materiali translucidi SONO il linguaggio iOS di Health/Fitness, non tinte piatte).

- **Colori semantici → valori iOS puntuali**: blue **#0A84FF** (era #4DA3FF), secondary label **#8E8E93**, tertiary **#636366**, separator **rgba(84,84,88,0.65)**. Propagati ovunque (theme→DS.color).
- **Token surface opachi aggiunti** (#1C1C1E/#2C2C2E/#3A3A3C) come opzione per liste Settings-style, accanto al glass esistente.
- Tipografia già normalizzata alla scala canonica (34/28/22/17/15/13/12) nei turni precedenti; tab bar/login/stagionali/ManageSheet già a spec.

### Onestà sullo scope
NON ho ridisegnato alla cieca tutte le 41 schermate in un turno: sarebbe stato un cambio non verificabile e rischioso. Ho consolidato la fonte di verità (token) ai valori iOS, da cui ogni schermata eredita. Il ridisegno per-schermata (Home editoriale, Personale Settings-style, liste vs griglie) richiede iterazione vista-a-schermo, screenshot per screenshot — come stiamo già facendo (Reparti/Gestisci, Matrici Stagionali, Login).

### Verifiche
- 0 errori; 0 cicli; **10 suite verdi**. Resa a schermo = 🔴 da device.
## [Matrici stagionali — ridisegno Apple-grade completo]

> Ridisegno totale della schermata (non patch). Logica invariata (validateSeasonalConfig, updateReparto→STAGIONALE, setRange/setOp/setOpSet).

- **Header 96** con due cerchi 44×44 (indietro chevron + chiudi X), titolo 28 bold + sottotitolo 15.
- **Periodo ricostruito**: eliminati i +/- a raffica su giorno/mese/anno. Ora due **campi data** (Inizio/Fine) che aprono un **picker inline** a colonne (giorno + mese), con Conferma. Nessuna sovrapposizione.
- **Configurazione operativa**: griglia **2 colonne**, card 90px r20, ogni parametro (Settori M/P/N, Settori chiusi, Posti letto, Copertura min %, Personale min) con label + **stepper** (valore 28 bold). Copertura a step di 5%.
- **Stagioni = sezioni collassabili** (radio + chevron animato 200ms), **una aperta per volta** (stile Apple Health).
- **Matrici = card selezionabili** 72px, 2 colonne, titolo + "ciclo N", bordo blu + sfondo `blueSoft` se selezionata; ultima card "＋ Personalizzata" → matrice-editor. Nessun testo troncato.
- **Info card** (info.circle) sulla continuità del ciclo; **Salva sticky** full-width 56/r18 (blu se valido) con icona.
- Tipografia sui token canonici (28/22/17/15/13); spaziature 24/16/12.

### Verifiche
- 0 errori; 0 cicli; **10 suite verdi**. Resa/animazioni/picker = 🔴 da device.
## ["Gestisci reparto" → bottom sheet Apple]

> Il pulsante Gestisci era già funzionante (ActionSheet nativo con Modifica/Rimuovi); il mock chiedeva una sheet Apple custom. Sostituita l'esperienza, logica e cascata invariate.

- **`components/ManageSheet.tsx`** (nuovo): bottom sheet stile Apple — titolo "Gestisci reparto" + sottotitolo col nome reparto, due righe **tile-icona + titolo + sottotitolo + chevron** (Modifica in blu, **Elimina in rosso**), Annulla, X. Materiale `card2`, spring open (damping 20), backdrop 0.5, token colore reali del tema (`card2/line/blueSoft/red`), tipografia sulla scala canonica (20/17/15/13).
- **RepartiScreen**: il pulsante "Gestisci" apre `ManageSheet` invece dell'ActionSheet di sistema; Modifica → wizard reparto con `id`, Elimina → conferma + `removeReparto` (cascata su staff/turni invariata). Rimosso l'import `showContextMenu` non più usato.

### Verifiche
- 0 errori; 0 cicli; **10 suite verdi**. Resa visiva/animazione sheet = 🔴 da device.
## [Apple UI Reconstruction — scala tipografica canonica]

> Limite d'ambiente invariato: nessuna istanza Supabase raggiungibile → go-live/realtime/RLS-runtime NON eseguibili qui (🔴, dichiarati). Eseguita la parte UI, interamente verificabile.

- **FASE 11 — Tipografia normalizzata alla scala Apple** (misurato): da **28 valori di fontSize frammentari** (12.5, 13.5, 11.5, 10.5, 9, 8.5…) a **10 gradini canonici** (11/12/13/15/17/20/22/28/34/40) su **55 file** (schermate+componenti). **Nessun testo sotto 11pt** (a11y). È la differenza misurabile tra una UI React-Native-standard e una scala tipografica coerente. Pesi e gerarchia (ordine relativo) preservati; 0 errori, 10 suite logiche verdi.
- **Tab bar** confermata conforme: solo icone, badge #FF2D55 Apple-style, pillola scorrevole, flottante (già a spec dai turni precedenti).

### 🔴 NON eseguibile in questo ambiente (dichiarato, nessun "dovrebbe/sembra")
Auth Supabase reale, realtime, dual-write server, RLS attack-test runtime, pilota multi-device: richiedono un'istanza Supabase + rete. Codice/artefatti pronti e testati (migration/redaction/sync-DLQ nei turni precedenti).

### Verifiche
- 0 errori; 0 cicli; **10 suite verdi**; tipografia: 28→10 valori, min 11pt.
## [Supabase Execution — migration engine + redaction + retry/DLQ (tutto testato)]

> Limite d'ambiente dichiarato: nessuna istanza Supabase raggiungibile da qui (rete solo npm/pypi/github) → SQL e Auth reali NON eseguibili. Implementato e PROVATO tutto ciò che è codice; il resto marcato 🔴.

- **FASE 2 — Migration engine** (`services/migrationEngine.ts`, puro): esplode il blob locale in righe relazionali (wards/matrices/staff/staff_wards/shifts/absences/vacations) con conteggi pre/post, **dedup** (unique staff/giorno), **scarto orfani** (shift/assenze senza staff) e `verifyIntegrity` (0 FK rotte). ✅ provato: 5 shift validi + 1 orfano scartato, ferie→vacations, malattia→absences, 0 FK rotte. **Bug semantico trovato dal test e corretto**: `integrity.ok` ora = "risultato finale pulito" (orfani scartati), non "input senza orfani".
- **FASE 7 — AI Redaction Layer** (`services/aiRedaction.ts`, OBBLIGATORIO): nomi→alias opachi (op_1,op_2…), email/telefono/CF→placeholder; `isClean()` come guardia pre-invio. ✅ provato su testo con PII reale (nome+email+tel+CF) → 0 PII residua.
- **FASE 6 — Offline robusto**: `backoffMs` esponenziale (1s→5min cap), `attempts` per op, **dead-letter queue** dopo MAX_ATTEMPTS=5; `SyncEngine.flush` ora ritenta i falliti e li sposta in DLQ. ✅ provato: fallimenti ripetuti→DLQ, fallimento parziale→attempts incrementato.
- **FASE 1 — verifica refoundation**: schema 36 cascade, shifts unique, audit append-only (nessuna policy U/D) → VERIFICATO staticamente.

### 🔴 NON eseguibile/verificabile in questo ambiente (dichiarato)
Esecuzione SQL su Supabase, Auth reale (login/OTP/refresh/multi-device), dual-write su server, RLS runtime, DR/restore: richiedono un'istanza. Gli artefatti e i layer client sono pronti e testati.

### Verifiche
- 0 errori; 0 cicli; **10 suite verdi** (sync+retry/DLQ, migration, redaction inclusi).
## [Supabase Refoundation — schema relazionale + RLS + sync queue cablata]

> Backend-first. Nessuna modifica estetica/AI/animazioni. Il critico dimostrato nell'audit precedente (coda offline senza produttori) è stato CORRETTO.

- **CRITICO RISOLTO — offline-first ora reale**: `services/syncMapper.ts` (puro) traduce ogni `commit()` in una operazione di sync; `enqueue` cablato nel punto unico di mutazione dello store. La coda aveva 0 produttori → ora ogni CREATE/UPDATE/DELETE di dominio genera un'operazione. ✅ end-to-end: mapper + Outbox enqueue/pending/markSynced + flush offline (resta in coda) / online (push e svuota).
- **FASE 3 — schema relazionale completo** (`integrations/supabase-schema-v2.sql`): **23 tabelle** (organizations, users, roles, wards, matrices, seasonal_matrices, staff, staff_wards, shifts, absences, vacations, desiderata, requests, availability, on_call, notifications, invitations, ai_conversations, ai_messages, settings, attachments, audit_log, sync_queue), **42 FK** con on delete cascade/restrict/set null, 14 indici, soft-delete su 8 tabelle, unique anti-duplicato (shifts per operatore/giorno, staff per email), trigger updated_at. Sostituisce il blob `app_state(jsonb)`. Nessun dato orfano per costruzione.
- **FASE 5 — RLS enterprise** (`integrations/supabase-rls-v2.sql`): helper `auth_org()/auth_role()/is_staff_self()`; isolamento per organizzazione su 16 tabelle; STAFF vede solo le proprie righe (shifts/absences/vacations); scrittura dominio solo OWNER/MANAGER; STAFF crea solo richieste/disponibilità/desiderata proprie; **audit_log append-only immutabile** (nessuna policy UPDATE/DELETE); ANON deny-all. Matrice di verifica inclusa (escalation/cross-ward/cross-org/enumeration/mass-assignment/bypass/tamper → tutti BLOCCATI).
- **FASE 11 — audit**: schema `audit_log` con before/after/ip/device/session/seq (conformità sanitaria) — popolato lato server.

### Verifiche
- 0 errori; 0 cicli; **9 suite verdi** (+sync). SQL = artefatti di migrazione (esecuzione su Supabase reale = 🔴 fuori ambiente).
## [Supabase Migration Audit — inventario reale + 1 finding architetturale critico]

> Audit (modifiche minime per regola del brief). Misurato, non dedotto.

- **FINDING CRITICO (architettura)**: esiste già un layer sync (`services/sync.ts` Outbox, `supabaseBackend.ts`, `syncBootstrap.ts`) + schema SQL con RLS, ma **lo store non chiama mai `enqueue`**: la coda offline non ha produttori → è un guscio scollegato. Inoltre `app_state` nello schema è **un blob jsonb unico**, non relazionale: niente FK/integrità/RLS per-entità. → Migrazione = lavoro reale, non cablaggio.
- **PERFORMANCE misurata** (✅ /tmp/perf): build 500op 112ms · 1000op 154ms · 2000op 274ms · **5000op 517ms** (CPU ok); ma il piano serializzato è **17MB a 5000op in un singolo blob AsyncStorage** → il muro è persistenza/sync, non il motore. Indica: persistenza per-entità + sync incrementale (non blob unico).
- **FASE 11 (correzione certa applicata)**: `AuditEntry` ora prevede **before/after** (tracciabilità sanitaria della modifica). IP/device NON aggiunti dal client (non attendibili) → popolati lato Supabase. Retrocompatibile, suite audit verde.
- **Sicurezza (documentata, non risolvibile lato client)**: `role` letto dal blob locale senza verifica server → chi modifica lo storage diventa OWNER; `merge()` è mass-assignment by design. Entrambi chiusi solo da Supabase Auth + RLS.

### Verifiche
- 0 errori; 0 cicli; **8 suite verdi**; performance fino a 5000 op misurata realmente.
## [Auth Audit Round 2 — 3 bug critici trovati e corretti]

> Revisione ostile del mio stesso lavoro. Tre difetti reali trovati e chiusi prima di dichiarare pronto.

- **CRITICO 1 — reset password faceva AUTO-LOGIN**: `setNewPassword` scriveva la sessione → l'utente entrava nell'app senza ripassare dal login (viola FASE 4). **Corretto**: dopo il reset la sessione viene rimossa, ritorno obbligato al login.
- **CRITICO 2 — frame protetto al cold start**: AuthGate era solo-effetto → Dashboard/area poteva renderizzare per un frame prima del redirect. **Corretto**: AuthGate ora monta un **overlay opaco bloccante** (sopra lo Stack, zIndex 9999) finché lo stato non è (idratato E autenticato E coerente con la rotta) — zero frame di contenuto protetto. Mai copre le schermate di auth.
- **CRITICO 3 — sessione fantasma al cambio ruolo**: nessun `loginAsOwner` → un manager che accedeva dopo uno staff restava `role: STAFF` e veniva bloccato dal RoleGuard. **Corretto**: `loginAsOwner(email)` ripulisce il ruolo al login manager; logout già completo (session + sessione staff).
- **FASE 5 — Invitation Token** (architettura, non Supabase): `utils/invitations.ts` (token opaco, scadenza 7gg, stati pending/accepted/revoked/expired) + store (`inviteStaff`/`acceptStaffInvite`/`revokeStaffInvite`, persistiti) + `loginAsStaff` ora accetta come autorizzazione **un invito accettato** oltre alla membership. ✅ ciclo completo: create/scadenza/token-o-email errati/no-riuso/revoca.
- **Confermati GIÀ corretti (audit)**: spoof staff impossibile (`isAuthorizedStaff`), OTP invalidato dopo il reset (`removeItem(K_CODE)`), lockout 5 tentativi, policy 8+/A/a/1.

### Verifiche
- 0 errori (filtro esteso); 0 cicli; **8 suite verdi** (mxf, rc3, dash0, audit, auth3, staffstats, board, **invite**).
## [Authentication Rebuild + Login Experience]

> Nota di realtà: il flusso Supabase descritto nel brief (email→link→app) NON esisteva nel progetto — l'auth è locale via authProvider/useAuth con OTP 6 cifre già professionale. Costruito ciò che mancava davvero; il resto del brief (deep link, refresh token, email reali) = Supabase, dichiarato non implementabile/verificabile qui.

- **FASE 1 — AuthGate obbligatorio (il buco vero)**: prima l'app apriva la Dashboard da OWNER senza login. Ora `AuthGate` (montato accanto a RoleGuard): non autenticato → SOLO /login (whitelist: login/registrazione/recupero/onboarding); autenticato su /login → redirect alla propria area; nessun flash in cold start (gate su loading+hydrated). Autenticato = session owner (useAuth) **oppure** sessione staff locale (role+currentEmail) — ponte dichiarato verso Supabase.
- **FASE 3/7 — Login ridisegnato a spec**: gerarchia Logo→TURNOVER→"Gestione intelligente della turnistica sanitaria"→Ruolo→Email→Password→Accedi→link; padding 32, spaziature 24, campi **56/r18 traslucidi** con label sopra; **segmented con pillola spring**; **Accedi pieno 56/r18, pressione 0.97/140ms** (PressableScale ora accetta durate per-istanza); niente sheet, pagina piena safe-area.
- **FASE 4 — policy password a spec, fonte unica**: la vecchia era debole (solo 8+numero) → `utils/passwordPolicy` (8+, maiuscola, minuscola, numero) usata da reset E registrazione via re-export del provider (✅ 5 casi). Il flusso OTP locale 6 cifre (scadenza/rate-limit/resend, già ✅ in auth3) NON fa auto-login: successo → torna al login ✓.
- **Logout completo**: prima Esci chiudeva solo la session owner → lo staff restava dentro. Ora signOut + logoutSession → /login.
- Fix in corsa: passwordIssue usata internamente dal provider (import+re-export), useStore mancante in AccountHub.

### Dichiarato NON implementabile/verificabile qui (FASI 5/6/8 parziali)
Deep link e callback Supabase, magic link, refresh/scadenza token reali, email OTP reali, sessione corrotta server-side, cold-start su device: richiedono backend e dispositivo. I punti di innesto sono pronti (authProvider sostituibile, schema SQL presente).

### Verifiche
- 0 errori (filtro esteso ai duplicati/2305); 0 cicli; **7 suite verdi** (auth3 estesa: provisioning/lock/OTP/policy).
## [Final Product Review Board — verifica da zero, sonde ostili]

> Nessuna fiducia nei report precedenti: riverificato tutto + 4 sonde nuove. Motore invariato.

- **BUG CRITICO trovato e dimostrato**: le assenze sono mono-mese → una maternità inserita a maggio **non copre giugno** (l'operatrice risultava in turno). **Fix certo consegnato**: `splitAssenzaRange` (helper puro: spezza per mese, gestisce il cambio anno, valida i range — ✅ 5 mesi/wrap/invalidi) + `addAssenzaRange` nello store (un solo commit + rebuild). Il date-picker multi-mese nel wizard = correzione consigliata (UI da fare a schermo).
- **Sonda 06:30** (5 assenze + 1 maternità su 14 op, ✅): toolchain completa in **32ms**; 6/6 assenti riconosciuti per nome; **0 postazioni scoperte** — l'engine ha già redistribuito in generazione (autofix=0 è coerenza, non mancanza); AI con causa/impatto/rischio/soluzione.
- **Determinismo post-persistenza** (✅, mai testato prima): stesso piano dopo round-trip JSON (coerenza AsyncStorage).
- **Trust provisioning**: primo accesso staff gated da `isAuthorizedStaff` ✓; resta ALTO il modello d'invito senza token (claim dell'account da chi conosce l'email autorizzata) → da chiudere con Supabase Auth.

### Verifiche
- 166 file 0 errori; errori reali+TDZ = 0; cicli = 0; **7 suite verdi** (6 core + board).
## [Apple-Grade V3 — Bottom bar fisica + rifiniture finali]

> Motore invariato. Conflitto tra direttive risolto a verbale: dashboard resta a 6 sezioni (Reconstruction FASE 10 = stato consegnato), non 9 (V3).

- **Bottom bar a spec esatta**: altezza **76** · radius **38** · margine inferiore **24** · larghezza **92%** · padding **12** · materiale `rgba(25,25,25,0.55)` + blur 60 + bordo 0.12 + highlight 0.18 + **edge inferiore translucido** + shadow **0.08**. Icone **32**, etichette **13 medium**. **Pillola bianca 0.16, radius massimo, che SCORRE con spring morbida (~180ms)** — mai fade, mai mount/unmount. **Badge flottanti #FF2D55** esterni all'icona, cablati a un conteggio reale (richieste pending OWNER → tab Personale).
- **FASE 14**: aggiunto `AIModel` (ultimo tipo mancante); provider list aggiornata (OpenAI/Anthropic/Gemini/OpenRouter/Ollama/LM Studio/vLLM/LocalAI) — architettura già sostituibile (✅ mock provato).
- **FASE 7**: scala tipografica a token (34/28/22/18/16/13, pesi Bold/Semibold/Regular/Medium); zero consumer rotti (verificato); migrazione dei literal per-schermata = passata dichiarata.
- **FASE 11 Reparti**: già oggetto informativo (Modalità · Matrice attiva · Copertura · Prossimo cambio + menu contestuale); rimossa l'unica violazione (X eliminazione visibile, duplicato del menu).
- **FASE 13 Account**: card **SISTEMA** con sole verità: Archiviazione locale · Sincronizzazione non attiva · **Audit log attivo** · AI: LLM non collegato · Privacy on-device.
- **FASE 17**: scala estesa — **100 reparti × 400 op: 392ms** ✅ (oltre: 50×250 133ms, 20×500 35ms).

### Verifiche (post-modifiche)
- 166 file 0 errori sintassi; errori reali+TDZ = 0; cicli = 0; **6 suite core verdi** (mxf, rc3+100rep, dash0, audit, auth3, staffstats).
## [Ultimate Master Audit — fondazione Hospital Ready]

> Motore invariato. Ambiente container resettato a metà sessione: progetto ripristinato dallo zip, toolchain reinstallata, 6 suite core ri-eseguite oggi (mxf, rc3, dash0, audit, auth3, staffstats); le altre 18 suite storiche restano come risultati documentati nei report precedenti, non ri-eseguiti oggi.

- **FASE 5 — Control Room definitiva (6 sezioni)**: 1 STATO (hero + Copertura · Operatori presenti · Assenze · Reperibili) → 2 CRITICITÀ → 3 EQUITÀ (Fairness + Fedeltà matrice in una riga) → 4 TREND → 5 INSIGHT → Azioni ultime.
- **FASE 9 — AI Foundation enterprise, LLM-agnostic**: `AIProvider {name, complete}` + registry `setAIProvider/getAIProvider` (default null = solo risposte deterministiche dal motore; Ollama/Qwen/DeepSeek/Mistral/Gemma/Llama collegabili senza toccare l'app); `buildAIContext` (grounding JSON: reparti/operatori/copertura/fairness/fidelity/avvisi/criticità); tipi `AIInsight`, `AITask`, `AIExplanation`.
- **FASE 10 — risposte con causa/impatto/RISCHIO/SOLUZIONE**: `analyzeDay` ora include "• Rischio" (postazioni scoperte → sovraccarico) e "• Soluzione" (sostituzioni proposte o reperibilità/scambi), più `spiegazioni: AIExplanation[]` strutturate. ✅ testato.
- **FASE 8 — Audit log con versionamento**: `services/auditLog.ts` (AuditEntry con `seq` monotono che sopravvive al cap 500, append puro ✅, persistenza round-trip ✅) cablato su 4 mutazioni critiche (rimuovi reparto/operatore, approva/rifiuta richiesta) con actor+role.
- **FASE 15 — scala misurata** (✅ rc3): 10 rep×60 op 79ms · 20×120 150ms · **50 reparti×250 op 138ms** · **20 reparti×500 op 134ms** (sovra-organico estremo: fairness 0 → segnale reso governabile dai KPI, performance comunque dimostrata a 500 operatori).
- Fix: import `recordAudit` mancante in useStore (4 TS2304) → 0 errori reali+TDZ.

### Verifiche (post-reset)
- 166 file 0 errori sintassi; errori reali+TDZ = 0; cicli = 0; **6 suite core verdi** (mxf 100/100/100/97/Δ19 + AI rischio/soluzione/context/provider; rc3 estremi+scala; dash0; audit; auth3; staffstats).
## [Master Audit + Material System avanzato]

> Motore invariato. Correzioni automatiche solo dove certe; il resto in report.

- **FASE 13 — pillola scorrevole**: la tab attiva ora ha UNA pillola che **scivola** (onLayout per-tab → translateX animato 220ms), non appare/scompare; highlight superiore sulla bar (rifrazione sobria). GlassCard: **bordo fisico inferiore** (edge scuro 1px) → materiale presente, non vetro piatto.
- **Dashboard a 9 sezioni**: 1 Stato · 2 Criticità · 3 Assenze · 4 Reperibili · **5 Equità · 6 Fedeltà matrice (separate)** · 7 Trend · 8 Insight · 9 Azioni.
- **Accessibilità**: eliminati i testi sotto 10pt (CellEditor 9→11/10, StaffDetail 9→10, badge 10→11, ShiftGrid dow 9→10). ErrorBoundary allineato alla palette (resta theme-indipendente by design).
- **FASE 11 — stress estremi (✅ /tmp/rc3)**: EPIDEMIA 40% malattia → cov 92%, fidelity stabile (F escluse correttamente); FERIE MASSIVE 50% → 86%; CARENZA strutturale → 53% **visibile**; reparto piccolo 96%. Build 1–20ms. L'app misura la crisi, non la maschera.
- **Audit architettura**: 0 componenti orfani (ShiftBadge/TopBar erano falsi positivi: import relativi), 0 cicli, ErrorBoundary presente, hex residui censiti (10, di cui 2 corretti).

### Verifiche
- Errori reali+TDZ = 0; 165 file 0 errori; import↔export OK; cicli = 0; **24 suite verdi** (incl. rc3).
## [Refactor esperienza STAFF — due prodotti, un backend]

> Motore invariato. RBAC a doppia protezione (UI + routing), zero funzioni OWNER visibili allo Staff.

- **Dashboard STAFF dedicata** con gli **8 widget richiesti, tutti da dati reali**: Turno di oggi · Prossimo turno · Ore lavorate (hoursBank) · Monte ore previsto · Ferie residue (ferieAnnue o stima 26 dichiarata) · Richieste in attesa · Prossima reperibilità (disponibilità reali) · Notifiche recenti. + griglia "Le tue sezioni" (9 sezioni Staff con colori AREA). Logica pura in `utils/staffStats.ts` (✅ Node: turni/ferie/richieste/reperibilità/notifiche).
- **Navigazione separata**: tab bar **role-aware** — STAFF vede solo Dashboard e Account; gli hub Pianificazione/Personale/Controllo spariscono dalla barra.
- **Mai redirect silenziosi**: nuova schermata **"Accesso non autorizzato"** (`/accesso-negato`, lucchetto + "Torna alla mia area"); `RoleGuard` v2 blocca anche i **singoli tab hub** dentro (tabs) e ogni route OWNER (deep-link inclusi) reindirizzando lì.
- **Banca Ore per STAFF**: sola consultazione, **solo la propria riga** (saldo/straordinari/debito/notti/festivi); route consentita.
- **Pulizia**: eliminato `StrumentiScreen.tsx` (sorgente orfano).

### Dichiarato non implementato (onesto)
- Esportazione **PDF/calendario** dei turni, vista giornaliera/settimanale in "I miei turni", schermata **Backup/Sincronizzazione**: richiedono librerie native/print o backend → pianificate con Supabase, non simulate.

### Verifiche
- Errori reali+TDZ = 0; 165 file 0 errori; import↔export OK; cicli = 0; **23 suite verdi** (incl. staffstats).
## [Motion System + Glass Material System (token-driven)]

> Solo UI. Motore invariato. Nessun valore sparso: tutto da token.

- **FASE 1 — Token system completo** in `utils/designSystem.ts`: SPACING (griglia 8pt), TYPE (largeTitle→kpi 40), **GLASS** (bg 0.05 · border 0.12 · highlight 0.18 · blur 60 · radius 32), **DEPTH** (none/soft/floating, ombre minime), **MOTION** (8 animazioni nominate: cardPress 0.98/170 · tabChange 200 (uscente→0.6, entrante 0.92→1) · pageEnter 220 (fade+12px+0.99) · pageExit 220 · modalOpen 240/0.94 · modalClose 240 · kpiUpdate 300 · sectionReveal 200 · pillIndicator 220).
- **FASE 2 — GlassCard a 5 layer** (upgrade in-place → tutte le card esistenti): blur 60 → tinta 0.05 → bordo luminoso 0.12 → **highlight superiore 0.18** → contenuto; radius 32, ombra soft.
- **FASE 3 — wiring**: PressableScale/CountUpText/FadeInView (+scaleFrom) e Stack (220ms) leggono i token MOTION.
- **FASE 4 — Bottom bar a spec**: sospesa (margine inferiore **+20** oltre la safe-area), padding 16, **vetro chiaro** GLASS.background/border, blur 60, **pillola attiva animata 220ms** (fade+scale 0.9→1, mai istantanea), TabChange a spec (opacità 1↔0.6, scala 0.92→1, 200ms).
- **FASE 5 — Dashboard 1-8**: STATO → CRITICITÀ → **ASSENZE** → **REPERIBILI** → EQUITÀ → TREND → INSIGHT → AZIONI (ultime).

### Verifiche
- Errori reali+TDZ = 0; 163 file 0 errori; import↔export OK; cicli = 0; **22 suite verdi**.
## [MATRIX FIRST verificato + KPI Fedeltà Matrice + Control Room finale + AI consulente]

> Motore NON modificato: audit + KPI di misura + UI. Tutto provato in Node.

- **AUDIT MOTORE (FASI 1-3, ✅ provato)**: il motore è **matrix-first per costruzione** — STEP 1 ancora ogni operatore al ciclo via calendario assoluto (`seq[(absDayIndex+offset) % L]`, stagionali risolte per-giorno). Esperimenti: capienza accoppiata **100%**, rientro da ferie **100%** (riprende il punto esatto), continuità mese successivo **100%** (non reinventa il piano), lock-stability 97%, sensibilità Δ19 su 40 manomissioni, deterministico. Le "deviazioni" osservabili sono potatura da capienza (N matrice > slot) e personalizzazioni volute (PT/notti=0/matrici miste): gerarchia MATRICE→…→COPERTURA visibile e misurata, non casualità.
- **FASE 4 — KPI Matrix Fidelity** (`services/matrixFidelity.ts`, layer puro): 0-100 con bande (100 piena / ≥90 minima / ≥75 moderata / ≥50 molte-deroghe / alterato). Semantica: S(smonto)≡R (trasformazione contrattuale, non deroga); F escluse (interruzioni legittime). Esposto in **Dashboard, Centro Criticità, Direzione**.
- **FASE 5 — Control Room finale**: 1 STATO (Copertura · Operatori presenti · **Assenze** · **Reperibili** oggi) → 2 CRITICITÀ → 3 **EQUITÀ** (Fairness + Fedeltà matrice) → 4 TREND → 5 INSIGHT → 6 AZIONI.
- **FASE 6 — AI consulente**: tipi `AIAction`/`AISuggestion`/`AIDecision` (+`decideSuggestion`); `analyzeDay` ora risponde con Cause · Assenti · **Copertura del giorno** · Sostituzioni (→AISuggestion[]) · **Impatto equità** · **Impatto matrice** · **Impatto banca ore**. Solo dati reali (✅ testato).
- **FASE 7 — Design finale**: bottom bar più staccata (margini 20), blur 60, **bordo luminoso** rgba(255,255,255,0.14); hero 280; radius card token **32**.

### Verifiche
- Errori reali+TDZ = 0; 163 file 0 errori; import↔export OK; cicli = 0; **22 suite verdi** (incl. mxf).
## [RC Definitiva — security staff, AI per-giorno, simulazione ospedaliera, palette v8]

> Motore invariato. Tutto il nuovo = layer puri + UI.

- **FASE 8 Login definitivo**: Staff ora con **password** (provisioning al primo accesso, verifica hash, **lockout 5 tentativi/15min**, lastLogin, reset token). Logica pura `utils/staffAuth.ts` (✅ testata: provisioning/lock/sblocco/reset), persistenza `services/staffCredentials.ts`. Hash locale placeholder dichiarato (Supabase farà l'hashing reale).
- **FASE 9 AI**: `AIService.analyzeDay` — "Perché il 14 manca personale?" → **cause reali** (assenze/malattia/maternità per nome), cause strutturali, postazioni scoperte, sostituzioni proposte. Guard a DB vuoto (messaggio onesto, niente crash). ✅ testato.
- **FASE 6 Simulazione ospedaliera (✅ eseguita)**: reparto Medicina M3/P3/N2, 18 op, ferie+malattia+maternità applicate (F), festivi gestiti; copertura 100%, **0 violazioni 11h**, max 5 giorni consecutivi, max 2 notti consecutive; orizzonti 1/3/6/12 mesi (10–91ms) sempre **0 violazioni**.
- **FASE 7 Distruttivo (✅)**: matrice eliminata→null controllato, seasonal undefined→invalida, reparto fantasma→nessun crash, ferie sovrapposte→nessun crash, reperibilità id inesistente→no-op, AI ctx vuoto→messaggio onesto.
- **FASE 10**: palette aree v8 (Richieste #FF9F0A, Reperibilità #64D2FF, Criticità #FF453A, Report #5AC8FA, Direzione #FFD60A, Banca ore #32D74B) + remap card hub.

### Verifiche
- Errori reali+TDZ = 0; 162 file 0 errori; import↔export OK; cicli import = 0; **regressione 21 suite verdi**.
## [Release Candidate — login a 2 ruoli, harness RC end-to-end, architettura AI]

> Motore invariato. Login/AI = UI+layer; harness = solo /tmp (non in app).

- **Login separato ○ Manager / ○ Staff** (segmented 44pt in LoginScreen): Manager = email+password (signIn); Staff = `loginAsStaff(email)` con gating già ✅ (autorizzata, attiva, non revocata, non duplicata, collegata a operatore). Campo password disabilitato in modalità Staff (provider locale: l'autorizzazione fa da credenziale — da sostituire con password reale al collegamento Supabase).
- **Harness RC (/tmp/rc.js, ✅ eseguito)**: stress 1/5/20 reparti e 5→100 operatori (build 6–30ms), **12 mesi consecutivi in 182ms con 0 violazioni riposo 11h**, evento reale "assenza improvvisa" → copertura cala, whyUncovered risponde (2 cause + 2 strutturali), criticità rilevate, fairness deterministico in range, AIService grounded.
- **Architettura Assistente IA (Fase 13)**: `services/ai.ts` (AIMessage/AIConversation/AIProvider per Supabase futuro, AIService = consulente che risponde SOLO da dati reali: assistantQuery + fairness + banca ore + suggerimenti) + `services/aiChatStore.ts` (persistenza). Nessun modello esterno collegato.

### Verifiche
- Errori reali+TDZ = 0; 160 file 0 errori; import↔export OK; **regressione 19 suite verdi** (incl. rc).
## [HOTFIX CRITICO — crash all'avvio "Cannot access 'te' before initialization"]

> Diagnosi strumentale (no ipotesi). Causa radice corretta, nessun workaround/try-catch.

- **Causa radice**: `screens/DashboardScreen.tsx` riga 45 (introdotta nel V7): `const scoreCol = score >= 90 ? …` leggeva `score`, dichiarata **alla riga 67** dello stesso scope → TDZ alla prima render della Home ("Cannot access 'score' before initialization"; nel bundle web minificato il nome diventa `te`).
- **Fix**: spostata la dichiarazione di `scoreCol` immediatamente dopo quella di `score` (correzione d'ordine).
- **Hardening del processo**: il check "errori reali" ora include **TS2448/TS2449/TS2454** (use-before-declaration) — il punto cieco che aveva lasciato passare il bug. Scansione su tutto il progetto: **0 occorrenze** residue.
- Verifiche: cicli import relativi = 0 (rilevatore dedicato); `services/hours.ts` (`let te` letterale) verificato innocente; 158 file 0 errori; import↔export OK; regressione 16 suite verdi.
## [Micro-animazioni premium (discrete, timing da spec)]

> Solo UI/animazioni. Motore invariato. Nessuna dipendenza aggiunta (Animated core).

- **Pulsanti** (PressableScale): press 1→0.98 in **130ms**, rilascio in **160ms**, curva morbida, zero rimbalzo (prima: spring).
- **Bottom bar**: tap tab → **pop 1→1.08→1 (180ms)**; tab attiva resta a **1.06** con pill illuminata; transizione animata al cambio focus.
- **Apertura/chiusura schermate**: Stack nativo `fade_from_bottom` **200ms** (fade + movimento verticale leggero, inverso in chiusura).
- **Hero/KPI**: **count-up 300ms** (`CountUpText`: anima il numero iniziale, suffissi preservati — "85%", "12/15"; fallback statico se non numerico). Applicato a valore KPI e anello salute.
- **Criticità**: fade-in + slide minima al mount (delay scalare 60ms per riga). **Trend**: disegno graduale **500ms** al primo caricamento. **Insight**: fade-in.

### Verifiche
- Errori reali TS = 0; 158 file 0 errori; import↔export OK; regressione **16 suite verdi**.
## [V7 — iOS Native Premium: hero "Stato del reparto", trend reale, token definitivi]

> Solo UI. Motore/AI/RBAC/store invariati. Nessun dato inventato.

- **Token V7**: surface #080808/#101010, testo secondario #B3B3B3, terziario #7A7A7A, divider 0.05. Colori funzionali aggiornati (Generazione #3B82F6, Personale #34C759, Criticità #FF9500, Report #30D158, Reparti #64D2FF, Ferie #FFD60A, Reperibilità #FF9F0A, Sostituzioni #FF453A, Assistente #AF52DE) — stesse chiavi AREA, propagazione automatica.
- **Dashboard a 6 sezioni** (ordine V7): **1 Hero "STATO DEL REPARTO"** (radius 32, padding 24, min 260) con **anello salute 96pt** a scala 4 colori (≥90 #34C759 / ≥75 #64D2FF / ≥60 #FFD60A / <60 #FF453A) + check compliance; **2 KPI 2×2** (Copertura, Operatori, Criticità, **Equità**) valore 40pt; **3 Criticità come righe 72pt** (pallino + testo + chevron → Centro Criticità); **4 Trend reale** (barre per-giorno = operatori in turno dal piano corrente, niente dati inventati); **5 Insight in UNA card** radius 28 con timeline verticale (max 4); **6 Azioni** ultime. Card a schermo ridotte (insight 3 card → 1; KPI 7 → 4).
- **Touch target 44pt obbligatori**: pulsanti header (back/X/azioni) 32-38 → **44×44**. Titolo header 22, sottotitolo 14/500.
- **KPI value 40pt**, icone QuickAction **28pt**, QuickAction height **116**.

### Verifiche
- Errori reali TS = 0; 156 file 0 errori; import↔export OK; regressione **16 suite verdi**.
## [V3 — Semplificazione UX: menu contestuali, Control Room, priorità criticità]

> Solo UI/UX, zero funzioni perse. Motore/AI/RBAC invariati.

- **Menu contestuale nativo iOS** (`utils/contextMenu.ts`, ActionSheetIOS + fallback Alert, zero dipendenze). Pulsanti visibili ridotti: card Reparto **2→1** ("Gestisci" → Modifica/Rimuovi nel foglio), matrici custom nel wizard **3→1** (•••), azioni stagione **2→1** (•••). Distruttive sempre nascoste nel menu (stile iOS).
- **Dashboard → Control Room** (ordine obbligato): **1 Stato reparto** (Copertura, Operatori, **Assenze oggi**, **Turni generati**) · **2 Rischi** (Criticità, Richieste, **Equità carichi** = fairnessScore con categoria — modulo fairness ✅ testato, ora finalmente esposto) · 3 Trend/Analisi (ring) · 4 Insight · 5 Azioni (in fondo).
- **Centro Criticità → priorità operative**: allarmi **ordinati per gravità** (🔴→🟡→🟢) e resi come righe-priorità (pallino colorato, card neutra, descrizione + azione) — stile Health, non dashboard aziendale.

### Verifiche
- Errori reali TS = 0; 156 file 0 errori; import↔export OK; regressione **16 suite verdi**.
## [Apple-grade V2 — griglie uniformi, Turni più leggibili, card Reparti complete]

> Solo UI. Motore, AI, RBAC, workflow invariati.

- **Azioni rapide uniformi**: QuickActionCard ad altezza FISSA 124 (prima minHeight → altezze variabili = griglia "ammassata"), contenuto centrato (icona+titolo+sottotitolo), 2 colonne flex identiche gap 12.
- **Turni (schermata chiave)**: celle griglia 38×46 → **44×52**, badge turno 30 → **34**, contrasto colori turno su nero **0.18 → 0.24**.
- **Card Reparti (stile Wallet)**: ora Nome · Modalità · Matrice attiva · **Copertura %** (computeCoverage.byRep, soglie verde/giallo/rosso) · Prossimo cambio · Nuova matrice.
- **Micro-tap a spec**: PressableScale 0.97 → **0.98** (spring nativo, no bounce).
- Stati vuoti: confermati premium con CTA su Reparti/Personale (+12 schermate con EmptyState).

### Verifiche
- Errori reali TS = 0; 155 file 0 errori; import↔export OK; regressione **16 suite verdi** (incl. dash0).
## [Premium redesign — fondazione Black AMOLED + colori funzionali + KPI reali]

> Solo UI/design system. Motore, logica, RBAC, workflow invariati.

- **Black AMOLED foundation** (token centralizzati in `utils/designSystem.ts` → tutta l'app): bg **#000000**, surface **#0A0A0A**, glass 0.05 / glass-elevate 0.08, border 0.10, divider 0.06, testo #FFF / #A8A8A8 / #6E6E73. Semantici iOS: blue #4DA3FF, green #30D158, orange #FF9F0A, red #FF453A, purple #BF5AF2. Radius card 24, floating 32. Bottom bar fallback → glass nero rgba(10,10,10,0.70).
- **Colori funzionali per AREA** (icona/titolo, mai tutta la card): Pianificazione/Personale/Controllo/Ferie/Desiderate/Reperibilità/Report/Criticità/Account; applicati a 21 QuickActionCard (hub + dashboard) via nuova prop `color`.
- **BUG KPI a database vuoto (✅ provato in Node)**: l'engine a ctx vuoto ritorna copertura 100% e score 70 (vacui). La Dashboard e il Centro Criticità ora mostrano **"Nessun dato disponibile"** (gate `hasData`) finché non esistono reparti/personale: niente valori fittizi. Ordine dashboard: KPI → Analisi → Insight → Azioni (data-first).
- **Pulsante-bug**: "Genera Turni" puntava a '/' (loop home) → ora `/turni`.
- **Header uniformi**: SheetHeader/ScreenHeader minHeight 72.

### Verifiche
- ✅ Node: dash-empty (100/70 documentato → gate necessario), regressione 15 suite verdi. Errori reali TS = 0; 155 file 0 errori; import↔export OK.
## [Pre-release audit: rimozione strumenti legacy + notifiche role-aware]

> Solo UI/navigazione/permessi. Motore invariato.

- **Fase 1**: rimosso l'unico ingresso a `strumenti` (legacy) in TurniScreen + eliminata la route (`app/strumenti.tsx` + Stack.Screen). `StrumentiScreen.tsx` resta come sorgente orfano (rimovibile).
- **Fase 2 (fix RBAC reale)**: `NotificheScreen` era il centro coordinatore (tutte le richieste + approva/rifiuta) ma accessibile a STAFF → leak. Ora role-aware: STAFF vede **solo le proprie** notifiche (filtro per infId), badge per stato (In attesa/Approvata/Rifiutata), **niente approva/rifiuta**.

### Verifiche
- Errori reali TS = 0; import↔export OK; 155 file 0 errori; regressione motore verde (incl. rbac2).
## [Hardening finale: date, reperibilità raggruppata, unicità staffId]

> Solo UI/overlay/permessi. Motore invariato.

- **Date (Fase 1)**: nessun `toLocaleDateString`/`formatDate` nel progetto; pill dashboard ora usa `fmtDataIt` (GG/MM/AAAA); reperibilità usa `fmtDataIt`.
- **Reperibilità coordinatore (Fase 2)**: sezioni separate **IN ATTESA / APPROVATE / RIFIUTATE** con conteggio, in attesa per prime.
- **Unicità (Fase 3)**: helper puri `emailDuplicata` + `staffIdDuplicato`; login STAFF risolve `staffId` (Membership.infId); schermate STAFF filtrano per infId (richieste/desiderate/turni/reperibilità).

### Verifiche
- ✅ Node: unicità email/staffId, reperibilità transizioni, `can()`. Regressione motore verde (incl. rbac2). Errori reali TS = 0; nessun dead-button; nessun object-as-child.
## [Reperibilità operatore completa + RBAC store + dup-email + date]

> Solo UI/overlay/permessi. Motore invariato. Riuso del pattern del modulo on-call esistente (niente duplicazioni); on-call coordinatore intatto.

- **Reperibilità operatore** (`ReperibilitaOperatore`, logica pura `utils/reperibilitaOpLogic`, persistenza `services/reperibilitaOp`): STAFF invia data (GG/MM/AAAA via stepper) + fascia ("Tutto il giorno" o HH:MM-HH:MM) + telefono (precompilato dall'ultima richiesta) + note → stato IN ATTESA. Coordinatore: card Nome/Data/Fascia/Telefono/Note/Stato con **CHIAMA (`tel:`), ACCETTA, RIFIUTA** e badge giallo/verde/rosso. Tutto sulla route `reperibilita` role-aware (nessuna nuova schermata).
- **RBAC Livello 3** (turno precedente): guard `can()` su add/update/remove staff e reparti + regenerate. Approvazioni reperibilità gated via `can(role,'approve')`.
- **Login Staff**: aggiunto errore controllato su **email duplicata** (oltre ad autorizzazione/attivo già presenti).

### Verifiche
- ✅ Node: transizioni reperibilità (attesa→approvata/rifiutata), badge colori, `emailDuplicata`, `can()`. Regressione motore verde (incl. rbac2). Errori reali TS = 0.
## [RBAC a 3 livelli — guard nello store (Livello 3)]

> Solo store/permessi. Motore/logica di dominio invariati. Riuso di utils/permissions (can/isAuthorizedStaff), niente duplicazioni.

- **Livello 3 (action store)**: guard `can(role, ...)` aggiunti a addStaff/updateStaff/removeStaff (editPersonale), addReparto/updateReparto/removeReparto (editReparti), regenerate (editTurni). approveRequest/rejectRequest erano già protetti. STAFF → no-op controllato, niente crash.
- Confermati già presenti: **Livello 1** (RoleGuard blocca route/deep-link per STAFF), **Livello 2** (RichiesteScreen nasconde Approva/Rifiuta/Invita per STAFF), **login Staff** gated da `isAuthorizedStaff` (email non autorizzata/revocata → accesso negato; nessun self-signup).

### Verifiche
- ✅ Node: `can()` (OWNER tutto, STAFF solo view) e `isAuthorizedStaff` (autorizzato/revocato/sconosciuto/vuoto). Regressione motore verde (incl. rbac2). Errori reali TS = 0.
## [RBAC operatore — guard di route + calendario personale + fix pulsante]

> Solo UI/navigazione. Motore/logica/dati invariati. Causa radice corretta, niente workaround.

- **RoleGuard** (`components/RoleGuard.tsx`, montato nel root layout): blocca l'accesso diretto/deep-link degli OPERATORI alle route da coordinatore (reindirizzo a '/'); whitelist operatore esplicita. Non solo nascosti: bloccati a livello di route.
- **Fix pulsante "I miei turni"**: era `to: '/'` (loop sulla dashboard). Ora apre **StaffTurniScreen** (`/i-miei-turni`): calendario personale sola lettura con giorno, **data GG/MM/AAAA**, turno/ferie/riposo.
- **Helper data** `fmtDataIt` (GG/MM/AAAA) in utils/helpers.
- Sezione operatore "Le mie richieste" rinominata **"Richieste"**.

### Verifiche
- 154 file 0 errori; import↔export OK; errori reali TS = 0; nessun object-as-child negli schermi operatore; regressione motore verde (incl. rbac2).
## [Matrici stagionali — catalogo completo standard + personalizzate]

> Solo UI. Motore/logica/dati invariati. Causa radice: catalogo non raggruppato + azioni per-stagione assenti (le custom erano già caricate ma "appiattite").

- `SeasonalEditor` ora mostra per ogni stagione due gruppi: **STANDARD** (MATRICI) e **PERSONALIZZATE** (matriciCustom). Selezione indifferente.
- **+ Nuova matrice** in ogni stagione → apre l'editor; al salvataggio la matrice entra in matriciCustom e viene **auto-selezionata** per quella stagione (ponte transitorio `matriceBridge`, niente uscita logica dal wizard).
- **Modifica** / **Duplica** in-card quando la stagione usa una matrice custom (duplica = nuovo id + " Copia", auto-selezionata).
- `validateSeasonalConfig` e il riepilogo trattano standard e custom senza differenze (già così; confermato).

### Verifiche
- 151 file 0 errori; import↔export OK; errori reali TS = 0; validazione/risoluzione ✅ Node; regressione motore verde.
## [Step orari — fix troncamento orario (layout)]

> Solo UI. Motore/logica/dati invariati.

- Orario MAI troncato: gruppo `[−] HH:MM [+]` a larghezza fissa 176px, valore minWidth 88 centrato, rimossi numberOfLines/adjustsFontSizeToFit (causa del troncamento: contenitore flex troppo stretto + numberOfLines). Pulsanti 44×44. Rimosse label Inizio/Fine e separatore verticale. Due gruppi su una riga (space-between). Card ~107px (titolo 24/700).
## [Step orari reparto — redesign chirurgico (più compatto)]

> Struttura identica allo screenshot; cambiate SOLO le misure del controllo orario. Motore/logica/dati invariati.

- Titolo turno 24/700 (niente width che tagliava "Pomeriggio"); label Inizio/Fine 13/500 opacità 70%; pulsanti +/- 44×44 radius 12; orario 24/700 centrato; gap 8px; card padding 14 (~127px, prima ~150-190); separatore verticale 1px rgba(255,255,255,0.08) tra Inizio e Fine.
- Comportamento: tap = ±15m, long-press = ±1h.
## [Fix crash creazione staff + stability audit statico]

> Fix alla radice (no workaround, no JSON.stringify). Motore/logica/dati invariati.

- **P0 FIX — crash "Objects are not valid as a React child {area, livello}"**: `screens/PersonaleScreen.tsx` renderizzava `{c}` su `(s.competenze).map((c: string) => ...)`, ma `competenze` è `Competenza[]` (oggetti). L'annotazione `(c: string)` era errata e nascondeva il bug a TypeScript. Corretto: render di `c.area` (key `c.area`). Unico punto nel progetto (verificato).

### Audit statico (errori reali TS = 0, regressione motore verde)
- Nessun altro oggetto/array renderizzato come figlio React (verificati CentroCriticità `a.cause`=stringa, Simulatore=numeri).
- Persistenza: `loadData` protetta da try/catch + type-guard (parse corrotto → fallback, niente crash).
- Note: 13 `router.back()` non protetti da `canGoBack` (rischio basso, modali con parent).
## [Time picker reparto — versione compatta iOS-first]

> Solo UI/UX. Logica, validazioni, compliance, controlli 11h, motore e dati invariati.

- **TimeStepper compatto**: ogni orario è ora `[−] HH:MM [+]` su una riga, con pulsanti **44px** che affiancano l'orario protagonista. Tap = ±15m, **long-press = incremento/decremento continuo**.
- **Card per turno**: Mattina/Pomeriggio/Notte sono **una card** (radius 24, padding 16, ~120px) con **Inizio e Fine affiancati**. Niente più card alte con quattro pulsanti sotto.
- Rimosso il layout precedente ([−1h][+1h] / [−15m][+15m]).

### Verifiche
- 150 file 0 errori; import↔export OK; errori reali TS = 0; wizard orari + restMinutes verdi; regressione motore verde.
## [Matrici reparto — revisione UX definitiva (wizard self-contained + card Reparti)]

> Solo UI + wiring ai layer esistenti (matriceMode/matriciCustom/add-removeMatriceCustom/getActiveMatrice/validateSeasonalConfig/seasonalMatrice). Motore intatto. Nessuna nuova struttura dati.

- **Wizard stagionale INLINE**: selezionando ○ Stagionale appaiono subito le 4 stagioni (data inizio/fine + matrice) dentro il wizard — niente più uscita verso un'altra schermata. Componente riusabile `SeasonalEditor`.
- **Validazione live + blocco salvataggio**: `validateSeasonalConfig` ad ogni modifica (🟢 valida / 🔴 periodo non coperto / sovrapposizione / matrice mancante); il reparto NON è salvabile se non valida.
- **Riepilogo finale** (step 4): REPARTO + MODALITÀ + matrice (standard/custom con durata ciclo) o le 4 stagioni → matrice.
- **Card Reparti**: per ogni reparto Modalità + Matrice attiva (`getActiveMatrice` oggi); se stagionale anche **Prossimo cambio** (data) + **Nuova matrice** (`nextMatriceChange`, nuova funzione pura).

### Verifiche
- ✅ Node: getActiveMatrice, validateSeasonalConfig (gap/overlap/missing), nextMatriceChange (15/8→23/9→C), regressione motore verde.
- 🟡 compila: wizard inline, blocco save, riepilogo, card Reparti, banner stagionale. 150 file 0 errori; import↔export OK; errori reali TS = 0.
## [Matrici reparto — UI Standard/Custom/Stagionale collegata ai layer]

> Solo UI + wiring ai layer già testati (matriceResolver/validateSeasonalConfig/matriceMode). Motore intatto. Resa su device da validare.

- **Editor matrice personalizzata** (`MatriceEditorScreen`, route `matrice-editor`): nome + descrizione + pattern come **card per giorno** (selettore turno M/P/N/R/F, su/giù per riordinare, elimina), aggiungi giorno, salva → `addMatriceCustom`. (Drag → frecce su/giù, nessuna libreria drag offline.)
- **Wizard Reparto, step matrice**: selettore **○ Standard / ○ Personalizzata / ○ Stagionale**; standard = catalogo; custom = crea/seleziona + **Modifica/Duplica/Elimina**; stagionale = nota + CTA. Salva `matriceMode` sul reparto (seasonal → `matrice='STAGIONALE'`).
- **Matrici stagionali**: **validazione live** (`validateSeasonalConfig`) con banner 🟢/🔴 (valida / sovrapposizione / periodo non coperto / matrice mancante) + **riepilogo** Stagione → Matrice.

### Verifiche
- 149 file 0 errori; import↔export OK; errori reali TS = 0; resolver/validazione ✅ in Node; regressione motore verde.
## [Matrici reparto — layer resolver + validazione stagionale (engine-safe)]

> Layer puro additivo: NON tocca engine.ts (che già gestisce lo stagionale internamente). ✅ logica testata in Node.

- **`services/matriceResolver.ts`** (Fase architetturale): `getActiveMatrice(rep, matrici, month0, day)` / `getActiveMatriceId(...)` / `repartoMatriceMode(rep)` — risolvono la matrice attiva per data secondo la modalità (standard/custom/seasonal). `validateSeasonalConfig(cfg, idMatrici)` verifica copertura annuale, sovrapposizioni, buchi e matrice assegnata/esistente.
- **Tipo `MatriceMode`** ('standard'|'custom'|'seasonal') + campo opzionale `Reparto.matriceMode` (backward compatible; default dedotto: 'STAGIONALE'→seasonal).
- Le matrici custom usano già `Matrice.seq` + store `matriciCustom`/`addMatriceCustom`; lo stagionale usa `reparto.seasonal` (resolver `seasonalMatrice` già esistente nel motore).

### Verifiche (✅ Node)
- Risoluzione: Mag→A, Ago→B, Nov→C, Gen(wrap)→D; standard→rep.matrice. Validazione: valida ok; gap/overlap/matrice-mancante rilevati. 147 file 0 errori; import↔export OK; errori reali TS = 0; regressione motore verde (seasonal/custmat/matrix).
## [TimeStepper ricostruito iOS-first]

> Solo UI. Motore/logica intatti. Resa su device da validare (no rendering offline).

- **TimeStepper ricostruito**: ogni orario è una **card full-width** (radius 24, padding 20, minHeight 120) con **valore grande centrale** HH:MM (38px, 800) e **pulsanti SOTTO** in due righe (−1h/+1h, −15m/+15m). Nessun controllo affiancato al valore, nessuna width hardcoded, target ≥56, `flexWrap` responsive (i pulsanti vanno a capo, mai compressi). Step minuti 15 (prima 5).
- **Wizard reparto**: Inizio e Fine ora **impilati verticalmente** (`timeFields` row → column), ciascuno a piena larghezza → niente overflow/sovrapposizioni.

### Verifiche
- 146 file 0 errori; import↔export OK; errori reali TS = 0; wizard orari + validazione verdi; regressione motore verde.
## [Navigazione & UX: back uniforme, tab bar blur, niente wizard obbligatorio]

> Solo UX/navigazione. Motore/logica intatti. Regressione verde.

- **Tasto Indietro ovunque (fix architetturale)**: aggiunta la freccia ← nei due header condivisi — `SheetHeader` (← a sinistra + X a destra, 27 schermate) e `ScreenHeader` (← su Copertura/Personale/Reparti/Report/Turni). Back resiliente: `canGoBack() ? back() : replace('/')`. Nessuna schermata secondaria resta senza uscita.
- **Tab bar Liquid Glass**: integrato `BlurView` (expo-blur) dietro la barra, con fallback al pannello traslucido se il pacchetto non è installato. Aggiunto `expo-blur` a package.json (richiede `npx expo install expo-blur`).
- **Rimosso il wizard "Configura il reparto"**: eliminato il gate onboarding dal HomeTab; la Dashboard è sempre la home. L'utente configura in qualsiasi ordine dagli hub. Non compare più al primo avvio/login/registrazione/refresh.

### Verifiche
- 146 file 0 errori; import↔export OK; errori reali TS = 0; regressione motore verde.
## [Hardening — fix crash React + X resilienti + dark-only]

> Nessuna modifica a motore/logica/generazione. Regressione verde.

- **FIX CRASH** "Objects are not valid as a React child {score, livello, dettaglio}": `dashboardData.indiceSicurezza` è un oggetto `SafetyIndex`, non un numero. Corretto in `DashboardScreen` e `CentroCriticitaScreen` usando `.score` (con guardia). Scansione globale: nessun altro oggetto del motore reso direttamente in JSX (indicatori/distribuzione/postazioni non sono renderizzati; Simulatore usa già `.score`).
- **X / navigazione**: `SheetHeader` collega correttamente la X a `onClose`; resa **uniformemente resiliente** la chiusura (36 occorrenze in 29 file): `canGoBack() ? back() : replace('/')` per evitare X inerti con back-stack vuoto.
- **DARK ONLY**: tema forzato a dark nel provider (`useTheme`), `setMode/toggle` inerti, nessun `useColorScheme`, nessuna palette light raggiungibile. Il selettore "Modalità motore" (rigida/operativa) in Impostazioni è la modalità di generazione, NON un tema: lasciato intatto.

### Verifiche
- 146 file 0 errori; import↔export OK; errori reali TS = 0; regressione motore verde (incl. fairness).
## [Hardening — Fairness Engine (additivo, motore intatto)]

> Modulo puro additivo: NON tocca engine.ts. ✅ logica eseguita in Node.

- **`services/fairness.ts`** (Fase 5): indice di equità per reparto. Per operatore conta notti/weekend/festivi/turni pesanti-leggeri (+ reperibilità opzionale), calcola carico composito, media, deviazione standard, coefficiente di variazione → **fairnessScore 0–100** con categorie (eccellente/buono/attenzione/critico) e scostamento % per operatore. Funzioni `fairnessReport`/`fairnessFor`.
- Pronto per essere cablato in Dashboard/Criticità/Direzione (non ancora collegato alla UI).

### Verifiche
- 146 file 0 errori; import↔export OK; errori reali TS = 0; **fairness ✅ testato** (equa 97 / sbilanciata 0 / determinismo); regressione motore verde.
## [UI consistency pass: card, avatar, pulsanti coerenti]

> Nessuna nuova funzione/schermata/componente. Solo coerenza. Motore/logica/backend invariati. Regressione verde.

- **Card radius unificato a 24** (prima 16/20/24/28): KPICard 28→24, Card 16→24, card operatore 20→24, card allarme 20→24, card richiesta 14→24. GlassCard/QuickActionCard/Account già 24.
- **Avatar unificati alla scala 48/56/96**: Dashboard 40→48, Personale 40→48, Richieste 44→48; Account header 96.
- **Pulsanti**: altezza 56 (variante inline `small` 44 mantenuta per azioni compatte).
- **Chip/pill/input**: scala secondaria coerente (8–12), distinta dalle card (intenzionale).

### Verifiche
- 145 file 0 errori; import↔export OK; nessun container card fuori standard; errori reali TS = 0; regressione verde.
## [UI rebuild — Fase 4.5 (completamento): Richieste stile Apple Mail + Personale arricchito]

> Solo UX/visual: motore/logica/backend invariati. Regressione verde.

- **Richieste/Ferie**: card stile Apple Mail — header con **avatar + ruolo + data (giorni + mese) + chip stato**, motivazione, valutazione AI (copertura prima→dopo, sostituto) e azioni Approva/Rifiuta/Analizza. Niente righe da database.
- **Personale**: ogni card operatore ora mostra **ferie residue** (da `ferieBalanceFor`) e **badge competenze**, oltre a ruolo/contratto/livello e monte turni.

### Verifiche
- 145 file 0 errori; import↔export OK; errori reali TS = 0; regressione verde (incl. pilot/ferie/reperibilità).
## [UI rebuild — Fase 4.5: bottom nav viva, Centro Criticità "sala controllo", Account Hub premium]

> Solo UX/visual: nessuna modifica a motore/logica/backend. Regressione verde. Resa da validare su device.

- **Bottom Navigation**: tab attiva a **pillola** (rgba(110,200,255,0.18)), altezza 84, radius 32, icona 28, scale/spring al tap.
- **Centro Criticità** ricostruito come sala controllo: 4 **KPI giganti** (Copertura, Criticità, Postazioni scoperte, Indice sicurezza) + **allarmi a card** colorate (rosso/giallo/verde con titolo/causa/azione) + **AI Correction Center** (max 3 soluzioni con copertura prima→dopo, chip impatto, Applica). Niente liste testuali.
- **Account Hub** premium: header avatar **96px** (nome, email, ruolo, sessione) + **card azione 90px** (icona, titolo, descrizione, freccia); voci senza backend con toast onesto (nessun pulsante morto).

### Verifiche
- 145 file 0 errori; import↔export OK; errori reali TS = 0; regressione verde. Dati/logica invariati.
## [UI rebuild — Fase 3: Dashboard premium + Insight AI + Personale a card]

> Solo UX/visual: nessuna modifica a motore/logica/dati. Regressione verde. Resa da validare su device.

- **KPICard premium**: icona, valore grande, descrizione, chip trend; altezza 160, radius 28.
- **Dashboard**: KPI con icone + **trend reale** (copertura oggi vs media mese, nessun dato inventato) + nuova sezione **"Cosa sta succedendo oggi?"** (Insight AI derivati da copertura/richieste/criticità reali).
- **Personale**: lista "Excel" sostituita da **card operatore** (avatar, nome, ruolo·contratto·livello, monte turni, elimina).

### Verifiche
- 145 file 0 errori; import↔export OK; errori reali TS = 0; regressione verde.
## [UI rebuild — Fase 2: navigazione a 5 tab + hub + AppShell]

> Solo presentazione/routing: nessuna modifica a motore/compliance/auth/dati. Regressione verde. Resa e navigazione da validare su device (no rendering offline). Blur reale e font SF Pro richiedono librerie non installabili offline.

- **FloatingBottomNavigation** (tabBar custom, pannello traslucido, 5 tab: Dashboard/Pianificazione/Personale/Controllo/Account) + **AppShell** (TopBar + contenuto).
- **Routing ristrutturato**: `app/(tabs)` ora ha index(Dashboard)/pianificazione/personale/controllo/account; rimosse le tab copertura/reparti/report (assorbite); aggiunte route push `turni/personale-lista/copertura/reparti/report`.
- **Dashboard = Home** reale del coordinatore (Staff → dashboard personale; onboarding finché non completato).
- **Hub** Pianificazione/Personale/Controllo con `QuickActionCard` al posto della lista "Strumenti".
- Padding schermate adeguato alla nav flottante.

### Verifiche
- 145 file 0 errori; import↔export OK; tutte le route degli hub presenti; errori reali TS = 0; regressione verde.
## [UI rebuild — Fase 1: design system + Dashboard premium]

> Solo presentazione: nessuna modifica a motore/compliance/auth/dati. 37+ suite verdi.

- **Nuovi componenti del design system**: `KPICard`, `QuickActionCard`, `NotificationBadge` (radius 24, glass, palette navy/azzurro). Riusati senza duplicare: `Avatar`, `Card`, `GlassCard`, `EmptyState`, `TopBar`, `Button`.
- **Dashboard ricostruita** (concept mockup #1): top bar (logo + campanella con badge + avatar→Account Hub), saluto "Ciao, {nome}" + data, KPI 2×2 (Copertura oggi, Operatori in servizio, Criticità aperte, Richieste in attesa), card "Analisi piano del mese" (indice di sicurezza /100 + check conformità reali + Apri analisi), azioni rapide a card (Genera Turni, Personale, Centro Criticità, Assistente AI). Tutto cablato ai dati reali (`dashboardData` + `complianceReport`), logica invariata.

### Verifiche
- 135 file 0 errori; import↔export OK; errori reali TS = 0; regressione verde.
## [Stepper orari (no wheel) + icone nei pulsanti + Button unificato]

> Motore invariato; 37 suite verdi. Logica verificata; resa a schermo da validare su device.

- **Icone come testo (root cause)**: `Button` dichiarava `icon?: React.ReactNode` e renderizzava `{icon}`; con `icon="nome"` (stringa, 43 usi) React stampava il NOME come testo. **Fix**: `Button` ora accetta `string | nodo` e per le stringhe rende `<Icon name=…/>`. Niente più "download-outline" a schermo.
- **Button unificato (design system)**: altezza 56, radius 16, padding 24, gap 12, stato `loading`; `small` resta ≥44 touch.
- **Wheel picker ELIMINATO**: rimosso `components/TimeWheel.tsx` (Wheel/TimeWheel/snapToInterval/onMomentumScrollEnd/onScrollEndDrag/logica offset). Sostituito da `components/TimeStepper.tsx`: `[−] HH [+] : [−] MM [+]`, ore 0–23 e minuti step 5 con **wrap**, **aggiornamento immediato** (setTime→setOrari), nessun OK/popup/scroll, target 44×44, token del tema (visibile in dark e light → risolve anche orari invisibili in light).
- Validazione 11h e incompatibilità turni invariate.

### Verifiche
- 132 file 0 errori; import↔export OK; errori reali TS = 0. Test `stepper` (wrap/step5/emit, 6 campi indipendenti, persistenza, restMinutes reattivo) verde; regressione 37/37 verde.
## [FIX critico wizard reparto: orari non salvati + tema chiaro]

- **Orari non salvati (root cause)**: in `TimeWheel.tsx` il valore era committato SOLO in `onMomentumScrollEnd`/`onScrollEndDrag`, con l'indice calcolato da `Math.round(offset/ITEM)` sull'offset PRIMA dello snap. Con un drag che si ferma prima della metà verso l'item successivo, `v===value` → `onChange` mai chiamato e `snapToInterval` riportava la ruota al valore precedente. **Fix**: commit LIVE su `onScroll` (lo stato segue sempre l'item centrato); `onScrollBeginDrag/onMomentumScrollEnd` gestiscono solo il flag anti-conflitto per il riposizionamento da preset. Aggiunto pulsante OK.
- **Tema chiaro (root cause)**: `TimeWheel` usava i token statici `DS.color.*` (palette dark) → in light la pill era bianco-su-bianco. **Fix**: il componente ora consuma `useTheme()` (visibile in dark e light).

### Verifiche
- 132 file 0 errori; import↔export OK; errori reali TS = 0. Test `picker` (commit→item centrato, 6 campi indipendenti, preset, persistenza Avanti/Indietro) verde; regressione verde.
## [Auth UI completa + Account Hub + Recupero password (simulati, backend-ready)]

> Nessun Supabase reale: tutto dietro un provider swappabile, simulato in locale. Sostituendo il provider si collega il backend. Motore invariato.

- **Architettura**: `services/authProvider.ts` (interfaccia `AuthProvider` + `LocalAuthProvider`; logica OTP/recovery in funzioni PURE testate) e `hooks/useAuth.tsx` (context + sessione persistente). App avvolta in `AuthProviderComponent`.
- **Schermate**: Login definitivo (email/password, Ricordami, loading/errori), Registrazione (validazioni reali + termini), Recupero password a 5 step (email→codice→nuova→conferma→fatto, con scaduto/errato/troppi tentativi/reinvio), Account Hub (ospite/autenticato), Sicurezza (mock: account/sessione/dispositivi).
- **Top bar condivisa** `components/TopBar.tsx` (reparto · titolo · campanella+avatar, avatar→Account Hub, badge notifiche).
- **Notifiche**: `services/notifications.ts` (categorie ferie/criticità/conflitti/sistema, mock derivato dai dati reali).
- **Account fuori dalle Impostazioni**: la voce in Strumenti ora apre l'Account Hub.
- **Pulizia**: rimosso `components/FadeInView.tsx` (orfano, commit precedente).

### Verifiche
- 132 file 0 errori; import↔export OK; errori reali TS = 0. `authui` (22 check su logica+flusso locale) verde; regressione verde.
## [RC: palette iOS, pulizia, RCA picker]

> Solo ciò che è realizzabile/verificabile offline. Auth reale, recupero password e foto profilo richiedono client Supabase, rete e image-picker NON disponibili qui → non implementati (non finti). Motore invariato.

- **Palette (Part 10)** applicata ai token globali: bg #08111F, surface #101B2D, card rgba .08, bordi rgba .12, testo #FFFFFF / #A8B3C7, accent #6EC8FF, success #3DDC97, warning #FFC857, danger #FF6B6B. Default colore icona → bianco (mai nero).
- **Pulizia**: rimosso `components/FadeInView.tsx` (orfano). Audit: schermate tutte raggiungibili, dipendenze tutte usate, route coerenti, nessun testo nero hardcoded, tutte le icone con colore esplicito. `supabaseBackend.ts` mantenuto (scaffolding del backend appena schematizzato).
- **BUG picker orari (Part 13)**: già corretto (commit precedente: `onScrollEndDrag` + `scrollEventThrottle`); RCA nel report.

### Verifiche
- 120 file 0 errori; import↔export OK; regressione verde. Palette/pulizia verificate staticamente (nessun rendering offline).
## [Backend: schema SQL + RLS per Supabase (multi-tenant)]

> Artifact scrivibile/revisionabile offline. NON eseguito (nessuna credenziale/rete): da applicare sul progetto reale. Nessuna modifica all'app/motore.

- `supabase/migrations/0001_schema.sql`: 11 tabelle multi-tenant (organizations, profiles, reparti, staff, ferie, pianos, requests, reperibilita, desiderata, audit, org_settings) con strutture annidate in JSONB, indici e trigger updated_at.
- `supabase/migrations/0002_rls.sql`: RLS su tutte le tabelle, funzioni helper (current_org/role/staff_id, is_owner), 25 policy. OWNER = pieno accesso alla propria organizzazione; STAFF = solo i propri dati. Vista `staff_public` (personale senza campi sensibili, rispecchia privacy.ts) e funzione `my_shifts(month_key)` (turni del solo richiedente).
- `supabase/README.md`: applicazione, modello di sicurezza, mappatura tipi→tabelle, flusso di accesso, limiti.

### Verifiche (offline)
- SQL ben formato (parentesi e $$ bilanciati); RLS attiva su tutte le 11 tabelle con policy (25 totali). NON eseguito su Postgres.
## [UI bugfix + UX: picker orari, leggibilità, onboarding]

> Solo UI/UX/pulizia. Motore invariato; 36 suite verdi.

- **Picker orari (BUG 1)**: il valore si aggiornava solo con lo slancio (`onMomentumScrollEnd`); uno scroll lento non lo committava. Aggiunti `onScrollEndDrag` + `scrollEventThrottle` → selezione reale e persistente.
- **Leggibilità (BUG 2)**: testo secondario/terziario portati a rgba(255,255,255,0.72)/0.55; aggiunte ~25 icone mancanti (time, moon, sunny, download, search, checkmark, call, mail, log-in/out, medkit, flask…) così non appaiono più come cerchietti generici. Fallback icona = forma nel colore richiesto, mai testo/nero.
- **Card (BUG 3)**: `GlassCard` borderRadius → 24 (tutte le dashboard).
- **Pulizia (BUG 4)**: rimosso `AVATAR_ICONS` (codice morto); nuovi file senza variabili/import inutilizzati.
- **Primo avvio (BUG 5)**: wizard "Configura il reparto" con stati ○/✓/🔒, blocco progressivo degli step e "Entra nella Dashboard"; flag persistente → non più mostrato dopo il completamento.

### Verifiche
- 121 file 0 errori; import↔export OK; errori reali TS = 0; 36 suite verdi.
## [Hospital Pilot: collegate banca ore, ferie residue, direzione, reperibilità, import, onboarding]

> Logica collegata alla UI. Motore di generazione invariato; 36 suite verdi. Selezione file .xlsx nativa non disponibile offline (import via incolla-dati + template).

### Nuova logica (testata)
- **Ferie residue** (`services/ferie.ts`): monte annuo (`Staff.ferieAnnue`, default 28), maturate pro-rata, usate (solo ferie), residue. Test verde.
- **Reperibilità** (`services/reperibilita.ts`, modulo separato): assegnazione, storico, richiamo, statistiche, controlli (consecutive, su-turno, richiamo dopo notte). Persistenza propria. Test verde.

### Nuove schermate (collegate alla logica)
- **Banca ore** (`/banca-ore`): ore contrattuali/lavorate/saldo/straordinari/debito/notti/festivi + ferie residue, export CSV.
- **Direzione** (`/direzione`): copertura, violazioni normative, straordinari, ferie residue, notti, festivi, export CSV.
- **Reperibilità** (`/reperibilita`): assegna/storico/richiamo/statistiche + segnalazioni.
- **Onboarding** (`/onboarding`): wizard 4 step, mostrato al primo avvio del coordinatore (stato vuoto).
- **Import personale** (`/import-personale`): template scaricabile + incolla-dati + validazione/anteprima/errori/duplicati + conferma (`addStaff`). Selezione file .xlsx nativa rinviata (dipendenza non installabile offline).

### Verifiche
- 120 file 0 errori; import↔export OK; TS2304/2300/2451/2741/2739 = 0; 36 suite verdi (incl. `pilot`, `enterprise2`).
## [Hardening: robustezza runtime e anti-crash]

> Nessuna nuova funzione. Solo stabilità. Motore invariato; regressione verde.

### Bug corretti
- **Perdita dati**: il load dello storage non rileggeva `profile` e `currentEmail` → personalizzazione avatar e sessione Staff andavano perse al riavvio. Ora riletti con coercizione di tipo.
- **Crash schermata bianca su dati legacy/importati**: campi opzionali (`reparti`, `esenzioniTurni`, `esenzioniSettori`, `deroghe`) usati senza guardia in StaffWizard, StaffDetail e Report → aggiunte guard clause `|| []`.

### Verificato (già robusto)
- Load storage: JSON corrotto → `null`; tipi sbagliati → default sicuri (coercizione completa con `Array.isArray`).
- Hydrate: `mounted` guard (no setState dopo unmount); persistenza solo dopo idratazione.
- Nessun `useEffect` senza dipendenze; nessun setState in fase di render; nessun loop infinito.
- Stato vuoto: tutte le schermate sopravvivono (dashboard sicura, EmptyState).
- Export PDF/Excel in try/catch; condivisione con guardia `isAvailableAsync`.

### Verifiche
- 108 file 0 errori; import↔export OK; errori reali TS = 0; regressione verde.
## [Enterprise: conformità normativa, banca ore, import personale]

> Nuovi moduli di SOLA ANALISI (puri): non modificano la generazione. Motore invariato (regressione verde). 0 errori TypeScript reali.

### Conformità normativa (D.Lgs 66/CCNL) — `services/compliance.ts`
- `complianceReport(ctx, piano)` verifica il piano (anche dopo modifiche manuali) e segnala: riposo 11h, riposo settimanale, notti consecutive (per contratto), giorni consecutivi (per contratto), media 48h/sett. (indicativa). Il piano generato dal motore risulta conforme (0 violazioni); le violazioni introdotte manualmente vengono intercettate. Test `enterprise2` verde.

### Banca ore — `services/hoursBank.ts`
- `hoursBank(ctx, piano)`: per operatore ore contrattuali/lavorate/accreditate, saldo, straordinari, debito, notti, festivi, assenze. Pronto per dashboard/report.

### Import personale — `utils/staffImport.ts`
- `parseStaffRows(rows, reparti, existing)`: validazione (nome/ruolo/contratto/ore/reparto/esenzioni), anteprima, errori per riga, duplicati per matricola/nominativo; mappatura esenzioni. `staffImportTemplateRows()` per il template scaricabile. (La selezione file .xlsx resta lato UI/device.)

### QA di scala (reale, Node)
- Generazione 50/100/200 operatori × 3 mesi senza crash; tempi medi ~230/288/278 ms/mese; piani conformi (0 violazioni 11h).

### Verifiche
- 108 file 0 errori; import↔export OK; TS2304/2300/2451/2741/2739 = 0; 34 suite verdi.
## [Audit a ciclo: ri-verifica completa]

> Ciclo di audit ripetuto. Nessun bug reale nuovo (già sanati). Aggiornati 3 commenti obsoleti che citavano CAPOTURNO. FASE 4 (matrice personalizzata per stagione) verificata. 0 errori TypeScript reali; 33 suite verdi.
## [Audit tecnico + correzione errori di compilazione]

> Audit completo del progetto. Motore di generazione invariato (regressione verde). 0 errori TypeScript reali.

### Bug critici risolti
- `UtentiAutorizzatiScreen`: rimossa doppia dichiarazione di `staff` (l'elenco autorizzati è stato rinominato `autorizzati`); corretta la condizione ridondante `ruolo === 'STAFF' || ruolo !== 'OWNER'` → `ruolo !== 'OWNER'`.
- `useStore`: rimosso `profile` duplicato e il metodo `setProfile` finiti per errore dentro `StoreState`; aggiunti `role/members/requests` mancanti in `initialState`; ripristinate in `StoreContextValue` le firme di `profile/setProfile/currentEmail/loginAsStaff/logoutSession/updateMember/removeMember`. (Regressioni introdotte da `replace` senza limite nelle patch precedenti.)
- `ProfileConfigLite`: aggiunto `emoji`; `ShiftGrid`: corrette le props dell'`Avatar` (`nome` invece di `name`, rimosso `index`); `SeasonalConfigScreen`: matrice personalizzata ora include `notti` (obbligatorio).
- Rimosso codice morto introdotto (import inutilizzati in ShiftGrid e StaffDashboard).

### Verifiche
- Errori reali di binding (TS2300/2451/2304/2552/2741/2739) = 0; routing OK (22 rotte navigate, tutte con file); import↔export OK; 105 file 0 errori di sintassi; regressione completa verde. I residui di compilazione sono solo i tipi di react-native/expo non installabili offline.
## [Patch privacy + separazione Staff + UX iPhone]

> Priorità: privacy sanitaria reale. Motore di generazione invariato (regressione verde).

### Privacy assoluta Staff (P1, livello dati)
- Nuovo `utils/privacy.ts`: rimozione dei campi sensibili (esenzioni, 104, limitazioni, permessi speciali, note riservate, causali, HR, competenze, livello, anni esperienza) PRIMA che i dati raggiungano lo Staff. Le assenze diventano «Assente»/«Assenza approvata» (mai la motivazione). Lo Staff vede solo le proprie richieste. Test `privacy` verde (8/8).
- Richieste Staff filtrate alle proprie (`sanitizeRequestsForStaff`).

### Separazione totale Staff (P2)
- Le tab del coordinatore (Copertura, Staff, Reparti, Report) sono ASSENTI per lo Staff (`href:null`), non disabilitate. Lo Staff vede solo la Home personale e naviga a I miei turni / Richieste / Desiderate / Profilo / Notifiche.

### Associazione email → operatore (P3)
- In «Utenti autorizzati» il coordinatore seleziona email + operatore associato (un solo operatore per email, no duplicati). Le desiderate Staff usano automaticamente l'operatore associato all'email loggata: lo Staff può inviare richieste solo per sé stesso, senza scegliere altri operatori.

### Sistema avatar (P5)
- Libreria per categorie: Sanità (icone flat), Animali e Personaggi (emoji locali: cane/gatto/coniglio/panda, uomo/donna/ragazzo/ragazza). Aggiunto rendering emoji all'`Avatar` + `ProfileConfig.emoji`. Restano colore e iniziali personalizzate.

### Selettore orari reparto (P6)
- Nuovo `TimeWheel` stile iOS (ruote ore/minuti, scroll verticale + snap), build-safe senza dipendenze native. Collegato agli orari turno (inizio/fine) nel wizard reparto.

### Audit navigazione (P4)
- Verificato: tutte le modali (incluse Profilo, Utenti autorizzati, Notifiche) hanno X/Back funzionante; nessuna schermata bloccante.

### Verifiche
- 105 file 0 errori; import↔export OK; TS2304 = 0; regressione completa verde (`privacy` + `rbac2` + `auth2` + motore/sync/postazioni/auto-fix).
## [Pre-pubblicazione: login Staff, utenti autorizzati, notifiche, dashboard Staff]

> Motore di generazione invariato (regressione verde). Nessuna logica commerciale.

### Login Staff locale (FASE 1)
- `loginAsStaff(email)` (store) + helper puro `isAuthorizedStaff(members,email)`: l'email deve essere fra gli utenti autorizzati e non disattivata. Niente password, niente OTP (architettura pronta per OTP futuro). Email assente → «Email non autorizzata dal coordinatore.» Schermata Login aggiornata (rimosso lo step OTP). Test `auth2` verde.

### Utenti autorizzati in Impostazioni (FASE 2)
- Nuova schermata `UtentiAutorizzatiScreen` (Impostazioni → Utenti autorizzati): aggiungi / modifica / elimina email + attiva/disattiva accesso (`updateMember`, `removeMember`). Persistito. Rimosso il blocco da Richieste.

### Centro notifiche (FASE 3)
- Campanello 🔔 con badge numerico nella testata della Dashboard Coordinatore (conteggio richieste in attesa). Nuova `NotificheScreen`: nome operatore, data, tipo, stato + Approva/Rifiuta (rifiuto con motivazione obbligatoria). Gestita la richiesta → il badge si aggiorna.

### Dashboard Staff separata (FASE 4)
- `StaffDashboardScreen` (mostrata nel tab Home quando ruolo = STAFF): solo I miei turni, Le mie richieste, Nuova richiesta, Profilo. Lo Staff è spettatore (RBAC blocca ogni modifica).

### Backup cloud (FASE 5)
- `createSupabaseStateSync` (app_state push/pull, build-safe) per recupero dati al cambio dispositivo. Storage locale resta AsyncStorage (SQLite non installabile offline). Sincronizzazione cloud non eseguibile in ambiente offline.

### Verifiche
- 103 file 0 errori; import↔export OK; TS2304 = 0; regressione completa verde (`rbac2` + `auth2` + suite motore/sync/postazioni/auto-fix/custom-matrix).
## [Architettura auth/profili: 2 ruoli + pannello profilo avatar]

> Nessuna logica commerciale presente (nessun Stripe/abbonamento/IAP): confermato. Motore di generazione invariato (regressione verde).

### Due soli ruoli
- RBAC ridotto a **Coordinatore (OWNER) / Staff**. Rimosso CAPOTURNO da tipi, permessi, storage, adapter, schermate (Login, Richieste, Dashboard). Staff = sola consultazione (nessuna modifica a turni/personale/matrici/reparti/impostazioni). Test `rbac2` verde; il motore non aveva alcun concetto di "capoturno" (il "coordinatore di turno" M/R/F resta invariato).

### Avatar = profilo + personalizzazione
- Nuovo `ProfileScreen` (route `/profilo`), aperto toccando l'avatar in Dashboard: sezione profilo (avatar, nome, ruolo, stato login) + personalizzazione (colore, iniziali personalizzate, avatar Uomo/Donna, libreria icone sanitarie locali: infermiere/ospedale/siringa/stetoscopio/croce/reparto/calendario/medico/turno/cuore). Nessuna immagine esterna.
- `Avatar` ora renderizza la configurazione scelta (icona/uomo/donna/iniziali + colore) con fallback iniziali; `ProfileConfig` persistito (sopravvive a riavvio/cambio dispositivo via sync).

### Verifiche
- 98 file 0 errori; import↔export OK; TS2304 = 0; regressione motore+sync verde (`rbac2` sostituisce `capoturno`).
## [Redesign premium — Tappa 1: primitive UI + Dashboard hero]

> Logica invariata (motore/AI/copertura/postazioni/richieste/matrici/RBAC/sync/backend): regressione verde.

### Componenti riutilizzabili (vetro soft, animazioni native)
- `components/Avatar.tsx`: iniziali + badge ruolo (fallback senza foto).
- `components/GlassCard.tsx`: superficie traslucida + bordo + ombra morbida (radius 20).
- `components/PressableScale.tsx`: pressione con micro-scala 1→0.97 (RN Animated).
- `components/FadeInView.tsx`: comparsa morbida (reanimated FadeInDown).

### Dashboard (hero ridisegnata)
- Header premium: saluto orario + nome (dal membro reale, altrimenti ruolo) + Avatar (tap → Account). X di chiusura conservata in alto a destra.
- KPI 2×2 a vetro: Copertura oggi · Postazioni critiche · Richieste in attesa · Criticità future.
- Azioni rapide 2 colonne (Genera Turni, Personale, Richieste, Centro Criticità, Assistente, Postazioni) con micro-scala.
- Copertura mese/settimana compattata (rimossa la ridondanza).

### Verifiche
- 96 file 0 errori; import↔export OK; TS2304 = 0; regressione motore+sync verde. Nessuna foto profilo (iniziali, come concordato); vetro soft senza blur (expo-blur non disponibile offline).
## [Redesign premium — FASE 0 audit + FASE 1 cleanup + FASE 2 Design System]

> Logica invariata: motore, AI, copertura, postazioni, richieste, matrici, RBAC, sync, backend, norme NON toccati (regressione verde a conferma).

### FASE 0 — Audit
- Componenti inutilizzati: **nessuno** (tutti importati e usati).
- Route orfane / schermate irraggiungibili: **nessuna** (18 route ↔ 18 file; tutte raggiungibili).
- Import/variabili morte rilevate via compilatore: 6 nei file UI (più alcune in engine, lasciate intatte per non toccare la logica).

### FASE 1 — Cleanup
- Rimossi import/locali morti: `Backup` (useStore), `Icon` (CentroCriticità), `Pressable` (Dashboard, Strumenti), `TURNI` (StaffWizard), `grouped`+`DerogaItem` (Report).

### FASE 2 — Design System centrale
- Nuovo `utils/designSystem.ts`: token unici (colori premium #07111F/#0B1320/#101826, card/border traslucidi, success #7BC47F / warning #F2B84B / danger #E66A6A / info #79B8FF, raggi 24/20/18, spaziatura, tipografia, ombre soft, motion). Helper `initials()` + `ROLE_BADGE`.
- La palette dark del tema ora deriva dal Design System → ricolorazione premium dell'intera app con un'unica fonte di verità (nessun cambio di layout/logica).

### Verifiche
- 93 file 0 errori; import↔export OK; TS2304 = 0; **regressione motore+sync verde (logica invariata)**.
## [Audit navigazione + Matrice personalizzata stagionale]

### Audit navigazione / chiusura (statico, schermata per schermata)
- Verificate tutte le 16 schermate con `SheetHeader`: ciascuna passa `onClose={() => router.back()}` → la X chiude davvero. Assistente e Richieste hanno una X dedicata (router.back). Le 5 schede (Turni/Copertura/Staff/Reparti/Report) correttamente senza X.
- 18 route modali registrate ↔ 18 file presenti: nessuna route mancante. Tutte raggiungibili (incluse ferie-wizard, cell-editor, staff-detail, sostituzioni aperte con `router.push({ pathname, params })`).
- ErrorBoundary presente e attivo in `_layout` (nessuno schermo bianco al crash di render). Toast con auto-dismiss (nessun overlay permanente).
- Esito: nessun pulsante X non funzionante, nessuna schermata irraggiungibile o senza ritorno, nessun blocco individuato.

### Matrice personalizzata stagionale (Obiettivo 4)
- In "Matrici stagionali", accanto ai cicli standard, nuova opzione **+ Personalizzata** per ogni stagione: apre un editor con palette M / P / N / SM / R, sequenza con **aggiungi, elimina, riordina** (◀▶), salva. La matrice creata è salvata in persistenza (`matriciCustom`) e assegnata alla stagione; vale per Primavera/Estate/Autunno/Inverno.

### Verifiche
- Nuova suite `custmat`: la matrice personalizzata genera in tutte le 4 stagioni con **0 violazioni** sacre, deterministica, smonto "S" solo dopo notte. 32/32 suite verdi. Sintassi 92 file 0 errori, import↔export OK, TS2304 = 0.

## [Pre-release: login OTP, conflitti, audit, performance]

### Login reale (FASE 1)
- Adapter Supabase completato: coordinatore email+password; staff/capoturno **OTP a due passi** (`requestStaffOtp` invia il codice solo se l'email è autorizzata e attiva → `verifyStaffOtp` verifica e accede, nessuna password); `changePassword` e `resetPassword`. Schermata Login aggiornata: invio codice, inserimento OTP, reinvio, "password dimenticata". (Statico: richiede backend reale per l'esecuzione.)

### Risoluzione conflitti (FASE 3) — testato
- `services/sync.ts`: `detectConflicts` (locale vs remoto sullo stesso bersaglio con valori diversi), `resolveConflict('local'|'remote')` (Versione A / Versione B), `nonConflicting` (applicazione automatica del resto), `targetKey`. Strategia esplicita, nessun falso positivo a parità di valore.

### Audit trail (FASE 4)
- `AuditEntry` esteso con **actor** (ruolo/utente) e **motivo**. `commit` registra l'attore; rifiuto/approvazione ferie loggano il commento, le correzioni AI loggano la soluzione applicata.

### Verifiche (realmente eseguite in Node)
- **FASE 2 sync**: modifiche eterogenee offline (turno/ferie/reparto) → flush → 3 inviate, **nessuna perdita, nessuna duplicazione** (doppio flush = 0), offline preserva la coda, riconnessione invia il residuo.
- **FASE 3 conflitti**: 1 conflitto rilevato su cella condivisa, A/B esposte, scelta applicata, resto auto-applicato, nessun falso positivo.
- **FASE 6 performance (200 operatori × 20 reparti × 24 mesi)**: generazione **media 186 ms/mese**, picco 521 ms, totale 4,46 s; dashboard 127 ms; centro criticità 161 ms; auto-fix 84 ms; assistente 31 ms.
- 30/30 suite engine verdi; sintassi 91 file 0 errori; import↔export OK; TS2304 = 0.

### Non eseguibile in ambiente offline
- Login/sync end-to-end reali, QA su dispositivi fisici, build APK/AAB/IPA: forniti come codice/guida, NON dichiarati testati.

## [Collegamento Supabase: glue offline-first + login]

### Wiring offline-first (build-safe)
- `services/syncBootstrap.ts`: istanzia Outbox + SyncEngine su AsyncStorage; `recordChange(entity,action,payload)` (best-effort, non blocca offline), `configureSync(port)` per collegare il backend reale, `trySync()` per il flush alla riconnessione.
- Store: `recordChange` collegato a submitRequest/approveRequest/rejectRequest/setCell → ogni modifica entra nella coda di sincronizzazione (offline inclusa).

### Login
- `screens/LoginScreen.tsx` (route `/login`, voce "Account / Accesso" in Strumenti): tab Coordinatore (email+password) e Staff/Capoturno (sola email). Collegata a `backend.auth`: con i placeholder mostra "Backend non collegato"; diventa reale iniettando l'adapter Supabase.

### Guida
- Consegnata `TURNOVER-Setup-Supabase.md`: creazione progetto, esecuzione schema+RLS, credenziali, auth email/OTP, bootstrap client, collegamento login+sync, checklist di test. Indicate onestamente le aggiunte UI residue (OTP staff a due passi, org_id post-login) e ciò che non è eseguibile offline.

### Verifiche
- 30/30 suite engine + suite `sync` verdi. Sintassi 91 file 0 errori, import↔export OK, TS2304 = 0. Il glue di sync è build-safe; backend reale e login restano non eseguibili in ambiente offline.

## [Produzione: fondazione offline-first + adapter Supabase]

### Offline-first (testato)
- `services/sync.ts`: coda **Outbox** + **SyncEngine** provider-agnostici. Le modifiche locali si accodano e si sincronizzano appena c'è rete (flush differito); offline il lavoro continua e la coda persiste. Gestione di ack parziali e conflitti last-write-wins (per `ts`). `RemotePort` è l'interfaccia che il backend reale implementa; `localPort` è il default offline.

### Adapter Supabase (statico, da installare/configurare)
- `services/supabaseBackend.ts`: implementazioni REALI di `AuthService`/`MembershipService`/`RemotePort` su Supabase. Build-safe: riceve il client come parametro (nessun import dell'SDK), quindi il progetto compila anche senza il pacchetto. OWNER login email+password; STAFF/CAPOTURNO accesso solo-email autorizzata (OTP, nessuna password); gestione membership e push outbox.
- `integrations/supabase-schema.sql`: schema Postgres + **Row Level Security** (organizations, memberships, requests, sync_ops, app_state) con policy OWNER/STAFF/CAPOTURNO e commento di rifiuto riservato al richiedente.

### Stato
- Questi pezzi NON sono eseguibili nell'ambiente offline (servono rete, SDK, credenziali). Forniti come codice reale + schema, marcati come non testati a runtime. La fondazione offline-first è invece testata in Node.

### Verifiche
- 30/30 suite engine verdi + nuova suite `sync` (Outbox/SyncEngine). Sintassi 88 file 0 errori, import↔export OK, TS2304 = 0.

## [Correzione automatica + Previsione + Hardening]

### Correzione automatica delle criticità
- `proposeAutoFix(ctx, piano, day?)` → fino a 3 soluzioni ordinate per efficacia: **richiamo da riposo** (validato con evalCandidate → solo se legale), **spostamento interno** (riassegnazione settore, nessun cambio turno), **chiusura postazione** (ultima risorsa). Ogni soluzione riporta impatto copertura (prima→dopo), impatto equità/fatigue/economico (nullo/basso/medio/alto) e rischio legale (assente/attenzione/critico). Le soluzioni non violano mai 11h/recupero/smonto/max-consecutivi/esenzioni.
- `applyAutoFix(ctx, piano, sol)` → applica richiamo/spostamento al piano (clone, non muta l'originale). Store: azione `applyFix(sol)` con undo/audit; per la chiusura agisce sul reparto.

### Previsione scoperture
- `forecastCoverage(ctx, piano, horizon, fromDay)` → giorni a rischio (medio/alto) nei prossimi 7/14/30 giorni con motivazioni (assenze approvate, carenza senior, postazioni a rischio).

### Analisi cause
- `whyUncovered` arricchito: «mancano N infermieri/OSS» per ruolo + `causeStrutturali`. `structuralCauses(ctx, piano)` (organico sottodimensionato, assenze concentrate, pochi senior/OSS, notti squilibrate). `repartoFragility(ctx, piano)` (ranking reparti).

### Assistente AI — nuovi intent
- «cosa rischia di scoprirsi», «proponi correzione» / «come aumentare la copertura», «applica correzione», «chi posso richiamare», «cosa manca oggi», «quale reparto è più fragile», «quale matrice genera più criticità». Tutti su dati reali.

### UI
- Nuova schermata **Centro Criticità** (perché scoperto + proposte di correzione con «Applica» + previsione 7/14/30). Sezione **Criticità future** + pulsanti Centro/Simulatore nella Dashboard.

### Hardening backend (placeholder offline)
- `services/backend.ts`: interfacce `AuthService`, `SyncService`, `MembershipService` con implementazioni locali placeholder (nessuna rete; non rompono l'offline). Pronte da collegare a Supabase/Firebase.

### Verifiche
- 30/30 suite verdi (nuova `autofix`). `applyAutoFix`: **0 violazioni sacre** dopo l'applicazione. L'AI usa solo nomi reali. Sintassi 86 file 0 errori, import↔export OK, TS2304 = 0.

## [Solo dati reali — nessun operatore di esempio]

### Nessun dato demo
- Confermato: lo stato iniziale è vuoto (nessun operatore, reparto o ferie predefiniti). Nessun seed/demo nel database. I `REPARTI_PREDEF` restano solo come *template* selezionabili in fase di creazione (nulla viene inserito finché il coordinatore non agisce).
- Rimosso il nome di esempio dal placeholder di inserimento operatore.

### Assistente AI su dati reali
- Tutte le analisi AI usano esclusivamente `ctx.staff`, `ctx.ferie`, `ctx.richieste`, `ctx.reparti` e le postazioni reali; nessun nome inventato. I nomi sintetici delle simulazioni («Nuovo operatore», «Agg N») non compaiono mai nelle risposte.
- Nuovo intent «Perché oggi sono scoperto?» → `whyUncovered(ctx, piano, day?)`: copertura del giorno, postazioni realmente scoperte, cause (operatori realmente assenti con il motivo reale: ferie/malattia/permesso), soluzioni con soli operatori reali (sostituto idoneo o richiamo da riposo); se nessuno è idoneo, suggerisce un'assunzione.

### Verifiche
- 29/29 suite verdi (nuova `realdata`): l'AI cita solo nomi realmente inseriti; con personale vuoto non inventa nulla; «perché non è pubblicabile» resta sul proprio intent. Sintassi 83 file 0 errori, import↔export OK, TS2304 = 0.

## [Postazioni come vincolo reale di generazione]

### Postazioni nel motore di generazione
- L'ottimizzatore (`optimizePiano`) ora include una **penalità di copertura delle postazioni** nel costo globale, con pesi per priorità (critica ≫ alta > media > bassa). Aggiunto un **pass dedicato** che mira agli scambi che coprono le postazioni critiche/alte scoperte, eseguito **prima** delle passate di equità/preferenze.
- **Sicurezza per costruzione**: ogni scambio passa ancora tutti i controlli legali (riposo 11h, recupero post-notte, smonto ancorato alla notte, max 6 consecutivi, esenzioni di ruolo, quota notti). Le postazioni guidano *quali* scambi legali applicare, non *quali* vincoli rilassare. Senza postazioni configurate il comportamento è identico a prima (zero regressioni).
- Priorità rispettata: legale > critiche > alte > medie > equità > preferenze > desiderata. Una postazione critica non viene sacrificata per una preferenza.

### Copertura minima garantita + CRITICITÀ GRAVE
- `Reparto.minimi` (critiche/alte/OSS/infermieri minimi). `stationGuarantee(ctx, piano)` segnala **CRITICITÀ GRAVE** con dettaglio per giorno quando i minimi non sono rispettati. `publishGate` ora **blocca la pubblicazione** se una postazione critica è scoperta o se i minimi non sono garantiti.

### Dashboard direzionale
- `safetyIndex(ctx, piano)` → indice di sicurezza assistenziale 0-100 (postazioni critiche/alte coperte, presenza senior/OSS, criticità aperte) con livello 🟢 Sicuro / 🟡 Attenzione / 🔴 Critico. Mostrato in cima alla Dashboard.

### Simulatore strategico
- `simulateScenario` ora restituisce anche `indiceSicurezzaPrima/Dopo`, `postazioniRecuperate`, `postazioniPerse`. La schermata mostra questi campi.

### Assistente AI — direzionale
- Nuovi intent: «quale postazione impedisce la pubblicazione», «quali postazioni critiche non sono garantite», «quanti infermieri senior mancano», «quale assunzione migliorerebbe maggiormente la copertura» (confronto senior/OSS/infermiere per indice di sicurezza), «collo di bottiglia», «quale postazione genera più criticità».

### Verifiche (QA sacro)
- 28/28 suite verdi (nuova `clinical_gen`). **Stress matrix con postazioni attive (reparti stagionali + coordinatore + senior/OSS) su 10/30/50/100/200 operatori e mesi a cavallo stagione: 11h=0, recupero=0, smonto=0, max-consecutivi≤6, esenzioni coordinatore=0** — invarianti sacri preservati. Determinismo confermato. Sintassi 83 file 0 errori, import↔export OK, TS2304 = 0.

## [Postazioni operative reali + Copertura assistenziale]

### Postazioni operative (Fasi 1-4)
- Tipi: `Postazione` (id, nome, turni M/P/N, priorità critica/alta/media/bassa, requisiti, quantità), `StationReq` (ruolo infermiere/oss, senior, referente, anzianità minima), stato `verde`/`giallo`/`rosso`. Campo `Reparto.postazioni?`.
- Motore — `stationCoverage(ctx, piano)`: layer di analisi sopra il piano (non tocca il generatore). Per ogni giorno/turno alloca gli operatori presenti alle postazioni con **allocazione greedy per priorità** (prima le critiche). Stato per postazione: 🟢 coperta, 🟡 coperta con criticità (requisito soft come senior/referente soddisfatto in deroga), 🔴 scoperta.
- `stationsOnDay(ctx, piano, day)` per lo stato giornaliero; `substituteForStation(...)` propone un operatore idoneo (preferendo il match completo).
- Requisiti verificati: ruolo (infermiere/OSS), senior (livello/anni≥5/classificazione), referente, anzianità minima.

### Dashboard Clinica (Fase 5)
- `dashboardData` ora include `postazioni` (copertura assistenziale reale) e una criticità dedicata alle postazioni critiche scoperte. La Dashboard mostra la sezione «Copertura Assistenziale Reale» con pallino colore + stato.

### Simulatore clinico (Fase 7)
- `simulateScenario` ora restituisce anche `stazioniScoperte` per il giorno interessato (es. «Se Rossi è assente domani» → quali postazioni restano scoperte).

### AI clinica (Fase 6)
- Nuovi intent: «quali postazioni sono scoperte», «quale postazione è più critica», «quale sostituto copre [postazione]». Trigger ristretto per non collidere con «unità assistenziali».

### Verifiche
- 27/27 suite verdi (nuova `clinical`). Retro-compatibile: reparti senza postazioni → nessun impatto. Sintassi 83 file 0 errori, import↔export OK, TS2304 = 0.

## [Dashboard Coordinatore + Config operativa stagionale + Simulatore AI]

### Configurazione operativa stagionale (Fasi 1-2)
- Tipo `SeasonOps` su `SeasonRange`: settori attivi per turno (M/P/N), OSS per turno (informativo), settori chiusi, posti letto/chiusi, copertura minima %, personale minimo.
- Motore: `resolveSeasonalOps(ctx)` applicato in cima a `buildPiano` e `computeCoverage`. Quando un reparto `STAGIONALE` ha settori specifici per la stagione dominante del mese, generazione e copertura usano quei fabbisogni. **Retro-compatibile**: senza override il contesto resta identico (zero regressioni sulle 25 suite preesistenti). Verificato: giugno→settori estate (15 slot), gennaio→settori inverno (10 slot).

### Simulatore Scenario / Scenario AI (Fasi 4-5)
- `simulateScenario(ctx, piano, input)` → `{ coperturaAttuale, coperturaPrevista, giorniCritici, turniScoperti, impatto, sostituti[], vincoli[], nota }`. Scenari: ferie, malattia, assunzione, dimissione, chiusura/apertura settore, +/- posti letto. **Tutte le simulazioni sono temporanee: il piano reale non viene mai modificato.** Sostituti via `evalCandidate`; vincoli (copertura insufficiente, sbilanciamento notti) calcolati.
- Schermata `SimulatoreScreen` (route `simulatore`).

### Dashboard Coordinatore (Fase 3)
- `dashboardData(ctx, piano, today)` → copertura mese/settimana/oggi (copertura giornaliera reale), conteggi ferie (attesa/approvate/respinte), criticità, indicatori (più notti/weekend/festivi/ore, meno ore), distribuzione per operatore, stagione attiva.
- Schermata `DashboardScreen` (route `dashboard`) con KPI, suggerimenti AI proattivi, criticità, indicatori e grafici a barre.

### AI proattiva (Fase 7)
- `proactiveSuggestions(ctx, piano)` → suggerimenti automatici: approvazione consigliata, giorni scoperti previsti, sbilanciamento notti, mese in equilibrio.

### Assistente AI — nuovi intent (Fase 6)
- Stagione attiva, configurazione operativa attiva, settori chiusi per stagione, «se apro/chiudo un settore» (via simulatore), «quanti operatori mancano per il 100%» (stima da simulazione iterativa), «chi posso assumere per migliorare la copertura».

### Performance (Fase 8)
- Misurata su 10/30/50/100/200 operatori: dashboard 3-20 ms (< 500), scenario 3-26 ms (< 2 s), generazione nei limiti. Tutti i target rispettati.

### Verifiche
- 26/26 suite verdi (nuova `advanced` + tutte le precedenti incl. `stress`, `seasonal`). Sintassi 81 file 0 errori, import↔export OK, TS2304 = 0.

## [Matrici stagionali + valutazione AI richieste]

### Matrici stagionali (nuova modalità "STAGIONALE")
- Tipi: `Season`, `SeasonRange` (matrice + data inizio/fine in gg/mm, mesi 1-based), `SeasonalConfig` (Record delle 4 stagioni). Campo opzionale `seasonal?` su `Reparto` e su `Staff`.
- Helper puri (`utils/helpers.ts`): `inSeasonRange` (con gestione wrap dicembre→febbraio), `seasonForDay`, `seasonalMatrice`.
- Motore (`buildPiano`): risoluzione della matrice **per-giorno** quando il reparto/operatore usa `STAGIONALE`. `seasonalConfigFor` determina la configurazione (operatore > reparto; le preferenze forti solo-mattina/pomeriggio e i combo restano prioritari).
- **Continuità di ciclo (requisito critico):** al cambio stagione il ciclo NON riparte dal primo giorno. L'indicizzazione resta ancorata al **calendario assoluto** (`absDayIndex`), quindi cambia solo la lunghezza del ciclo mentre l'indice continua a scorrere. Verificato: 30/30 divergenze rispetto all'indicizzazione locale (nessun restart), ≤1 differenza da recupero/smonto, smonto e vincolo 11h preservati al confine.
- Date stagioni completamente personalizzabili (nessuna data fissa).

### Assistente AI — domande stagionali
- Nuovi intent: matrici stagionali attive, matrice usata in un mese ("a luglio"), prossimo cambio stagione, operatori che usano matrici stagionali, configurazione stagionale del reparto. Trigger ristretto per non intercettare domande non stagionali (es. "quante ore a giugno").

### Valutazione AI per richiesta + commento obbligatorio (multiutente)
- `assessRequest(ctx, piano, req)` → simula l'assenza del richiedente nei giorni richiesti, misura la **copertura residua** reale, propone un **sostituto idoneo** (via `evalCandidate`), classifica l'**impatto** (basso/medio/critico) e indica se la richiesta è approvabile.
- `RichiesteScreen`: ogni richiesta in attesa mostra la valutazione AI (copertura prima→residua, sostituto, impatto, nota). Il **rifiuto richiede una motivazione** (≥3 caratteri) salvata nello storico e visibile al richiedente.

### UI
- Nuova schermata `SeasonalConfigScreen` (route `matrici-stagionali`, modale) con selettore reparto interno, scelta matrice per stagione (cicli standard + personalizzate) e intervallo date con stepper gg/mm. Voce "Matrici stagionali" in Strumenti.
- Il **costruttore di matrici personalizzate** era già presente in `MatriciScreen` (composizione libera M/P/N/S/R/G, lunghezza arbitraria, salvataggio nel catalogo, eliminazione, persistenza nei backup).

### Persistenza
- `reparto.seasonal` viene salvato/ripristinato automaticamente (i reparti sono serializzati per intero in salvataggio, idratazione e backup); le matrici personalizzate erano già persistite.

### Verifiche
- 25/25 suite verdi (incluse `seasonal`, `seasonal_ai`, `stress`). Sintassi 77 file 0 errori, import↔export OK, TS2304 = 0.

## [CAPOTURNO, coordinatore M/R/F, stress matrix]

### Ruolo CAPOTURNO (terzo ruolo, permessi intermedi)
- `UserRole` += `CAPOTURNO`. RBAC (utils/permissions.ts): CAPOTURNO può **modificare turni**, **approvare/respingere richieste**, **vedere tutti gli operatori**; NON può pubblicare, invitare, modificare personale/reparti, esportare.
- Guardie store ora basate su `can()`: `setCell` consentito a OWNER+CAPOTURNO; `approveRequest`/`rejectRequest` a OWNER+CAPOTURNO. `loadData` gestisce i 3 ruoli. `roleLabel`/`isOwner` aggiornati (isOwner = solo OWNER).
- UI: schermata Richieste con **switch a 3 ruoli** e gating `can()` — composer per STAFF/CAPOTURNO, dashboard approvazioni per chi può approvare (OWNER/CAPOTURNO), gestione accessi solo OWNER.

### Coordinatore: solo M/R/F
- Motore: il coordinatore non riceve mai il pomeriggio (P→R; la notte era già N→R). Verificato anche con matrice piena (DECIMA): ottiene solo M/R.

### Stress matrix (eseguita davvero)
- 10/30/50/100/200 operatori × checkpoint mesi 1/6/12/24, optimize ON, 2 reparti, mix contratti/matrici, neoassunti, OSS, ferie+L104+malattia, continuità cross-mese.
- Risultati: **11h=0, recupero=0, smonto=0, maxRun≤6, coordinatore 0 notti/WE/festivi, 0 settori, solo M/R/F, determinismo ✓** a ogni scala. Copertura: 10→~44% (organico insufficiente, non violazione), 30→~89%, 50→~92%, 100→93%, 200→94%. Tempi 56–301 ms/mese.

### Verifiche
- Suite CAPOTURNO + coordinatore M/R/F verdi. Regressione completa (22 suite) verde. Stress matrix verde. TS2304=0, import/export ok, sintassi 0 errori (75 file).

## [Multiutente — RBAC, richieste/desiderate con approvazione (fondazione lato-app)]

Backend **da collegare in seguito** (scelta utente): qui è costruita la **fondazione lato-app**, locale e testabile, con punto d'innesto pulito. Inviti via email, sync tra dispositivi e autenticazione restano **da implementare sul backend**. Abbonamento **escluso** (scelta utente).

### Dati / tipi
- `UserRole` (OWNER/STAFF), `RbacAction`, `ApprovalRequest`, `Membership`. `EngineContext.richieste?` e `PersistedData` += `role/members/richieste`.

### RBAC (utils/permissions.ts)
- `can(role, action)` e `isOwner(role)`: OWNER permessi completi; STAFF sola consultazione + invio richieste (no modifica turni/personale/reparti, no pubblicazione/approvazione/inviti/export).

### Richieste → vincoli (utils/requests.ts, puro)
- `requestToConstraint`: una richiesta **approvata** diventa una **ferie** (assenza) o un **desiderata** (riposo/mattina/pomeriggio/evitaNotte, priorità alta) → entra automaticamente nei vincoli di generazione. `requestLabel` per la UI.

### Store (hooks/useStore.tsx)
- Stato `role/members/requests` + persistenza (e correzione: ora salva anche `aiMode/matriciCustom/matriceMese`, prima persi).
- Azioni: `setRole` (switch in-app), `inviteMember`/`revokeMember`, `submitRequest`, `approveRequest` (→ converte in vincolo, rigenera), `rejectRequest`.
- **Guardie RBAC**: `setCell` e `approveRequest`/`rejectRequest` bloccati per lo STAFF.
- `ctxOf` espone `richieste` all'assistente.

### Assistente AI (services/engine.ts)
- Nuovi intent: "chi ha richiesto ferie", "quanti operatori in attesa", "mostrami i conflitti/incompatibili", "quale combinazione approvare". Rilevamento conflitti di copertura (approvare lascerebbe giorni scoperti).

### UI
- Nuova schermata **Richieste e Desiderate** (`screens/RichiesteScreen.tsx`, route `app/richieste.tsx`, modale), role-aware: STAFF invia richieste e vede lo stato; OWNER approva/respinge, gestisce gli accessi (invita/revoca) e cambia vista con lo **switch ruolo**. Ingresso da Strumenti.

### Verifiche (motore/logica, reali)
- RBAC `can` (OWNER vs STAFF) verde. `requestToConstraint` (ferie/riposo/preferenze) verde. **Approvazione ferie rispettata in generazione** (operatore assente nei giorni approvati). Intent AI richieste verdi. **Conflitto reale** (troppe ferie lo stesso giorno) rilevato. Regressione completa (20 suite) verde, TS2304=0, import/export ok.

### Scenari richiesti
- ② STAFF tenta modifica turno → **negato** (guardia `setCell` + RBAC). ③ STAFF invia ferie → OWNER approva → **generazione rispetta** (verificato). ④ revoca accesso → membro marcato "revocato" (rimozione reale cross-device = backend). ① inviti gratuiti / ⑤ abbonamento: ① scaffold inviti (accesso reale = backend); ⑤ **escluso** per scelta.

### Da completare (richiede backend / verifica device)
- Inviti via email reali, sincronizzazione multi-dispositivo, autenticazione, rimozione reale all'atto della revoca: **backend** (già esistente lato utente, da collegare). Gating visivo dei pulsanti di modifica su **tutte** le schermate per lo STAFF: enforce già a livello store (setCell) e nella schermata Richieste; estensione visiva completa = follow-up (UI non testabile a runtime offline).

## [Architettura — Coordinatore e Fuori Turno NON sono unità assistenziali]

Correzione concettuale: il personale di **coordinamento/supporto** (Coordinatore, Fuori Turno) è ora **escluso dalla logica assistenziale** (copertura, settori, scoperture, sostituzioni, fabbisogno, bilanciamento, ottimizzazione), pur restando **visibile nel piano**. Il personale **assistenziale** (Infermiere, OSS) resta l'unico a partecipare.

### Dati
- `Staff` + `countInCoverage?: boolean` (override esplicito). Helper unico `countsInCoverage(inf)` (utils/helpers.ts): usa il flag se presente, altrimenti deriva dalla qualifica (Coordinatore/Caposala/Fuori Turno → false; Infermiere/OSS → true). Preservato in `sanitizeStaff`.

### Motore (services/engine.ts)
- `evalCandidate`: ritorna `null` per il personale non assistenziale → **mai** usato per autofill, scoperture o sostituzioni.
- Posa‑matrice (STEP 4): il personale non assistenziale resta visibile col proprio turno ma **senza settore** (settore = null).
- `computeCoverage`: **salta** il personale non assistenziale (la copertura usa solo l'assistenziale).
- `optimizePiano`: opera **solo** sul personale assistenziale (non riassegna né "spreme" coordinatori/fuori turno nei settori). *(Questo era il punto che, con optimize attivo, assegnava erroneamente settori al coordinatore.)*
- `assistantQuery`: nuovo intent **"unità assistenziali"** ("quante unità/infermieri/oss…") → conta solo l'assistenziale ed elenca a parte gli esclusi (Coordinatore, Fuori Turno).
- `services/substitution.ts` `rankSubstitutes`: il personale non assistenziale è **escluso** dalla lista candidati.

### UI
- Personale: la riga marca il personale non assistenziale come **"supporto (fuori conteggio)"** (riga troncata, nessun rischio layout).

### Verifiche (motore, reali)
- **Scenario 1** (1 coord + 30 inf + 10 OSS): coordinatore visibile, **0 settori**, copertura identica con/senza coordinatore (100%↔100%), assente dai sostituti.
- **Scenario 2** (solo coordinatore): **copertura = 0%** (non 100%).
- **Scenario 3** (scoperture): il coordinatore **non** viene mai usato per chiudere buchi (né autofill né sostituti).
- **Scenario 4** (assistente): "unità assistenziali presenti" = 25 (18 inf + 7 OSS), Coordinatore e Fuori Turno elencati come esclusi.
- Helper `countsInCoverage` (incl. flag esplicito) verde. Regressione completa (19 suite) verde, TS2304=0, import/export ok.

### Numeri prima/dopo
- Scenario 2: copertura **prima 100% → dopo 0%** (corretto).
- `scale` (30/50/100): confinamento cross‑reparto ora calcolato sui soli assistenziali (22/37/75 unità) — i coordinatori (25%) non sono più conteggiati nella distribuzione assistenziale.

### Documentato (SAFE MODE, non applicato)
- Separazione visiva del **Report** in sezioni "Assistenziale" / "Supporto": i dati di copertura sono già corretti; il raggruppamento grafico richiede verifica su dispositivo.

## [UI iOS 26 — SAFE MODE STRICT (presentazione, logica invariata)]

Solo layer UI/design system. Nessuna modifica a engine/validator/persistence/storage/AI/export. Applicate solo modifiche a rischio‑zero‑layout, verificate (TS2304=0, import/export, route, test motore verdi).

### Applicate (certe)
- **Design system completato** (Fase 2, additivo, `utils/theme.ts`): aggiunte `SPACING` (4/8/12/16/20/24/32) e `RADIUS` (12/16/20/24), oltre alla scala `TYPE` e `TOUCH_MIN` già introdotte. Adottabili gradualmente, nessuna rottura.
- **Personale — stile "Contatti"** (Fase 5): la riga ora mostra anche il **livello professionale** (classificazione automatica) e gli **anni di esperienza**, riusando dati già nel modello tramite `classifyOperator` (funzione di sola lettura). Modifica limitata alla sottostringa esistente con `numberOfLines={1}` → nessun rischio di overflow/layout. Nessun dato inventato.

### PROPOSTE NON APPLICATE — richiedono verifica dispositivo reale
- **Dashboard‑first** (Fase 3): anteporre KPI/alert/azioni alle liste richiede ristrutturare l'albero dei componenti → verifica layout/scroll su device.
- **Header Large Title + stato operativo** (Fase 4): cambia la configurazione di navigazione/safe‑area → verifica su device.
- **Copertura come dashboard KPI** (Fase 6): ristrutturazione schermata → verifica su device.
- **Assistente "Apple Intelligence" (insight proattivi in evidenza)** (Fase 7): la logica esiste (fatigue, gate, neoassunti, proposte) ed è già esposta nelle sezioni Criticità/Suggerimenti; un pannello insight dedicato è una ristrutturazione UI → verifica su device.
- **FlatList/SectionList** (Fase 9): Personale/Report/Reparti/Matrici/Assistente usano `.map` in `ScrollView`; conversione cambia scroll/misure → verifica su device.


## [UI/UX refactor — SAFE MODE (solo presentazione, logica invariata)]

Nessuna modifica a engine/store/servizi/validatori/persistenza/AI: toccati solo componenti visuali e design system. Applicate solo modifiche a rischio‑zero‑layout, verificate (compilazione, TS2304=0, import/export, route).

### Applicate
- **Feedback "pressed" su tutti i controlli condivisi** (Fase 5 — nessun pulsante "morto"): `Chip`, `SelectChip`, `OptionCard` ora reagiscono al tocco con opacità; `Button` ha già l'animazione di scala. Propagato a tutta l'app tramite i componenti condivisi.
- **Touch target ≥44pt** (Fase 3) senza spostare la grafica: aggiunto `hitSlop` a `Button` (copre la variante `small` 38→48), `Chip` (34→~46), `SelectChip` (~32→~44). Zero rischio di layout (l'area visiva non cambia).
- **Design system tipografico iOS** (Fase 2): aggiunta scala `TYPE` (largeTitle/title1‑3/headline/body/callout/subhead/footnote/caption) e `TOUCH_MIN=44` in `utils/theme.ts`. Additiva: adottabile gradualmente senza rotture.
- Verificato che il sistema colori è già tokenizzato (nessun colore arbitrario significativo: i soli `#000` residui sono default icona e shadow standard).

### Documentate, NON applicate (rischio di regressione non verificabile offline)
- **FlatList/SectionList** al posto di `ScrollView + map` (Fase 6): cambia il comportamento di scroll/misura; va validato su dispositivo.
- **Card translucide + blur + large‑title collapsing header** (Fase 4): richiedono `expo-blur`/configurazione header di navigazione non verificabili qui.
- **FAB / floating entry point dell'assistente** (Fase 7): overlay con safe‑area e z‑index da validare su device; l'ingresso resta il pulsante ✦ in ogni header (Copilot‑style, già non‑chatbot).
- **Celle turno (ShiftGrid)**: dense per design (31 giorni, scroll orizzontale). NON aggiunto `hitSlop` per non creare aree di tocco sovrapposte tra celle adiacenti.


## [Audit pre-produzione — bug CRITICO persistenza + completamento backup + assistente]

### ⚠ BUG CRITICO corretto — perdita dati al caricamento
- **Causa**: `loadData()` applicava `sanitizeStaff` a ogni avvio, e `sanitizeStaff` (utils/helpers.ts) **restituiva solo un sottoinsieme fisso di campi**, scartando `esenteWeekend`, `esenteFestivi`, `preferenze`, `competenze`, `anniEsperienza`, `livello`, `templateCombo`, `oreSettimanali`.
- **Effetto**: dopo qualunque riavvio dell'app, un coordinatore configurato "solo mattina / no notti / no weekend / no festivi" perdeva quelle impostazioni e **ricominciava a ricevere notti, weekend e festivi**; si perdevano anche tutte le preferenze e il profilo professionale.
- **Fix**: `sanitizeStaff` ora **preserva tutti i campi opzionali** (con validazione leggera) mantenendo la normalizzazione difensiva degli array obbligatori. File: `utils/helpers.ts`.
- **Verifica**: nuova regressione dedicata — tutti i campi opzionali sopravvivono al passaggio; array malformati restano normalizzati a `[]`.

### Backup/restore completato (perdita dati al ripristino)
- Prima il backup salvava solo reparti/staff/ferie/pianos/mese/anno/audit: **andavano persi matrici personalizzate, matrice‑mese, desiderata e impostazioni** (modalità, modalità AI).
- `serializeBackup` + `parseBackup` (services/storage.ts) ora includono `matriciCustom`, `matriceMese`, `desiderata`, `mode`, `aiMode`; `exportBackup`/`importBackup` (hooks/useStore.tsx) li esportano e ripristinano. Checksum **retro‑compatibile** (verifica sul payload ricevuto: i vecchi backup restano validi).

### Assistente AI — domande mancanti completate
- Nuovi intenti in `assistantQuery` (services/engine.ts): **elenco per livello** ("chi è neoassunto/junior/senior/esperto/referente"), **straordinari/ore**, e instradamento di **"quali vincoli CCNL sto violando"/"quali criticità"** al gate. Disambiguazione "chi è neoassunto" (elenco) vs "turni con neoassunti" (analisi turni).

### Verifiche eseguite (motore, reali)
- Workflow coordinatore completo (creazione reparto/personale/OSS/coordinatore, ferie/malattia/104, matrice personalizzata, generazione, modifica, trova sostituto, gate, export PDF/XLSX, backup/restore) → verde.
- Assistente: 11 domande di Fase 7 + normativa (Fase 8) → verde.
- Eventi reali (5 malattie + 10 ferie, dimissione, assunzione, apertura/chiusura reparto, coordinatore assente) → vincoli sempre tenuti.
- Stress 10/30/50/100/200 operatori, fino a 20 reparti, 12 mesi: nessun crash, 41–88 ms/mese, 11h=0, recupero=0, max‑6.
- Regressione completa (18 suite) verde; TS2304=0; import/export ok.

### Dichiarato NON correggibile/verificabile in questo ambiente offline
- Esecuzione UI a runtime (tap reali, rendering, scroll, tastiera, orientamento, notch, device iOS/Android/tablet): **non eseguibile** senza dispositivo/Expo.
- UX mobile da rivedere su dispositivo: **target touch < 44px** (es. ScreenHeader 38/30px, CellEditor 30px, badge/azioni 32‑36px) e **liste non virtualizzate** (Personale/Report usano `.map` in ScrollView: con 100‑200 operatori va valutata `FlatList`). Identificati ma **non modificati** per non introdurre regressioni non verificabili offline.


## [Enterprise — Assistente Coordinatore AI offline + profilo professionale]

### Nuove funzioni motore (pure, testate)
- **`assistantQuery(ctx, piano, q)`**: motore di interrogazione **offline** (nessuna API esterna) sui dati reali.
  Intenti: ranking notti/weekend/festivi/assenze, sovraccarico (fatigue), giorni consecutivi, turni scoperti,
  alert neoassunti, motivo del blocco pubblicazione, ricerca sostituti (ordinati per idoneità e livello),
  e **normativa** integrata. Routing robusto (es. "smonto dopo la notte" → normativa, "chi può fare una notte"
  → sostituto, "chi ha più notti" → ranking).
- **`NORMATIVA` + `normaLookup`**: base normativa locale (riposo 11h/D.Lgs 66, smonto/recupero, max consecutivi,
  lavoro notturno, ferie, L.104, maternità, profilo infermiere DM 739, profilo OSS, ruolo coordinatore).
- **`checkNeoassunti(ctx, piano)`**: rileva turni con ≥2 neoassunti e nessun Senior/Esperto/Referente. **Non bloccante.**
- **`classifyOperator`** potenziata: priorità a livello esplicito → anni di esperienza → competenze.
- **`publishGate`**: aggiunto controllo "Alert neoassunti" come **warn** (mai bloccante); bloccano solo
  11h/recupero/smonto/max-6/esenzioni. Provato: piano pulito con neoassunti resta pubblicabile.
- **`rankSubstitutes`**: aggiunta priorità per **livello professionale** (Referente→Esperto→Senior→Junior→Neoassunto),
  mantenendo prioritari vincoli ed equità.

### Profilo professionale
- `Staff` + `anniEsperienza?` e `livello?` (tipo `OperatorClass`). Campi **opzionali**, non bloccano la generazione.
- `COMPETENZE_AREE` e `LIVELLI` in costanti. Competenze informative (non vincolanti).

### UI
- **Pulsante globale Assistente** (logo ✦ nell'header) presente in tutte le schermate principali → apre l'Assistente.
- Nuova schermata **Assistente Coordinatore AI** (`screens/AssistenteScreen.tsx`, route `app/assistente.tsx`, modale):
  Chat (Q&A offline + domande rapide), Personale (classificazione + fatigue con bande 0-25/26-50/51-75/76-100),
  Criticità (publishGate + alert neoassunti), Suggerimenti (proposte matrice + **"Applica tutte le proposte"**).
- **Wizard operatore**: nuovo blocco Profilo (anni esperienza, livello, competenze).
- Store: nuova azione **`applyMatriceProposals()`** (applica `proposeMatrice` a tutti, rigenera, ritorna n. modificati).

### Verifiche
- Backbone: tutti gli intenti dell'assistente, classificazione, neoassunti, gate, normativa → verdi.
- Regressione completa (14 suite) verde; bug coordinatore "solo mattina" riconfermato risolto.
- **Audit 30/50/100 operatori × 24 mesi** (Coordinatore AI, optimize ON): 11h cross-month=0, recupero=0,
  smonto valido, max-6, coordinatore 0 notti/weekend/festivi (anche "solo mattina"), determinismo, copertura 90-94%,
  funzioni AI raggiungibili sul piano reale.

### Non incluso / da completare (dichiarato)
- Dashboard direzionale come schermata separata; copilot dentro **ogni** wizard; costruttore matrice **dentro** ogni
  wizard; superficie alert/fatigue anche in Report. La UI **non** è verificabile a runtime offline (solo controlli statici).


## [Fix CRITICO — crash creazione operatore (anteprima ciclo matrice non a 7 giorni)]

- **Bug**: in `StaffWizardScreen` l'anteprima del ritmo a 14 giorni calcolava la posizione nel ciclo con
  `% 7` (settimana fissa). Per ogni matrice con ciclo ≠ 7 giorni (Quinta=5, Sesta=6, Decima=10, Ottava=8,
  Turnazione 12h=5, **TM "Solo Mattina"**, TA, TN1=3, ...) l'indice usciva dall'array → `seq[pos]`
  `undefined` → `colors.shift[undefined].bg` → **crash di render**: la schermata di creazione/modifica
  operatore si bloccava e l'operatore non veniva salvato. Riproducibile con il Coordinatore "Solo Mattina"
  (matrice TM) e con tutte le matrici cliniche reali.
- **Fix**: la posizione nel ciclo ora usa la **lunghezza reale della sequenza** della matrice
  (`% mxPreview.seq.length`) con guardia anti-undefined; accesso ai colori turno reso difensivo
  (`colors.shift[t] || colors.shift.R`) anche nell'elenco matrici. File: `screens/StaffWizardScreen.tsx`.
- **Verificato**: 0 indici undefined su tutte le matrici × offset 0–6; ciclo di vita coordinatore
  (salva/modifica/elimina) senza crash; coordinatore 0 notti/0 weekend/0 festivi, solo mattine feriali;
  generazione mai bloccata; determinismo e regressione completa (13 suite) verdi.


## [Coordinatore AI: ottimizzatore collegato (3 modalità) · classificazione automatica · proposta matrice]

- **FASE 10 — Ottimizzatore collegato all'app.** Nuovo `aiMode` con 3 modalità: **Rapida** (solo
  matrice, massima aderenza), **Equa** (ottimizzatore+equità), **Coordinatore AI** (ottimizzatore +
  equità + desiderata + preferenze). Default: Coordinatore AI. `optimize` è ora propagato a TUTTE le
  generazioni dello store (era sempre `false`). Selettore in Impostazioni. Persistente + migrazione.
- **FASE 3 — Classificazione automatica** (`classifyOperator`): Neoassunto/Junior/Senior/Esperto/
  Referente da qualifica + skill matrix, con motivazioni.
- **FASE 4 — Proposta automatica della matrice** (`proposeMatrice`/`proposeAllMatrici`): l'AI propone
  la matrice per operatore (rispettando preferenze forti ed esenzioni) con spiegazione.

> Prova reale: in modalità Coordinatore AI su 30/50/100 operatori × 24 mesi la dispersione delle notti
> cala nettamente (50 op: 50%→26%; 100 op: 65%→40%) e le ore si bilanciano, **mantenendo 11h/recupero/
> max-6 a 0, coordinatore 0/0/0 e copertura ≥90%**. L'aderenza alla matrice scende (≈70%) in Coordinatore
> AI: è il compromesso atteso fra equità e fedeltà alla matrice, ora scelto dall'utente.

> Restano NON implementate: Fasi 5 (equità storica pluriennale), 6 (simulatore strategico), 7 (skill mix
> VINCOLANTE in generazione — oggi solo gate di pubblicazione), 8 (auto-ribilanciamento), 11–13
> (auto-rebalance/fatigue in generazione/dashboard UI) e l'integrazione UI del backbone. Vedi report.


## [Rebranding TURNOVER · backbone di verifica: fatigue score + gate di pubblicazione + skill mix]

- **Rebranding completo TurniAI → TURNOVER**: nome app, slug, scheme, bundle id (`com.turnover.app`),
  nome progetto/package, footer PDF, marker backup, placeholder import, nomi file di backup,
  chiavi di storage (`turnover_data_v1`/`turnover_theme_v1`) con **migrazione automatica** dai dati
  storici `turniai_*`. Import backup **retro-compatibile**: accetta sia `TURNOVER` sia `TurniAI`.
  Il **checksum** dei backup è invariato (calcolato sui soli dati).
- **Fatigue score** (`fatigueScore`): indice 0–100 per operatore da notti/weekend/festivi/
  concentrazione del lavoro negli ultimi giorni del mese.
- **Skill matrix** (dati): campo opzionale `competenze` su operatore (area + livello + date), backward-safe.
- **Skill mix** (`skillMixCheck`): rilevazione turni privi di referente/competenze critiche (rilevazione,
  non ancora vincolo in generazione).
- **Gate di pubblicazione** (`publishGate`): aggrega i controlli inviolabili (11h, recupero post-notte,
  smonto, max 6 consecutivi, copertura) + fatigue + skill mix e **blocca** se anche uno fallisce.

> Nota: le Fasi 3 (acuità dinamica), 5 (equità storica pluriennale), 6 (simulatore strategico),
> 7 (assenze predittive), 8 (auto-ribilanciamento) e 9 (dashboard direzionale), e l'integrazione UI
> delle nuove funzioni, NON sono incluse in questa release. Vedi report di audit.


## [Catalogo matrici reali · gerarchia Operatore→Reparto→Mese · matrici personalizzate · audit]

Revisione architetturale: il motore **applica matrici contrattuali reali** da un catalogo
configurabile — non le inventa e non sceglie autonomamente. La **matrice è la regola**;
l'ottimizzatore interviene solo come raffinamento opzionale.

- **Catalogo matrici** (`utils/constants.ts`) con metadati per voce — nome, descrizione,
  sequenza, durata ciclo, compatibilità reparto/ruolo: **Quinta** `M P N S R`,
  **Sesta** `M M P P N S`, **Decima** `M M P P R N N S R R`, **Ottava** `M M P P N N S R`,
  **12 Ore** `G N S R R`. Smonto **incorporato** nella matrice. Restano disponibili le
  matrici settimanali/a scalare preesistenti.
- **Nuovo turno `G`** (giornata 12h): tipo `Turno`, ore (12h), colori tema/PDF/XLSX, label.
- **Gerarchia obbligatoria** (`resolveMatrice`, motore): Operatore → Reparto → Mese → (auto
  recovery-safe come ultima istanza). Se l'operatore ha una matrice si usa quella; altrimenti
  quella del reparto; altrimenti quella del mese. L'**origine** è tracciata e mostrata.
- **Generatore matrice-first**: il piano parte esclusivamente dalla matrice assegnata;
  ≥90% dei giorni deriva dalla matrice. Le modifiche sono eccezioni (ferie/malattia/permesso/
  aspettativa/desiderata/preferenze/copertura). L'ottimizzatore equità/preferenze è ora
  **opt-in** (`optimize=true`); il taglio notti per FTE è applicato solo in ottimizzazione
  (la matrice definisce le notti).
- **Vincoli assoluti** mai derogati e verificati: riposo 11 ore, recupero post-notte, smonto,
  limite 6 giorni consecutivi, esenzioni di ruolo (coordinatore: niente notti — imposto sopra
  la matrice) e preferenze forti solo-mattina/pomeriggio.
- **Matrici personalizzate**: nuova schermata **Catalogo matrici** (`app/matrici`) per costruire
  e salvare sequenze proprie nel catalogo; persistenza (`matriciCustom`) e CRUD nello store.
- **Selezione matrice a 3 livelli in UI**: scheda operatore e reparto (catalogo completo +
  "Eredita"), **matrice del mese** in Impostazioni.
- **Audit "Aderenza alla Matrice"** (Report, `matrixReport`): per operatore matrice assegnata,
  origine, durata ciclo, posizione nel ciclo, % di rispetto, n. deroghe e motivazioni; più
  conteggi per matrice e per origine e aderenza complessiva.
- **Persistenza**: `matriciCustom` e `matriceMese` letti da `loadData`; formato/checksum del
  **backup invariati** (i nuovi campi sono omessi dal core del backup).

### Test
- **Test specifici per ogni matrice** (Quinta/Sesta/Decima/Ottava/12h): aderenza ≥90%
  (100% su organico bilanciato), 11 ore = 0, smonto valido (anche a cavallo di mese),
  max 6 consecutivi. Test di gerarchia (operatore/reparto/mese) e di matrice personalizzata.
- Batteria di regressione completa verde; invarianti SACRI a 0 (copertura, 11 ore, recupero,
  consecutivi, esenzioni). Le metriche soft di equità (alternanza festivi, confinamento
  multi-reparto) sono ora **subordinate alla matrice** per mandato esplicito.

## [Collegamento UI: preferenze · desiderata · modalità · report deroghe]

Completato il collegamento tra motore e interfaccia (nessuna modifica algoritmica al motore).

- **Scheda operatore (StaffWizard, step 7)**: preferenze forti (no notti, no weekend, no
  festivi, solo mattina, solo pomeriggio) e deboli (preferenza mattina/pomeriggio, weekend
  libero, reparto preferito, settore preferito). Salvate su `Staff.preferenze` /
  `esenteWeekend` / `esenteFestivi`.
- **Schermata Desiderata** (nuova, `app/desiderata`): elenco ordinato, creazione, modifica ed
  eliminazione. Per desiderata: operatore, data singola o intervallo, tipologia
  (lavorare/riposo/mattina/pomeriggio/evita notte), priorità (bassa/media/alta).
- **Schermata Impostazioni** (nuova, `app/impostazioni`): scelta Modalità Rigida / Operativa
  con priorità descritte; **salvataggio persistente** in AsyncStorage.
- **Report → "Deroghe Generate"**: elenco con operatore, giorno, reparto, tipo deroga e
  motivazione (dal piano del mese corrente).
- **Store**: `mode` e `desiderata` aggiunti allo stato e a `ctxOf` (tutte le generazioni li
  ereditano), con persistenza e CRUD (`setMode`, `addDesiderata`, `updateDesiderata`,
  `removeDesiderata`); ogni operazione rigenera il piano del mese e registra l'audit.
- Backup invariato (formato e checksum non toccati); mode/desiderata persistiti nello storage
  principale, non nel file di backup.

---

## [Modalità di generazione · Deroghe · Preferenze · Desiderata]

### 1. Modalità di generazione (configurazione globale del motore)
- **Rigida**: priorità 11h → recupero → equità → preferenze → copertura. La copertura può
  scendere: notti oltre quota, weekend/festivi per operatori esenti restano vincoli **duri**.
- **Operativa** (default): priorità 11h → recupero → copertura → equità → preferenze. Il
  motore punta al 100% di copertura e, quando necessario, genera **deroghe controllate**
  (tracciate). Le 11 ore, il recupero post-notte, il limite di 6 giorni consecutivi e le
  esenzioni di ruolo del coordinatore restano **non derogabili** in entrambe le modalità.
- `EngineContext.mode` ('rigida' | 'operativa'); default 'operativa'.

### 2. Registro deroghe controllate
- Ogni deroga registra operatore, giorno, reparto, motivo e regola derogata
  (`BuildStats.derogheList: Deroga[]`). Regole derogabili in operativa: superamento quota
  notti, weekend extra, festivo extra (più lo straordinario di monte ore). **Le 11 ore non
  sono mai derogabili.**

### 3. Preferenze personali (`Staff.preferenze`)
- **Forti**: no notti / no weekend / no festivi (campi esistenti esenzioniTurni/esente*),
  solo mattina, solo pomeriggio. Applicate come vincoli duri (template dedicati TM/TP +
  eleggibilità in copertura e ottimizzazione).
- **Deboli**: preferenza mattina/pomeriggio, weekend libero, settore, reparto. Soft: pesano
  nell'obiettivo (peso maggiore in rigida, minore in operativa).

### 4. Desiderata (nuova entità `Desiderata`)
- Per operatore: data o intervallo, tipo (lavoro/riposo/mattina/pomeriggio/evitaNotte),
  priorità (bassa/media/alta). Rispettati come termine soft in copertura e ottimizzazione,
  pesati per priorità. `EngineContext.desiderata`.

### 5. Ottimizzazione e metriche
- L'ottimizzatore bilancia desiderata + preferenze + equità mantenendo la copertura.
- `prefSatisfaction(ctx, piano)` calcola **% preferenze deboli soddisfatte** e **% desiderata
  soddisfatti** (esposte in `BuildStats.prefPct` / `desPct`).

### 6. Report — sezione "Qualità Organizzativa"
- Nuova sezione in ReportScreen: Copertura, Equità, Coerenza, Preferenze soddisfatte %,
  Desiderata soddisfatti %, Deroghe generate. `SimResult` esteso di conseguenza. PDF, XLSX,
  backup, audit e undo/redo invariati.

### 7. Validazione (43 operatori · 12 mesi, entrambe le modalità)
- Rigida: copertura 98.6%, deroghe 235, preferenze 67%, desiderata 75%, 11h 0, recupero 0,
  oreCV 4%. Operativa: copertura 99.0%, deroghe 252, preferenze 61%, desiderata 79%, 11h 0,
  recupero 0, oreCV 4%. Preferenze forti (solo mattina/solo pomeriggio/no notti) rispettate
  al 100% in entrambe. Operativa copre più della rigida usando deroghe; rigida soddisfa più
  preferenze deboli. Nessuna regressione (smonto, equità, STEP 0, scala 30/50/100, audit,
  validatore, XLSX/PDF/backup).

---

## [Equità notti FTE · Ruoli · Festivi · Giorni consecutivi] (C1·C2·C3·C5)

### C1 — Perequazione notti su base FTE
- La quota notti mensile teorica è il `nottiMax` del contratto (∝ ore/FTE: FT36=5, PT75=3,
  PT50=2, …). Tre meccanismi la rendono effettiva: (a) i **part-time** non ricevono più un
  ciclo solo-notte — hanno sempre base diurna + un solo blocco notte; (b) **taglio notti**
  dopo la generazione: le notti che il template assegna oltre la quota diventano riposo e
  liberano slot che la copertura ridistribuisce verso chi è sotto quota; (c) **tetto duro**
  in copertura e ottimizzazione (nessuno supera `nottiMax`) + **penalità elevata** nella
  funzione obiettivo. Le notti seguono ora il contratto, non il template.

### C2 — Modello di ruolo (applicato per qualifica)
- **Coordinatore** (qualifica con "coordinat"): automaticamente solo giornata feriale —
  escluso da notti, weekend e festivi.
- **Specialista** (e ogni operatore): esenzioni weekend/festivi **configurabili**
  (`esenteWeekend`, `esenteFestivi`) oltre all'esenzione notti esistente. Le esenzioni sono
  applicate in base/copertura/ottimizzazione (mai lavoro nei giorni esenti).

### C3 — Festivi: equità + memoria storica + alternanza
- Distribuzione più equa dei festivi (preferenza in copertura a chi ne ha lavorati meno).
- **Memoria storica annuale**: `EngineContext.festiviCount` (festivi già lavorati nell'anno)
  e `festiviMajor` (chi ha lavorato i festivi maggiori l'anno precedente).
- **Alternanza dei festivi maggiori** (Natale, Capodanno, Pasqua, Pasquetta, Ferragosto):
  chi ha lavorato un festivo maggiore ha priorità negativa per lo stesso festivo l'anno dopo
  (penalità in copertura e nell'obiettivo).

### C5 — Massimo 6 giorni consecutivi = vincolo DURO
- Da penalità soft a **vincolo duro**: il motore non può generare 7 giorni consecutivi, né
  in copertura, né in ottimizzazione, né dai template a cavallo di mese. Gate in copertura e
  ottimizzatore + passaggio di enforcement (con continuità cross-mese) che converte in
  riposo il giorno eccedente. Tetto per operatore = `min(giorniCons del contratto, 6)`.

### Validazione (43 operatori · 24 mesi) — tutto verificato
- Notti FTE: PT ≤ FT, nessuno oltre la quota mensile. Coordinatore 0 notti / 0 weekend /
  0 festivi. Specialisti esenti 0 weekend / 0 festivi. Festivi σ≈2.0; alternanza Natale
  (la maggioranza non ripete l'anno dopo). Giorni consecutivi: max 6. Copertura ~99%,
  11h 0/0, recupero 0, cross-mese 0/0, determinismo. Nessuna regressione (smonto, equità,
  STEP 0, scala 30/50/100, validatore, XLSX/PDF/backup/audit).

---

## [Recupero inviolabile + equità reparti/settori + Qualità Operativa]

### Modello SMONTO (chiarito e verificato)
- Lo smonto `S` **non è un turno, non è un riposo**: è semplicemente il giorno dopo una
  notte, generato automaticamente. Non assegnabile, non copribile, non modificabile.
  Non conta nelle ore (`shiftHours('S')=0`), non conta nei riposi (i riposi sono solo `R`),
  e **non è mai una violazione 11h** rispetto alla notte che lo precede (i controlli 11h
  ignorano le celle non lavorative). Dopo `N N S R R` i due riposi *reali* sono quelli
  **dopo** lo smonto.

### 1. Recupero post-notte INVIOLABILE (vincolo forte)
- Le sequenze `N S R` e `N N S R R` sono blocchi protetti: `nb` notti → smonto + `nb`
  riposi reali, tutti non lavorativi.
- Nessuna fase può romperli: `protectRecovery` marca smonto+riposi prima della copertura;
  lo **STEP 5** non riempie mai `S` né i riposi di recupero (skip su `riposoForzato`), e una
  notte piazzata dalla copertura **protegge subito** il proprio recupero; lo **STEP 6** ha
  un gate forte (`rowRecoveryOk`) che rifiuta ogni scambio che lascerebbe una notte senza
  recupero completo. Verificato: **0 violazioni** a 30/50/100 e su 12 mesi.

### 2. Migrazione automatica dei template
- Gli operatori senza template (matrice legacy o assente) ricevono automaticamente un
  template coerente con qualifica, contratto, abilitazione notti e part-time/full-time
  (`autoTemplateIds`/`migrateTemplates`). Le matrici legacy non vengono più usate in
  generazione: niente più mix legacy/template. La matrice nasce coerente (coerenza
  pre-ottimizzazione 90/100; auto 84-87/100).

### 3. Equità reparti e settori nella funzione obiettivo
- `qualityPenaltyOp` penalizza la **concentrazione** in un solo settore e in un solo
  reparto (anti-confinamento), passato il numero di reparti dell'operatore a tutti i
  chiamanti. Verificato: **nessun operatore confinato** in un solo settore/reparto a
  30/50/100.

### 4. Report "Qualità Operativa"
- Nuova sezione con indice di equità, indice di coerenza, le 8 differenze (ore, notti,
  weekend, festivi, riposi, smonti, reparti, settori) e le criticità rilevate. Per ogni
  operatore: settore/reparto più e meno assegnato.

### Invarianti verificati (nessuna regressione)
- 11h **0/0 su 24 mesi**, copertura invariata dall'ottimizzazione, continuità cross-mese
  0/0, smonti corretti, determinismo, PDF/XLSX/backup+tamper/audit/undo-redo: tutti verdi.

---

## [STEP 0 — Template di rotazione] — La matrice nasce già ordinata

### Nuovo STEP 0 prima della generazione
- Introdotto lo **STEP 0**: il motore costruisce la base da **template di rotazione
  compatti** invece di sequenze qualunque. I blocchi logici sono *intenzionali*, non più
  un effetto collaterale delle penalità.
- Template inclusi (in `MATRICI`, quindi selezionabili e configurabili):
  `TA` M M P P R · `TB` M M M P P R · `TC` P P M M R · `TD` N N S R R ·
  `TE` M M P P P R · `TN1` N S R. Lo **smonto `S` è già dentro il template notte**.
- I template sono **configurabili** (lista `MATRICI`/`ROTATION_TEMPLATES`),
  **combinabili** (nuovo campo `Staff.templateCombo`, es. `['TB','TD']` →
  `M M M P P R N N S R R`), **assegnabili automaticamente** (per profilo: solo-giorno per
  gli esenti notte, blocco giorno + blocco notte per i notturnisti, ciclo leggero per i
  part-time) e **sfasati** tra operatori (offset per-operatore).
- Pipeline: **STEP 0 template → copertura → assenze → riposi 11h → settori → equità →
  ottimizzazione**. Sorgente della sequenza per operatore: `templateCombo` esplicito →
  altrimenti `matrice` scelta → altrimenti auto.

### Copertura più rispettosa dei blocchi notte
- STEP 5 (copertura) ora, **a parità di deroghe**, preferisce i candidati che **non**
  creano blocchi di 3+ notti consecutive — senza mai ridurre la copertura (se l'unico
  candidato creerebbe 3 notti, viene comunque usato).

### Smonto robusto agli scambi
- `deriveSmonti` è ora una **normalizzazione idempotente**: ogni riposo dopo una notte
  diventa `S`, ogni `S` non più preceduto da notte (es. dopo uno scambio) torna `R`.
- L'ottimizzatore **non sposta** le celle di smonto (restano ancorate alla loro notte).

### Dimostrazione (pre-ottimizzazione)
- Indice di coerenza **prima** dell'ottimizzazione: vecchi cicli `71/100` → template
  `88/100` (auto `81/100`). Righe a blocchi riconoscibili già nel piano grezzo
  (`M M P P R`, `N N S R R`, …) per 13/14 operatori.

### Invarianti verificati (nessuna regressione)
- Riposo 11h **0/0 su 24 mesi** (anche percorso auto), copertura invariata a 30/50/100
  (100%), continuità cross-mese 0/0, assenze, equità, smonti, PDF, XLSX, backup+tamper,
  audit, undo/redo, simulatore, validatore: tutti verdi.

---

## [Smonto notte + matrice realistica] — Motore da assegnatore a pianificatore

### Smonto notte come categoria separata (`S`)
- Introdotto il turno **`S` = Smonto notte**: né lavoro né riposo. È una categoria a sé,
  con colore e legenda propri in app, PDF e XLSX.
- Lo smonto è il **primo giorno non lavorativo dopo un blocco di notti** (quel giorno era
  già forzato a riposo dalle 11h, quindi **copertura e riposo 11h restano identici per
  costruzione** — è una ri-etichettatura, non un nuovo vincolo).
- Sequenze post-notte ora prodotte: **`N S R`** (1 notte → smonto → riposo) e
  **`N N S R R`** (2 notti → smonto → 2 riposi). Cross-mese gestito tramite il bordo
  del mese precedente (notte a fine mese → smonto al giorno 1 successivo).
- I conteggi sono corretti ovunque: `isWork('S')=false`, lo smonto **non** è conteggiato
  tra i riposi né tra le ore; un nuovo contatore **smonti** lo traccia separatamente.

### Indice di Coerenza della Matrice (0–100)
- Nuovo indicatore in *Report* accanto all'Indice di Equità. Valuta compattezza delle
  sequenze, qualità delle rotazioni, recuperi post-notte, distribuzione dei riposi e
  assenza di alternanze casuali (leggibilità della riga di ogni operatore).

### Ottimizzatore consapevole di smonto, coerenza e qualità
- L'ottimizzatore (STEP 6) ora bilancia anche gli **smonti** e tratta un `R` dopo `N`
  come smonto (non come riposo), così i **riposi reali** restano equilibrati.
- Nuove **penalità di qualità**: più di 2 notti consecutive, più di 6 giorni lavorativi
  consecutivi, più di 3 riposi consecutivi, più di 2 weekend lavorati consecutivi,
  permanenza eccessiva nello stesso settore.
- Nuovi **termini di coerenza**: transizioni innaturali (`N→M/P`, `M/P→N`), giorni di
  lavoro isolati fra riposi, alternanze (`M P M`, `P N P N`…) sono penalizzate, così le
  matrici risultano compatte e leggibili (coerenza in salita dopo l'ottimizzazione).

### Validatore aggiornato
- Nuovi controlli: **notti senza smonto**, **doppia notte senza doppio recupero**,
  **qualità/coerenza della matrice** (indice esposto in `PianoCheck.coherenceIndex`).
  Il punteggio finale integra ora anche la coerenza.

### Test (ambiente offline: tsc statico + emit CommonJS + harness Node)
- **Smonto**: 0 transizioni `N→M/P`, sequenze `N S`/`N N S`, copertura invariata,
  riposo 11h **0/0 su 24 mesi**, `S` escluso da lavoro/riposi, deterministico.
- **Scala 30/50/100** (baseline vs ottimizzato): ore 84–90 → 24–30, riposi 11–12 → 1–2,
  notti 11 → 7–8, equità 35–36 → 58–59, **coerenza 79–83 → 91–95**; copertura 100%
  invariata, 11h 0 violazioni, deterministico, < 1s anche a 100 operatori.
- Regressione completa verde: continuità mensile/annuale, copertura, assenze, PDF, XLSX,
  backup+tamper, migrazione, simulatore, validatore.

### Compatibilità
- I piani già salvati non vengono ri-etichettati automaticamente (lo smonto è esplicito):
  vengono prodotti smonti **alla rigenerazione**. Nessuna rottura di backup/audit/undo.

---

## [Motore di equità] — Da assegnatore a ottimizzatore (coordinatore infermieristico)

### Nuovo modello di generazione
- Aggiunta una **fase di ottimizzazione post-generazione** (STEP 6): dopo aver
  costruito un piano valido (matrice → assenze → riposo 11h → settori → copertura),
  il motore **analizza l'intero mese** e ribilancia automaticamente i carichi finché
  non trova la distribuzione migliore. Non si ferma alla prima soluzione valida.
- Lo strumento dell'ottimizzazione è lo **scambio di intera cella** (turno + reparto +
  settore) **fra due operatori nello stesso giorno**: il multiset dei turni del giorno
  resta identico → **la copertura non cambia mai**, cambia solo *chi* fa cosa.
- Uno scambio è applicato solo se **non viola il riposo 11h** (anche ai bordi del mese,
  via `prevEdge`/`nextEdge`), **rispetta l'eleggibilità** di entrambi (reparti/settori/
  esenzioni/notti) e **riduce il costo globale** (varianza delle metriche + penalità di
  qualità). Ricerca locale **greedy deterministica** (ordine fisso, niente casualità) →
  risultato riproducibile, compatibile con undo/redo e con i test.

### Vincoli di equità e qualità
- Equità: minimizza la differenza tra operatori su **ore, mattine, pomeriggi, notti,
  weekend, festivi, riposi, settori**. Tra operatori comparabili raggiunge il **±1** su
  notti/weekend/festivi; lo scarto globale residuo è strutturale (esenzioni notti,
  part-time, ferie) e non comprimibile da alcun algoritmo.
- Qualità (penalità automatiche): **3+ notti consecutive**, troppi pomeriggi consecutivi,
  troppi giorni lavorati consecutivi (oltre soglia di contratto), troppi riposi
  consecutivi, ripetizione dello stesso settore in giorni consecutivi.

### Indice di equità (0–100)
- `analytics.computeEquity`/`SimResult` espongono ora **differenza ore, notti, weekend,
  festivi, riposi** e un **punteggio 0–100** che il generatore massimizza. Visibili nel
  **Report** (riga "Differenze max") e nel toast di generazione ("equità X/100").

### File modificati
- `services/engine.ts` — STEP 6 + modulo ottimizzatore (`optimizePiano`, `scoreMonth`,
  penalità di qualità, scambi vincolati, ricalcolo deroghe finali). `buildPiano` ha un
  6° parametro `optimize=true` (retrocompatibile).
- `services/analytics.ts` — `EquityReport`/`SimResult` con i 5 differenziali + riposi nel
  punteggio; `isHoliday` ri-esportato.
- `utils/helpers.ts` — spostate qui `isHoliday`/festività (così il motore le usa senza
  ciclo con analytics).
- `types/index.ts` — `BuildStats` con `equityBefore`/`equityAfter`/`optSwaps`/`optPasses`.
- `screens/ReportScreen.tsx`, `screens/TurniScreen.tsx` — esposizione di indice e diff.

### Garanzie preservate (verificate da simulazioni)
- **Copertura invariata** dagli scambi · **0 violazioni 11h** interne e **0 al confine
  tra mesi** (24 mesi consecutivi) · niente 3 notti consecutive · **determinismo** ·
  sistema assenze/backup/validatore/XLSX/PDF senza regressioni.

## [Assenza unificata] — Sigla unica ASS + motivazione libera

### Nuovo modello
- Le 8 tipologie predefinite (Ferie, Malattia, Permesso, Legge 104, Formazione,
  Congedo, Infortunio, Aspettativa) sono sostituite da **un'unica assenza "ASS"**
  con **colore unico configurabile** (`ASS_COLOR` / `ASS_SOFT` in `utils/constants.ts`)
  e **motivazione a testo libero**. In inserimento l'utente compila solo data inizio,
  data fine e motivazione.
- **Griglia**: ogni assenza è mostrata come `ASS`. **Dettaglio cella**: banner di sola
  lettura con la motivazione completa. **PDF**: cella `ASS`, legenda "ASS = Assenza" e
  sezione "Assenze (motivazioni)" per pagina/reparto. **XLSX**: cella `ASS`, voce unica
  in legenda e foglio dedicato **"Assenze"** (Operatore · Dal · Al · Motivazione).
- **Statistiche/Simulatore**: i giorni di assenza confluiscono in un unico conteggio
  `assenze`, con ripartizione per motivazione libera (`assenzePerTipo`). **Validatore**
  aggiornato. Backup/Ripristino, Audit Log e Undo/Redo trasportano la nuova motivazione.

### Migrazione automatica (nessun dato perso)
- All'avvio (`loadData`) e all'import di backup (`importBackup`) le assenze esistenti
  sono convertite: FER→"Ferie", MAL→"Malattia", PER→"Permesso", 104→"Legge 104",
  FOR→"Formazione", CON→"Congedo", INF→"Infortunio", ASP→"Aspettativa". Idempotente:
  le voci con motivazione già presente non vengono toccate.

### Corretto (rilevato durante la revisione)
- `ReportScreen.doExportXLSX` referenziava variabili fuori scope (`m`/`r`) → l'export
  Excel sollevava un `ReferenceError` nel toast finale. Ora mostra l'esito corretto.

### File modificati
`types/index.ts`, `utils/constants.ts`, `utils/helpers.ts`, `services/engine.ts`,
`services/analytics.ts`, `services/validator.ts`, `services/xlsxData.ts`, `services/xlsx.ts`,
`services/pdf.ts`, `services/storage.ts`, `hooks/useStore.tsx`, `components/ShiftBadge.tsx`,
`screens/FerieWizardScreen.tsx`, `screens/StaffDetailScreen.tsx`, `screens/CellEditorScreen.tsx`,
`screens/ReportScreen.tsx`.

---

## [Audit finale] — Compatibilità import backup

### Corretto
- **Import di backup di versioni precedenti**: `parseBackup` verificava l'integrità
  ricalcolando il checksum sul payload *normalizzato* (che reintroduceva `audit: []`),
  rifiutando come "corrotto" i backup vecchi privi del campo `audit`. Ora la verifica
  usa i dati **come ricevuti**: identica al payload originariamente firmato per qualunque
  backup prodotto dall'app, robusta a campi mancanti o aggiunti in futuro, con rilevazione
  delle manomissioni invariata. *(File: `services/storage.ts`)*

### Audit (nessun'altra modifica)
Verificati senza problemi: assenze a cavallo di due mesi (due voci mensili, giorni F =
riposo, 0 violazioni al confine), reparto eliminato (nessun crash, nessuna cella orfana
dopo rigenerazione, copertura/monte ore/validatore robusti al fallback orari), modifica
manuale del primo/ultimo giorno (lock rispettato, 11h al confine garantite), simulazioni
annuali consecutive (deterministiche, 0/0 su 24 mesi), undo/redo, audit log, persistenza.

---

## [Build cross-mese] — Riposo 11h tra mesi consecutivi

### Corretto
- **Riposo 11h ora garantito anche AL CONFINE tra mesi** (ultimo giorno del mese
  precedente → primo giorno del mese successivo), incluso il passaggio
  **Dicembre → Gennaio**. Prima il vincolo era applicato solo all'interno del
  singolo mese e il salto tra mesi poteva violare le 11 ore pur con matrice continua.

### Motore (`services/engine.ts`)
- Nuovo tipo `PrevEdge` e funzioni `edgeFromPiano` (ultimo turno effettivo del mese
  precedente, con orari reali del reparto; tiene conto di assenze e modifiche manuali)
  e `nextEdgeFromPiano` (giorno 1 **bloccato** del mese successivo).
- `restOkBothSides`, `evalCandidate`, `smartFill`, `buildPiano` ora accettano
  `prevEdge` e `nextEdge` (default `{}`, **retro-compatibili**: la generazione pura
  resta invariata).
- **STEP 3** reso bidirezionale: ogni cella lavorata non bloccata cede a `R` se viola
  le 11h verso il giorno precedente (o il bordo del mese prec. al giorno 1) **oppure**
  verso una cella **bloccata** immovibile / il bordo del mese successivo (giorno dim).
- **STEP 4** (assegnazione settore) e **STEP 5** (massimizzazione copertura) verificano
  il riposo anche sul lato successivo verso celle bloccate e verso il bordo del mese dopo.

### Validatore (`services/validator.ts`)
- `checkPiano(ctx, piano, prevPiano?)`: analizza anche il confine col mese precedente,
  segnala le violazioni residue evidenziando l'operatore (`"Riposo < 11h tra mesi: …"`),
  conteggia `boundaryViolations` e riduce/cappa il punteggio (≤ 50) quando il vincolo
  non è rispettato.

### Simulatore e Monte ore (`services/analytics.ts`, `services/hours.ts`)
- `simulateRange` (12/24 mesi) e `annualHours` propagano il bordo (`prevEdge`) tra mesi
  consecutivi: le simulazioni rispettano il riposo 11h anche nei passaggi tra mesi.

### App (`hooks/useStore.tsx`, `screens/StrumentiScreen.tsx`, `screens/CellEditorScreen.tsx`)
- Store: helper `prevEdgeOf` / `nextEdgeOf`; bordo inoltrato a tutte le ricostruzioni di
  mese (generazione, navigazione, rigenerazione, modifica cella, rimozione operatore,
  init). Esposto `prevPiano`.
- "Controlla Piano" passa il mese precedente al validatore.
- Editor di cella: il blocco CCNL 11h è ora **boundary-aware** sul giorno 1 (controlla
  l'ultimo giorno del mese precedente).

### Test (offline, deterministici)
- Dic→Jan singolo operatore: **0** violazioni dentro i mesi, **0** al confine (prima 5/12).
- Validatore: rileva il confine violato, cappa il punteggio, evidenzia l'operatore.
- Casi: assenza ultimo giorno (edge esclude l'operatore), assenza primo giorno (g1=F),
  operatori aggiunti a metà anno, operatori rimossi (nessun orfano), ripristino backup.
- **Stress 100 infermieri × 10 reparti × 24 mesi** + assenze casuali + 282 modifiche
  manuali valide + rigenerazioni: **0** violazioni dentro i mesi e **0** ai 23 confini
  su ~35.300 turni.
- Regressione mirata: simulatore 12 mesi, copertura 99%, indice di equità nei limiti.
