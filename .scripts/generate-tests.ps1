[CmdletBinding()]
param (
    [Parameter()]
    [string[]]
    $swaggers
)
$testServer = get-command "$(resolve-path $PSScriptRoot/..)/modelerfour/node_modules/.bin/start-autorest-express"
& $testServer --verbose --show-messages pwsh $PSScriptRoot/generate.ps1 @PSBoundParameters