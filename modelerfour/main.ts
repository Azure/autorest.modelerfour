import { AutoRestExtension, } from '@azure-tools/autorest-extension-base';
import { processRequest as modelerfour } from './modeler/plugin-modelerfour';
import { processRequest as preNamer } from './prenamer/plugin-prenamer';
import { processRequest as flattener } from './flattener/plugin-flattener';

export async function initializePlugins(pluginHost: AutoRestExtension) {
  pluginHost.Add('modelerfour', modelerfour);
  pluginHost.Add('pre-namer', preNamer);
  pluginHost.Add('flatten', flattener);
}

async function main() {
  const pluginHost = new AutoRestExtension();
  await initializePlugins(pluginHost);
  await pluginHost.Run();
}

main();