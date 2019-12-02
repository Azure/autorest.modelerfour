# Test Configuration (extended pipeline)

``` yaml


pipeline:
  my0/reset-identity:
    input: swagger-document/loader-swagger
    to: test-document
    name: oai2.loaded.json

  my1/reset-identity:
    input: openapi-document/loader-openapi
    to: test-document
    name: oai3.loaded.json
  
  my3/reset-identity:
    input: openapi-document/model-deduplicator
    to: test-document

  my2/reset-identity:
    input:  
      - openapi-document/tree-shaker
    to: test-document
    #name: oai3-shaken.json

  my4/reset-identity:
    input: openapi-document/subset-reducer
    to: test-document

  my5/reset-identity:
    input: openapi-document/multi-api/identity
    to: test-document

  my/emitter:
    input: 
      - my0/reset-identity
      - my1/reset-identity
      - my2/reset-identity
      - my3/reset-identity
      - my4/reset-identity
      - my5/reset-identity
    is-object: true 

output-artifact: test-document
```