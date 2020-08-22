import { ApiPromise } from '@polkadot/api';
import { RequestHandler } from 'express';

import { RuntimeCodeService } from '../../services';
import AbstractController from '../AbstractController';

/**
 * Get version information of the Substrate runtime.
 *
 * Query:
 * - (Optional)`at`: Block at which to retrieve runtime version information at. Block
 * 		identifier, as the block height or block hash. Defaults to most recent block.
 *
 * Returns:
 * - `at`: Block number and hash at which the call was made.
 * - `code`: Runtime code wasm blob.
 */
export default class RuntimeCodeController extends AbstractController<
	RuntimeCodeService
> {
	constructor(api: ApiPromise) {
		super(api, '/runtime/code', new RuntimeCodeService(api));
		this.initRoutes();
	}

	protected initRoutes(): void {
		this.safeMountAsyncGetHandlers([['', this.getCodeAtBlock]]);
	}

	/**
	 * Get the chain's latest metadata in a decoded, JSON format.
	 *
	 * @param _req Express Request
	 * @param res Express Response
	 */

	private getCodeAtBlock: RequestHandler = async (
		{ query: { at } },
		res
	): Promise<void> => {
		const hash =
			typeof at === 'string'
				? await this.getHashForBlock(at)
				: await this.api.rpc.chain.getFinalizedHead();

		RuntimeCodeController.sanitizedSend(
			res,
			await this.service.fetchCode(hash)
		);
	};
}
