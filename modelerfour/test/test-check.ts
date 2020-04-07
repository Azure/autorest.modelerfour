/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { suite, test } from 'mocha-typescript';
import * as assert from 'assert';
import { readFile, readdir, isDirectory } from '@azure-tools/async-io';
import { deserialize, fail, serialize } from '@azure-tools/codegen';
import { startSession, Message, Channel } from '@azure-tools/autorest-extension-base';
import { values, keys, length } from '@azure-tools/linq';
import { Model } from '@azure-tools/openapi';
import chalk from 'chalk';
import { QualityPreChecker } from '../quality-precheck/prechecker';

require('source-map-support').install();

function addStyle(style: string, text: string): string {
  return `▌PUSH:${style}▐${text}▌POP▐`;
}
function compileStyledText(text: string): string {
  const styleStack = ['(x => x)'];
  let result = '';
  let consumedUpTo = 0;
  const appendPart = (end: number) => {
    const CHALK = chalk;
    result += eval(styleStack[styleStack.length - 1])(text.slice(consumedUpTo, end));
    consumedUpTo = end;
  };

  const commandRegex = /▌(.+?)▐/g;
  let i: RegExpExecArray | null;
  // eslint-disable-next-line no-cond-assign
  while (i = commandRegex.exec(text)) {
    const startIndex = i.index;
    const length = i[0].length;
    const command = i[1].split(':');

    // append up to here with current style
    appendPart(startIndex);

    // process command
    consumedUpTo += length;
    switch (command[0]) {
      case 'PUSH':
        styleStack.push('CHALK.' + command[1]);
        break;
      case 'POP':
        styleStack.pop();
        break;
    }
  }
  appendPart(text.length);
  return result;
}

export function color(text: string): string {
  return compileStyledText(text.
    replace(/\*\*(.*?)\*\*/gm, addStyle('bold', '$1')).
    replace(/(\[.*?s\])/gm, addStyle('yellow.bold', '$1')).
    replace(/^# (.*)/gm, addStyle('greenBright', '$1')).
    replace(/^## (.*)/gm, addStyle('green', '$1')).
    replace(/^### (.*)/gm, addStyle('cyanBright', '$1')).
    replace(/(https?:\/\/\S*)/gmi, addStyle('blue.bold.underline', '$1')).
    replace(/__(.*)__/gm, addStyle('italic', '$1')).
    replace(/^>(.*)/gm, addStyle('cyan', '  $1')).
    replace(/^!(.*)/gm, addStyle('red.bold', '  $1')).
    replace(/^(ERROR) (.*?):?(.*)/gmi, `${addStyle('red.bold', '$1')} ${addStyle('green', '$2')}:$3`).
    replace(/^(WARNING) (.*?):?(.*)/gmi, `${addStyle('yellow.bold', '$1')} ${addStyle('green', '$2')}:$3`).
    replace(/^(\s* - \w*:\/\/\S*):(\d*):(\d*) (.*)/gm, `${addStyle('cyan', '$1')}:${addStyle('cyan.bold', '$2')}:${addStyle('cyan.bold', '$3')} $4`).
    replace(/`(.+?)`/gm, addStyle('gray', '$1')).
    replace(/"(.*?)"/gm, addStyle('gray', '"$1"')).
    replace(/'(.*?)'/gm, addStyle('gray', '\'$1\'')));
}
(<any>global).color = color;

let unexpectedErrorCount = 0;

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


async function createTestSession<TInputModel>(config: any, folder: string, inputs: Array<string>, outputs: Array<string>) {
  const filesInFolder = await readData(folder, ...inputs);

  const expected = <any>deserialize((values(filesInFolder).first(each => each.filename === 'expected.yaml') || fail(`missing test file 'expected.yaml' in ${folder}`)).content, 'expected.yaml')
  const unexpected = <any>{};

  return {
    session: await startSession<TInputModel>({
      ReadFile: async (filename: string): Promise<string> => (values(filesInFolder).first(each => each.filename === filename) || fail(`missing input '${filename}'`)).content,
      GetValue: async (key: string): Promise<any> => {
        if (!key) {
          return config;
        }
        return config[key];
      },
      ListInputs: async (artifactType?: string): Promise<Array<string>> => filesInFolder.map(each => each.filename),

      ProtectFiles: async (path: string): Promise<void> => {
        // test 
      },
      WriteFile: (filename: string, content: string, sourceMap?: any, artifactType?: string): void => {
        // test 
      },
      Message: (message: Message): void => {
        const i = expected[message.Channel].indexOf(message.Text.trim());

        if (i > -1) {
          // expected message found. remove it 
          expected[message.Channel].splice(i, 1);
          if (expected[message.Channel].length === 0) {
            delete expected[message.Channel];
          }
          return;
        }

        unexpectedErrorCount++;
        unexpected[message.Channel] = unexpected[message.Channel] || new Array<string>();

        unexpected[message.Channel].push(message.Text);
      },
      UpdateConfigurationFile: (filename: string, content: string): void => {
        // test 
      },
      GetConfigurationFile: async (filename: string): Promise<string> => '',
    }),
    expected,
    unexpected
  };
}

@suite class Process {
  // to generate the oai3 doc from an oai2 input:
  // autorest --pipeline-model:v3 --input-file:./oai2.loaded.json --output-folder:. --verbose --debug --no-network-check ../test-configuration.md

  @test async 'error-checks'() {
    const folders = await readdir(`${__dirname}/../../test/errors/`);
    for (const each of folders) {
      const folder = `${__dirname}/../../test/errors/${each}`;

      if (! await isDirectory(folder)) {
        continue;
      }
      console.log(`Expecting Errors From: ${folder}`);

      const cfg = {
        modelerfour: {
        }
      }

      const { session, expected, unexpected } = await createTestSession<Model>(cfg, folder, ['openapi-document.json', 'expected.yaml'], []);

      // process OAI model
      const prechecker = await new QualityPreChecker(session).init();

      // go!
      await prechecker.process();

      console.error(``);
      assert(unexpectedErrorCount === 0, `Unexpected messages encountered -- these should be in the 'unexpected.yaml' file:\n\n=========\n\n${serialize(unexpected)}\n\n=========`);

      assert(length(expected) === 0, `Did not hit expected messages -- the following are present in the 'expected.yaml' file, but not hit: \n\n=========\n\n${serialize(expected)}\n\n=========`);
    }
  }
}