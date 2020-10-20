/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as assert from "assert";
import { suite, test } from "mocha-typescript";
import { ModelerFour } from "../../modeler/modelerfour";
import {
  createTestSession,
  createTestSpec,
  addSchema,
  addOperation,
  response,
  InitialTestSpec,
  responses
} from "./unitTestUtil";
import {
  CodeModel,
  Parameter,
  SchemaResponse,
  ConstantSchema,
  SealedChoiceSchema
} from "@azure-tools/codemodel";
import { ParameterLocation } from "@azure-tools/openapi";

const cfg = {
  modelerfour: {
    "flatten-models": true,
    "flatten-payloads": true,
    "group-parameters": true,
    "resolve-schema-name-collisons": true,
    "additional-checks": true,
    //'always-create-content-type-parameter': true,
    naming: {
      override: {
        $host: "$host",
        cmyk: "CMYK"
      },
      local: "_ + camel",
      constantParameter: "pascal"
    }
  },
  "payload-flattening-threshold": 2
};

async function runModeler(spec: any, config: any = cfg): Promise<CodeModel> {
  const modelerErrors: any[] = [];
  const session = await createTestSession(config, spec, modelerErrors);
  const modeler = await new ModelerFour(session).init();

  assert.equal(modelerErrors.length, 0);

  return modeler.process();
}

export function findByName<T>(
  name: string,
  items: T[] | undefined
): T | undefined {
  return (
    (items && items.find(i => (<any>i).language.default.name === name)) ||
    undefined
  );
}

function assertSchema(
  schemaName: string,
  schemaList: any[] | undefined,
  accessor: (schema: any) => any,
  expected: any
) {
  assert(
    schemaList,
    `Schema list was empty when searching for schema: ${schemaName}`
  );

  // We've already asserted, but make the compiler happy
  if (schemaList) {
    const schema = findByName(schemaName, schemaList);
    assert(schema, `Could not find schema in code model: ${schemaName}`);
    assert.deepEqual(accessor(schema), expected);
  }
}

@suite
class Modeler {
  @test
  async "preserves 'info' metadata"() {
    const spec = createTestSpec();
    const codeModel = await runModeler(spec);

    assert.strictEqual(codeModel.info.title, InitialTestSpec.info.title);
    assert.strictEqual(codeModel.info.license, InitialTestSpec.info.license);
    assert.strictEqual(
      codeModel.info.description,
      InitialTestSpec.info.description
    );
    assert.strictEqual(
      codeModel.info.contact?.name,
      InitialTestSpec.info.contact.name
    );
    assert.strictEqual(
      codeModel.info.contact?.url,
      InitialTestSpec.info.contact.url
    );
    assert.strictEqual(
      codeModel.info.contact?.email,
      InitialTestSpec.info.contact.email
    );
  }

  @test
  async "tracks schema usage"() {
    const testSchema = {
      type: "object",
      properties: {
        "prop-one": {
          type: "integer",
          format: "int32"
        }
      }
    };

    const spec = createTestSpec();

    addSchema(spec, "Input", {
      type: "object",
      properties: {
        arrayProperty: {
          type: "array",
          items: {
            $ref: "#/components/schemas/ElementSchema"
          }
        }
      }
    });
    addSchema(spec, "OutputItem", {
      type: "object",
      properties: {
        dictionaryProperty: {
          properties: {
            foo: {
              $ref: "#/components/schemas/ElementSchema"
            }
          }
        }
      }
    });
    addSchema(spec, "InputOutput", {
      type: "object",
      properties: {
        property: {
          $ref: "#/components/schemas/ObjectProperty"
        }
      }
    });
    addSchema(spec, "ObjectProperty", {
      type: "object",
      properties: {
        foo: {
          type: "string"
        }
      }
    });
    addSchema(spec, "ElementSchema", {
      type: "object",
      properties: {
        foo: {
          type: "string"
        }
      }
    });

    addOperation(spec, "/test", {
      get: {
        description: "An operation.",
        responses: responses(
          response(200, "application/json", {
            type: "array",
            items: {
              $ref: "#/components/schemas/OutputItem"
            }
          }),
          response(202, "application/xml", {
            $ref: "#/components/schemas/InputOutput"
          })
        )
      },
      post: {
        description: "Post it.",
        parameters: [
          {
            name: "inputParam",
            in: "body",
            description: "Input parameter",
            required: true,
            schema: {
              $ref: "#/components/schemas/Input"
            }
          },
          {
            name: "inputOutputParam",
            in: "body",
            description: "Input parameter",
            required: true,
            schema: {
              $ref: "#/components/schemas/InputOutput"
            }
          }
        ]
      }
    });

    const codeModel = await runModeler(spec);

    // Ensure that usage gets propagated to schemas in request parameters
    assertSchema("Input", codeModel.schemas.objects, s => s.usage, ["input"]);

    // Ensure that usage gets propagated to properties in response schemas
    assertSchema("OutputItem", codeModel.schemas.objects, s => s.usage, [
      "output"
    ]);

    // Ensure that usage gets propagated to schemas used in both request and response
    assertSchema(
      "InputOutput",
      codeModel.schemas.objects,
      s => s.usage.sort(),
      ["input", "output"]
    );

    // Ensure that usage gets propagated to schems on object properties
    assertSchema(
      "ObjectProperty",
      codeModel.schemas.objects,
      s => s.usage.sort(),
      ["input", "output"]
    );

    // Ensure that usage gets propagated to schemas used as elements of
    // arrays and dictionary property values
    assertSchema(
      "ElementSchema",
      codeModel.schemas.objects,
      s => s.usage.sort(),
      ["input", "output"]
    );
  }

