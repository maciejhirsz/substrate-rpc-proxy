import { sanitizeNumbers } from '../../sanitize/sanitizeNumbers';
import { blockHash789629, mockApi } from '../test-helpers/mock';
import * as nodeVersionResponse from '../test-helpers/responses/node/nodeVersion.json';
import { NodeVersionService } from '.';

const nodeVersionService = new NodeVersionService(mockApi);

describe('NodeVersionService', () => {
	describe('fetchNodeTransactionPool', () => {
		it('works when ApiPromise works', async () => {
			expect(
				sanitizeNumbers(
					await nodeVersionService.fetchVersion(blockHash789629)
				)
			).toStrictEqual(nodeVersionResponse);
		});
	});
});
