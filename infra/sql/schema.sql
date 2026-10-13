CREATE TABLE dbo.Locations (
    LocationId int IDENTITY(1,1) NOT NULL PRIMARY KEY,
    Name nvarchar(128) NOT NULL UNIQUE,
    Latitude decimal(9,6) NULL,
    Longitude decimal(9,6) NULL
);

CREATE TABLE dbo.Sensors (
    SensorId nvarchar(64) NOT NULL PRIMARY KEY,
    LocationId int NOT NULL REFERENCES dbo.Locations(LocationId),
    DeviceState nvarchar(16) NOT NULL DEFAULT N'active',
    RegisteredAt datetime2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    LastSeenAt datetime2(3) NULL,
    CONSTRAINT CK_Sensors_State CHECK (DeviceState IN (N'active', N'maintenance', N'revoked'))
);

CREATE TABLE dbo.SensorMetrics (
    SensorId nvarchar(64) NOT NULL REFERENCES dbo.Sensors(SensorId),
    Metric nvarchar(32) NOT NULL,
    Unit nvarchar(16) NOT NULL,
    Enabled bit NOT NULL DEFAULT 1,
    CONSTRAINT PK_SensorMetrics PRIMARY KEY (SensorId, Metric)
);

CREATE TABLE dbo.AlertThresholds (
    ThresholdId int IDENTITY(1,1) NOT NULL PRIMARY KEY,
    LocationId int NULL REFERENCES dbo.Locations(LocationId),
    Metric nvarchar(32) NOT NULL,
    ThresholdValue decimal(12,4) NOT NULL,
    Comparator nvarchar(8) NOT NULL DEFAULT N'>',
    Severity nvarchar(16) NOT NULL,
    Enabled bit NOT NULL DEFAULT 1,
    CONSTRAINT CK_AlertThresholds_Comparator CHECK (Comparator IN (N'>', N'>=', N'<', N'<='))
);

CREATE TABLE dbo.SensorEvents (
    SensorId nvarchar(64) NOT NULL REFERENCES dbo.Sensors(SensorId),
    EventId nvarchar(128) NOT NULL,
    ObservedAt datetime2(3) NOT NULL,
    ReceivedAt datetime2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_SensorEvents PRIMARY KEY (SensorId, EventId)
);

CREATE TABLE dbo.SensorAlerts (
    AlertId nvarchar(160) NOT NULL PRIMARY KEY,
    SensorId nvarchar(64) NOT NULL REFERENCES dbo.Sensors(SensorId),
    LocationId int NOT NULL REFERENCES dbo.Locations(LocationId),
    ConditionText nvarchar(256) NOT NULL,
    Severity nvarchar(16) NOT NULL,
    State nvarchar(16) NOT NULL DEFAULT N'Open',
    CreatedAt datetime2(3) NOT NULL,
    CONSTRAINT CK_SensorAlerts_Severity CHECK (Severity IN (N'Informational', N'Warning', N'Critical')),
    CONSTRAINT CK_SensorAlerts_State CHECK (State IN (N'Open', N'Resolved'))
);

CREATE INDEX IX_Sensors_Location_State ON dbo.Sensors(LocationId, DeviceState);
CREATE INDEX IX_AlertThresholds_Metric_Enabled ON dbo.AlertThresholds(Metric, Enabled);
CREATE INDEX IX_SensorEvents_ObservedAt ON dbo.SensorEvents(ObservedAt DESC);
CREATE INDEX IX_SensorAlerts_State_Severity_CreatedAt ON dbo.SensorAlerts(State, Severity, CreatedAt DESC);