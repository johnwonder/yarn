/* @flow */

import type {Reporter} from '../../reporters/index.js';
import type Config from '../../config.js';
import buildSubCommands from './_build-sub-commands.js';
import * as fs from '../../util/fs.js';
import {METADATA_FILENAME} from '../../constants';

const path = require('path');

export function hasWrapper(flags: Object, args: Array<string>): boolean {
  return args[0] !== 'dir';
}

export const {run, setFlags, examples} = buildSubCommands('cache', {
  async ls(config: Config, reporter: Reporter, flags: Object, args: Array<string>): Promise<void> {
    async function readCacheMetadata(
      parentDir = config.cacheFolder,
      metadataFile = METADATA_FILENAME,
    ): Promise<Array<Array<string>>> {
      const folders = await fs.readdir(parentDir);
      const packagesMetadata = [];

      for (const folder of folders) {
        if (folder[0] === '.') {
          continue;
        }

        const loc = path.join(config.cacheFolder, parentDir.replace(config.cacheFolder, ''), folder);
        // Check if this is a scoped package
        if (!await fs.exists(path.join(loc, metadataFile))) {
          // If so, recurrently read scoped packages metadata
          packagesMetadata.push(...(await readCacheMetadata(loc)));
        } else {
          const {registry, package: manifest, remote} = await config.readPackageMetadata(loc);
          packagesMetadata.push([manifest.name, manifest.version, registry, (remote && remote.resolved) || '']);
        }
      }

      return packagesMetadata;
    }

    const body = await readCacheMetadata();

    reporter.table(['Name', 'Version', 'Registry', 'Resolved'], body);
  },

  dir(config: Config, reporter: Reporter) {
    reporter.log(config.cacheFolder);
  },

  async clean(config: Config, reporter: Reporter, flags: Object, args: Array<string>): Promise<void> {
    if (config.cacheFolder) {
      await fs.unlink(config._cacheRootFolder);
      await fs.mkdirp(config.cacheFolder);
      reporter.success(reporter.lang('clearedCache'));
    }
  },
});
