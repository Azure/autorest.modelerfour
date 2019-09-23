/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { deserialize, serialize } from '@azure-tools/codegen';
import { Host, startSession } from '@azure-tools/autorest-extension-base';
import * as OpenAPI from '@azure-tools/openapi';
import { ModelerFour } from './modelerfour';
import { codeModelSchema } from '@azure-tools/codemodel';


export async function processRequest(host: Host) {
  const debug = await host.GetValue('debug') || false;

  try {
    const session = await startSession<OpenAPI.Model>(host);

    // process
    const modeler = new ModelerFour(session);

    // go!
    const codeModel = modeler.process();

    // output the model to the pipeline
    host.WriteFile('code-model-v4.yaml', serialize(codeModel, codeModelSchema), undefined, 'code-model-v4');

  } catch (E) {
    if (debug) {
      console.error(`${__filename} - FAILURE  ${JSON.stringify(E)} ${E.stack}`);
    }
    throw E;
  }
}
