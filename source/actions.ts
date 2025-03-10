/**
 * Check whether a given action contains a valid `dest` field.
 * @param action - The given action to inspect.
 * @returns Whether the given action contains a valid `dest` field.
 */
export function isDestAction<Args, Known extends boolean>(action: ArgAction<Args, Known>): action is ArgDestAction<Args, Known> {
	return destActionTypes.has(action.type);
}


const destActionTypes = new Set(['value', 'flag', 'count', 'constant']);


export type ArgDest<Args, Known extends boolean> = Known extends true ? KnownArgDest<Args> : UnknownArgDest<Args>;
export type KnownArgDest<Args> = { dest?: string & keyof Args; };
export type UnknownArgDest<Args> = { dest: string & keyof Args; };

export type ArgDestAction<Args, Known extends boolean> =
	| ArgValueAction<Args, Known>
	| ArgFlagAction<Args, Known>
	| ArgCountAction<Args, Known>
	| ArgConstAction<Args, Known>;

export type ArgAction<Args, Known extends boolean> =
	| ArgHelpAction
	| ArgVersionAction
	| ArgValueAction<Args, Known>
	| ArgFlagAction<Args, Known>
	| ArgCountAction<Args, Known>
	| ArgConstAction<Args, Known>
	| ArgCustomAction<Args>;

export type ArgHelpAction = {
	type: 'help';
	dest?: undefined;
	count?: undefined;
};

export type ArgVersionAction = {
	type: 'version';
	dest?: undefined;
	count?: undefined;
};

export type ArgValueAction<Args, Known extends boolean> = ArgDest<Args, Known> & {
	type: 'value';
	count?: ArgValueActionCount;
};

export type ArgFlagAction<Args, Known extends boolean> = ArgDest<Args, Known> & {
	type: 'flag';
	count?: undefined;
};

export type ArgCountAction<Args, Known extends boolean> = ArgDest<Args, Known> & {
	type: 'count';
	count?: undefined;
};

export type ArgConstAction<Args, Known extends boolean> = ArgDest<Args, Known> & {
	type: 'constant';
	value: string | number | boolean;
	count?: undefined;
};

export type ArgCustomAction<Args> = {
	type: 'custom';
	fn: (value: string | null, result: Partial<Args>) => void;
	dest?: undefined;
	count?: undefined;
};

export type ArgActionType = ArgAction<unknown, false>['type'];

export type ArgValueActionCount = number | '+' | '*' | undefined;