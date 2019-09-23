/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AutoRestExtension, } from '@azure-tools/autorest-extension-base';
import { processRequest as modelerfour } from './plugin-modelerfour';

export async function initializePlugins(pluginHost: AutoRestExtension) {
  // add modelerfour plugin
  pluginHost.Add('modelerfour', modelerfour);
}
