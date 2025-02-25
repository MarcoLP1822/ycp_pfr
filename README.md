# Web Proofreading App

## Overview

Web Proofreading App è un'applicazione web che permette agli utenti di caricare documenti di testo editabili (doc, docx, odf, txt) per la correzione automatica tramite un modello linguistico AI. Il sistema evidenzia le correzioni inline e consente agli utenti di accettare le modifiche individualmente o in blocco, mantenendo il controllo delle versioni per eventuali rollback.

## Features

- **Gestione dei File:** Caricamento, rinomina e cancellazione dei documenti.
- **Motore di Proofreading:** Correzione automatica dei testi con evidenziazione inline.
- **Interfaccia di Revisione:** Visualizzazione affiancata del testo originale e corretto.
- **Controllo delle Versioni:** Possibilità di rollback sulle modifiche.
- **Autenticazione Utente:** Login e gestione delle sessioni tramite Supabase.

## Setup Instructions

1. **Clona il repository:**
   ```bash
   git clone https://github.com/tuo-username/web-proofreading-app.git
   cd web-proofreading-app

2. **Installa le dipendenze:**
   ```bash
    npm install
    # oppure
    yarn install
   
3. **Configura le variabili d'ambiente:**
    Crea un file .env.local e imposta le variabili necessarie (ad esempio, chiavi API, URL di Supabase, ecc.).