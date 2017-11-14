/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as fs from "fs";
import * as path from "path";
import * as promisify from "pify";
import { OutstandingTaskAwaiter, Exception, Delay } from '@microsoft.azure/tasks'
import { isFile } from "./file-io"
const { lock, check, } = require("proper-lockfile")

const fs_open: (path: string | Buffer, flags: string | number) => Promise<number> = promisify(fs.open);

export class UnableToReadLockException extends Exception {
  constructor(path: string, public exitCode: number = 1) {
    super(`Unable to create read lock on '${path}'.`, exitCode);
    Object.setPrototypeOf(this, UnableToReadLockException.prototype);
  }
}

export interface UnlockOptions {
  realpath?: boolean;
  delay?: number;
}

export interface CheckOptions extends UnlockOptions {
  stale?: number;
}

export interface LockOptions extends CheckOptions {
  update?: number;
  retries?: number;
}

export type release = () => Promise<void>;
export type _release = () => void;

export class Lock {
  private static _exclusive: (path: string, options?: LockOptions) => Promise<_release> = promisify(lock);
  public static check: (path: string, options?: CheckOptions) => Promise<boolean> = promisify(check);

  public static async exclusive(path: string, options?: LockOptions): Promise<release> {
    return promisify(await this._exclusive(path, options));
  }

  public static async waitForExclusive(path: string, timeout: number = 5 * 60 * 1000): Promise<release | null> {
    let result: release | null = null;
    const expire = Date.now() + timeout;

    do {
      try {
        result = await this.exclusive(path);
      } catch (e) {
        // no worries. Just wait a few seconds and see if we can get it.
        await Delay(3000);
      }
    } while (result == null && expire > Date.now())

    return result;
  }

  public static async read(path: string, options?: LockOptions): Promise<release> {
    // first try to create the file
    // it's ok if it fails
    options = options || {};
    options.delay = options.delay || 2000;
    options.retries = options.retries || 4;

    const p = `${path}.lock`;

    try {
      fs.writeFileSync(p, 'lockfile');
    } catch (e) {
      // no worries.
    }

    // try to open the file for read 
    try {
      if (await isFile(p)) {
        const fd = await fs_open(p, 'r');
        return async () => {
          fs.close(fd, (err) => { });
          try {
            fs.unlinkSync(p);
          } catch (E) {
          }
        };
      }
    } catch (e) {
    }
    if (options.retries) {
      await Delay(options.delay);
      options.retries--;
      return await this.read(path, options);
    }
    throw new UnableToReadLockException(path);
  }
}