  @test
  async "allows integer schemas with unexpected 'format'"() {
    const spec = createTestSpec();

    addSchema(spec, "Int16", {
      type: "integer",
      format: "int16"
    });

    addSchema(spec, "Goose", {
      type: "integer",
      format: "goose"
    });

    addSchema(spec, "Int64", {
      type: "integer",
      format: "int64"
    });

    const codeModel = await runModeler(spec);

    assertSchema("Int16", codeModel.schemas.numbers, s => s.precision, 32);
    assertSchema("Goose", codeModel.schemas.numbers, s => s.precision, 32);

    // Make sure a legitimate format is detected correctly
    assertSchema("Int64", codeModel.schemas.numbers, s => s.precision, 64);
  }

  @test
  async "modelAsString=true creates ChoiceSchema for single-value enum"() {
    const spec = createTestSpec();

    addSchema(spec, "ShouldBeConstant", {
      type: "string",
      enum: ["html_strip"]
    });

    addSchema(spec, "ShouldBeChoice", {
      type: "string",
      enum: ["html_strip"],
      "x-ms-enum": {
        modelAsString: true
      }
    });

    const codeModel = await runModeler(spec);

    assertSchema(
      "ShouldBeConstant",
      codeModel.schemas.constants,
      s => s.value.value,
      "html_strip"
    );

    assertSchema(
      "ShouldBeChoice",
      codeModel.schemas.choices,
      s => s.choices[0].value,
      "html_strip"
    );
  }

  @test
  async "propagates 'nullable' to properties, parameters, collections, and responses"() {
    const spec = createTestSpec();

    addSchema(spec, "WannaBeNullable", {
      type: "object",
      nullable: true,
      properties: {
        iIsHere: {
          type: "boolean"
        }
      }
    });

    addSchema(spec, "NotNullable", {
      type: "object",
      nullable: true,
      properties: {
        iIsHere: {
          type: "boolean"
        }
      }
    });

    addSchema(spec, "NullableArrayElement", {
      type: "array",
      items: {
        nullable: true,
        $ref: "#/components/schemas/NotNullable"
      }
    });

    addSchema(spec, "NullableArrayElementSchema", {
      type: "array",
      items: {
        $ref: "#/components/schemas/WannaBeNullable"
      }
    });

    addSchema(spec, "NullableDictionaryElement", {
      additionalProperties: {
        nullable: true,
        $ref: "#/components/schemas/NotNullable"
      }
    });

    addSchema(spec, "NullableDictionaryElementSchema", {
      additionalProperties: {
        $ref: "#/components/schemas/WannaBeNullable"
      }
    });

    addSchema(spec, "NullableProperty", {
      type: "object",
      properties: {
        willBeNullable: {
          $ref: "#/components/schemas/WannaBeNullable"
        }
      }
    });

    addOperation(spec, "/test", {
      post: {
        description: "Post it.",
        parameters: [
          {
            name: "nullableParam",
            in: "body",
            description: "Input parameter",
            required: true,
            schema: {
              $ref: "#/components/schemas/WannaBeNullable"
            }
          }
        ],
        responses: {
          "200": {
            content: {
              "application/json": {
                schema: {
                  type: "string",
                  nullable: true
                }
              }
            }
          }
        }
      }
    });

    const codeModel = await runModeler(spec);

    assertSchema(
      "NullableArrayElement",
      codeModel.schemas.arrays,
      s => s.nullableItems,
      true
    );

    assertSchema(
      "NullableArrayElementSchema",
      codeModel.schemas.arrays,
      s => s.nullableItems,
      true
    );

    assertSchema(
      "NullableDictionaryElement",
      codeModel.schemas.dictionaries,
      s => s.nullableItems,
      true
    );

    assertSchema(
      "NullableDictionaryElementSchema",
      codeModel.schemas.dictionaries,
      s => s.nullableItems,
      true
    );

    assertSchema(
      "NullableProperty",
      codeModel.schemas.objects,
      s => s.properties[0].nullable,
      true
    );

    // $host param comes first then the parameter we're looking for
    const operation = codeModel.operationGroups[0].operations[0];
    const param = operation.parameters![1];

    const response: SchemaResponse = <SchemaResponse>operation.responses![0];
    assert.strictEqual(param.nullable, true);
    assert.strictEqual(response.nullable, true);
  }

