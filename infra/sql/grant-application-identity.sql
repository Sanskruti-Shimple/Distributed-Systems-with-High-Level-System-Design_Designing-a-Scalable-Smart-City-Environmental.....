-- Run as the Microsoft Entra SQL administrator after Terraform creates the workload identity.
-- Replace the two values from terraform output before execution.
CREATE USER [smart-city-workload] FROM EXTERNAL PROVIDER
    WITH OBJECT_ID = 'REPLACE_WITH_WORKLOAD_IDENTITY_OBJECT_ID';

ALTER ROLE db_datareader ADD MEMBER [smart-city-workload];
ALTER ROLE db_datawriter ADD MEMBER [smart-city-workload];