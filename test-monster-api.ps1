$body = @{
  profile = @{
    symptoms = @("fatigue", "brain fog", "joint pain")
    coping = @("meditation", "exercise", "hydration")
    personality = @("cheerful", "determined", "creative")
  }
  userId = "test-user-123"
} | ConvertTo-Json

Invoke-RestMethod -Method Post -Uri "http://localhost:54321/functions/v1/generate-monster-image" -Body $body -ContentType "application/json"
