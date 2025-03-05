# DOCX Merge Service (.NET 9)

Questo microservizio è realizzato in ASP.NET Core (.NET 9) e utilizza l'Open XML SDK per fondere il testo corretto in un file DOCX originale.

## Funzionalità
- Riceve un file DOCX e una stringa di testo corretto tramite una richiesta POST in multipart/form-data.
- Sostituisce il contenuto del documento con il testo corretto.
- Restituisce il file DOCX modificato come download.

## Come Eseguire

### Localmente
1. Assicurati di avere installato .NET 9 SDK.
2. Dal terminale, posizionati nella cartella `docx_merge_service` ed esegui:
   ```bash
   dotnet run
   ```
3. Il servizio sarà disponibile su https://localhost:5000 o http://localhost:5000
Utilizzando Docker
    1 - Costruisci l'immagine Docker:
    ```
    bash
    docker build -t docx-merge-service .
    ```
    2 - Esegui il container:
    ```
    bash
    docker run -d -p 5000:80 docx-merge-service
    ```
## Endpoint API
### POST /Merge/merge
- Descrizione: Fondi il testo corretto nel file DOCX originale.
- Parametri:
    - file (IFormFile): Il file DOCX originale.
    - correctedText (string): Il testo corretto da integrare.
- Risposta: Restituisce il file DOCX fuso come download.