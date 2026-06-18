# SMOKE TEST — TURNOVER single-user (post rimozione multiutente)

Questa checklist copre le verifiche **runtime** che NON posso eseguire nell'ambiente offline
(niente Metro/EAS/browser/device). Il typecheck (0 errori) e il verify gate (10/10) sono passati,
ma il **primo render e il comportamento a runtime vanno verificati da te**.

## 0. Preparazione
```bash
npm install            # installa crypto-js + expo-document-picker (nuove dipendenze)
npm run verify         # deve stampare "VERIFY OK — pronto al deploy" (10/10)
npm run typecheck      # 0 errori attesi
npx expo start         # oppure: npm run export:web && deploy Cloudflare
```

## 1. Avvio a freddo (CRITICO — questo è ciò che non ho potuto verificare)
- [ ] L'app si apre **direttamente sulla Dashboard del Coordinatore** (nessun login, nessun gate).
- [ ] Nessuna schermata bianca / crash all'avvio.
- [ ] La bottom nav mostra **tutti i 5 tab** (Home, Pianificazione, Personale, Controllo, Account).
- [ ] Il tab "Account" apre **Impostazioni** (non più Account Hub).

## 2. Navigazione (nessun dead-end verso route rimosse)
- [ ] Dashboard: tap sull'avatar in alto → apre **Profilo** (non più /account-hub).
- [ ] TopBar: l'avatar in alto a destra → apre **Personalizzazione**.
- [ ] Impostazioni: NON deve più esistere la sezione "Accessi / Utenti autorizzati".
- [ ] Personale (hub): NON deve più esistere la card "Accessi" né "Richieste".
- [ ] Profilo: NON deve più esistere il bottone "Accedi / Esci".

## 3. CRUD operativo (deve funzionare come prima)
- [ ] Reparti: aggiungi / modifica / elimina.
- [ ] Personale: aggiungi operatore (wizard), modifica scheda, elimina.
- [ ] Ferie / Desiderate: inserimento e rimozione.
- [ ] Generazione turni: rigenera il piano → copertura calcolata, nessun crash.

## 4. Centro Decisionale + Famiglia
- [ ] Centro Decisionale: scenario Ferie → SIMULA → verdetto semaforo + sostituti.
- [ ] Scheda operatore: sezione "Vincolo Familiare" (toggle/relazione/priorità/matrice) → Family Score live.
- [ ] Dashboard: widget "Copertura familiare" appare se c'è almeno un operatore con vincolo.

## 5. Backup / Ripristino (FASE 4)
- [ ] Crea Backup con password → genera file `.turnover` (condivisione/salvataggio).
- [ ] Importa Backup → password giusta → **ripristino completo**.
- [ ] Verifica che dopo il ripristino tornino: reparti, personale, ferie, desiderate, **vincoli familiari**, **profilo** e **personalizzazione (tema + accessibilità)**.
- [ ] Password errata → errore chiaro, **dati invariati**.
- [ ] File modificato a mano → errore "non integro", **dati invariati**.

## 6. Personalizzazione / Accessibilità
- [ ] Cambio tema (7 temi) → si applica a tutte le schermate.
- [ ] Testo XL / card "wide" → layout non rotto, niente testo tagliato.

## 7. Responsive (FASE 10)
- [ ] iPhone SE (piccolo), iPhone standard, modello con Dynamic Island.
- [ ] Web / PWA.
- [ ] Nessun overflow orizzontale, nessuna tabella fuori schermo, nessuna card troncata.

## Note
- Se qualcosa non parte all'avvio, il sospetto n.1 è la **persistenza**: i dati salvati da una
  versione precedente contengono ancora `role/currentEmail/members/...`. Il caricamento è
  retro-compatibile (campi extra ignorati), ma se vedi anomalie prova a **creare un backup,
  resettare i dati locali e ripristinare**.
- Le nuove dipendenze native (`expo-document-picker`) richiedono un **rebuild** (non basta OTA).
