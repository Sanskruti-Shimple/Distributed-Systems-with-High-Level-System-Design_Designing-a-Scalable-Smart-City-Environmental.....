data "azurerm_client_config" "current" {}

resource "random_string" "suffix" {
  length  = 6
  lower   = true
  upper   = false
  numeric = true
  special = false
}

locals {
  suffix          = random_string.suffix.result
  resource_group  = "${var.name_prefix}-${local.suffix}-rg"
  acr_name        = "${replace(var.name_prefix, "-", "")}${local.suffix}"
  key_vault_name  = "${var.name_prefix}-${local.suffix}-kv"
  aks_name        = "${var.name_prefix}-${local.suffix}-aks"
  eventhub_name   = "${var.name_prefix}-${local.suffix}-eh"
  sql_server_name = "${var.name_prefix}-${local.suffix}-sql"
  adx_name        = "${var.name_prefix}-${local.suffix}-adx"
  tags = {
    application = "smart-city-environmental-monitoring"
    environment = "demo"
    lifecycle   = "ephemeral"
  }
}

resource "azurerm_resource_group" "demo" {
  name     = local.resource_group
  location = var.location
  tags     = local.tags
}

resource "azurerm_log_analytics_workspace" "demo" {
  name                = "${var.name_prefix}-${local.suffix}-law"
  location            = azurerm_resource_group.demo.location
  resource_group_name = azurerm_resource_group.demo.name
  sku                 = "PerGB2018"
  retention_in_days   = 30
  tags                = local.tags
}

resource "azurerm_application_insights" "demo" {
  name                = "${var.name_prefix}-${local.suffix}-appi"
  location            = azurerm_resource_group.demo.location
  resource_group_name = azurerm_resource_group.demo.name
  application_type    = "web"
  workspace_id        = azurerm_log_analytics_workspace.demo.id
  tags                = local.tags
}

resource "azurerm_container_registry" "demo" {
  name                = local.acr_name
  resource_group_name = azurerm_resource_group.demo.name
  location            = azurerm_resource_group.demo.location
  sku                 = "Basic"
  admin_enabled       = false
  tags                = local.tags
}

resource "azurerm_virtual_network" "demo" {
  name                = "${var.name_prefix}-${local.suffix}-vnet"
  address_space       = ["10.42.0.0/16"]
  location            = azurerm_resource_group.demo.location
  resource_group_name = azurerm_resource_group.demo.name
  tags                = local.tags
}

resource "azurerm_subnet" "aks" {
  name                 = "aks"
  resource_group_name  = azurerm_resource_group.demo.name
  virtual_network_name = azurerm_virtual_network.demo.name
  address_prefixes     = ["10.42.0.0/20"]
  service_endpoints    = ["Microsoft.Sql"]
}

resource "azurerm_user_assigned_identity" "workloads" {
  name                = "${var.name_prefix}-${local.suffix}-workload-id"
  location            = azurerm_resource_group.demo.location
  resource_group_name = azurerm_resource_group.demo.name
  tags                = local.tags
}

resource "azurerm_kubernetes_cluster" "demo" {
  name                      = local.aks_name
  location                  = azurerm_resource_group.demo.location
  resource_group_name       = azurerm_resource_group.demo.name
  dns_prefix                = "${var.name_prefix}-${local.suffix}"
  kubernetes_version        = "1.35"
  sku_tier                  = "Free"
  local_account_disabled    = true
  oidc_issuer_enabled       = true
  workload_identity_enabled = true

  default_node_pool {
    name                         = "system"
    vm_size                      = var.aks_vm_size
    auto_scaling_enabled         = true
    min_count                    = 1
    max_count                    = 3
    vnet_subnet_id               = azurerm_subnet.aks.id
    only_critical_addons_enabled = false
    temporary_name_for_rotation  = "systemtemp"
  }

  identity {
    type = "SystemAssigned"
  }

  key_vault_secrets_provider {
    secret_rotation_enabled = true
  }

  azure_active_directory_role_based_access_control {
    tenant_id          = data.azurerm_client_config.current.tenant_id
    azure_rbac_enabled = true
  }

  network_profile {
    network_plugin      = "azure"
    network_policy      = "azure"
    load_balancer_sku   = "standard"
    service_cidr        = "10.43.0.0/16"
    dns_service_ip      = "10.43.0.10"
    network_plugin_mode = "overlay"
  }

  oms_agent {
    log_analytics_workspace_id = azurerm_log_analytics_workspace.demo.id
  }

  tags = local.tags
}

