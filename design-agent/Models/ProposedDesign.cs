using System.Text.Json.Serialization;

namespace design_agent.Models;

public record ProposedDesign(
    [property: JsonPropertyName("overview")] string? Overview,
    [property: JsonPropertyName("architecture")] ArchitectureSpec? Architecture,
    [property: JsonPropertyName("api_contracts")] List<ApiContract>? ApiContracts,
    [property: JsonPropertyName("data_model")] List<DataModelEntity>? DataModel,
    [property: JsonPropertyName("failure_modes")] List<FailureMode>? FailureModes,
    [property: JsonPropertyName("observability")] ObservabilitySpec? Observability,
    [property: JsonPropertyName("security")] SecuritySpec? Security);

public record ArchitectureSpec(
    [property: JsonPropertyName("components")] List<ComponentSpec>? Components,
    [property: JsonPropertyName("data_flow")] string? DataFlow);

public record ComponentSpec(
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("responsibility")] string Responsibility);

public record ApiContract(
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("request")] string Request,
    [property: JsonPropertyName("response")] string Response);

public record DataModelEntity(
    [property: JsonPropertyName("entity")] string Entity,
    [property: JsonPropertyName("fields")] string Fields);

public record FailureMode(
    [property: JsonPropertyName("scenario")] string Scenario,
    [property: JsonPropertyName("mitigation")] string Mitigation);

public record ObservabilitySpec(
    [property: JsonPropertyName("logs")] List<string>? Logs,
    [property: JsonPropertyName("metrics")] List<string>? Metrics,
    [property: JsonPropertyName("traces")] List<string>? Traces);

public record SecuritySpec(
    [property: JsonPropertyName("authn")] string Authn,
    [property: JsonPropertyName("authz")] string Authz,
    [property: JsonPropertyName("data_handling")] string DataHandling);
