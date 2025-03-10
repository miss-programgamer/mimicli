import { styleText } from 'node:util';

import Queue from './queue.js';

import type { ArgAction, ArgValueAction } from './actions.js';
import { isDestAction } from './actions.js';

import type { Letter, Continuation } from './utilities.js';
import { getArgName, getArgParts } from './utilities.js';


export type ParserOptions = {
	usage?: string;
	desc?: string;
	padding?: number;
	version?: string;
	help?: boolean;
	error?: ErrorStrat;
};

export type ErrorStrat = 'throw' | 'exit';

export default class Parser<Args extends object> {
	private readonly usage: string;
	private readonly desc?: string;
	private readonly padding: number;
	private readonly version?: string;
	private readonly help: boolean;
	private readonly error: ErrorStrat;

	private readonly handlers: Record<string | number, ArgHandler<Args> | undefined>;
	private readonly continuations: Queue<Continuation<string>>;
	private readonly helpMessages: ArgHelp<Args>[];

	private handlerPosition: number = 0;
	private parsePosition: number = 0;

	constructor({ usage, desc, padding, version, help, error }: ParserOptions = {}) {
		this.usage = usage ?? this.defaultUsage;
		this.desc = desc;
		this.padding = padding ?? 24;
		this.version = version;
		this.help = help ?? true;
		this.error = error ?? 'throw';

		this.handlers = {};
		this.continuations = new Queue();
		this.helpMessages = [];

		if (this.help) {
			this.handle(['-h', '--help'], {
				help: 'display this help message, then exit',
				action: { type: 'help' }
			});
		}

		if (this.version != null) {
			this.handle('--version', {
				help: 'display this app\'s version, then exit',
				action: { type: 'version' }
			});
		}
	}

	handle<Name extends string>(key: PosArgKey<Name>, options: PosArgOptions<Args, Name extends keyof Args ? true : false>): void;
	handle<Name extends string>(key: ShortArgKey | LongArgKey<Name>, options: ArgOptions<Args, Name extends keyof Args ? true : false>): void;
	handle<Name extends string>(keyPair: ShortLongArgKeyPair<Name>, options: ArgOptions<Args, Name extends keyof Args ? true : false>): void;
	handle<Name extends string>(keyOrPair: ArgKey<Name> | ShortLongArgKeyPair<Name>, { action, help }: ArgOptions<Args, true>) {
		if (typeof keyOrPair === 'string') {
			const key = keyOrPair;
			const [name, type] = getArgName(key);

			if (isDestAction(action)) {
				action.dest ??= name as string & keyof Args;
			}

			const handler = this.bindActionHandler(type === 'pos', action);

			if (type === 'pos') {
				this.handlers[this.handlerPosition] = handler;

				if (typeof action.count === 'number' || action.count == null) {
					++this.handlerPosition;
				} else {
					this.handlerPosition = Infinity;
				}
			} else {
				this.pushHelp(null, key, help, action as ArgAction<Args, false>, action.dest ?? null);
				this.handlers[key] = handler;
			}
		} else {
			const [shortKey, longKey] = keyOrPair;
			const [longName] = getArgName(longKey);

			if (isDestAction(action)) {
				action.dest ??= longName as string & keyof Args;
			}

			const handler = this.bindActionHandler(false, action);

			this.pushHelp(shortKey, longKey, help, action as ArgAction<Args, false>, action.dest ?? null);
			this.handlers[shortKey] = handler;
			this.handlers[longKey] = handler;
		}
	}

	parse(argv?: string[]): Args {
		argv ??= process?.argv?.slice?.(2) ?? [];
		this.parsePosition = 0;

		const result: Partial<Args> = {};

		for (const arg of argv) {
			const [name, value, type] = getArgParts(arg);

			switch (type) {
				case 'pos':
					this.parsePos(arg, value, result);
					break;

				case 'short':
					this.parseShort(arg, name, value, result);
					break;

				case 'long':
					this.parseLong(arg, name, value, result);
					break;
			}
		}

		for (const { resolve, reject, required } of this.continuations.popAll()) {
			if (required) {
				reject('expected positional argument; encountered end of arguments list');
			} else {
				resolve(null);
			}
		}

		return result as Args;
	}