  @test
  async "propagates clientDefaultValue from x-ms-client-default"() {
    const spec = createTestSpec();

    addSchema(spec, "HasClientDefault", {
      type: "object",
      nullable: true,
      properties: {
        hasDefaultValue: {
          type: "boolean",
          required: true,
          "x-ms-client-default": true
        }
      }
    });

    addOperation(spec, "/test", {
      post: {
        operationId: "postIt",
        description: "Post it.",
        requestBody: {
          in: "body",
          description: "Input parameter",
          required: true,
          "x-ms-client-default": "Bodied",
          "x-ms-requestBody-name": "defaultedBodyParam",
          content: {
            "application/json": {
              schema: {
                type: "string"
              }
            }
          }
        },
        parameters: [
          {
            name: "defaultedQueryParam",
            in: "query",
            description: "Input parameter",
            "x-ms-client-default": 42,
            schema: {
              type: "number"
            }
          }
        ]
      }
    });

    addOperation(spec, "/memes", {
      post: {
        operationId: "postMeme",
        description: "Gimmie ur memes.",
        requestBody: {
          description: "Input parameter",
          required: true,
          "x-ms-requestBody-name": "defaultedBodyMeme",
          "x-ms-client-default": "meme.jpg",
          content: {
            "image/jpeg": {
              schema: {
                type: "string",
                format: "binary"
              }
            }
          }
        }
      }
    });

    const codeModel = await runModeler(spec);

    assertSchema(
      "HasClientDefault",
      codeModel.schemas.objects,
      s => s.properties[0].clientDefaultValue,
      true
    );

    const postIt = findByName(
      "postIt",
      codeModel.operationGroups[0].operations
    );
    const bodyParam = findByName<Parameter | undefined>(
      "defaultedBodyParam",
      <Parameter[] | undefined>postIt!.requests?.[0].parameters
    );
    assert.strictEqual(bodyParam?.clientDefaultValue, "Bodied");

    const queryParam = findByName("defaultedQueryParam", postIt!.parameters);
    assert.strictEqual(queryParam!.clientDefaultValue, 42);

    const postMeme = findByName(
      "postMeme",
      codeModel.operationGroups[0].operations
    );
    const memeBodyParam = findByName<Parameter | undefined>(
      "defaultedBodyMeme",
      <Parameter[] | undefined>postMeme!.requests?.[0].parameters
    );
    assert.strictEqual(memeBodyParam?.clientDefaultValue, "meme.jpg");
  }

