/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as util from './lib/util.ts';
import * as date from './lib/date.ts';
import * as task from './lib/gulp/task.ts';
import * as compilation from './lib/compilation.ts';
import { promises as fs } from 'fs';

function makeCompileBuildTask(disableMangle: boolean, skipNLS = false) {
	return task.series(
		util.rimraf('out-build'),
		date.writeISODate('out-build'),
		compilation.compileApiProposalNamesTask,
		compilation.compileTask('src', 'out-build', true, { disableMangle, skipNLS }),
		// The REH packaging step unconditionally globs out-build/nls.*.json. NLS-less
		// builds never produce them, so emit empty stubs; the runtime only consults
		// the table for compile-time-indexed localize calls, which nls-less output
		// never contains (localize() keeps its string form and falls back in-code).
		async () => {
			if (!skipNLS) { return; }
			await fs.writeFile('out-build/nls.messages.json', '[]');
			await fs.writeFile('out-build/nls.keys.json', '[]');
		}
	);
}

// Local/PR compile, including nls and inline sources in sourcemaps, minification, no mangling
export const compileBuildWithoutManglingTask = task.define('compile-build-without-mangling', task.series(compilation.copyCodiconsTask, makeCompileBuildTask(true)));
task.task(compileBuildWithoutManglingTask);

// Fast local/server-build compile: esbuild transpile only, no mangling, no NLS
// extraction and no inline-source sourcemaps. Orders of magnitude faster than
// the full pipeline; output is functionally equivalent for self-hosted servers
// (UI strings fall back to the in-code English defaults).
export const compileBuildDevFastTask = task.define('compile-build-dev-fast', task.series(compilation.copyCodiconsTask, makeCompileBuildTask(true, true)));
task.task(compileBuildDevFastTask);

// CI compile, including nls and inline sources in sourcemaps, mangling, minification, for build
export const compileBuildWithManglingTask = task.define('compile-build-with-mangling', task.series(compilation.copyCodiconsTask, makeCompileBuildTask(false)));
task.task(compileBuildWithManglingTask);
