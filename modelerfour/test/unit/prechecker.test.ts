import * as assert from "assert";
import { suite, test } from "mocha-typescript";
import { QualityPreChecker } from "../../quality-precheck/prechecker";
import {
  Model,
  Refable,
  Dereferenced,
  dereference,
  Schema,
  PropertyDetails,
  JsonType,
  StringFormat,
} from "@azure-tools/openapi";
import {
  createTestSession,
  createTestSpec,
  addSchema,
  addOperation,
  response,
  InitialTestSpec,
  responses,
} from "./unitTestUtil";

class PreCheckerClient {
  private constructor(private input: Model, public result: Model) {}

  resolve<T>(item: Refable<T>): Dereferenced<T> {
    return dereference(this.input, item);
  }

  static async create(spec: any): Promise<PreCheckerClient> {
    const precheckerErrors: Array<any> = [];
    const session = await createTestSession({}, spec, precheckerErrors);
    const prechecker = await new QualityPreChecker(session).init();

    const client = new PreCheckerClient(prechecker.input, prechecker.process());

    assert.equal(precheckerErrors.length, 0);

    return client;
  }
}

@suite
class PreChecker {
  @test
  async "removes empty object schemas from allOf list when other parents are present"() {
    const spec = createTestSpec();

    addSchema(spec, "ParentSchema", {
      type: "object",
      nullable: true,
      properties: {
        hack: {
          type: "boolean",
        },
      },
    });

    addSchema(spec, "ChildSchema", {
      type: "object",
      allOf: [{ type: "object" }, { $ref: "#/components/schemas/ParentSchema" }],
      properties: {
        childOfHack: {
          type: "integer",
        },
      },
    });

    const client = await PreCheckerClient.create(spec);
    const model = client.result;

    const childSchemaRef = model.components?.schemas && model.components?.schemas["ChildSchema"];
    if (childSchemaRef) {
      const childSchema = client.resolve<Schema>(childSchemaRef);
      assert.strictEqual(childSchema.instance.allOf?.length, 1);
      const parent = client.resolve(childSchema.instance.allOf && childSchema.instance.allOf[0]);
      assert.strictEqual(parent.name, "ParentSchema");
    } else {
      assert.fail("No 'ChildSchema' found!");
    }
  }
}
