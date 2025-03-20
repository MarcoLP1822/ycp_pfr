# Stage di base: immagine runtime
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 80
EXPOSE 443

# Stage di build: utilizza l'immagine SDK per compilare l'applicazione
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["docx_merge_service.csproj", "./"]
RUN dotnet restore "./docx_merge_service.csproj"
COPY . .
WORKDIR "/src/."
RUN dotnet build "docx_merge_service.csproj" -c Release -o /app/build

# Stage di pubblicazione: pubblica l'applicazione
FROM build AS publish
RUN dotnet publish "docx_merge_service.csproj" -c Release -o /app/publish

# Stage finale: crea l'immagine finale
FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "docx_merge_service.dll"]
