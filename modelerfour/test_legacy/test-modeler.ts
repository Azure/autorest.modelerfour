/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
// eslint-disable-next-line @typescript-eslint/ban-ts-ignore
// @ts-ignore
// Keeping this file for tracking only for now.

import { suite, test } from "mocha-typescript";
import * as assert from "assert";
import { ModelerFour } from "../modeler/modelerfour";
import { readFile, writeFile, readdir, mkdir } from "@azure-tools/async-io";
import { deserialize, serialize, fail } from "@azure-tools/codegen";
import { startSession } from "@azure-tools/autorest-extension-base";
import { values } from "@azure-tools/linq";
import { CodeModel } from "@azure-tools/codemodel";
import { Model } from "@azure-tools/openapi";
import { codeModelSchema } from "@azure-tools/codemodel";
import { ReadUri } from "@azure-tools/uri";
import { PreNamer } from "../prenamer/prenamer";
import { Flattener } from "../flattener/flattener";
import { Grouper } from "../grouper/grouper";
import { Checker } from "../checker/checker";
import chalk from "chalk";

require("source-map-support").install();

function addStyle(style: string, text: string): string {
  return `▌PUSH:${style}▐${text}▌POP▐`;
}
function compileStyledText(text: string): string {
  const styleStack = ["(x => x)"];
  let result = "";
  let consumedUpTo = 0;
  const appendPart = (end: number) => {
    const CHALK = chalk;
    result += eval(styleStack[styleStack.length - 1])(text.slice(consumedUpTo, end));
    consumedUpTo = end;
  };

  const commandRegex = /▌(.+?)▐/g;
  let i: RegExpExecArray | null;
  // eslint-disable-next-line no-cond-assign
  while ((i = commandRegex.exec(text))) {
    const startIndex = i.index;
    const length = i[0].length;
    const command = i[1].split(":");

    // append up to here with current style
    appendPart(startIndex);

    // process command
    consumedUpTo += length;
    switch (command[0]) {
      case "PUSH":
        styleStack.push("CHALK." + command[1]);
        break;
      case "POP":
        styleStack.pop();
        break;
    }
  }
  appendPart(text.length);
  return result;
}