  @test
  async "propagates parameter 'expand' value"() {
    const spec = createTestSpec();

    addOperation(spec, "/test", {
      post: {
        operationId: "getIt",
        description: "Get operation.",
        parameters: [
          {
            name: "explodedParam",
            in: "query",
            style: "form",
            explode: true,
            schema: {
              type: "array",
              items: {
                type: "string"
              }
            }
          },
          {
            name: "nonExplodedParam",
            in: "query",
            style: "form",
            schema: {
              type: "array",
              items: {
                type: "string"
              }
            }
          }
        ]
      }
    });

    const codeModel = await runModeler(spec);

    const getIt = findByName("getIt", codeModel.operationGroups[0].operations);
    const explodedParam = findByName("explodedParam", getIt!.parameters);
    assert.strictEqual(explodedParam!.protocol.http!.explode, true);
    const nonExplodedParam = findByName("nonExplodedParam", getIt!.parameters);
    assert.strictEqual(nonExplodedParam!.protocol.http!.explode, undefined);
  }

  @test
  async "stores header name and description in HttpHeader language field"() {
    const spec = createTestSpec();

    addOperation(spec, "/header", {
      post: {
        operationId: "namedHeaders",
        description: "Operation with named header response.",
        parameters: [],
        responses: responses(
          response(
            200,
            "application/json",
            {
              type: "string"
            },
            "Response with a named header.",
            {
              headers: {
                "x-named-header": {
                  "x-ms-client-name": "NamedHeader",
                  // No description on purpose
                  schema: {
                    type: "string"
                  }
                },
                "x-unnamed-header": {
                  description: "Header with no client name",
                  schema: {
                    type: "string"
                  }
                }
              }
            }
          )
        )
      }
    });

    const codeModel = await runModeler(spec);

    const namedHeaders = findByName(
      "namedHeaders",
      codeModel.operationGroups[0].operations
    );

    const namedHeader = namedHeaders?.responses?.[0].protocol.http!.headers[0];
    assert.strictEqual(namedHeader.language.default.name, "NamedHeader");
    assert.strictEqual(namedHeader.language.default.description, "");

    const unnamedHeader = namedHeaders?.responses?.[0].protocol.http!
      .headers[1];
    assert.strictEqual(unnamedHeader.language.default.name, "x-unnamed-header");
    assert.strictEqual(
      unnamedHeader.language.default.description,
      "Header with no client name"
    );
  }

  @test
  async "x-ms-text extension in xml object will be moved to 'text' property"() {
    const spec = createTestSpec();

    addSchema(spec, "HasOnlyText", {
      type: "object",
      properties: {
        message: {
          type: "string",
          xml: {
            "x-ms-text": true
          }
        }
      }
    });

    const codeModel = await runModeler(spec);

    assertSchema(
      "HasOnlyText",
      codeModel.schemas.objects,
      o => o.properties[0].schema.serialization.xml.text,
      true
    );

    addSchema(spec, "HasTextAndAttribute", {
      type: "object",
      properties: {
        message: {
          type: "string",
          xml: {
            "x-ms-text": true,
            attribute: true
          }
        }
      }
    });

    // Should throw when both 'text' and 'attribute' are true
    await assert.rejects(
      () => runModeler(spec),
      /XML serialization for a schema cannot be in both 'text' and 'attribute'$/
    );
  }

