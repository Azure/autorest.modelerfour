# AutoRest Modeler Four 

## Changelog:
#### (patch-level changes)

#### 4.3.x
  - flattening (model and payload) enabled.
  - properties should respect x-ms-client-name (many fixes)
  - global parameters should try to be in order of original spec
  - filter out 'x-ms-original' from extensions
  - add serializedName for host parameters
  - make sure reused global parameter is added to method too
  - processed values in constants/enums a bit better, support AnySchema for no type/format 
  - support server variable parameters as method unless they have x-ms-parameter-location

#### 4.2.75 - bug fixes:
  - add `style` to parameters to support collection format 
  - `potential-breaking-change` Include common paramters from oai/path #68 (requires fix from autorest-core 3.0.6160+ ) 
  - propogate extensions from server parameters (ie, x-ms-skip-url-encoding) #61
  - `potential-breaking-change` make operation groups case insensitive. #59 
  - `potential-breaking-change` sealedChoice/Choice selection was backwards ( was creating a sealedchoice schema for modelAsString:true and vice versa) #62 
  - `potential-breaking-change` drop constant schema from response, use constantschema's valueType instead. #63
  - `potential-breaking-change` fix body parameter marked as required when not marked so in spec. #64

#### 4.1.60 - add missing serializedName on parameters
  - query parameters should have a serializedName so that they don't rely on the cosmetic name property.
  

#### 4.1.58 - Breaking change: 
  - version bump, change your configuration to specify version `~4.1.0` or greater
  
  ``` 
  use-extension:
    "@autorest/modelerfour" : "~4.1.0" 
  ```
  - each Http operation (via `.protocol.http`) will now have a separate `path` and `uri` properties. 
  <br>Both are still templates, and will have parameters. 
  <br>The parameters for the `uri` property will have `in` set to `ParameterLocation.Uri`
  <br>The parameters for the `path` property will continue to have `in` set to `ParameterLocation.Path`

  
  - autorest-core recently added an option to aggressively deduplicate inline models (ie, ones without a name)
  and modeler-four based generator will have that enabled by default. (ie `deduplicate-inline-models: true`)
  <br>This may increase deduplication time on extremely large openapi models.

  - this package contains the initial code for the flattener plugin, however it is not yet enabled.

  - updated `@azure-tools/codemodel` package to `3.0.241`:
  <br>`uri` (required) was added to `HttpRequest`
  <br>`flattenedNames` (optional) was added to `Property` (in anticipation of supporting flattening)



# Contributing

This project welcomes contributions and suggestions.  Most contributions require you to agree to a
Contributor License Agreement (CLA) declaring that you have the right to, and actually do, grant us
the rights to use your contribution. For details, visit https://cla.microsoft.com.

When you submit a pull request, a CLA-bot will automatically determine whether you need to provide
a CLA and decorate the PR appropriately (e.g., label, comment). Simply follow the instructions
provided by the bot. You will only need to do this once across all repos using our CLA.

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or
contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.


### Autorest plugin configuration
- Please don't edit this section unless you're re-configuring how the powershell extension plugs in to AutoRest
AutoRest needs the below config to pick this up as a plug-in - see https://github.com/Azure/autorest/blob/master/docs/developer/architecture/AutoRest-extension.md


### ModelFour Options
You can specify the following options in your configuration for modelerfour:

~~~ markdown
``` yaml
modelerfour: 
  # this will speed up the serialization if you explicitly say you do or do not want yaml tags in the model
  # default - both
  emit-yaml-tags: undefined|true|false

  # this will flatten modelers marked with 'x-ms-client-flatten' 
  # defaults to false if not specified
  flatten-models: false|true    

  # this will flatten parameters when payload-flattening-threshold is specified (or marked in the input spec)
  # defaults to false if not specified
  flatten-payloads: false|true  
  
  # this runs a pre-namer step to clean up names 
  # defaults to true if not specified
  prenamer: true|false          

  # merges response headers into response objects 
  # defaults to false if not specified
  # (not implemented yet)
  merge-response-headers: false|true 
```
~~~


#### ModelerFour

``` yaml 
pipeline-model: v3
modelerfour-loaded: true
```

``` yaml
pipeline:
  modelerfour:
    input: openapi-document/multi-api/identity  

  modelerfour/new-transform:
    input: modelerfour

  modelerfour/pre-namer:
    input: modelerfour/new-transform

  modelerfour/pre-namer/new-transform:
    input: modelerfour/pre-namer

  modelerfour/flattener:
    input: modelerfour/pre-namer/new-transform

  modelerfour/flattener/new-transform:
    input: modelerfour/flattener

  modelerfour/identity:
    input: modelerfour/flattener/new-transform

  modelerfour/emitter:
    input: modelerfour/identity
    scope: scope-modelerfour/emitter

  modelerfour/notags/emitter:
    input: modelerfour/identity
    scope: scope-modelerfour/notags/emitter

scope-modelerfour/emitter: # writing to disk settings
  input-artifact: code-model-v4
  is-object: true # tells autorest that it is an object graph instead of a text document
  output-uri-expr: | # forces filename if it gets written to disk.
    "code-model-v4.yaml"  
    
scope-modelerfour/notags/emitter: # writing to disk settings
  input-artifact: code-model-v4-no-tags
  is-object: true # tells autorest that it is an object graph instead of a text document
  output-uri-expr: | # forces filename if it gets written to disk.
    "code-model-v4-no-tags.yaml"  

# the default preference for modeler-four based generators is to deduplicate inline models fully.
# this may impact performance on extremely large models with a lot of inline schemas.
deduplicate-inline-models: true

```

