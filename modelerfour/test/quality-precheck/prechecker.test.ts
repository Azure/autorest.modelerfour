import { addSchema, createTestSessionFromModel, createTestSpec } from "../utils";
import { QualityPreChecker } from "../../src/quality-precheck/prechecker";
import { Model, Refable, Dereferenced, dereference, Schema } from "@azure-tools/openapi";

class PreCheckerClient {
  private constructor(private input: Model, public result: Model) {}

  resolve<T>(item: Refable<T>): Dereferenced<T> {
    return dereference(this.input, item);
  }

  static async create(spec: Model): Promise<PreCheckerClient> {
    const { session, errors } = await createTestSessionFromModel<Model>({}, spec);
    const prechecker = await new QualityPreChecker(session).init();
    expect(errors.length).toBe(0);

    return new PreCheckerClient(prechecker.input, prechecker.process());
  }
}

describe("Prechecker", () => {
  it("removes empty object schemas from allOf list when other parents are present", async () => {
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
      expect(childSchema.instance.allOf?.length).toEqual(1);
      const parent = client.resolve(childSchema.instance.allOf && childSchema.instance.allOf[0]);
      expect(parent.name).toEqual("ParentSchema");
    } else {
      fail("No 'ChildSchema' found!");
    }
  });
});