resource "azurerm_role_assignment" "acr_pull" {
  scope                = azurerm_container_registry.demo.id
  role_definition_name = "AcrPull"
  principal_id         = azurerm_kubernetes_cluster.demo.kubelet_identity[0].object_id
}

resource "azurerm_eventhub_namespace" "demo" {
  name                = local.eventhub_name
  location            = azurerm_resource_group.demo.location
  resource_group_name = azurerm_resource_group.demo.name
  sku                 = "Standard"
  capacity            = 1
  minimum_tls_version = "1.2"
  tags                = local.tags
}

resource "azurerm_eventhub" "readings" {
  name                = "sensor-readings"
  namespace_name      = azurerm_eventhub_namespace.demo.name
  resource_group_name = azurerm_resource_group.demo.name
  partition_count     = 4
  message_retention   = 1
}

resource "azurerm_eventhub_authorization_rule" "producer" {
  name                = "sensor-producer"
  namespace_name      = azurerm_eventhub_namespace.demo.name
  eventhub_name       = azurerm_eventhub.readings.name
  resource_group_name = azurerm_resource_group.demo.name
  listen              = false
  send                = true
  manage              = false
}

resource "azurerm_eventhub_authorization_rule" "consumer" {
  name                = "sensor-consumer"
  namespace_name      = azurerm_eventhub_namespace.demo.name
  eventhub_name       = azurerm_eventhub.readings.name
  resource_group_name = azurerm_resource_group.demo.name
  listen              = true
  send                = false
  manage              = false
}

resource "azurerm_mssql_server" "demo" {
  name                          = local.sql_server_name
  resource_group_name           = azurerm_resource_group.demo.name
  location                      = azurerm_resource_group.demo.location
  version                       = "12.0"
  administrator_login           = var.sql_admin_login
  administrator_login_password  = var.sql_admin_password
  minimum_tls_version           = "1.2"
  public_network_access_enabled = true
  azuread_administrator {
    login_username              = var.sql_entra_admin_login
    object_id                   = var.sql_entra_admin_object_id
    tenant_id                   = data.azurerm_client_config.current.tenant_id
    azuread_authentication_only = true
  }
  tags = local.tags
}

resource "azurerm_mssql_database" "demo" {
  name                        = "smartcity"
  server_id                   = azurerm_mssql_server.demo.id
  sku_name                    = "GP_S_Gen5_1"
  min_capacity                = 0.5
  auto_pause_delay_in_minutes = 60
  zone_redundant              = false
  tags                        = local.tags
}

resource "azurerm_mssql_virtual_network_rule" "aks" {
  name      = "aks-subnet"
  server_id = azurerm_mssql_server.demo.id
  subnet_id = azurerm_subnet.aks.id
}

resource "azurerm_mssql_firewall_rule" "admin" {
  for_each         = { for index, cidr in var.sql_allowed_ip_ranges : tostring(index) => cidr }
  name             = "admin-${each.key}"
  server_id        = azurerm_mssql_server.demo.id
  start_ip_address = split("/", each.value)[0]
  end_ip_address   = split("/", each.value)[0]
}

resource "azurerm_kusto_cluster" "demo" {
  name                = local.adx_name
  location            = azurerm_resource_group.demo.location
  resource_group_name = azurerm_resource_group.demo.name
  sku {
    name     = "Dev(No SLA)_Standard_D11_v2"
    capacity = 1
  }
  identity {
    type = "SystemAssigned"
  }
  double_encryption_enabled     = true
  disk_encryption_enabled       = true
  purge_enabled                 = false
  streaming_ingestion_enabled   = true
  public_network_access_enabled = true
  tags                          = local.tags
}

