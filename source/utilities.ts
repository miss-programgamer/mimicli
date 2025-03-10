import { findPackageJSON } from 'node:module';
import { readFile } from 'node:fs/promises';


/**
 * Find out what type the given argument is.
 * @param arg - An argument obtained from the command line.
 * @returns The type of the given argument.
 */
export function getArgType(arg: string): ArgType {
	if (arg.startsWith('---')) {
		throw new SyntaxError('arguments may not start with ---');
	} else if (arg.startsWith('--')) {
		return 'long';
	} else if (arg.startsWith('-')) {
		return 'short';
	} else {
		return 'pos';
	}
}

/**
 * Get the name & type of the given argument.
 * @param arg - An argument name as passed to `Parser.handle`.
 * @returns The name and type of the given argument.
 */
export function getArgName(arg: string): [string, ArgType] {
	const type = getArgType(arg);

	switch (type) {
		case 'pos':
			return [arg, type];

		case 'short':
			return [arg.substring(1), type];

		case 'long':
			return [arg.substring(2), type];
	}
}

/**
 * Get the name, value, and type of the given argument.
 * @param arg - An argument obtained from the command line.
 * @returns The name, value, and type of the given argument.
 */
export function getArgParts(arg: string): [null, string, 'pos'] | [string, string | null, 'short' | 'long'] {
	const type = getArgType(arg);
	const valueIndex = arg.indexOf('=');
	const hasValue = valueIndex !== -1;

	if (type === 'pos') {
		return [null, arg, type];
	} else if (hasValue) {
		if (type === 'short') {
			const name = arg.substring(1, valueIndex);
			const value = arg.substring(valueIndex + 1);
			return [name, value, type];
		} else if (type === 'long') {
			const name = arg.substring(2, valueIndex);
			const value = arg.substring(valueIndex + 1);
			return [name, value, type];
		}
	} else {
		if (type === 'short') {
			return [arg.substring(1), null, type];
		} else if (type === 'long') {
			return [arg.substring(2), null, type];
		}
	}

	throw Error("unreachable");
}

/**
 * Read the version from a module's package.json file and return it.
 * @param specifier - 
 * @param base - 
 * @returns Our package.json's version field.
 */
export async function getVersion(specifier: string | URL, base?: string | URL): Promise<string> {
	const buffer = await readFile(findPackageJSON(specifier, base)!);
	return JSON.parse(buffer.toString()).version;
}


export type ArgType = 'pos' | 'short' | 'long';

export type Continuation<T> =
	| OptionalContinuation<T>
	| RequiredContinuation<T>;

export interface OptionalContinuation<T> {
	resolve: (value: T | null) => void;
	reject: (reason?: any) => void;
	required: false;
}

export interface RequiredContinuation<T> {
	resolve: (value: T) => void;
	reject: (reason?: any) => void;
	required: true;
}

export type Letter =
	| 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h' | 'i'
	| 'j' | 'k' | 'l' | 'm' | 'n' | 'o' | 'p' | 'q' | 'r'
	| 's' | 't' | 'u' | 'v' | 'w' | 'x' | 'y' | 'z';