	private parsePos(arg: string, value: string, result: Partial<Args>) {
		if (!this.continuations.empty) {
			const { resolve } = this.continuations.pop();
			resolve(value);
		} else {
			const handler = this.handlers[this.parsePosition];

			if (handler == null) {
				if (this.parsePosition === 0) {
					const errArg = styleText(['redBright'], arg);
					this.emitError(`no positional argument handlers were registered: ${errArg}`);
				} else {
					const errArg = styleText(['redBright'], arg);
					this.emitError(`encountered extraneous positional argument: ${errArg}`);
				}
			}

			handler(value, result);
		}
	}

	private parseShort(arg: string, name: string, value: string | null, result: Partial<Args>) {
		if (!this.continuations.empty) {
			for (const { resolve, reject, required } of this.continuations.popAll()) {
				if (required) {
					const errArg = styleText(['redBright'], arg);
					reject(`expected value argument; encountered keyword argument: ${errArg}`);
				} else {
					resolve(null);
				}
			}
		} else {
			const letters = [...name];

			for (const [i, letter] of letters.entries()) {
				const key = `-${letter}`;

				if (i === letters.length - 1) {
					const handler = this.handlers[key];

					if (handler != null) {
						handler(value, result);
					} else {
						const errArg = styleText(['redBright'], arg);
						this.emitError(`unrecognized keyword argument encountered: ${errArg}`);
					}
				} else {
					const handler = this.handlers[key];

					if (handler != null) {
						handler(null, result);
					} else {
						const errArg = styleText(['redBright'], arg);
						this.emitError(`unrecognized keyword argument encountered: ${errArg}`);
					}
				}
			}
		}
	}

	private parseLong(arg: string, name: string, value: string | null, result: Partial<Args>) {
		if (!this.continuations.empty) {
			for (const { resolve, reject, required } of this.continuations.popAll()) {
				if (required) {
					const errArg = styleText(['redBright'], arg);
					reject(`expected value argument; encountered keyword argument: ${errArg}`);
				} else {
					resolve(null);
				}
			}
		} else {
			const key = `--${name}`;
			const handler = this.handlers[key];

			if (handler != null) {
				handler(value, result);
			} else {
				const errArg = styleText(['redBright'], arg);
				this.emitError(`unrecognized keyword argument encountered: ${errArg}`);
			}
		}
	}

