import { ApiPromise } from '@polkadot/api';
import { StorageKey } from '@polkadot/types';
import { AssetId, BlockHash } from '@polkadot/types/interfaces';

import {
	IAccountAssetApproval,
	IAccountAssetsBalances,
	IAssetBalance,
} from '../../types/responses';
import { AbstractService } from '../AbstractService';

export class AccountsAssetsService extends AbstractService {
	/**
	 * Fetch all the `AssetBalance`s alongside their `AssetId`'s for a given array of queried `AssetId`'s.
	 * If none are queried the function will get all AssetId's associated with the
	 * given `AccountId`, and send back all the `AssetsBalance`s.
	 *
	 * @param hash `BlockHash` to make call at
	 * @param address `AccountId` associated with the balances
	 * @param assets An array of `assetId`'s to be queried. If the length is zero
	 * all assetId's associated to the account will be queried
	 */
	async fetchAssetBalances(
		hash: BlockHash,
		address: string,
		assets: number[]
	): Promise<IAccountAssetsBalances> {
		const { api } = this;

		const { number } = await api.rpc.chain.getHeader(hash);

		let response;
		if (assets.length === 0) {
			/**
			 * This will query all assets and return them in an array
			 */
			const keys = await api.query.assets.asset.keysAt(hash);
			const assetIds = this.extractAssetIds(keys);

			response = await this.queryAssets(api, assetIds, address);
		} else {
			/**
			 * This will query all assets by the requested AssetIds
			 */
			response = await this.queryAssets(api, assets, address);
		}

		const at = {
			hash,
			height: number.unwrap().toString(10),
		};

		return {
			at,
			assets: response,
		};
	}

	/**
	 * Fetch all `AccountApproval`'s with a given `AssetId` and a `AssetApprovalKey`
	 * which consists of a `delegate` and an `owner`
	 *
	 * @param hash `BlockHash` to make call at
	 * @param address `AccountId` or owner associated with the approvals
	 * @param assetId `AssetId` associated with the `AssetApproval`
	 * @param delegate `delegate`
	 */
	async fetchAssetApproval(
		hash: BlockHash,
		address: string,
		assetId: number,
		delegate: string
	): Promise<IAccountAssetApproval> {
		const { api } = this;

		/**
		 * AssetApprovalKey, contains the `accountId` as the address key, and the
		 * delegate `accountId`. Both are required for a successfull query
		 */
		const approvalKey = { owner: address, delegate };

		const [{ number }, assetApproval] = await Promise.all([
			api.rpc.chain.getHeader(hash),
			api.query.assets.approvals(assetId, approvalKey),
		]);

		let amount = null,
			deposit = null;
		if (assetApproval.isSome) {
			({ amount, deposit } = assetApproval.unwrap());
		}

		const at = {
			hash,
			height: number.unwrap().toString(10),
		};

		return {
			at,
			amount,
			deposit,
		};
	}

	/**
	 * Takes in an array of `AssetId`s, and an `AccountId` and returns
	 * all balances tied to those `AssetId`s.
	 *
	 * @param api ApiPromise
	 * @param assets An Array of `AssetId`'s or numbers representing assetId's
	 * @param address An `AccountId` associated with the queried path
	 */
	async queryAssets(
		api: ApiPromise,
		assets: AssetId[] | number[],
		address: string
	): Promise<IAssetBalance[]> {
		return Promise.all(
			assets.map(async (assetId: AssetId | number) => {
				const assetBalance = await api.query.assets.account(assetId, address);

				return {
					assetId,
					balance: assetBalance.balance,
					isFrozen: assetBalance.isFrozen,
					isSufficient: assetBalance.isSufficient,
				};
			})
		);
	}

	/**
	 * @param keys An Array of storage keys used to extract `AssetId`'s
	 */
	extractAssetIds(keys: StorageKey<[AssetId]>[]): AssetId[] {
		return keys.map(({ args: [assetId] }) => assetId);
	}
}
