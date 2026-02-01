FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

COPY design-agent/design-agent.csproj design-agent/
RUN dotnet restore design-agent/design-agent.csproj

COPY design-agent/ design-agent/
RUN dotnet publish design-agent/design-agent.csproj -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/runtime:9.0
WORKDIR /app

COPY --from=build /app/publish .

ENTRYPOINT ["dotnet", "design-agent.dll"]
