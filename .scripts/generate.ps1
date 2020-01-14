[CmdletBinding()]
param (
    [Parameter()]
    [string[]]
    $swaggers
)
# generates the AutoRest tests into separate modules

$root = ( resolve-path "$PSScriptRoot/..").Path
$outputRoot = ( resolve-path "$root/modelerfour/test").Path

cd $root

# load test names
$inputs = (iwr "http://localhost:3000/__files/files.txt").Content

$inputs = $inputs.split("`n");
$inputs = $inputs |% { $_.replace('.json','').trim() }


if( $swaggers -ne $null) {
  $inputs = $inputs |% { if( $swaggers.indexOf( $_ ) -gt -1 )  { return $_ } }
}


# source location for swagger files
$swaggerRoot = "http://localhost:3000/__files/"
 
# AutoRest Choice
$autorest = (get-command autorest-beta).Source 

$success = @{}
$errors = @{}

function run-autorest($src) {
  $name = $src
  $src = "$name.json"

  $outputFolder = "$outputRoot/scenarios/$name"
  
  $txt = "$autorest --version:$root\..\autorest --pipeline-model:v3 --input-file:$swaggerRoot$src --output-folder:$outputFolder --title:$name $root/modelerfour/test/test-configuration.md $args" 
  write-host -fore GREEN "`n--------------------------------------------------------`nGenerating [$name]`n--------------------------------------------------------`n"
  echo $txt
  & $autorest "--version:$root\..\autorest" "--pipeline-model:v3" "--input-file:$swaggerRoot$src" "--output-folder:$outputFolder" "--clear-output-folder" "--title:$name" "$root/modelerfour/test/test-configuration.md" "--deduplicate-inline-models" $args
  $rc = $LastExitCode
  if( $rc -gt 0 ) {
    write-host -fore RED "`n--------------------------------------------------------`nFAILED GENERATION [$name]`n--------------------------------------------------------`n"
    $errors[$src] = $txt
  } else {
    write-host -fore GREEN "`n--------------------------------------------------------`nSUCCESS [$name]`n--------------------------------------------------------`n"
    $success[$src] = $txt
  }
}



$inputs |% {
  if ( $_.length -gt 0 ) {
    if ($_.startsWith('azure')) {
      run-autorest $_ --azure 
    } else {
      run-autorest $_
    }
  }
}

$success.Keys |% {
    write-host -fore GREEN $_  # : $each
}
$errors.Keys |% {
    write-host -fore RED $_  # : $each
}

# datalake storage
autorest-beta --version:$root\..\autorest --pipeline-model:v3 --input-file:https://github.com/Azure/azure-rest-api-specs/blob/master/specification/storage/data-plane/Microsoft.StorageDataLake/stable/2019-10-31/DataLakeStorage.json  --output-folder:$outputRoot\scenarios\datalake-storage --verbose --debug --no-network-check "$outputRoot/test-configuration.md"
# text analytics
autorest-beta --version:$root\..\autorest --pipeline-model:v3 --input-file:https://raw.githubusercontent.com/Azure/azure-rest-api-specs/master/specification/cognitiveservices/data-plane/TextAnalytics/preview/v3.0-preview.1/TextAnalytics.json  --output-folder:$outputRoot\scenarios\text-analytics --verbose --debug --no-network-check "$outputRoot/test-configuration.md"
# keyvault
autorest-beta --version:$root\..\autorest --pipeline-model:v3 --input-file:https://github.com/Azure/azure-rest-api-specs/blob/28adfecc8c8d9a425451a5b7f6f2688e471a60f4/specification/keyvault/data-plane/Microsoft.KeyVault/preview/7.0/keyvault.json  --output-folder:$outputRoot\scenarios\keyvault --verbose --debug --no-network-check "$outputRoot/test-configuration.md"

# blob storage
autorest-beta --version:$root\..\autorest --pipeline-model:v3 --input-file:https://github.com/Azure/azure-rest-api-specs/blob/12ff3b96ec4ede0a56a7315bcdaefe9ae8aa9168/specification/storage/data-plane/Microsoft.BlobStorage/preview/2019-02-02/blob.json  --output-folder:$outputRoot\scenarios\blob-storage --verbose --debug --no-network-check "$outputRoot/test-configuration.md" 