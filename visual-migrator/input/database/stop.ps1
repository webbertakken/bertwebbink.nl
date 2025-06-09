# Stop and remove the MariaDB container
Write-Host "Removing container..."
docker stop temp-mariadb
docker rm temp-mariadb

Write-Host "✅ MariaDB container 'temp-mariadb' torn down."