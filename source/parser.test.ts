import { expect } from 'chai';
import Parser from './parser';


interface TestArgs {
	foo: string;
	bar: number;
	strict: boolean;
	src: string;
	dest: string;
}


describe('Parser', () => {
	const parser = new Parser<TestArgs>({ version: '0.1.0' });

	parser.handle('--foo', {
		help: 'store a string value',
		action: { type: 'value' }
	});

	parser.handle(['-b', '--bar'], {
		help: 'store number of given arg',
		action: { type: 'count' }
	});

	parser.handle('--strict', {
		help: 'store the presence of given arg',
		action: { type: 'flag' }
	});

	parser.handle('src', {
		help: 'the source value of the thing',
		action: { type: 'value' },
	});

	parser.handle('dest', {
		help: 'the destination value of the thing',
		action: { type: 'value' },
	});


	it('should handle inline value args', () => {
		const args = parser.parse(['--foo=value']);
		expect(args).to.have.property('foo', 'value');
	});

	it('should handle separate value args', () => {
		const args = parser.parse(['--foo', 'value']);
		expect(args).to.have.property('foo', 'value');
	});

	it('should handle count args', () => {
		const args = parser.parse(['--bar', '-bbb', '--bar']);
		expect(args).to.have.property('bar', 5);
	});

	it('should handle positional arguments', () => {
		const args = parser.parse(['source', 'destination']);
		expect(args).to.have.property('src', 'source');
		expect(args).to.have.property('dest', 'destination');
	});

	it('should reject extraneous positional arguments', () => {
		expect(() => parser.parse(['a', 'b', 'c'])).to.throw(SyntaxError);
	});
});