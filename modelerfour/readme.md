
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

  modelerfour/identity:
    input: modelerfour/pre-namer/new-transform

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

```
