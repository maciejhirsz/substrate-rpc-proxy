import { ApiPromise } from '@polkadot/api';

import ApiHandler from '../ApiHandler';
import { RequestHandlerTx } from '../types/request_types';
import AbstractController from './AbstractController';

/**
 * POST a serialized transaction and receive a fee estimate.
 *
 * Post info:
 * - `data`: Expects a hex-encoded transaction, e.g. '{"tx": "0x..."}'.
 * - `headers`: Expects 'Content-Type: application/json'.
 *
 * Returns:
 * - Success:
 *   - `weight`: Extrinsic weight.
 *   - `class`: Extrinsic class, one of 'Normal', 'Operational', or 'Mandatory'.
 *   - `partialFee`: _Expected_ inclusion fee for the transaction. Note that the fee rate changes
 *     up to 30% in a 24 hour period and this will not be the exact fee.
 * - Failure:
 *   - `error`: Error description.
 *   - `data`: The extrinsic and reference block hash.
 *   - `cause`: Error message from the client.
 *
 * Note: `partialFee` does not include any tips that you may add to increase a transaction's
 * priority. See the reference on `compute_fee`.
 *
 * Substrate Reference:
 * - `RuntimeDispatchInfo`: https://crates.parity.io/pallet_transaction_payment_rpc_runtime_api/struct.RuntimeDispatchInfo.html
 * - `query_info`: https://crates.parity.io/pallet_transaction_payment/struct.Module.html#method.query_info
 * - `compute_fee`: https://crates.parity.io/pallet_transaction_payment/struct.Module.html#method.compute_fee
 */
export default class TxFeeEstimate extends AbstractController {
	handler: ApiHandler;
	constructor(api: ApiPromise) {
		super(api, '/tx/fee-estimate');
		this.handler = new ApiHandler(api);
		this.initRoutes();
	}

	protected initRoutes(): void {
		this.router.post(this.path, this.catchWrap(this.txFeeEstimate));
	}

	/**
	 * Submit a serialized transaction in order to receive an estimate for its
	 * partial fees.
	 *
	 * @param req Sidecar TxRequest
	 * @param res Express Response
	 */
	private txFeeEstimate: RequestHandlerTx = async (
		req,
		res
	): Promise<void> => {
		const { tx } = req.body;
		if (!tx) {
			throw {
				error: 'Missing field `tx` on request body.',
			};
		}

		const hash = await this.api.rpc.chain.getFinalizedHead();

		res.send(await this.handler.fetchFeeInformation(hash, tx));
	};
}