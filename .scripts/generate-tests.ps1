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

# start @autorest/test-server
./modelerfour/node_modules/.bin/start-autorest-testserver

start-sleep 3

# load test names
$inputs = (iwr "http://localhost:3000/swagger/files.txt").Content

$inputs = $inputs.split("`n");
$inputs = $inputs |% { $_.replace('.json','').trim() }


if( $swaggers -ne $null) {
  $inputs = $inputs |% { if( $swaggers.indexOf( $_ ) -gt -1 )  { return $_ } }
}


# source location for swagger files
$swaggerRoot = "http://localhost:3000/swagger/"
 
# AutoRest Choice
$autorest = (get-command autorest-beta).Source 

$success = @{}
$errors = @{}

function run-autorest($src) {
  $name = $src
  $src = "$name.json"

  $outputFolder = "$outputRoot/scenarios/$name"
  
  $txt = "$autorest --version:c:\work\2019\autorest.megarepo\autorest --pipeline-model:v3 --input-file:$swaggerRoot$src --output-folder:$outputFolder --title:$name $root/modelerfour/test/test-configuration.md $args" 
  write-host -fore GREEN "`n--------------------------------------------------------`nGenerating [$name]`n--------------------------------------------------------`n"
  echo $txt
  & $autorest "--version:c:\work\2019\autorest.megarepo\autorest" "--pipeline-model:v3" "--input-file:$swaggerRoot$src" "--output-folder:$outputFolder" "--clear-output-folder" "--title:$name" "$root/modelerfour/test/test-configuration.md" "--deduplicate-inline-models" $args
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

autorest-beta --version:c:\work\2019\autorest.megarepo\autorest --pipeline-model:v3 --input-file:https://github.com/Azure/azure-rest-api-specs/blob/master/specification/storage/data-plane/Microsoft.StorageDataLake/stable/2019-10-31/DataLakeStorage.json  --output-folder:C:\work\2019\autorest.megarepo\autorest.modelerfour\modelerfour\test\scenarios\datalake-storage --verbose --debug --no-network-check "$root/modelerfour/test/test-configuration.md"
autorest-beta --version:c:\work\2019\autorest.megarepo\autorest --pipeline-model:v3 --input-file:https://raw.githubusercontent.com/Azure/azure-rest-api-specs/master/specification/cognitiveservices/data-plane/TextAnalytics/preview/v3.0-preview.1/TextAnalytics.json  --output-folder:C:\work\2019\autorest.megarepo\autorest.modelerfour\modelerfour\test\scenarios\text-analytics --verbose --debug --no-network-check "$root/modelerfour/test/test-configuration.md"

