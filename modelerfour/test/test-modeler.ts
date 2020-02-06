/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { suite, test } from 'mocha-typescript';
import * as assert from 'assert';
import { ModelerFour } from '../modeler/modelerfour';
import { readFile, writeFile, readdir, mkdir } from '@azure-tools/async-io';
import { deserialize, serialize, fail } from '@azure-tools/codegen';
import { startSession } from '@azure-tools/autorest-extension-base';
import { values } from '@azure-tools/linq';
import { CodeModel } from '@azure-tools/codemodel';
import { Model } from '@azure-tools/openapi';
import { codeModelSchema } from '@azure-tools/codemodel';
import { ReadUri } from '@azure-tools/uri';
import { PreNamer } from '../prenamer/prenamer';
import { Flattener } from '../flattener/flattener';
import { Grouper } from '../grouper/grouper';


require('source-map-support').install();


const resources = `${__dirname}/../../test/resources/process`;

async function readData(folder: string, ...files: Array<string>): Promise<Array<{ model: any; filename: string; content: string }>> {
  const results = [];
  for (const filename of files) {
    const content = await readFile(`${folder}/${filename}`);
    const model = deserialize<any>(content, filename);
    results.push({
      model,
      filename,
      content
    });
  }
  return results;
}

async function cts<TInputModel>(config: any, filename: string, content: string) {
  const ii = [{
    model: deserialize<any>(content, filename),
    filename,
    content
  }];

  return await startSession<TInputModel>({
    ReadFile: async (filename: string): Promise<string> => (values(ii).first(each => each.filename === filename) || fail(`missing input '${filename}'`)).content,
    GetValue: async (key: string): Promise<any> => {
      if (!key) {
        return config;
      }
      return config[key];
    },
    ListInputs: async (artifactType?: string): Promise<Array<string>> => ii.map(each => each.filename),

    ProtectFiles: async (path: string): Promise<void> => {
      // test 
    },
    WriteFile: (filename: string, content: string, sourceMap?: any, artifactType?: string): void => {
      // test 
    },
    Message: (message: any): void => {
      // test 
      console.error(message);
    },
    UpdateConfigurationFile: (filename: string, content: string): void => {
      // test 
    },
    GetConfigurationFile: async (filename: string): Promise<string> => '',
  });
}

async function createTestSession<TInputModel>(config: any, folder: string, inputs: Array<string>, outputs: Array<string>) {
  const ii = await readData(folder, ...inputs);
  const oo = await readData(folder, ...outputs);

  return await startSession<TInputModel>({
    ReadFile: async (filename: string): Promise<string> => (values(ii).first(each => each.filename === filename) || fail(`missing input '${filename}'`)).content,
    GetValue: async (key: string): Promise<any> => {
      if (!key) {
        return config;
      }
      return config[key];
    },
    ListInputs: async (artifactType?: string): Promise<Array<string>> => ii.map(each => each.filename),

    ProtectFiles: async (path: string): Promise<void> => {
      // test 
    },
    WriteFile: (filename: string, content: string, sourceMap?: any, artifactType?: string): void => {
      // test 
    },
    Message: (message: any): void => {
      // test 
      console.error(message);
    },
    UpdateConfigurationFile: (filename: string, content: string): void => {
      // test 
    },
    GetConfigurationFile: async (filename: string): Promise<string> => '',
  });
}

async function createPassThruSession(config: any, input: string, inputArtifactType: string) {
  return await startSession<CodeModel>({
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
      console.error(message);
    },
    UpdateConfigurationFile: (filename: string, content: string): void => {
      // test 
    },
    GetConfigurationFile: async (filename: string): Promise<string> => '',
  }, {}, codeModelSchema);
}

@suite class Process {
  @test async 'simple model test'() {
    const session = await createTestSession<Model>({}, resources, ['input2.yaml'], ['output1.yaml']);

    // process OAI model
    const modeler = new ModelerFour(session);

    // go!
    const codeModel = await modeler.process();

    // console.log(serialize(codeModel))
    const yaml = serialize(codeModel, codeModelSchema);

    //await (writeFile(`${__dirname}/../../output.yaml`, yaml));

    const cms = deserialize<CodeModel>(yaml, 'foo.yaml', codeModelSchema);

    assert.strictEqual(true, cms instanceof CodeModel, 'Type Info is maintained in deserialization.');
  }

  @test async 'acceptance-suite'() {
    const folders = await readdir(`${__dirname}/../../test/scenarios/`);
    for (const each of folders) {
      if ([
        'body-formdata',
        'body-formdata-urlencoded',
      ].indexOf(each) > -1) {
        console.log(`Skipping: ${each}`);
        continue;
      }
      /* if ('body-complex' !== each) {
        console.log(`Skipping: ${each}`);
        continue;
      } */
      console.log(`Processing: ${each}`);

      const cfg = {
        modelerfour: {
          'flatten-models': true,
          'flatten-payloads': true,
          'group-parameters': true,
          'resolve-schema-name-collisons': true,
          naming: {
            override: {
              '$host': '$host',
              'cmyk': 'CMYK'
            },
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
            */
          }
        },
        'payload-flattening-threshold': 2
      }

      const session = await createTestSession<Model>(cfg, `${__dirname}/../../test/scenarios/${each}`, ['openapi-document.json'], []);

      // process OAI model
      const modeler = await new ModelerFour(session).init();

      // go!
      const codeModel = await modeler.process();

      const yaml = serialize(codeModel, codeModelSchema);
      await mkdir(`${__dirname}/../../test/scenarios/${each}`);
      await (writeFile(`${__dirname}/../../test/scenarios/${each}/modeler.yaml`, yaml));


      const flattener = await new Flattener(await createPassThruSession(cfg, yaml, 'code-model-v4')).init();
      const flattened = await flattener.process();
      const flatteneyaml = serialize(flattened, codeModelSchema);
      await (writeFile(`${__dirname}/../../test/scenarios/${each}/flattened.yaml`, flatteneyaml));

      const grouper = await new Grouper(await createPassThruSession(cfg, flatteneyaml, 'code-model-v4')).init();
      const grouped = await grouper.process();
      const groupedYaml = serialize(grouped, codeModelSchema);
      await (writeFile(`${__dirname}/../../test/scenarios/${each}/grouped.yaml`, groupedYaml));

      const namer = await new PreNamer(await createPassThruSession(cfg, groupedYaml, 'code-model-v4')).init();
      const named = await namer.process();
      const namedyaml = serialize(named, codeModelSchema);
      await (writeFile(`${__dirname}/../../test/scenarios/${each}/namer.yaml`, namedyaml));


    }
  }
}