resource "azurerm_kusto_database" "demo" {
  name                = "smartcity"
  resource_group_name = azurerm_resource_group.demo.name
  location            = azurerm_resource_group.demo.location
  cluster_name        = azurerm_kusto_cluster.demo.name
  soft_delete_period  = "P7D"
  hot_cache_period    = "P1D"
}

resource "azurerm_key_vault" "demo" {
  name                          = local.key_vault_name
  location                      = azurerm_resource_group.demo.location
  resource_group_name           = azurerm_resource_group.demo.name
  tenant_id                     = data.azurerm_client_config.current.tenant_id
  sku_name                      = "standard"
  rbac_authorization_enabled    = true
  purge_protection_enabled      = true
  soft_delete_retention_days    = 7
  public_network_access_enabled = true
  tags                          = local.tags
}

resource "azurerm_role_assignment" "aks_key_vault" {
  scope                = azurerm_key_vault.demo.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = azurerm_user_assigned_identity.workloads.principal_id
}

resource "azurerm_federated_identity_credential" "workloads" {
  name                = "smart-city-service-account"
  resource_group_name = azurerm_resource_group.demo.name
  parent_id           = azurerm_user_assigned_identity.workloads.id
  audience            = ["api://AzureADTokenExchange"]
  issuer              = azurerm_kubernetes_cluster.demo.oidc_issuer_url
  subject             = "system:serviceaccount:smart-city:smart-city"
}

resource "azurerm_kusto_database_principal_assignment" "ingestor" {
  name                = "smart-city-ingestor"
  resource_group_name = azurerm_resource_group.demo.name
  cluster_name        = azurerm_kusto_cluster.demo.name
  database_name       = azurerm_kusto_database.demo.name
  tenant_id           = data.azurerm_client_config.current.tenant_id
  principal_id        = azurerm_user_assigned_identity.workloads.principal_id
  principal_type      = "App"
  role                = "Ingestor"
}

resource "azurerm_kusto_database_principal_assignment" "viewer" {
  name                = "smart-city-viewer"
  resource_group_name = azurerm_resource_group.demo.name
  cluster_name        = azurerm_kusto_cluster.demo.name
  database_name       = azurerm_kusto_database.demo.name
  tenant_id           = data.azurerm_client_config.current.tenant_id
  principal_id        = azurerm_user_assigned_identity.workloads.principal_id
  principal_type      = "App"
  role                = "Viewer"
}

resource "azurerm_key_vault_secret" "eventhub_producer" {
  name         = "eventhub-producer-connection"
  key_vault_id = azurerm_key_vault.demo.id
  value        = azurerm_eventhub_authorization_rule.producer.primary_connection_string
  depends_on   = [azurerm_role_assignment.aks_key_vault]
}

resource "azurerm_key_vault_secret" "eventhub_consumer" {
  name         = "eventhub-consumer-connection"
  key_vault_id = azurerm_key_vault.demo.id
  value        = azurerm_eventhub_authorization_rule.consumer.primary_connection_string
  depends_on   = [azurerm_role_assignment.aks_key_vault]
}

resource "azurerm_consumption_budget_resource_group" "demo" {
  name              = "${var.name_prefix}-monthly-demo-budget"
  resource_group_id = azurerm_resource_group.demo.id
  amount            = var.monthly_budget_usd
  time_grain        = "Monthly"

  time_period {
    start_date = "2026-10-01T00:00:00Z"
    end_date   = "2036-10-01T00:00:00Z"
  }

  notification {
    enabled        = true
    threshold      = 80
    operator       = "GreaterThan"
    threshold_type = "Actual"
    contact_emails = var.budget_contact_emails
  }

  notification {
    enabled        = true
    threshold      = 100
    operator       = "GreaterThan"
    threshold_type = "Forecasted"
    contact_emails = var.budget_contact_emails
  }
}

resource "random_password" "device_token" {
  length  = 48
  special = false
}

resource "azurerm_key_vault_secret" "device_token" {
  name         = "device-ingestion-token"
  key_vault_id = azurerm_key_vault.demo.id
  value        = random_password.device_token.result
  depends_on   = [azurerm_role_assignment.aks_key_vault]
}