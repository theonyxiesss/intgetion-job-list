$ErrorActionPreference = "Stop"

$secureKey = Read-Host "Вставь OpenRouter API key (ввод скрыт)" -AsSecureString
if ($secureKey.Length -eq 0) {
    throw "Ключ пустой. Файл не изменён."
}

$keyPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureKey)
try {
    $apiKey = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($keyPointer)
}
finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($keyPointer)
    $secureKey.Dispose()
}

if ($apiKey -match "[\r\n]") {
    throw "Ключ должен быть одной строкой. Файл не изменён."
}

$repoRoot = Split-Path -Parent $PSScriptRoot
$envPath = Join-Path $repoRoot ".env.local"
$lines = [System.Collections.Generic.List[string]]::new()

if (Test-Path -LiteralPath $envPath) {
    foreach ($line in [System.IO.File]::ReadAllLines($envPath)) {
        $lines.Add($line)
    }
}

$keyLineIndexes = @(
    for ($index = 0; $index -lt $lines.Count; $index++) {
        if ($lines[$index] -match '^\s*OPENROUTER_API_KEY\s*=') {
            $index
        }
    }
)

$newLine = "OPENROUTER_API_KEY=$apiKey"
if ($keyLineIndexes.Count -gt 0) {
    $lines[$keyLineIndexes[0]] = $newLine
    for ($index = $keyLineIndexes.Count - 1; $index -gt 0; $index--) {
        $lines.RemoveAt($keyLineIndexes[$index])
    }
}
else {
    $lines.Add($newLine)
}

[System.IO.File]::WriteAllLines($envPath, $lines, [System.Text.UTF8Encoding]::new($false))
Write-Host "OPENROUTER_API_KEY сохранён в .env.local. Значение не выводится."
