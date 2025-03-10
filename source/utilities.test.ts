import { expect } from 'chai';
import { getArgName, getArgParts, getArgType } from './utilities.js';


describe('utilities.js', () => {
	describe(getArgType.name, () => {
		it('should detect positional arguments', () => {
			expect(getArgType('foo')).to.equal('pos');
		});

		it('should detect short keyword arguments', () => {
			expect(getArgType('-f')).to.equal('short');
		});

		it('should detect long keyword arguments', () => {
			expect(getArgType('--foo')).to.equal('long');
		});
	});

	describe(getArgName.name, () => {
		it('should parse positional argument name', () => {
			const [name] = getArgName('foo');
			expect(name).eq('foo');
		});

		it('should parse short keyword argument name', () => {
			const [name] = getArgName('-f');
			expect(name).eq('f');
		});

		it('should parse long keyword argument name', () => {
			const [name] = getArgName('--foo');
			expect(name).eq('foo');
		});
	});

	describe(getArgParts.name, () => {
		it('should parse positional argument parts', () => {
			const [name, value] = getArgParts('foo');
			expect(name).eq(null);
			expect(value).eq('foo');
		});

		it('should parse short keyword argument parts without value', () => {
			const [name, value] = getArgParts('-f');
			expect(name).eq('f');
			expect(value).eq(null);
		});

		it('should parse short keyword argument parts with value', () => {
			const [name, value] = getArgParts('-f=foo');
			expect(name).eq('f');
			expect(value).eq('foo');
		});

		it('should parse long keyword argument parts without value', () => {
			const [name, value] = getArgParts('--foo');
			expect(name).eq('foo');
			expect(value).eq(null);
		});

		it('should parse long keyword argument parts with value', () => {
			const [name, value] = getArgParts('--foo=foo');
			expect(name).eq('foo');
			expect(value).eq('foo');
		});
	});
});