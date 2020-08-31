import { ApiPromise } from '@polkadot/api';
import { RequestHandler } from 'express';
import { IAddressParam } from 'src/types/requests';

import { validateAddress } from '../../middleware';
import { AccountsVestingInfoService } from '../../services/v0';
import AbstractController from '../AbstractController';

/**
 * GET vesting information for an address.
 *
 * Paths:
 * - `address`: Address to query.
 * - (Optional) `number`: Block hash or height at which to query. If not provided, queries
 *   finalized head.
 *
 * Returns:
 * - `at`: Block number and hash at which the call was made.
 * - `vesting`: Vesting schedule for an account.
 *   - `locked`: Number of tokens locked at start.
 *   - `perBlock`: Number of tokens that gets unlocked every block after `startingBlock`.
 *   - `startingBlock`: Starting block for unlocking(vesting).
 *
 * Substrate Reference:
 * - Vesting Pallet: https://crates.parity.io/pallet_vesting/index.html
 * - `VestingInfo`: https://crates.parity.io/pallet_vesting/struct.VestingInfo.html
 */
export default class AccountsVestingInfoController extends AbstractController<
	AccountsVestingInfoService
> {
	constructor(api: ApiPromise) {
		super(
			api,
			'/accounts/:address/vesting-info',
			new AccountsVestingInfoService(api)
		);
		this.initRoutes();
	}

	protected initRoutes(): void {
		this.router.use(this.path, validateAddress);

		this.safeMountAsyncGetHandlers([['', this.getAccountVestingInfo]]);
	}

	/**
	 * Get the latest account vesting summary of `address`.
	 *
	 * @param req Express Request
	 * @param res Express Response
	 */
	private getAccountVestingInfo: RequestHandler<IAddressParam> = async (
		{ params: { address }, query: { at } },
		res
	): Promise<void> => {
		const hash = await this.getHashFromAt(at);

		AccountsVestingInfoController.sanitizedSend(
			res,
			await this.service.fetchAccountVestingInfo(hash, address)
		);
	};
}
