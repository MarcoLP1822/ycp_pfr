/**
 * @file docx_merge_service/Services/DocxService.cs
 * @description
 * Questo file contiene il servizio per eseguire il merge di un documento DOCX originale con il testo corretto.
 * L’obiettivo è produrre un file DOCX in modalità revisione (track changes) che preservi la formattazione originale.
 *
 * Il merge viene effettuato secondo i seguenti step:
 * 1. Apertura del documento e abilitazione delle revisioni (track changes).
 * 2. Estrazione dei paragrafi originali e suddivisione del testo corretto in paragrafi.
 * 3. Confronto run-by-run per ogni paragrafo comune: 
 *    - Se il testo del run è invariato, si clona il run (mantenendo le proprietà di formattazione).
 *    - Se il testo differisce, viene applicato un diff (con diff-match-patch) che produce segmenti da
 *      evidenziare come inseriti (con <w:ins>) o cancellati (con <w:del>).
 * 4. Per paragrafi in eccesso nel testo corretto, vengono aggiunti nuovi paragrafi; per quelli in eccesso
 *    nell’originale, vengono marcati come cancellati.
 *
 * @dependencies
 * - DocumentFormat.OpenXml: per la manipolazione dei file DOCX.
 * - diff-match-patch: per il confronto testuale run-by-run.
 *
 * @notes
 * - Il merge cerca di mantenere invariati i nodi <w:pPr> (proprietà del paragrafo) e i run non modificati.
 * - Alcuni edge-case (ad esempio, differenze parziali di formattazione) possono richiedere ulteriori affinamenti.
 */

using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using DocumentFormat.OpenXml;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Wordprocessing;
using DiffMatchPatch; // diff-match-patch library

namespace DocxMergeService.Services
{
    public class DocxService
    {
        /// <summary>
        /// Apre un documento DOCX da uno stream in modalità lettura/scrittura.
        /// </summary>
        /// <param name="stream">Lo stream contenente il documento DOCX.</param>
        /// <returns>Il documento DOCX aperto come WordprocessingDocument.</returns>
        /// <exception cref="ArgumentNullException">Se lo stream è null.</exception>
        public WordprocessingDocument LoadDocument(Stream stream)
        {
            if (stream == null)
                throw new ArgumentNullException(nameof(stream), "Input stream cannot be null.");
            return WordprocessingDocument.Open(stream, true);
        }

        /// <summary>
        /// Abilita la funzionalità di track revisions nel documento, in modo che le modifiche appaiano come revisioni.
        /// </summary>
        /// <param name="doc">Il documento DOCX su cui abilitare le revisioni.</param>
        private void EnableTrackRevisions(WordprocessingDocument doc)
        {
            var settingsPart = doc.MainDocumentPart.DocumentSettingsPart;
            if (settingsPart == null)
            {
                settingsPart = doc.MainDocumentPart.AddNewPart<DocumentSettingsPart>();
                settingsPart.Settings = new Settings();
            }
            if (settingsPart.Settings == null)
                settingsPart.Settings = new Settings();
            var trackRevisions = new TrackRevisions { Val = OnOffValue.FromBoolean(true) };
            settingsPart.Settings.AppendChild(trackRevisions);
            settingsPart.Settings.Save();
        }