export function color(text: string): string {
  return compileStyledText(
    text
      .replace(/\*\*(.*?)\*\*/gm, addStyle("bold", "$1"))
      .replace(/(\[.*?s\])/gm, addStyle("yellow.bold", "$1"))
      .replace(/^# (.*)/gm, addStyle("greenBright", "$1"))
      .replace(/^## (.*)/gm, addStyle("green", "$1"))
      .replace(/^### (.*)/gm, addStyle("cyanBright", "$1"))
      .replace(/(https?:\/\/\S*)/gim, addStyle("blue.bold.underline", "$1"))
      .replace(/__(.*)__/gm, addStyle("italic", "$1"))
      .replace(/^>(.*)/gm, addStyle("cyan", "  $1"))
      .replace(/^!(.*)/gm, addStyle("red.bold", "  $1"))
      .replace(/^(ERROR) (.*?):?(.*)/gim, `${addStyle("red.bold", "$1")} ${addStyle("green", "$2")}:$3`)
      .replace(/^(WARNING) (.*?):?(.*)/gim, `${addStyle("yellow.bold", "$1")} ${addStyle("green", "$2")}:$3`)
      .replace(
        /^(\s* - \w*:\/\/\S*):(\d*):(\d*) (.*)/gm,
        `${addStyle("cyan", "$1")}:${addStyle("cyan.bold", "$2")}:${addStyle("cyan.bold", "$3")} $4`,
      )
      .replace(/`(.+?)`/gm, addStyle("gray", "$1"))
      .replace(/"(.*?)"/gm, addStyle("gray", '"$1"'))
      .replace(/'(.*?)'/gm, addStyle("gray", "'$1'")),
  );
}
(<any>global).color = color;

let errorCount = 0;

const resources = `${__dirname}/../../test/resources/process`;

async function readData(
  folder: string,
  ...files: Array<string>
): Promise<Array<{ model: any; filename: string; content: string }>> {
  const results = [];
  for (const filename of files) {
    const content = await readFile(`${folder}/${filename}`);
    const model = deserialize<any>(content, filename);
    results.push({
      model,
      filename,
      content,
    });
  }
  return results;
}

async function cts<TInputModel>(config: any, filename: string, content: string) {
  const ii = [
    {
      model: deserialize<any>(content, filename),
      filename,
      content,
    },
  ];

  return await startSession<TInputModel>({
    ReadFile: async (filename: string): Promise<string> =>
      (values(ii).first((each) => each.filename === filename) || fail(`missing input '${filename}'`)).content,
    GetValue: async (key: string): Promise<any> => {
      if (!key) {
        return config;
      }
      return config[key];
    },
    ListInputs: async (artifactType?: string): Promise<Array<string>> => ii.map((each) => each.filename),

    ProtectFiles: async (path: string): Promise<void> => {
      // test
    },
    WriteFile: (filename: string, content: string, sourceMap?: any, artifactType?: string): void => {
      // test
    },
    Message: (message: any): void => {
      // test
      if (message.Channel === "warning" || message.Channel === "error" || message.Channel === "verbose") {
        if (message.Channel === "error") {
          errorCount++;
        }
        console.error(color(`${message.Channel} ${message.Text}`));
      }
    },
    UpdateConfigurationFile: (filename: string, content: string): void => {
      // test
    },
    GetConfigurationFile: async (filename: string): Promise<string> => "",
  });
}

async function createTestSession<TInputModel>(
  config: any,
  folder: string,
  inputs: Array<string>,
  outputs: Array<string>,
) {
  const ii = await readData(folder, ...inputs);
  const oo = await readData(folder, ...outputs);

  return await startSession<TInputModel>({
    ReadFile: async (filename: string): Promise<string> =>
      (values(ii).first((each) => each.filename === filename) || fail(`missing input '${filename}'`)).content,
    GetValue: async (key: string): Promise<any> => {
      if (!key) {
        return config;
      }
      return config[key];
    },
    ListInputs: async (artifactType?: string): Promise<Array<string>> => ii.map((each) => each.filename),

    ProtectFiles: async (path: string): Promise<void> => {
      // test
    },
    WriteFile: (filename: string, content: string, sourceMap?: any, artifactType?: string): void => {
      // test
    },
    Message: (message: any): void => {
      // test
      if (message.Channel === "warning" || message.Channel === "error" || message.Channel === "verbose") {
        if (message.Channel === "error") {
          errorCount++;
        }
        console.error(color(`${message.Channel} ${message.Text}`));
      }
    },
    UpdateConfigurationFile: (filename: string, content: string): void => {
      // test
    },
    GetConfigurationFile: async (filename: string): Promise<string> => "",
  });
}

async function createPassThruSession(config: any, input: string, inputArtifactType: string) {
  return await startSession<CodeModel>(
    {
      ReadFile: async (filename: string): Promise<string> => input,
      GetValue: async (key: string): Promise<any> => {
        if (!key) {
          return config;
        }
        return config[key];
      },
      ListInputs: async (artifactType?: string): Promise<Array<string>> => [inputArtifactType],

      ProtectFiles: async (path: string): Promise<void> => {
        // test
      },
      WriteFile: (filename: string, content: string, sourceMap?: any, artifactType?: string): void => {
        // test
      },
      Message: (message: any): void => {
        // test
        if (message.Channel === "warning" || message.Channel === "error" || message.Channel === "verbose") {
          if (message.Channel === "error") {
            errorCount++;
          }
          console.error(color(`${message.Channel} ${message.Text}`));
        }
      },
      UpdateConfigurationFile: (filename: string, content: string): void => {
        // test
      },
      GetConfigurationFile: async (filename: string): Promise<string> => "",
    },
    {},
    codeModelSchema,
  );
}

@suite
class Process {
  @test
  async "simple model test"() {
    const session = await createTestSession<Model>({}, resources, ["input2.yaml"], ["output1.yaml"]);

    // process OAI model
    const modeler = await new ModelerFour(session).init();

    // go!
    const codeModel = await modeler.process();

    // console.log(serialize(codeModel))
    const yaml = serialize(codeModel, codeModelSchema);

    //await (writeFile(`${__dirname}/../../output.yaml`, yaml));

    const cms = deserialize<CodeModel>(yaml, "foo.yaml", codeModelSchema);

    assert.strictEqual(true, cms instanceof CodeModel, "Type Info is maintained in deserialization.");
  }

  @test
  async "acceptance-suite"() {
    const folders = await readdir(`${__dirname}/../../test/scenarios/`);
    for (const each of folders) {
      console.log(`Processing: ${each}`);

      const cfg = {
        "modelerfour": {
          "flatten-models": true,
          "flatten-payloads": true,
          "group-parameters": true,
          "resolve-schema-name-collisons": true,
          "additional-checks": true,
          "always-create-accept-parameter": true,
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

      const session = await createTestSession<Model>(
        cfg,
        `${__dirname}/../../test/scenarios/${each}`,
        ["openapi-document.json"],
        [],
      );

      // process OAI model
      const modeler = await new ModelerFour(session).init();

      // go!
      const codeModel = await modeler.process();

      const yaml = serialize(codeModel, codeModelSchema);
      await mkdir(`${__dirname}/../../test/scenarios/${each}`);
      await writeFile(`${__dirname}/../../test/scenarios/${each}/modeler.yaml`, yaml);

      const flattener = await new Flattener(await createPassThruSession(cfg, yaml, "code-model-v4")).init();
      const flattened = await flattener.process();
      const flatteneyaml = serialize(flattened, codeModelSchema);
      await writeFile(`${__dirname}/../../test/scenarios/${each}/flattened.yaml`, flatteneyaml);

      const grouper = await new Grouper(await createPassThruSession(cfg, flatteneyaml, "code-model-v4")).init();
      const grouped = await grouper.process();
      const groupedYaml = serialize(grouped, codeModelSchema);
      await writeFile(`${__dirname}/../../test/scenarios/${each}/grouped.yaml`, groupedYaml);

      const namer = await new PreNamer(await createPassThruSession(cfg, groupedYaml, "code-model-v4")).init();
      const named = await namer.process();
      const namedyaml = serialize(named, codeModelSchema);
      await writeFile(`${__dirname}/../../test/scenarios/${each}/namer.yaml`, namedyaml);

      const checker = await new Checker(await createPassThruSession(cfg, namedyaml, "code-model-v4")).init();
      await checker.process();

      assert(errorCount === 0, "Errors Encountered");
    }
  }
}
