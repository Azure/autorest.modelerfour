# AutoRest Modeler Four 

## Changelog:
#### 4.13.x 
  - add security info (checks to see if `input.components?.securitySchemes` has any content)
  - sync version of m4 and perks/codemodel == 4.13.x


#### 4.12.x
  - updated CI to build packages
  - any is in a category in schemas
  - times is a new category in schemas (not populated yet, next build)
  - polymorphic payloads are not flattened (when it's the class that declares the discriminator)
  - readonly is pulled from the schema if it's there
  - body parameters should have the required flag set correctly
  - content-type is now a header parameter (wasn't set before)
  - added `modelerfour.always-create-content-type-parameter` to always get the content type parameter even when there are only one option.
  - add support for x-ms-api-version extension to force enabling/disabling parameter to be treated as an api-version parameter
  - the checker plugin will now halt on errors (can be disabled by `modelerfour.additional-checks: false`)
  - when an enum without type is presented, if the values are all strings, assume 'string'
  - flatten parents first for consistency
  - adding quality prechecker step as a way to test the OAI document for quality before modelerfour runs.
  - report duplicate parents via allOf as an error. 
  - added choiceType for content-type schema 
  
#### 4.6.x
  - add additional checks for empty names, collisions
  - fix errant processing on APString => Apstring 
  - x-ms-client-name fixes on parameters
  - added setting for `preserve-uppercase-max-length` to preserve uppercase words up to a certain length.

#### 4.5.x
  - static linking libraries for stability
  - processed all names in namer, styles can be set in config (see below):

  - support overrides in namer 
  - static linked dependency

#### 4.4.x 
  - parameter grouping 
  - some namer changes 

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

  # setting this to false will skip parameter flattening 
  # for operations that have multiple requests (ie, JSON and BINARY)
  multiple-request-parameter-flattening: true|false
  
  # this runs a pre-namer step to clean up names 
  # defaults to true if not specified
  prenamer: true|false          

  # does a check to see if names in schemas/enums/etc will collide
  # off by default 
  resolve-schema-name-collisons: false|true

  # if you want to keep the flattened models even if they are not used
  # off by default
  keep-unused-flattened-models: false|true

  # merges response headers into response objects 
  # defaults to false if not specified
  # not implemented
  merge-response-headers: false|true 

  # enables parameter grouping via x-ms-parameter-grouping
  # defaults to false if not specified
  group-parameters: false|true

  # some additional sanity checks to help debugging
  # defaults to false
  additional-checks: true|false

  # always create the content-type parameter for binary requests 
  # when it's only one possible value, make it a constant.
  always-create-content-type-parameter: true

  # customization of the identifier normalization and naming provided by the prenamer.
  # pascal|pascalcase - MultiWordIdentifier 
  # camel|camelcase - multiWordIdentifier 
  # snake|snakecase - multi_word_identifier
  # upper|uppercase - MULTI_WORD_IDENTIFIER 
  # kebab|kebabcase - multi-word-identifier 
  # space|spacecase - spaces between recognized words
  # default is the first one in the list below:
  # you can prefix or postfix a formatted name with + (ie, '_ + camel' or 'pascal + _' )
  naming: 
    preserve-uppercase-max-length: <number> #defaults to 3
    parameter: camel|pascal|snake|upper|kebab|space
    property: camel|pascal|snake|upper|kebab|space
    operation: pascal|camel|snake|upper|kebab|space
    operationGroup:  pascal|camel|snake|upper|kebab|space
    choice:  pascal|camel|snake|upper|kebab|space
    choiceValue:  pascal|camel|snake|upper|kebab|space
    constant:  pascal|camel|snake|upper|kebab|space
    type:  pascal|camel|snake|upper|kebab|space
    client: pascal|camel|snake|upper|kebab|space
    local: _ + camel 
    global: camel    

    override:  # a key/value mapping of names to force to a certain value 
      cmyk : CMYK
      $host: $host
      LRO: LRO

```
~~~


#### ModelerFour

``` yaml 
pipeline-model: v3
modelerfour-loaded: true
```


``` yaml !$(enable-deduplication)
# By default, modeler-four based generators will not use the deduplicator or subset reducer
# if we need to easily disable this set the enable-deduplication flag.
pass-thru:
  - model-deduplicator
  - subset-reducer
```

``` yaml
modelerfour:
  naming:
    override:  # defaults 
      cmyk : CMYK
      $host: $host

pipeline:
  prechecker:
    input: openapi-document/multi-api/identity

  modelerfour:
    input: 
      - prechecker

  modelerfour/new-transform:
    input: modelerfour

  modelerfour/flattener:
    input: modelerfour/new-transform

  modelerfour/flattener/new-transform:
    input: modelerfour/flattener

  modelerfour/grouper:
    input: modelerfour/flattener/new-transform

  modelerfour/grouper/new-transform:
    input: modelerfour/grouper

  modelerfour/pre-namer:
    input: modelerfour/grouper/new-transform

  modelerfour/pre-namer/new-transform:
    input: modelerfour/pre-namer

  modelerfour/checker:
    input: 
      - modelerfour/pre-namer/new-transform
      - prechecker

  modelerfour/identity:
    input: modelerfour/checker

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

``` yaml $(inspector) 
pipeline:
  inspector/codemodel/reset-identity:
    input: 
      - prechecker
      - modelerfour/identity
      - inspector

    to: inspect-document
  
  inspector/emitter:
    input: 
      - inspector/codemodel/reset-identity    
```