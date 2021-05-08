import { ApiPromise } from '@polkadot/api';
import { RequestHandler } from 'express';
import { BadRequest } from 'http-errors';

import { validateAddress } from '../../middleware';
import { AccountsAssetsService } from '../../services/accounts';
import AbstractController from '../AbstractController';

/**
 * Get asset information for an address.
 * 
 * Paths:
 * - `address`: The address to query
 * 
 * Query:
 * - (Optional)`at`: Block at which to retrieve runtime version information at. Block
 *  	identifier, as the block height or block hash. Defaults to most recent block.
 * - (Optional for `/accounts/:address/asset-balances`)`assets`
 * - (Not-Optional for `/accounts/:address/asset-approvals)`assetId` The assetId associated
 * 		with the `AssetApproval`. 
 * - (Not-Optional for `/accounts/:address/asset-approvals)`delegate` The delegate associated
 * 		with the `ApprovalKey` which is tied to a `Approval`. The `ApprovalKey` consists
 * 		of an `owner` which is the `address` path parameter, and a `delegate`.
 * 
 * `/accounts/:address/asset-balances`
 * Returns: 
 * - `at`: Block number and hash at which the call was made.
 * - `assets`: An array of `AssetBalance` objects which have a AssetId attached to them
 * 		- `assetId`: The identifier of the asset.
 * 		- `balance`: The balance of the asset.
 * 		- `isFrozen`: Whether the asset is frozen for non-admin transfers.
 * 		- `isSufficient`: Whether a non-zero balance of this asset is a deposit of sufficient
 * 			value to account for the state bloat associated with its balance storage. If set to
 *			`true`, then non-zero balances may be stored without a `consumer` reference (and thus
 * 			an ED in the Balances pallet or whatever else is used to control user-account state
 *			growth).
 * 
 * `/accounts/:address/asset-approvals`
 * Returns:
 * - `at`: Block number and hash at which the call was made.
 * - `amount`: The amount of funds approved for the balance transfer from the owner 
 * 		to some delegated target.
 * - `deposit`: The amount reserved on the owner's account to hold this item in storage.
 * 
 * Substrate Reference: 
 * - Assets Pallet: https://crates.parity.io/pallet_assets/index.html
 * - `AssetBalance`: https://crates.parity.io/pallet_assets/struct.AssetBalance.html
 * - `ApprovalKey`: https://crates.parity.io/pallet_assets/struct.ApprovalKey.html
 * - `Approval`: https://crates.parity.io/pallet_assets/struct.Approval.html
 * 
 */
export default class AccountsAssetsController extends AbstractController<AccountsAssetsService> {
	constructor(api: ApiPromise) {
		super(api, '/accounts/:address/', new AccountsAssetsService(api));
		this.initRoutes();
	}

	protected initRoutes(): void {
		this.router.use(this.path, validateAddress);

		this.safeMountAsyncGetHandlers([
			['asset-balances', this.getAssetBalances],
			['asset-approvals', this.getAssetApprovals],
		]);
	}

	private getAssetBalances: RequestHandler = async (
		{ params: { address }, query: { at, assets } },
		res
	): Promise<void> => {
		const hash = await this.getHashFromAt(at);

		const assetsArray = Array.isArray(assets)
			? this.parseQueryParamArrayOrThrow(
					assets as string[],
					'`assets` query parameter is not in the correct format. Should be of the form `?assets[]=42&assets[]=3`. Reference the docs for more information.'
			  )
			: [];

		AccountsAssetsController.sanitizedSend(
			res,
			await this.service.fetchAssetBalances(hash, address, assetsArray)
		);
	};

	private getAssetApprovals: RequestHandler = async (
		{ params: { address }, query: { at, delegate, assetId } },
		res
	): Promise<void> => {
		const hash = await this.getHashFromAt(at);

		if (typeof delegate !== 'string' || typeof assetId !== 'string') {
			throw new BadRequest(
				'Must include a `delegate` and `assetId` query param'
			);
		}

		const id = this.parseNumberOrThrow(
			assetId,
			'`assetId` provided is not a number.'
		);

		AccountsAssetsController.sanitizedSend(
			res,
			await this.service.fetchAssetApproval(hash, address, id, delegate)
		);
	};
}