  @test
  async "converts multipart/form-data schema to operation parameters"() {
    const multiPartSchema = {
      type: "object",
      properties: {
        fileContent: {
          type: "string",
          format: "binary"
        },
        fileName: {
          type: "string"
        }
      },
      required: ["fileContent"]
    };

    const spec = createTestSpec();

    addSchema(spec, "MultiPartSchema", {
      type: "object",
      properties: {
        fileContent: {
          type: "string",
          format: "binary"
        },
        fileName: {
          type: "string"
        }
      },
      required: ["fileContent"]
    });

    addOperation(spec, "/upload-file", {
      post: {
        operationId: "uploadFile",
        description: "Upload a file.",
        requestBody: {
          description: "File details",
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                properties: {
                  fileContent: {
                    type: "string",
                    format: "binary"
                  },
                  fileName: {
                    type: "string"
                  }
                },
                required: ["fileContent"]
              }
            }
          }
        },
        responses: responses(
          response(200, "application/json", {
            type: "string"
          })
        )
      }
    });

    const codeModel = await runModeler(spec);

    const uploadFile = findByName(
      "uploadFile",
      codeModel.operationGroups[0].operations
    );

    const fileContentParam = uploadFile?.requests?.[0].parameters?.[0];
    assert.strictEqual(fileContentParam?.language.default.name, "fileContent");
    assert.strictEqual(fileContentParam?.required, true);
    const fileNameParam = uploadFile?.requests?.[0].parameters?.[1];
    assert.strictEqual(fileNameParam?.language.default.name, "fileName");
    assert.strictEqual(fileNameParam?.required, undefined);
  }

  @test
  async "synthesizes accept header based on response media types"() {
    const spec = createTestSpec();

    addOperation(spec, "/accept", {
      post: {
        operationId: "receivesAcceptHeader",
        description: "Receives an Accept header.",
        parameters: [],
        responses: responses(
          response(200, "application/json", {
            type: "string"
          }),
          response(400, "application/xml", {
            type: "string"
          })
        )
      }
    });

    addOperation(spec, "/hasAccept", {
      post: {
        operationId: "hasAcceptHeader",
        description: "Already has an Accept header.",
        parameters: [
          {
            name: "Accept",
            description: "Existing Accept header",
            in: "header",
            required: true,
            schema: {
              type: "string"
            }
          }
        ],
        responses: responses(
          response(200, "application/json", {
            type: "string"
          }),
          response(400, "application/xml", {
            type: "string"
          })
        )
      }
    });

    const codeModel = await runModeler(spec);

    const receivesAcceptHeader = findByName(
      "receivesAcceptHeader",
      codeModel.operationGroups[0].operations
    );

    const acceptParam = receivesAcceptHeader?.requests?.[0].parameters?.[0];
    assert.strictEqual(acceptParam!.language.default.serializedName, "Accept");
    assert.strictEqual(acceptParam!.schema.type, "constant");
    assert.strictEqual(acceptParam!.origin, "modelerfour:synthesized/accept");
    assert.strictEqual(
      (<ConstantSchema>acceptParam!.schema).value.value,
      "application/json, application/xml"
    );

    const hasAcceptHeader = findByName(
      "hasAcceptHeader",
      codeModel.operationGroups[0].operations
    );

    // Make sure that no Accept parameters were added to a request
    assert.strictEqual(hasAcceptHeader!.requests?.length, 1);
    assert.strictEqual(hasAcceptHeader!.requests?.[0].parameters, undefined);

    // Make sure the original Accept parameter is there
    const existingAcceptParam = hasAcceptHeader?.parameters?.[1];
    assert.strictEqual(
      existingAcceptParam!.language.default.serializedName,
      "Accept"
    );
    assert.strictEqual(existingAcceptParam!.origin, undefined);
  }

  @test
  async "always-seal-x-ms-enum configuration produces SealedChoiceSchema for all x-ms-enums"() {
    const spec = createTestSpec();

    addSchema(spec, "ModelAsString", {
      type: "string",
      enum: ["Apple", "Orange"],
      "x-ms-enum": {
        modelAsString: true
      }
    });

    addSchema(spec, "ShouldBeSealed", {
      type: "string",
      enum: ["Apple", "Orange"],
      "x-ms-enum": {
        modelAsString: false
      }
    });

    addSchema(spec, "SingleValueEnum", {
      type: "string",
      enum: ["Apple"],
      "x-ms-enum": {
        modelAsString: false
      }
    });

    const codeModelWithoutSetting = await runModeler(spec, {
      modelerfour: {
        "always-seal-x-ms-enums": false
      }
    });

    assertSchema(
      "ModelAsString",
      codeModelWithoutSetting.schemas.choices,
      s => s.choiceType.type,
      "string"
    );

    assertSchema(
      "ShouldBeSealed",
      codeModelWithoutSetting.schemas.sealedChoices,
      s => s.choiceType.type,
      "string"
    );

    assertSchema(
      "SingleValueEnum",
      codeModelWithoutSetting.schemas.constants,
      s => s.valueType.type,
      "string"
    );

    const codeModelWithSetting = await runModeler(spec, {
      modelerfour: {
        "always-seal-x-ms-enums": true
      }
    });

    assertSchema(
      "ModelAsString",
      codeModelWithSetting.schemas.sealedChoices,
      s => s.choiceType.type,
      "string"
    );

    assertSchema(
      "ShouldBeSealed",
      codeModelWithSetting.schemas.sealedChoices,
      s => s.choiceType.type,
      "string"
    );

    assertSchema(
      "SingleValueEnum",
      codeModelWithSetting.schemas.sealedChoices,
      s => s.choiceType.type,
      "string"
    );
  }

  @test
  async "allows header parameters with 'x-ms-api-version: true' to become full api-version parameters"() {
    const spec = createTestSpec();

    addOperation(spec, "/api-version-header", {
      get: {
        operationId: "apiVersionHeader",
        description: "Has an api-version header.",
        parameters: [
          {
            name: "api-version",
            in: "header",
            required: true,
            "x-ms-api-version": true,
            schema: {
              type: "string"
            }
          }
        ],
        responses: responses(
          response(200, "application/json", {
            type: "string"
          })
        )
      }
    });

    addOperation(spec, "/non-api-version-header", {
      get: {
        operationId: "nonApiVersionHeader",
        description: "Is not an api-version header.",
        parameters: [
          {
            name: "api-version",
            in: "header",
            required: true,
            schema: {
              type: "string"
            }
          }
        ],
        responses: responses(
          response(200, "application/json", {
            type: "string"
          })
        )
      }
    });

    addOperation(spec, "/api-version-query", {
      get: {
        operationId: "apiVersionQuery",
        description: "Has an api-version query param.",
        parameters: [
          {
            name: "api-version",
            in: "query",
            required: true,
            schema: {
              type: "string"
            }
          }
        ],
        responses: responses(
          response(200, "application/json", {
            type: "string"
          })
        )
      }
    });

    addOperation(spec, "/non-api-version-query", {
      get: {
        operationId: "nonApiVersionQuery",
        description:
          "An api-version query param that is explicitly not a client api-version.",
        parameters: [
          {
            name: "api-version",
            in: "query",
            required: true,
            "x-ms-api-version": false,
            schema: {
              type: "string"
            }
          }
        ],
        responses: responses(
          response(200, "application/json", {
            type: "string"
          })
        )
      }
    });

    const codeModel = await runModeler(spec);

    const apiVersionHeader = findByName(
      "apiVersionHeader",
      codeModel.operationGroups[0].operations
    );

    const apiVersionHeaderParam = apiVersionHeader?.parameters?.[1];
    assert.strictEqual(
      apiVersionHeaderParam!.language.default.serializedName,
      "api-version"
    );
    assert.strictEqual(apiVersionHeaderParam!.implementation, "Client");
    assert.strictEqual(
      apiVersionHeaderParam!.origin,
      "modelerfour:synthesized/api-version"
    );

    const nonApiVersionHeader = findByName(
      "nonApiVersionHeader",
      codeModel.operationGroups[0].operations
    );

    const nonApiVersionHeaderParam = nonApiVersionHeader?.parameters?.[1];
    assert.strictEqual(
      nonApiVersionHeaderParam!.language.default.serializedName,
      "api-version"
    );
    assert.strictEqual(nonApiVersionHeaderParam!.implementation, "Method");
    assert.strictEqual(nonApiVersionHeaderParam!.origin, undefined);

    const apiVersionQuery = findByName(
      "apiVersionQuery",
      codeModel.operationGroups[0].operations
    );

    const apiVersionQueryParam = apiVersionQuery?.parameters?.[1];
    assert.strictEqual(
      apiVersionQueryParam!.language.default.serializedName,
      "api-version"
    );
    assert.strictEqual(apiVersionQueryParam!.implementation, "Client");
    assert.strictEqual(
      apiVersionQueryParam!.origin,
      "modelerfour:synthesized/api-version"
    );

    const nonApiVersionQuery = findByName(
      "nonApiVersionQuery",
      codeModel.operationGroups[0].operations
    );

    const nonApiVersionQueryParam = nonApiVersionQuery?.parameters?.[1];
    assert.strictEqual(
      nonApiVersionQueryParam!.language.default.serializedName,
      "api-version"
    );
    assert.strictEqual(nonApiVersionQueryParam!.implementation, "Method");
    assert.strictEqual(nonApiVersionQueryParam!.origin, undefined);
  }

  @test
  async "propagates extensions to response header definitions"() {
    const spec = createTestSpec();

    addOperation(spec, "/headerWithExtension", {
      post: {
        operationId: "hasHeaderWithExtension",
        description: "Has x-ms-header-collection-prefix on header",
        parameters: [],
        responses: responses(
          response(
            200,
            "application/json",
            {
              type: "string"
            },
            "Response with a header extension.",
            {
              headers: {
                "x-named-header": {
                  "x-ms-client-name": "HeaderWithExtension",
                  "x-ms-header-collection-prefix": "x-ms-meta",
                  schema: {
                    type: "string"
                  }
                }
              }
            }
          )
        )
      }
    });

    const codeModel = await runModeler(spec);

    const hasHeaderWithExtension = findByName(
      "hasHeaderWithExtension",
      codeModel.operationGroups[0].operations
    );

    const headerWithExtension = hasHeaderWithExtension?.responses?.[0].protocol
      .http!.headers[0];
    assert.strictEqual(
      headerWithExtension.language.default.name,
      "HeaderWithExtension"
    );
    assert.strictEqual(
      headerWithExtension.extensions["x-ms-header-collection-prefix"],
      "x-ms-meta"
    );
  }

  async "allows text/plain responses when schema type is 'string'"() {
    const spec = createTestSpec();

    addOperation(spec, "/text", {
      post: {
        operationId: "textBody",
        description: "Responds with a plain text string.",
        parameters: [],
        responses: responses(
          response(200, "text/plain", {
            type: "string"
          }),
          response(201, "text/plain; charset=utf-8", {
            type: "string"
          }),
        )
      }
    });

    const codeModel = await runModeler(spec);


    const textBody = findByName(
      "textBody",
      codeModel.operationGroups[0].operations
    );

    const responseNoCharset = textBody?.responses?.[0] as SchemaResponse;
    const responseWithCharset = textBody?.responses?.[1] as SchemaResponse;

    assert.strictEqual(responseNoCharset.protocol.http?.knownMediaType, "text");
    assert.strictEqual(responseNoCharset.schema?.type, "string");
    assert.strictEqual(responseWithCharset.protocol.http?.knownMediaType, "text");
    assert.strictEqual(responseWithCharset.schema?.type, "string");
  }


  @test
  async "ensures unique names for synthesized schemas like ContentType and Accept"() {
    const spec = createTestSpec();

    addOperation(spec, "/accept", {
      post: {
        operationId: "receivesAcceptHeader",
        description: "Receives an Accept header.",
        parameters: [],
        requestBody: {
          description: "File details",
          required: true,
          content: {
            "image/png": {
              schema: {
                type: "string",
                format: "binary"
              }
            },
            "image/tiff": {
              schema: {
                type: "string",
                format: "binary"
              }
            }
          }
        },
        responses: responses(
          response(200, "application/json", {
            type: "string"
          }),
          response(400, "application/xml", {
            type: "string"
          })
        )
      }
    });

    addOperation(spec, "/accept1", {
      post: {
        operationId: "accept1",
        parameters: [],
        requestBody: {
          description: "File details",
          required: true,
          content: {
            "image/png": {
              schema: {
                type: "string",
                format: "binary"
              }
            },
            "image/bmp": {
              schema: {
                type: "string",
                format: "binary"
              }
            }
          }
        },
        responses: responses(
          response(200, "application/json", {
            type: "string"
          }),
          response(400, "text/plain", {
            type: "string"
          })
        )
      }
    });

    const codeModel = await runModeler(spec, {
      modelerfour: {
        "always-create-content-type-parameter": true
      }
    });

    const acceptSchema = findByName(
      "Accept",
      codeModel.schemas.constants
    );
    assert.strictEqual(
      (<ConstantSchema>acceptSchema).value.value,
      "application/json, application/xml"
    );

    const accept1Schema = findByName(
      "Accept1",
      codeModel.schemas.constants
    );
    assert.strictEqual(
      (<ConstantSchema>accept1Schema).value.value,
      "application/json, text/plain"
    );

    const contentTypeSchema = findByName(
      "ContentType",
      codeModel.schemas.sealedChoices
    );
    assert.strictEqual(
      (<SealedChoiceSchema>contentTypeSchema).choices[0].value,
      "image/png"
    );
    assert.strictEqual(
      (<SealedChoiceSchema>contentTypeSchema).choices[1].value,
      "image/tiff"
    );
    const choices = (<SealedChoiceSchema>contentTypeSchema).choices.map(c => c.value).sort();
    assert.deepEqual(choices, ["image/png", "image/tiff"]);

    const contentType1Schema = findByName(
      "ContentType1",
      codeModel.schemas.sealedChoices
    );
    const choices1 = (<SealedChoiceSchema>contentType1Schema).choices.map(c => c.value).sort();
    assert.deepEqual(choices1, ["image/bmp", "image/png"]);
  }
}
