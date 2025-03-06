/**
 * @file Program.cs
 * @description
 * This file sets up the ASP.NET Core application.
 * In this update, I added the registration for DocxService in the DI container
 * and configured the application to listen on the port specificato da Render tramite process.env.PORT.
 *
 * Key features:
 * - Registers controllers, Swagger, and DocxService.
 * - Configures middleware for HTTPS redirection and Swagger UI.
 * - Configura il binding sulla porta fornita da Render.
 *
 * @dependencies
 * - Microsoft.AspNetCore.Builder: For building the app.
 * - Microsoft.Extensions.DependencyInjection: For dependency injection.
 * - DocxMergeService.Services.DocxService: Registered for use in controllers.
 *
 * @notes
 * - Ensure that any new services are also added to the DI container here.
 */

using Microsoft.OpenApi.Models;
using DocxMergeService.Services;

var builder = WebApplication.CreateBuilder(args);

// Imposta il binding sulla porta fornita da Render tramite la variabile d'ambiente PORT.
// Render imposta automaticamente PORT, quindi usiamo quella; se non è definita, usiamo la porta 80 di default.
var port = Environment.GetEnvironmentVariable("PORT") ?? "10000";
builder.WebHost.UseUrls($"http://*:{port}");

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddScoped<DocxService>(); // Register DocxService for DI
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "DOCX Merge Service API", Version = "v1" });
});

var app = builder.Build();

// Configure the HTTP request pipeline.
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