        /// <summary>
        /// Effettua il merge del testo corretto in un documento DOCX originale, preservandone la formattazione e 
        /// inserendo revisioni (inserimenti e cancellazioni).
        /// </summary>
        /// <param name="originalStream">Lo stream del documento DOCX originale.</param>
        /// <param name="correctedText">Il testo corretto da integrare.</param>
        /// <returns>Un MemoryStream contenente il documento DOCX fuso.</returns>
        /// <exception cref="Exception">Se si verifica un errore durante il merge.</exception>
        public MemoryStream MergeDocument(MemoryStream originalStream, string correctedText)
        {
            try
            {
                if (originalStream == null)
                    throw new ArgumentNullException(nameof(originalStream), "Original document stream cannot be null.");
                if (correctedText == null)
                    throw new ArgumentNullException(nameof(correctedText), "Corrected text cannot be null.");

                originalStream.Position = 0;
                using (var wordDoc = LoadDocument(originalStream))
                {
                    EnableTrackRevisions(wordDoc);

                    var body = wordDoc.MainDocumentPart?.Document?.Body;
                    if (body == null)
                        throw new Exception("Invalid DOCX structure: Missing document body.");

                    // Suddivide il testo corretto in paragrafi
                    var correctedParagraphs = correctedText.Split(new[] { "\r\n", "\n" }, StringSplitOptions.None);
                    var originalParagraphs = body.Elements<Paragraph>().ToList();
                    int commonCount = Math.Min(originalParagraphs.Count, correctedParagraphs.Length);

                    // Per ogni paragrafo comune, aggiorna il contenuto tramite diff run-by-run
                    for (int i = 0; i < commonCount; i++)
                    {
                        var origPara = originalParagraphs[i];
                        string correctedPara = correctedParagraphs[i].Trim();
                        string originalParaText = GetFullParagraphText(origPara).Trim();

                        if (originalParaText == correctedPara)
                        {
                            // Paragrafo invariato: non fare nulla per preservare formattazione e stili.
                            continue;
                        }
                        else
                        {
                            // Aggiorna il paragrafo con una logica run-by-run che preserva i <w:pPr> (proprietà del paragrafo)
                            UpdateParagraphRunByRun(origPara, correctedPara);
                        }
                    }

                    // Se il testo corretto contiene paragrafi in più, aggiungili come nuove righe in modalità inserimento
                    for (int i = commonCount; i < correctedParagraphs.Length; i++)
                    {
                        var newPara = new Paragraph();
                        InsertFullParagraphAsIns(newPara, correctedParagraphs[i]);
                        body.AppendChild(newPara);
                    }

                    // Se il documento originale ha paragrafi in eccesso, marcali come cancellati
                    for (int i = commonCount; i < originalParagraphs.Count; i++)
                    {
                        MarkParagraphAsDeleted(originalParagraphs[i]);
                    }

                    wordDoc.MainDocumentPart.Document.Save();
                }

                // Ritorna il documento fuso come MemoryStream
                var mergedStream = new MemoryStream(originalStream.ToArray());
                mergedStream.Position = 0;
                return mergedStream;
            }
            catch (Exception ex)
            {
                throw new Exception("Error during DOCX merge: " + ex.Message, ex);
            }
        }

        /// <summary>
        /// Confronta e aggiorna il contenuto di un paragrafo esistente eseguendo un diff run-by-run.
        /// Mantiene i run invariati clonando le proprietà e applica <w:ins> per inserimenti e <w:del> per cancellazioni.
        /// </summary>
        /// <param name="paragraph">Il paragrafo originale da aggiornare.</param>
        /// <param name="correctedParaText">Il testo corretto per questo paragrafo.</param>
        private void UpdateParagraphRunByRun(Paragraph paragraph, string correctedParaText)
        {
            // Ottiene i run originali
            var originalRuns = paragraph.Elements<Run>().ToList();
            var newChildren = new List<OpenXmlElement>();
            int correctedIndex = 0;
            int correctedLength = correctedParaText.Length;
            var dmp = new diff_match_patch();

            foreach (var run in originalRuns)
            {
                // Estrae il testo corrente del run
                string runText = string.Concat(run.Elements<Text>().Select(t => t.Text));
                var runProps = run.RunProperties?.CloneNode(true) as RunProperties;

                if (string.IsNullOrEmpty(runText))
                {
                    // Se il run è vuoto, lo clona direttamente
                    newChildren.Add(run.CloneNode(true));
                    continue;
                }

                // Ottiene la parte rimanente del testo corretto
                string correctedRemainder = correctedParaText.Substring(correctedIndex);
                // Esegue il diff tra il testo del run e il testo rimanente
                var diffs = dmp.diff_main(runText, correctedRemainder, false);
                dmp.diff_cleanupSemantic(diffs);

                int localCorrectedUsed = 0;
                foreach (var diff in diffs)
                {
                    var op = diff.operation;
                    var text = diff.text;
                    if (op == Operation.EQUAL)
                    {
                        // Testo invariato: clona il run mantenendo le proprietà
                        var newRun = new Run();
                        if (runProps != null)
                            newRun.RunProperties = (RunProperties)runProps.CloneNode(true);
                        newRun.AppendChild(new Text(text) { Space = SpaceProcessingModeValues.Preserve });
                        newChildren.Add(newRun);
                        localCorrectedUsed += text.Length;
                    }
                    else if (op == Operation.DELETE)
                    {
                        // Testo eliminato: crea un run in modalità cancellazione
                        var delRun = BuildDeletedRun(text, runProps);
                        newChildren.Add(delRun);
                    }
                    else if (op == Operation.INSERT)
                    {
                        // Testo inserito: crea un run in modalità inserimento
                        var insRun = BuildInsertedRun(text, runProps);
                        newChildren.Add(insRun);
                        localCorrectedUsed += text.Length;
                    }
                }
                correctedIndex += localCorrectedUsed;
                if (correctedIndex > correctedLength)
                    correctedIndex = correctedLength;
            }

            // Se c'è ancora del testo corretto non processato, aggiungilo come inserito
            if (correctedIndex < correctedLength)
            {
                string leftover = correctedParaText.Substring(correctedIndex);
                var insRun = BuildInsertedRun(leftover, null);
                newChildren.Add(insRun);
                correctedIndex = correctedLength;
            }

            // Rimuove i run esistenti mantenendo intatto il nodo <w:pPr> (proprietà del paragrafo)
            var pPr = paragraph.Elements<ParagraphProperties>().FirstOrDefault();
            paragraph.RemoveAllChildren<Run>();
            if (pPr != null)
                paragraph.InsertAt(pPr.CloneNode(true), 0);
            foreach (var child in newChildren)
            {
                paragraph.AppendChild(child);
            }
        }

