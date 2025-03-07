/**
 * @file Program.cs
 * @description
 * Questo file configura l'applicazione ASP.NET Core.
 * In questo aggiornamento:
 * - Viene registrato il servizio DocxService per l'iniezione delle dipendenze.
 * - Viene configurato il binding sulla porta specificata dalla variabile d'ambiente PORT (utilizzata da Render).
 * - Vengono aggiunti i controller e Swagger per la documentazione.
 *
 * @dependencies
 * - Microsoft.AspNetCore.Builder
 * - Microsoft.Extensions.DependencyInjection
 * - Microsoft.OpenApi.Models
 * - DocxMergeService.Services.DocxService
 *
 * @notes
 * - Assicurati che il controller che gestisce l'endpoint merge sia configurato correttamente (ad esempio, con [Route("merge")]).
 */

using Microsoft.OpenApi.Models;
using DocxMergeService.Services;

var builder = WebApplication.CreateBuilder(args);

// Imposta il binding sulla porta fornita da Render (se presente) o usa la porta 80 di default.
var port = Environment.GetEnvironmentVariable("PORT") ?? "80";
builder.WebHost.UseUrls($"http://*:{port}");

// Registra i servizi nel container DI.
builder.Services.AddControllers();
builder.Services.AddScoped<DocxService>(); // Registrazione di DocxService per l'iniezione nelle classi (ad es. MergeController)
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "DOCX Merge Service API", Version = "v1" });
});

var app = builder.Build();

// Configurazione della pipeline HTTP.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "DOCX Merge Service API V1");
    });
}

app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();

app.Run();
