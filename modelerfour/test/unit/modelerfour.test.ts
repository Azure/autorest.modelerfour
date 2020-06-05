/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from "assert";
import { suite, test } from "mocha-typescript";
import { ModelerFour } from "../../modeler/modelerfour";
import { fail } from "@azure-tools/codegen";
import { startSession } from "@azure-tools/autorest-extension-base";
import { values } from "@azure-tools/linq";
import { CodeModel, Schema, SchemaUsage } from "@azure-tools/codemodel";
import { Model } from "@azure-tools/openapi";
import { codeModelSchema } from "@azure-tools/codemodel";

let modelerErrors: any[] = [];

async function createTestSession(config: any, openApiModel: any) {
  const openApiText = JSON.stringify(openApiModel);
  const ii = [
    {
      model: openApiModel as Model,
      filename: "openapi-3.json",
      content: openApiText
    }
  ];

  return await startSession<Model>(
    {
      ReadFile: async (filename: string): Promise<string> =>
        (
          values(ii).first(each => each.filename === filename) ||
          fail(`missing input '${filename}'`)
        ).content,
      GetValue: async (key: string): Promise<any> => {
        if (!key) {
          return config;
        }
        return config[key];
      },
      ListInputs: async (artifactType?: string): Promise<Array<string>> =>
        ii.map(each => each.filename),

      ProtectFiles: async (path: string): Promise<void> => {
        // test
      },
      WriteFile: (
        filename: string,
        content: string,
        sourceMap?: any,
        artifactType?: string
      ): void => {
        // test
      },
      Message: (message: any): void => {
        // test
        if (
          message.Channel === "warning" ||
          message.Channel === "error" ||
          message.Channel === "verbose"
        ) {
          if (message.Channel === "error") {
            modelerErrors.push(message);
          }
        }
      },
      UpdateConfigurationFile: (filename: string, content: string): void => {
        // test
      },
      GetConfigurationFile: async (filename: string): Promise<string> => ""
    },
    {},
    codeModelSchema
  );
}

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

export type TestSpecCustomizer = (spec: any) => any;

const InitialTestSpec = {
  info: {
    title: "Test OpenAPI 3 Specification",
    description: "A test document",
    contact: {
      name: "Microsoft Corporation",
      url: "https://microsoft.com",
      email: "devnull@microsoft.com"
    },
    license: "MIT",
    version: "1.0"
  },
  paths: {},
  components: {
    schemas: {}
  }
};

function createTestSpec(...customizers: TestSpecCustomizer[]): any {
  return customizers.reduce<any>(
    (spec: any, customizer: TestSpecCustomizer) => {
      return customizer(spec);
    },
    { ...InitialTestSpec } // Don't modify the original
  );
}

function addOperation(
  spec: any,
  path: string,
  operationDict: any,
  metadata: any = { apiVersions: ["1.0.0"] }
): void {
  operationDict = { ...operationDict, ...{ "x-ms-metadata": metadata } };
  spec.paths[path] = operationDict;
}

function addSchema(
  spec: any,
  name: string,
  schemaDict: any,
  metadata: any = { apiVersions: ["1.0.0"] }
): void {
  schemaDict = { ...schemaDict, ...{ "x-ms-metadata": metadata } };
  spec.components.schemas[name] = schemaDict;
}

async function runModeler(spec: any): Promise<CodeModel> {
  modelerErrors = [];
  const session = await createTestSession(cfg, spec);
  const modeler = await new ModelerFour(session).init();

  assert.equal(modelerErrors.length, 0);

  return modeler.process();
}

function response(
  code: number | "default",
  contentType: string,
  schema: any,
  description: string = "The response."
) {
  return {
    [code]: {
      description,
      content: {
        [contentType]: {
          schema
        }
      }
    }
  };
}

function responses(...responses: any[]) {
  return responses.reduce(
    (responsesDict, response) => Object.assign(responsesDict, response),
    {}
  );
}

function properties(...properties: any[]) {
  // TODO: Accept string or property object
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
    const schema = schemaList.find(s => s.language.default.name === schemaName);
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
  async "propagates 'nullable' to properties, parameters, and collections"() {
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

    addSchema(spec, "NullableArray", {
      type: "array",
      items: {
        $ref: "#/components/schemas/WannaBeNullable"
      }
    });

    addSchema(spec, "NullableDictionary", {
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
        ]
      }
    });

    const codeModel = await runModeler(spec);

    assertSchema(
      "NullableArray",
      codeModel.schemas.arrays,
      s => s.nullableItems,
      true
    );

    assertSchema(
      "NullableDictionary",
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
    const param = codeModel.operationGroups[0].operations[0].parameters?.[1];
    assert.strictEqual(param?.nullable, true);
  }
}
