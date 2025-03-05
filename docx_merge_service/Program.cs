using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

// Aggiunge i servizi necessari al container
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "DOCX Merge Service API", Version = "v1" });
});

var app = builder.Build();

// Configura il middleware per lo sviluppo
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
