cd 'Distaster Detection'
Get-Content '..\.env' -ErrorAction SilentlyContinue | Where-Object { $_.Trim() -match '^[^#]' -and $_.Trim() -match '=' } | ForEach-Object {
    $name, $val = $_.Split('=', 2)
    $cleanVal = $val.Trim().Trim('"').Replace('\n', "
")
    [Environment]::SetEnvironmentVariable($name.Trim(), $cleanVal, 'Process')
}
[Environment]::SetEnvironmentVariable('SPRING_RABBITMQ_HOST', 'localhost', 'Process')
[Environment]::SetEnvironmentVariable('SPRING_REDIS_HOST', 'localhost', 'Process')
[Environment]::SetEnvironmentVariable('EUREKA_CLIENT_SERVICEURL_DEFAULTZONE', 'http://localhost:8761/eureka/', 'Process')
[Environment]::SetEnvironmentVariable('MINIO_ENDPOINT', 'http://localhost:9000', 'Process')
[Environment]::SetEnvironmentVariable('SPRING_CLOUD_CONFIG_URI', 'http://localhost:8888', 'Process')
[Environment]::SetEnvironmentVariable('SPRING_DATASOURCE_PASSWORD', [Environment]::GetEnvironmentVariable('DB_PASSWORD', 'Process'), 'Process')
[Environment]::SetEnvironmentVariable('SPRING_RABBITMQ_USERNAME', [Environment]::GetEnvironmentVariable('RABBITMQ_USER', 'Process'), 'Process')
[Environment]::SetEnvironmentVariable('SPRING_RABBITMQ_PASSWORD', [Environment]::GetEnvironmentVariable('RABBITMQ_PASS', 'Process'), 'Process')
if (Test-Path '.venv\Scripts\activate') { .\.venv\Scripts\activate }; [Environment]::SetEnvironmentVariable('RABBITMQ_HOST', 'localhost', 'Process'); [Environment]::SetEnvironmentVariable('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/nexusaiddb', 'Process'); uvicorn src.api:app --host 0.0.0.0 --port 8000

