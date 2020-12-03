import { readFile } from "@azure-tools/async-io";
import { deserialize, fail } from "@azure-tools/codegen";
import { startSession } from "@azure-tools/autorest-extension-base";
import { values } from "@azure-tools/linq";
import chalk from "chalk";

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

// TODO: Figure out better thing, than global var.
let errorCount = 0;

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

export async function createTestSession<TInputModel>(
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
