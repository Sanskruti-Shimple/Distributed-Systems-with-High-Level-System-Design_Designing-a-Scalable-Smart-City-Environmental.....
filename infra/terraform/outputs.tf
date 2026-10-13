output "resource_group_name" {
  value = azurerm_resource_group.demo.name
}

output "aks_name" {
  value = azurerm_kubernetes_cluster.demo.name
}

output "acr_login_server" {
  value = azurerm_container_registry.demo.login_server
}

output "eventhub_bootstrap_servers" {
  value = "${azurerm_eventhub_namespace.demo.name}.servicebus.windows.net:9093"
}

output "sql_server_fqdn" {
  value = azurerm_mssql_server.demo.fully_qualified_domain_name
}

output "adx_cluster_uri" {
  value = azurerm_kusto_cluster.demo.uri
}

output "key_vault_name" {
  value = azurerm_key_vault.demo.name
}

output "key_vault_uri" {
  value = azurerm_key_vault.demo.vault_uri
}

output "workload_identity_client_id" {
  value = azurerm_user_assigned_identity.workloads.client_id
}

output "workload_identity_object_id" {
  value = azurerm_user_assigned_identity.workloads.principal_id
}

output "tenant_id" {
  value = data.azurerm_client_config.current.tenant_id
}

output "application_insights_connection_string" {
  value     = azurerm_application_insights.demo.connection_string
  sensitive = true
}