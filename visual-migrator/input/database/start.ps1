# 1. Spin up a throw-away MariaDB container on host port 3306
docker run --name temp-mariadb `
    -e MARIADB_ROOT_PASSWORD="P@ssw0rd!" `
    -d -p 3306:3306 `
    mariadb:latest

# 2. Wait for MariaDB to initialise
Write-Host "Waiting for MariaDB to be ready... (few seconds)"
Start-Sleep -Seconds 10

# 3. Create the target database 'wordpress'
Write-Host "Creating database 'wordpress'..."
docker exec temp-mariadb `
    mariadb -uroot -p"P@ssw0rd!" `
    -e "CREATE DATABASE IF NOT EXISTS wordpress;"

# 4. Import your dump into 'wordpress'
Write-Host "Importing .\backup.sql into 'wordpress'..."
Get-Content .\backup.sql -Raw `
| docker exec -i temp-mariadb `
    mariadb -uroot -p"P@ssw0rd!" wordpress

# 5. Connect to inspect
Write-Host "`nInspecting databases..."
docker exec -it temp-mariadb `
    mariadb -uroot -p"P@ssw0rd!" `
    -e "SHOW DATABASES;"

Write-Host "`n✅ Import complete. To connect run:`n  docker exec -it temp-mariadb mariadb -uroot -p"
