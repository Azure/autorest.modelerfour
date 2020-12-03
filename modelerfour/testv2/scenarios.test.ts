import { createTestSession } from "./helper";
import { ModelerFour } from "../modeler/modelerfour";
import { writeFile, mkdir } from "@azure-tools/async-io";
import { serialize } from "@azure-tools/codegen";
import { Model } from "@azure-tools/openapi";
import { codeModelSchema } from "@azure-tools/codemodel";
import { PreNamer } from "../prenamer/prenamer";
import { Flattener } from "../flattener/flattener";
import { Grouper } from "../grouper/grouper";
import { Checker } from "../checker/checker";

const cfg = {
  "modelerfour": {
    "flatten-models": true,
    "flatten-payloads": true,
    "group-parameters": true,
    "resolve-schema-name-collisons": true,
    "additional-checks": true,
    //'always-create-content-type-parameter': true,
    "naming": {
      override: {
        $host: "$host",
        cmyk: "CMYK",
      },
      local: "_ + camel",
      constantParameter: "pascal",
      /*
        for when playing with python style settings :
        
        parameter: 'snakecase',
        property: 'snakecase',
        operation: 'snakecase',
        operationGroup: 'pascalcase',
        choice: 'pascalcase',
        choiceValue: 'uppercase',
        constant: 'uppercase',
        type: 'pascalcase',
        // */
    },
  },
  "payload-flattening-threshold": 2,
};

describe("Testing rendering specific scenarios", () => {
  it("works", async () => {
    const folder = "head";
    const session = await createTestSession<Model>(
      cfg,
      `${__dirname}/../test/scenarios/${folder}`,
      ["openapi-document.json"],
      [],
    );

    // process OAI model
    const modeler = await new ModelerFour(session).init();

    // go!
    const codeModel = await modeler.process();

    const yaml = serialize(codeModel, codeModelSchema);

    expect(yaml).toMatchSpecificSnapshot("head/modeler.yaml");
  });
});
