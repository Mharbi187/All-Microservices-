cd 'core-service'
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
[Environment]::SetEnvironmentVariable('SPRING_DATASOURCE_URL', 'jdbc:postgresql://localhost:5432/nexusaiddb', 'Process')
mvn spring-boot:run
# En cas d'erreur de commande globale mvn, vous pouvez aussi lancer :
# .\mvnw.cmd spring-boot:run

