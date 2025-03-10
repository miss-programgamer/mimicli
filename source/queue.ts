export default class Queue<T> {
	_values: T[];

	constructor(values?: Iterable<T>) {
		this._values = values != null ? [...values] : [];
	}

	push(value: T) {
		this._values.push(value);
	}

	pop(): T {
		return this._values.splice(0, 1)[0];
	}

	popAll(): T[] {
		return this._values.splice(0, this._values.length);
	}

	get length(): number {
		return this._values.length;
	}

	get empty(): boolean {
		return this._values.length === 0;
	}
}