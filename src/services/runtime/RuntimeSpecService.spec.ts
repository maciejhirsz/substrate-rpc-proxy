import { sanitizeNumbers } from '../../sanitize/sanitizeNumbers';
import { blockHash789629, mockApi } from '../test-helpers/mock';
import * as response from '../test-helpers/responses/runtime/spec.json';
import { RuntimeSpecService } from './RuntimeSpecService';

const runtimeSpecService = new RuntimeSpecService(mockApi);

describe('RuntimeSpecService', () => {
	describe('fetchSpec', () => {
		it('works when ApiPromise works', async () => {
			expect(
				sanitizeNumbers(
					await runtimeSpecService.fetchSpec(blockHash789629)
				)
			).toStrictEqual(response);
		});
	});
});
