import { fail } from "@azure-tools/codegen";
import { startSession } from "@azure-tools/autorest-extension-base";
import { values, clone } from "@azure-tools/linq";
import { Model } from "@azure-tools/openapi";
import { codeModelSchema } from "@azure-tools/codemodel";

export async function createTestSession(
  config: any,
  openApiModel: any,
  messageList: any[]
) {
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
            messageList.push(message);
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

export function response(
  code: number | "default",
  contentType: string,
  schema: any,
  description: string = "The response.",
  extraProperties?: any
) {
  return {
    [code]: {
      description,
      content: {
        [contentType]: {
          schema
        }
      },
      ...extraProperties
    }
  };
}

export function responses(...responses: any[]) {
  return responses.reduce(
    (responsesDict, response) => Object.assign(responsesDict, response),
    {}
  );
}

export function properties(...properties: any[]) {
  // TODO: Accept string or property object
}

export const InitialTestSpec = {
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

export type TestSpecCustomizer = (spec: any) => any;

export function createTestSpec(...customizers: TestSpecCustomizer[]): any {
  return customizers.reduce<any>(
    (spec: any, customizer: TestSpecCustomizer) => {
      return customizer(spec);
    },
    clone(InitialTestSpec)
  );
}

export function addOperation(
  spec: any,
  path: string,
  operationDict: any,
  metadata: any = { apiVersions: ["1.0.0"] }
): void {
  operationDict = { ...operationDict, ...{ "x-ms-metadata": metadata } };
  spec.paths[path] = operationDict;
}

export function addSchema(
  spec: any,
  name: string,
  schemaDict: any,
  metadata: any = { apiVersions: ["1.0.0"] }
): void {
  schemaDict = { ...schemaDict, ...{ "x-ms-metadata": metadata } };
  spec.components.schemas[name] = schemaDict;
}
