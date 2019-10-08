/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { suite, test } from 'mocha-typescript';
import * as assert from 'assert';
import { ModelerFour } from '../modelerfour';
import { readFile, writeFile, readdir, mkdir } from '@azure-tools/async-io';
import { deserialize, serialize, fail } from '@azure-tools/codegen';
import { startSession } from '@azure-tools/autorest-extension-base';
import { values } from '@azure-tools/linq';
import { CodeModel } from '@azure-tools/codemodel';
import { Model } from '@azure-tools/openapi';
import { codeModelSchema } from '@azure-tools/codemodel';
import { ReadUri } from '@azure-tools/uri';


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
    const folders = await readdir(`${__dirname}/../../test/inputs/`);
    for (const each of folders) {
      if ([
        'body-file',
        'body-formdata',
        'lro',
        'storage',
        'xml-service',
        'datalake-storage',
      ].indexOf(each) > -1) {
        console.log(`Skipping: ${each}`);
        continue;
      }
      console.log(`Processing: ${each}`);
      const session = await createTestSession<Model>({}, `${__dirname}/../../test/inputs/${each}`, ['openapi-document.json'], []);

      // process OAI model
      const modeler = new ModelerFour(session);

      // go!
      const codeModel = await modeler.process();

      // console.log(serialize(codeModel))
      const yaml = serialize(codeModel, codeModelSchema);
      await mkdir(`${__dirname}/../../test/outputs/${each}`);

      await (writeFile(`${__dirname}/../../test/outputs/${each}/code-model-v4.yaml`, yaml));
    }
  }
}