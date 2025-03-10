import { expect } from 'chai';
import Queue from './queue.js';


describe('Queue', () => {
	it('should be default-constructible', () => {
		const queue = new Queue();
		expect(queue).to.have.property('length', 0);
		expect(queue).to.have.property('empty', true);
	});

	it('should be constructible with initial values', () => {
		const queue = new Queue([1, 2, 3]);
		expect(queue).to.have.property('length', 3);
		expect(queue).to.have.property('empty', false);
	});

	it('should be able to have values added', () => {
		const queue = new Queue<number>();
		expect(queue).to.have.property('length', 0);
		expect(queue).to.have.property('empty', true);
		queue.push(5);
		expect(queue).to.have.property('length', 1);
		expect(queue).to.have.property('empty', false);
	});
});