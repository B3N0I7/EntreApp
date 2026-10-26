import { describe, expect, it } from 'vitest';
import { LOGICAL_CONNECTOR_CATEGORIES } from './logicalConnectors';

describe('logical connectors data', () => {
	it('contains the seven source categories without level groupings', () => {
		expect(LOGICAL_CONNECTOR_CATEGORIES.map(({ title }) => title)).toEqual([
			'La Cause',
			'La Conséquence',
			'L’Opposition et la Concession',
			'L’Addition et la Succession d’idées',
			'Le But (L’objectif visé)',
			'La Condition et l’Hypothèse',
			'L’Illustration et l’Exemple'
		]);
		let connectorCount = 0;
		let exampleCount = 0;
		for (const category of LOGICAL_CONNECTOR_CATEGORIES) {
			connectorCount += category.connectors.length;
			for (const connector of category.connectors) exampleCount += connector.examples.length;
		}
		expect(connectorCount).toBe(84);
		expect(exampleCount).toBe(169);

		for (const category of LOGICAL_CONNECTOR_CATEGORIES) {
			expect(category.connectors.length).toBeGreaterThan(0);
			for (const connector of category.connectors) {
				expect(connector.examples.length).toBeGreaterThan(0);
				expect(connector.name).not.toMatch(/Niveau/i);
				expect('level' in connector).toBe(false);
			}
		}
	});
});
