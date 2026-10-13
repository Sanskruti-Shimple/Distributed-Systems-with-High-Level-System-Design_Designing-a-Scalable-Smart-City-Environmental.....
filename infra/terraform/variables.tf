variable "name_prefix" {
  description = "Lowercase, short prefix used for Azure resource names."
  type        = string
  default     = "metrovale"

  validation {
    condition     = can(regex("^[a-z0-9-]{3,12}$", var.name_prefix))
    error_message = "name_prefix must be 3-12 lowercase letters, digits, or hyphens."
  }
}

variable "location" {
  description = "Azure region; choose after checking service availability and pricing."
  type        = string
}

variable "aks_vm_size" {
  description = "AKS node SKU. Validate quota and regional availability before deployment."
  type        = string
  default     = "Standard_D2ads_v7"
}

variable "sql_admin_login" {
  description = "Bootstrap SQL administrator; use only for initial setup, not app traffic."
  type        = string
  default     = "cityadmin"
}

variable "sql_admin_password" {
  description = "Strong bootstrap SQL administrator password. Stored in Terraform state and Key Vault."
  type        = string
  sensitive   = true

  validation {
    condition     = length(var.sql_admin_password) >= 16
    error_message = "sql_admin_password must be at least 16 characters."
  }
}

variable "budget_contact_emails" {
  description = "Recipients for 80% and 100% monthly budget notifications."
  type        = list(string)
}

variable "monthly_budget_usd" {
  description = "Monthly resource-group budget in USD; the selected capstone range is $50-$200."
  type        = number
  default     = 150

  validation {
    condition     = var.monthly_budget_usd >= 50 && var.monthly_budget_usd <= 200
    error_message = "Set a monthly budget between $50 and $200 for this demo."
  }
}

variable "sql_allowed_ip_ranges" {
  description = "Optional client IPv4 CIDRs for temporary local SQL administration."
  type        = list(string)
  default     = []
}

variable "sql_entra_admin_login" {
  description = "UPN of the Microsoft Entra administrator for the Azure SQL logical server."
  type        = string
}

variable "sql_entra_admin_object_id" {
  description = "Object ID of the Microsoft Entra SQL administrator."
  type        = string
}