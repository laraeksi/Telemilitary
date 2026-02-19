<!-- Mermaid-style architecture sketch. -->
<!-- Diagram is for quick reference. -->
## Architecture Diagram 

flowchart TB
  subgraph Client
    UI[Pages & Components]
    Engine[Game Engine]
    TelemetryClient[Telemetry emitEvent]
    ConfigClient[Stage Configs]
    Ids[ID Utilities]
  end

  subgraph Shared
    StageConfig[Stage Configs]
    Types[Shared Types (JSDoc)]
    TelemetryTypes[Telemetry Shapes (JSDoc)]
  end

  subgraph Server
    Routes[Routes Table]
    Auth[Auth Controller]
    Events[Event Controller]
    Metrics[Metrics Controller]
    Balancer[Balancing Controller]
    Seed[Seed Controller]
    Validator[Event Validator]
    MetricsSvc[Metrics Services]
    BalanceSvc[Balancing Services]
    SimSvc[Simulation Service]
  end

  subgraph DataModels
    User[User Model]
    Session[Session Model]
    Stage[Stage Model]
    Config[Config Model]
    Event[Event Model]
    Anomaly[Anomaly Model]
    Rule[BalancingRule Model]
    Decision[DecisionLog Model]
  end

  UI --> Engine
  UI --> TelemetryClient
  Engine --> TelemetryClient
  UI --> ConfigClient
  ConfigClient --> StageConfig
  TelemetryClient --> TelemetryTypes
  Ids --> UI

  TelemetryClient --> Routes
  Routes --> Auth
  Routes --> Events
  Routes --> Metrics
  Routes --> Balancer
  Routes --> Seed

  Events --> Validator
  Events --> Event
  Events --> Anomaly
  Metrics --> MetricsSvc
  MetricsSvc --> Event
  MetricsSvc --> Session
  MetricsSvc --> Stage
  MetricsSvc --> Config

  Balancer --> BalanceSvc
  BalanceSvc --> Rule
  BalanceSvc --> Decision
  Balancer --> SimSvc
  SimSvc --> Event
  SimSvc --> Session

  Seed --> User
  Seed --> Session
  Seed --> Event
  Seed --> Anomaly
  Seed --> Decision

  Shared --> Client
  Shared --> Server

Notes:
- This diagram is scaffold-level and shows how the current files connect.
- Replace placeholder services with real DB connections and API handlers later.
<!-- Keep this diagram in sync with file moves -->
<!-- Update if new services are added -->
need an API because the client and server have different jobs:
Client (frontend): shows the game and dashboard UI.
Server (backend): stores telemetry, validates events, computes metrics, runs simulation, enforces roles.
Without an API, the frontend can’t send telemetry or fetch dashboard data. The API is the bridge between them.