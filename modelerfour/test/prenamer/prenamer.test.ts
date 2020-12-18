import { CodeModel, ObjectSchema } from "@azure-tools/codemodel";
import { PreNamer } from "../../src/prenamer/prenamer";
import { createTestSessionFromModel } from "../utils";

const runPrenamer = async (model: CodeModel) => {
  const { session } = await createTestSessionFromModel<CodeModel>({}, model);
  const prenamer = new PreNamer(session);
  return prenamer.process();
};

describe("Prenamer", () => {
  let model: CodeModel;
  beforeEach(() => {
    model = new CodeModel("TestPrenamer");
  });

  describe("Renaming objects", () => {
    it("Remove duplicate consecutive words by default", async () => {
      model.schemas.add(new ObjectSchema("FooBarBar", "Description"));
      const result = await runPrenamer(model);
      expect(result.schemas.objects?.[0].language.default.name).toEqual("FooBar");
    });

    it("Keeps duplicate consecutive words if the new name already exists", async () => {
      model.schemas.add(new ObjectSchema("FooBar", "Description"));
      model.schemas.add(new ObjectSchema("FooBarBar", "Description"));
      const result = await runPrenamer(model);
      expect(result.schemas.objects?.[0].language.default.name).toEqual("FooBar");
      expect(result.schemas.objects?.[1].language.default.name).toEqual("FooBarBar");
    });

    it("Keeps duplicate consecutive words if the new name already exists and still style the word", async () => {
      model.schemas.add(new ObjectSchema("FooBar", "Description"));
      model.schemas.add(new ObjectSchema("fooBAR-Bar", "Description"));
      const result = await runPrenamer(model);
      expect(result.schemas.objects?.[0].language.default.name).toEqual("FooBar");
      expect(result.schemas.objects?.[1].language.default.name).toEqual("FooBarBar");
    });
  });
});
