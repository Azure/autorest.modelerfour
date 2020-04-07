# Test Configuration (extended pipeline)

``` yaml
pipeline:
  my5/reset-identity:
    input: openapi-document/multi-api/identity
    to: test-document

  my/emitter:
    input: 
      - my5/reset-identity
    is-object: true 

output-artifact: test-document
pipeline-model: v3
```