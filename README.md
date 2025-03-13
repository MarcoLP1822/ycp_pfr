# YCP_PFR

## Panoramica

YCP_PFR è un'applicazione web moderna e minimalista che consente agli utenti di caricare documenti basati su testo modificabili (doc, docx, odf, txt) per la correzione di bozze. L'app utilizza un modello linguistico basato su intelligenza artificiale per analizzare, correggere e migliorare i testi. Evidenzia le correzioni in linea e permette agli utenti di accettarle singolarmente o in blocco. Inoltre, il sistema mantiene un controllo delle versioni per consentire il ripristino delle modifiche precedenti.

## Funzionalità

- **Gestione dei File:** 
  - Caricamento, rinomina ed eliminazione di documenti basati su testo
  - Avvio e monitoraggio del processo di correzione delle bozze
  
- **Motore di Correzione:**
  - Correzione automatica basata su AI per grammatica, punteggiatura, ortografia e sintassi
  - Evidenziazione inline delle correzioni suggerite
  
- **Interfaccia di Correzione:**
  - Visualizzazione affiancata dei testi originali e corretti
  - Opzioni per accettare correzioni singole o in blocco
  - Controllo delle versioni per ripristinare modifiche precedenti
  
- **Gestione Utenti e Sicurezza:**
  - Autenticazione sicura tramite Supabase Auth
  - Protezione delle route e sicurezza del database con Supabase RLS (Row Level Security)
  
- **Design Moderno:**
  - Interfaccia utente responsive e minimalista costruita con Tailwind CSS

## Istruzioni per l'Installazione

### Prerequisiti
- **Node.js** (v14 o successivo)
- **npm** o **yarn**
- **Git**

### Clonazione del Repository
```bash
git clone https://github.com/youcanprint1/web-proofreading-app.git
cd web-proofreading-app
```

### Installazione delle Dipendenze
```bash
npm install
# oppure
yarn install
```

### Configurazione delle Variabili d'Ambiente
Crea un file `.env.local` nella root del progetto e aggiungi le seguenti variabili:

```bash
# Chiave API OpenAI per la funzionalità di correzione
OPENAI_API_KEY=la_tua_chiave_api_openai

# Secret JWT per l'autenticazione
JWT_SECRET=il_tuo_secret_jwt

# Configurazione Supabase per Autenticazione, Storage e Database
NEXT_PUBLIC_SUPABASE_URL=il_tuo_url_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=la_tua_chiave_anonima_supabase

# URL di connessione PostgreSQL per le migrazioni Drizzle ORM (se necessario)
DATABASE_URL=il_tuo_url_database
```

### Migrazioni del Database
Per generare e applicare le migrazioni del database utilizzando Drizzle ORM, esegui:

```bash
npx drizzle-kit generate
npx drizzle-kit migrate
```

### Esecuzione dell'Applicazione in Locale
```bash
npm run dev
# oppure
yarn dev
```

L'applicazione sarà disponibile all'indirizzo `http://localhost:3000`.

## Linee Guida per il Deployment

### Deployment su Render
Questo progetto è ottimizzato per il deployment su Render:

1. Crea un account su [Render](https://render.com/) se non ne hai già uno
2. Dalla dashboard di Render, seleziona "New" e poi "Web Service"
3. Collega il tuo repository GitHub o GitLab
4. Configura il servizio con le seguenti impostazioni:
   - **Nome**: YCP_PFR o un nome a tua scelta
   - **Runtime**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Piano**: Seleziona il piano adeguato alle tue esigenze (Free per test, Standard per produzione)
5. Nella sezione "Environment Variables", aggiungi tutte le variabili d'ambiente necessarie (stesse del file `.env.local`)
6. Clicca su "Create Web Service" per avviare il deployment

Render effettuerà automaticamente il build e il deployment dell'applicazione. Ogni push al repository collegato attiverà un nuovo deployment.

### Configurazioni Avanzate su Render

Per ottimizzare l'applicazione in produzione su Render:

- **Auto-Scaling**: Nelle impostazioni del servizio, puoi configurare l'auto-scaling per gestire picchi di traffico
- **Custom Domains**: Configura un dominio personalizzato nelle impostazioni del servizio
- **Database Gestiti**: Render offre database PostgreSQL gestiti che puoi collegare facilmente alla tua applicazione
- **Continuous Deployment**: Per ambienti di produzione, puoi configurare branch specifici o utilizzare webhook personalizzati

### Opzioni Alternative di Deployment

Se desideri fare il deployment su un altro provider di hosting:

1. Assicurati che tutte le variabili d'ambiente siano impostate correttamente
2. Il comando di build dovrebbe essere `npm run build` o `yarn build`
3. Il comando di avvio dovrebbe essere `npm run start` o `yarn start`

Alcune alternative popolari includono:
- **Netlify**: Ottimo per applicazioni statiche o con funzioni serverless
- **DigitalOcean App Platform**: Soluzione completa per applicazioni Node.js
- **AWS Elastic Beanstalk**: Opzione robusta per scenari enterprise

## Testing
Questo progetto utilizza Jest e React Testing Library per i test unitari e di integrazione.

Esegui i test utilizzando:

```bash
npm run test
# oppure
yarn test
```

Assicurati che tutte le dipendenze necessarie per i test siano installate.

## Sviluppi Futuri
- Integrazione di API LLM aggiuntive per la correzione delle bozze
- Monitoraggio delle prestazioni e logging avanzati
- Supporto per formati di file aggiuntivi (es. PDF)
- Funzionalità estese di controllo versione
- Interfaccia multilingua

## Risoluzione dei Problemi

- **Variabili d'Ambiente**: Verifica che tutte le variabili d'ambiente richieste siano impostate correttamente in `.env.local` o nella configurazione del tuo provider di deployment.
- **Migrazioni Database**: Verifica il tuo `DATABASE_URL` e assicurati che la tua istanza PostgreSQL sia in esecuzione se le migrazioni falliscono.
- **Problemi di Deployment**: Controlla i log nel dashboard del tuo provider di hosting (es. Vercel) per eventuali messaggi di errore.
- **Problemi di Installazione**: In caso di errori durante l'installazione delle dipendenze, prova a cancellare le cartelle `node_modules` e `.next`, quindi esegui nuovamente `npm install`.

## Licenza
Questo progetto è distribuito con licenza MIT.

## Contributi
I contributi sono benvenuti! Per favore, leggi le linee guida per i contributi nel file `CONTRIBUTING.md` prima di inviare una pull request.

## Contatti
Per domande o supporto, apri un issue nel repository o contatta il team di sviluppo all'indirizzo email: 

