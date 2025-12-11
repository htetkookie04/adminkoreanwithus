# Database Setup Script for Korean With Us
# This script automates the database creation and migration process

Write-Host "🚀 Korean With Us - Database Setup Script" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Check if PostgreSQL is installed
$psqlPath = $null
$possiblePaths = @(
    "C:\Program Files\PostgreSQL\16\bin\psql.exe",
    "C:\Program Files\PostgreSQL\15\bin\psql.exe",
    "C:\Program Files\PostgreSQL\14\bin\psql.exe"
)

foreach ($path in $possiblePaths) {
    if (Test-Path $path) {
        $psqlPath = $path
        break
    }
}

if (-not $psqlPath) {
    Write-Host "❌ PostgreSQL not found. Please install PostgreSQL first." -ForegroundColor Red
    Write-Host "   Run: winget install --id PostgreSQL.PostgreSQL.16" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Found PostgreSQL at: $psqlPath" -ForegroundColor Green

# Set PostgreSQL bin directory in PATH for this session
$pgBinDir = Split-Path $psqlPath -Parent
$env:Path = "$pgBinDir;$env:Path"

# Database configuration
$dbName = "korean_with_us"
$dbUser = "postgres"

Write-Host ""
Write-Host "📋 Database Configuration:" -ForegroundColor Cyan
Write-Host "   Database: $dbName" -ForegroundColor White
Write-Host "   User: $dbUser" -ForegroundColor White
Write-Host ""

# Step 1: Create Database
Write-Host "🔨 Step 1: Creating database '$dbName'..." -ForegroundColor Yellow

# Check if database exists
$dbExists = & $psqlPath -U $dbUser -lqt | Select-String -Pattern "^\s*$dbName\s*\|"

if ($dbExists) {
    Write-Host "ℹ️  Database '$dbName' already exists" -ForegroundColor Blue
} else {
    & $psqlPath -U $dbUser -c "CREATE DATABASE $dbName;"
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Database '$dbName' created successfully" -ForegroundColor Green
    } else {
        Write-Host "❌ Failed to create database" -ForegroundColor Red
        exit 1
    }
}

# Step 2: Run SQL Migrations
Write-Host ""
Write-Host "📝 Step 2: Running database migrations..." -ForegroundColor Yellow

$migrationsDir = "..\database\migrations"
$migrationFiles = @(
    "001_initial_schema.sql",
    "002_timetable_schema.sql",
    "003_gallery_schema.sql",
    "004_lectures_schema.sql",
    "005_add_pdf_to_lectures.sql",
    "006_make_video_url_nullable.sql"
)

foreach ($file in $migrationFiles) {
    $filePath = Join-Path $migrationsDir $file
    if (Test-Path $filePath) {
        Write-Host "   Running: $file" -ForegroundColor White
        & $psqlPath -U $dbUser -d $dbName -f $filePath -v ON_ERROR_STOP=1
        if ($LASTEXITCODE -ne 0) {
            Write-Host "   ❌ Migration failed: $file" -ForegroundColor Red
            Write-Host "   This might be normal if migrations were already run" -ForegroundColor Yellow
        } else {
            Write-Host "   ✅ Migration completed: $file" -ForegroundColor Green
        }
    } else {
        Write-Host "   ⚠️  Migration file not found: $file" -ForegroundColor Yellow
    }
}

# Step 3: Sync Prisma Schema
Write-Host ""
Write-Host "🔄 Step 3: Syncing Prisma schema..." -ForegroundColor Yellow

# Check if Prisma migration exists
$prismaMigrationDir = ".\prisma\migrations"
if (Test-Path $prismaMigrationDir) {
    Write-Host "   Running Prisma migrations..." -ForegroundColor White
    npx prisma migrate deploy
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Prisma migrations deployed" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Prisma migrations may have already been applied" -ForegroundColor Yellow
    }
} else {
    Write-Host "   No Prisma migrations found" -ForegroundColor Blue
}

# Step 4: Generate Prisma Client
Write-Host ""
Write-Host "⚙️  Step 4: Generating Prisma Client..." -ForegroundColor Yellow
npx prisma generate
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Prisma Client generated" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to generate Prisma Client" -ForegroundColor Red
    exit 1
}

# Step 5: Seed Database
Write-Host ""
Write-Host "🌱 Step 5: Seeding database with admin user..." -ForegroundColor Yellow
npm run prisma:seed
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Database seeded successfully" -ForegroundColor Green
} else {
    Write-Host "⚠️  Seeding completed with warnings (this is normal if data already exists)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎉 Database setup completed!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Default Admin Credentials:" -ForegroundColor Cyan
Write-Host "   Email: admin@koreanwithus.com" -ForegroundColor White
Write-Host "   Password: admin123" -ForegroundColor White
Write-Host ""
Write-Host "▶️  Next step: Start the backend server with 'npm run dev'" -ForegroundColor Yellow
Write-Host ""