        /// <summary>
        /// Crea un run contenente il testo eliminato, avvolto in un elemento <w:del>.
        /// </summary>
        /// <param name="text">Il testo da marcare come eliminato.</param>
        /// <param name="runProps">Le proprietà del run originale, se disponibili.</param>
        /// <returns>Un elemento OpenXml che rappresenta il run cancellato.</returns>
        private OpenXmlElement BuildDeletedRun(string text, RunProperties runProps)
        {
            var runElement = new Run();
            if (runProps != null)
                runElement.RunProperties = (RunProperties)runProps.CloneNode(true);
            runElement.AppendChild(new DeletedText(text) { Space = SpaceProcessingModeValues.Preserve });
            var delRun = new DeletedRun
            {
                Author = "AI Correction",
                Date = DateTime.UtcNow
            };
            delRun.Append(runElement);
            return delRun;
        }

        /// <summary>
        /// Crea un run contenente il testo inserito, avvolto in un elemento <w:ins>.
        /// </summary>
        /// <param name="text">Il testo da marcare come inserito.</param>
        /// <param name="runProps">Le proprietà del run originale, se disponibili.</param>
        /// <returns>Un elemento OpenXml che rappresenta il run inserito.</returns>
        private OpenXmlElement BuildInsertedRun(string text, RunProperties runProps)
        {
            var runElement = new Run();
            if (runProps != null)
                runElement.RunProperties = (RunProperties)runProps.CloneNode(true);
            runElement.AppendChild(new Text(text) { Space = SpaceProcessingModeValues.Preserve });
            var insRun = new InsertedRun
            {
                Author = "AI Correction",
                Date = DateTime.UtcNow
            };
            insRun.Append(runElement);
            return insRun;
        }

        /// <summary>
        /// Inserisce un nuovo paragrafo come inserimento completo.
        /// </summary>
        /// <param name="para">Il paragrafo da aggiornare.</param>
        /// <param name="paragraphText">Il testo del nuovo paragrafo.</param>
        private void InsertFullParagraphAsIns(Paragraph para, string paragraphText)
        {
            var run = new Run(new Text(paragraphText) { Space = SpaceProcessingModeValues.Preserve });
            var ins = new InsertedRun
            {
                Author = "AI Correction",
                Date = DateTime.UtcNow
            };
            ins.Append(run);
            para.AppendChild(ins);
        }

        /// <summary>
        /// Marca un intero paragrafo come eliminato, avvolgendo ogni run in un elemento <w:del>.
        /// </summary>
        /// <param name="paragraph">Il paragrafo da marcare come eliminato.</param>
        private void MarkParagraphAsDeleted(Paragraph paragraph)
        {
            var runs = paragraph.Elements<Run>().ToList();
            foreach (var run in runs)
            {
                string originalText = string.Concat(run.Elements<Text>().Select(t => t.Text));
                run.RemoveAllChildren<Text>();
                var delText = new DeletedText(originalText) { Space = SpaceProcessingModeValues.Preserve };
                run.AppendChild(delText);
                var delRun = new DeletedRun
                {
                    Author = "AI Correction",
                    Date = DateTime.UtcNow
                };
                run.Parent.InsertAfter(delRun, run);
                delRun.Append(run);
                run.Remove();
            }
        }

        /// <summary>
        /// Restituisce il testo completo di un paragrafo, concatenando il contenuto di tutti i run.
        /// </summary>
        /// <param name="p">Il paragrafo da elaborare.</param>
        /// <returns>Il testo concatenato di tutti i run del paragrafo.</returns>
        private string GetFullParagraphText(Paragraph p)
        {
            return string.Concat(p.Elements<Run>()
                .SelectMany(r => r.Elements<Text>())
                .Select(t => t.Text));
        }
    }
}
