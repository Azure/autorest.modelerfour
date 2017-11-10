/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as fs from "fs";
import * as path from "path";
import * as promisify from "pify";
import { OutstandingTaskAwaiter, Exception, Delay } from '@microsoft.azure/tasks'

export class PathNotFoundException extends Exception {
  constructor(path: string, public exitCode: number = 1) {
    super(`File '${path}' not found.`, exitCode);
    Object.setPrototypeOf(this, PathNotFoundException.prototype);
  }
}

export class PathIsNotFileException extends Exception {
  constructor(path: string, public exitCode: number = 1) {
    super(`File '${path}' is not a file.`, exitCode);
    Object.setPrototypeOf(this, PathIsNotFileException.prototype);
  }
}

export class PathIsNotDirectoryException extends Exception {
  constructor(path: string, public exitCode: number = 1) {
    super(`File '${path}' is not a directory.`, exitCode);
    Object.setPrototypeOf(this, PathIsNotFileException.prototype);
  }
}


export class UnableToRemoveException extends Exception {
  constructor(path: string, public exitCode: number = 1) {
    super(`Unable to remove '${path}'.`, exitCode);
    Object.setPrototypeOf(this, UnableToRemoveException.prototype);
  }
}

export class UnableToMakeDirectoryException extends Exception {
  constructor(path: string, public exitCode: number = 1) {
    super(`Unable to create directory '${path}'.`, exitCode);
    Object.setPrototypeOf(this, UnableToMakeDirectoryException.prototype);
  }
}


export const exists: (path: string | Buffer) => Promise<boolean> = path => new Promise<boolean>((r, j) => fs.stat(path, (err: NodeJS.ErrnoException, stats: fs.Stats) => err ? r(false) : r(true)));
export const readdir: (path: string | Buffer) => Promise<Array<string>> = promisify(fs.readdir);
export const close: (fd: number) => Promise<void> = promisify(fs.close);

export const writeFile: (filename: string, content: string) => Promise<void> = (filename, content) => Promise.resolve(fs.writeFileSync(filename, content)); // for some reason writeFile only produced empty files
export const lstat: (path: string | Buffer) => Promise<fs.Stats> = promisify(fs.lstat);

const fs_rmdir: (path: string | Buffer) => Promise<void> = promisify(fs.rmdir);
const unlink: (path: string | Buffer) => Promise<void> = promisify(fs.unlink);
const fs_mkdir: (path: string | Buffer) => Promise<void> = promisify(fs.mkdir);
const fs_open: (path: string | Buffer, flags: string | number) => Promise<number> = promisify(fs.open);
const fs_close: (fs: number) => Promise<void> = promisify(fs.close);

export async function mkdir(dirPath: string) {
  if (!await isDirectory(dirPath)) {
    const p = path.normalize(dirPath + "/");
    const parent = path.dirname(dirPath);
    if (! await isDirectory(parent)) {
      if (p != parent) {
        await mkdir(parent);
      }
    }
    try {
      await fs_mkdir(p);
    } catch (e) {
      if (!await isDirectory(p)) {
        throw new UnableToMakeDirectoryException(p);
      }
    }
  }
}

const fs_readFile: (filename: string, encoding: string, ) => Promise<string> = promisify(fs.readFile);

export async function readFile(filename: string): Promise<string> {
  return fs_readFile(filename, "utf-8");
}

export async function isDirectory(dirPath: string): Promise<boolean> {
  try {
    if (await exists(dirPath)) {
      return (await lstat(dirPath)).isDirectory();
    }
  } catch (e) {
    // don't throw!
  }
  return false;
}

export async function isFile(filePath: string): Promise<boolean> {
  try {
    if (await exists(filePath)) {
      return !(await lstat(filePath)).isDirectory();
    }
  } catch (e) {
    // don't throw!
  }

  return false;
}

export async function rmdir(dirPath: string) {
  // if it's not there, do nothing.
  if (!await exists(dirPath)) {
    return;
  }

  //if it's not a directory, that's bad.
  if (!await isDirectory(dirPath)) {
    throw new PathIsNotDirectoryException(dirPath);
  }

  // make sure this isn't the current directory.
  if (process.cwd() === path.normalize(dirPath)) {
    process.chdir(`${dirPath}/..`);
  }

  // make sure the folder is empty first.
  const files = await readdir(dirPath);
  if (files.length) {
    const awaiter = new OutstandingTaskAwaiter();
    try {
      for (const file of files) {
        try {
          const p = path.join(dirPath, file);

          if (await isDirectory(p)) {
            // folders are recursively rmdir'd 
            awaiter.Await(rmdir(p));
          }
          else {
            // files and symlinks are unlink'd 
            awaiter.Await(unlink(p).catch(() => { }));
          }
        } catch (e) {
          // uh... can't.. ok.
        }

      }
    } finally {
      // after all the entries are done
      await awaiter.Wait();
    }
  }
  try {
    // if this fails for some reason, check if it's important.
    await fs_rmdir(dirPath);
  } catch (e) {
    // is it gone? that's all we really care about.
    if (await isDirectory(dirPath)) {
      // directory did not delete
      throw new UnableToRemoveException(dirPath);
    }
  }
}

export async function rmFile(filePath: string) {
  // not there? no problem
  if (!exists(filePath)) {
    return;
  }

  // not a file? that's not cool.
  if (await isDirectory(filePath)) {
    throw new PathIsNotFileException(filePath);
  }

  try {
    // files and symlinks are unlink'd 
    await unlink(filePath);
  } catch (e) {
    // is it gone? that's all we really care about.
    if (await exists(filePath)) {
      // directory did not delete
      throw new UnableToRemoveException(filePath);
    }
  }
}