	private handleAction(positional: boolean, action: ArgAction<Args, false>, value: string | null, result: Partial<Args>) {
		switch (action.type) {
			case 'help':
				console.log(`usage: ${this.usage}\n`);
				console.log(`${this.desc}\n`);
				console.log('optional arguments:');
				console.log(this.helpMessages.map(h => `${this.formatHelp(h)}`).join('\n'));
				process?.exit?.(0);

			case 'version':
				console.log(this.version);
				process?.exit?.(0);

			case 'value':
				if (action.count == null) {
					if (value != null) {
						result[action.dest] = value as any;
					} else {
						const parser = this;
						this.continuations.push({
							resolve(value) {
								result[action.dest] = value as any;
							},
							reject(reason) {
								parser.emitError(reason);
							},
							required: true,
						});
					}
					++this.parsePosition;
				} else if (action.count === '*') {
					if (value != null) {
						pushToDestArray(action.dest, value);
					}

					const parser = this;
					const continuation: Continuation<string> = {
						resolve(value) {
							if (value != null) {
								pushToDestArray(action.dest, value);
								parser.continuations.push(continuation);
							}
						},
						reject(reason) {
							parser.emitError(reason);
						},
						required: false,
					};

					parser.continuations.push(continuation);
				} else if (action.count === '+') {
					const parser = this;

					const continuation: Continuation<string> = {
						resolve(value) {
							if (value != null) {
								pushToDestArray(action.dest, value);
								parser.continuations.push(continuation);
							}
						},
						reject(reason) {
							parser.emitError(reason);
						},
						required: false,
					};

					if (value != null) {
						pushToDestArray(action.dest, value);
						parser.continuations.push(continuation);
					} else {
						this.continuations.push({
							resolve(value) {
								pushToDestArray(action.dest, value);
								parser.continuations.push(continuation);
							},
							reject(reason) {
								parser.emitError(reason);
							},
							required: true,
						});
					}
				} else {
					const parser = this;
					let count = action.count;

					const continuation: Continuation<string> = {
						resolve(value) {
							pushToDestArray(action.dest, value);

							if (--count > 0) {
								parser.continuations.push(continuation);
							}
						},
						reject(reason) {
							parser.emitError(reason);
						},
						required: true,
					};

					if (count > 0) {
						parser.continuations.push(continuation);
					}

					++this.parsePosition;
				}
				break;

			case 'flag':
				result[action.dest] = true as Args[typeof action.dest];
				break;

			case 'count':
				result[action.dest] ??= 0 as Args[typeof action.dest];
				result[action.dest] = (result[action.dest] as number + 1) as Args[typeof action.dest];
				break;

			case 'constant':
				result[action.dest] = action.value as Args[typeof action.dest];
				break;

			case 'custom':
				action.fn(value, result);
				break;
		}

		function pushToDestArray<Dest extends string & keyof Args>(dest: Dest, value: string) {
			result[dest] ??= [] as Args[Dest];
			(result[dest] as string[]).push(value);
		}
	}

	private bindActionHandler(positional: boolean, action: ArgAction<Args, true>): ArgHandler<Args> {
		return this.handleAction.bind(this, positional, action as ArgAction<Args, false>);
	}

	private pushHelp(short: string | null, long: string, help: string, action: ArgAction<Args, false>, dest: string | null) {
		this.helpMessages.push({ short, long, help, action });
	}

	private formatHelp({ short, long, help, action }: ArgHelp<Args>): string {
		if (short != null) {
			return `  ${short}, ${long} ${this.formatHelpDest(action)}`.padEnd(this.padding) + help;
		} else {
			return `      ${long} ${this.formatHelpDest(action)}`.padEnd(this.padding) + help;
		}
	}

	private formatHelpDest(action: ArgAction<Args, false>): string {
		if (action.dest != null) {
			if (action.type === 'value') {
				if (action.count === '+') {
					return `${action.dest.toUpperCase()}...`;
				} else if (action.count === '*') {
					return `[${action.dest.toUpperCase()}...]`;
				} else {
					return `${action.dest.toUpperCase()}`;
				}
			}
		}

		return '';
	}

	private emitError(message: string): never {
		switch (this.error) {
			case 'throw':
				throw new SyntaxError(message);

			case 'exit':
				console.error(message);
				process?.exit?.(1);
		}
	}

	private get defaultUsage(): string {
		return '';
	}
}


export type ArgHelp<Args> = {
	short: string | null;
	long: string | null;
	help: string;
	action: ArgAction<Args, false>;
};

export type ArgKey<Name extends string> =
	| LongArgKey<Name>
	| ShortArgKey
	| PosArgKey<Name>;

export type LongArgKey<Name extends string> = `--${Name}`;
export type ShortArgKey = `-${Lowercase<Letter> | Uppercase<Letter>}`;
export type PosArgKey<Name extends string> = `${Name}`;

export type LongOrPosArgKey<Name extends string> = LongArgKey<Name> | PosArgKey<Name>;
export type ShortLongArgKeyPair<Name extends string> = [ShortArgKey, LongArgKey<Name>];

export type ArgHandler<Args> = (value: string | null, result: Partial<Args>) => void;

export type ArgOptions<Args, Known extends boolean> = {
	help: string;
	action: ArgAction<Args, Known>;
};

export type PosArgOptions<Args, Known extends boolean> = {
	help: string;
	action: ArgValueAction<Args, Known>;
};