import { readFile } from "@azure-tools/async-io";
import { deserialize, fail } from "@azure-tools/codegen";
import { Session, startSession } from "@azure-tools/autorest-extension-base";

async function readData(
  folder: string,
  ...files: Array<string>
): Promise<Map<string, { model: any; filename: string; content: string }>> {
  const results = new Map<string, { model: any; filename: string; content: string }>();

  for (const filename of files) {
    const content = await readFile(`${folder}/${filename}`);
    const model = deserialize<any>(content, filename);
    results.set(filename, {
      model,
      filename,
      content,
    });
  }
  return results;
}

export async function createTestSession<TInputModel>(
  config: any,
  folder: string,
  inputs: Array<string>,
): Promise<Session<TInputModel>> {
  const models = await readData(folder, ...inputs);

  return await startSession<TInputModel>({
    ReadFile: (filename: string) =>
      Promise.resolve(models.get(filename)?.content ?? fail(`missing input '${filename}'`)),
    GetValue: (key: string) => Promise.resolve(key ? config[key] : config),
    ListInputs: (artifactType?: string) => Promise.resolve([...models.values()].map((x) => x.filename)),
    ProtectFiles: (path: string) => Promise.resolve(),
    WriteFile: (filename: string, content: string, sourceMap?: any, artifactType?: string) => Promise.resolve(),
    Message: (message: any): void => {
      if (message.Channel === "warning" || message.Channel === "error" || message.Channel === "verbose") {
        console.error(`${message.Channel} ${message.Text}`);
      }
    },
    UpdateConfigurationFile: (filename: string, content: string) => {},
    GetConfigurationFile: (filename: string) => Promise.resolve(""),
  });
}
