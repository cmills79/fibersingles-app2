# Supabase Edge Function Environment Variables Setup
param(
    [Parameter(Mandatory=$true)]
    [string]$ServiceAccountPath,
    [Parameter(Mandatory=$false)]
    [string]$EnvFilePath = ".env"
)

# Function to check if file exists
function Test-RequiredFile {
    param([string]$Path, [string]$Description)
    if (-not (Test-Path $Path)) {
        Write-Error "Required $Description file not found at: $Path"
        exit 1
    }
}

# Validate required files exist
Test-RequiredFile -Path $ServiceAccountPath -Description "service account"
Test-RequiredFile -Path $EnvFilePath -Description "environment variables"

Write-Host "Setting up environment variables..."

# Import variables from .env
Write-Host "Importing environment variables from $EnvFilePath..."
Get-Content $EnvFilePath | Where-Object { $_ -match '^[^#]' } | ForEach-Object {
    $name, $value = $_ -split '=', 2
    if ($name -and $value) {
        Write-Host "Setting $name..."
        supabase secrets set "$name=$value"
    }
}

# Set your Google Service Account Key
Write-Host "Setting GOOGLE_SERVICE_ACCOUNT_KEY..."
try {
    $serviceAccountKey = Get-Content $ServiceAccountPath -Raw -ErrorAction Stop
    supabase secrets set "GOOGLE_SERVICE_ACCOUNT_KEY=$serviceAccountKey"
} catch {
    Write-Error "Failed to read service account key: $_"
    exit 1
}

# Verify the secrets were set
Write-Host "`nVerifying secrets have been set..."
try {
    $secrets = supabase secrets list
    if (-not $?) { throw "Failed to list secrets" }
} catch {
    Write-Error "Failed to verify secrets: $_"
    exit 1
}

# Initialize and link Supabase project
Write-Host "`nInitializing Supabase project..."
try {
    # Only initialize if .supabase folder doesn't exist
    if (-not (Test-Path ".supabase")) {
        supabase init
        if (-not $?) { throw "Failed to initialize Supabase" }
    }

    Write-Host "Linking Supabase project..."
    supabase link --project-ref fibersingles-app2
    if (-not $?) { throw "Failed to link project" }
} catch {
    Write-Error "Failed to initialize/link Supabase project: $_"
    exit 1
}

# Deploy the Edge Function
Write-Host "`nDeploying generate-monster-image function..."
try {
    supabase functions deploy generate-monster-image
    if (-not $?) { throw "Failed to deploy function" }
    Write-Host "Function deployed successfully!"
} catch {
    Write-Error "Failed to deploy function: $_"
    exit 1
}
