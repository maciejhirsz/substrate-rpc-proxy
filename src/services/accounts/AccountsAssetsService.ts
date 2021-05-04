import { ApiPromise } from '@polkadot/api';
import { StorageKey } from '@polkadot/types';
import { AssetId, BlockHash } from '@polkadot/types/interfaces';
import { AccountId } from '@polkadot/types/interfaces/runtime';
import { AnyNumber } from '@polkadot/types/types';

import { IAccountAssetApproval } from '../../types/responses';
import { IAccountAssetsBalanceVec } from '../../types/responses';
import { AbstractService } from '../AbstractService';

export class AccountsAssetsService extends AbstractService {
	constructor(api: ApiPromise) {
		super(api);
	}

	async fetchAssetBalances(
		hash: BlockHash,
		address: string,
		assets: number[] | []
	): Promise<IAccountAssetsBalanceVec> {
		const { api } = this;

		const { number } = await api.rpc.chain.getHeader(hash);

		let response;
		if (assets.length === 0) {
			/**
			 * This will query all assets and return them in an array
			 */
			const keys = await api.query.assets.account.keysAt(hash);
			const assetIds = this.extractAssetIds(keys);

			const queryAllAssets = async () =>
				await Promise.all(
					assetIds.map((assetId: AssetId) =>
						api.query.assets.account(assetId, address)
					)
				);
			response = (await queryAllAssets()).map((asset, i) => {
				return {
					assetId: assetIds[i],
					balance: asset.balance,
					isFrozen: asset.isFrozen,
					isSufficient: asset.isSufficient,
				};
			});
		} else {
			/**
			 * This will query all assets by the requested AssetIds
			 */
			const queryAllAssets = async () =>
				await Promise.all(
					assets.map((assetId: number | AnyNumber) =>
						api.query.assets.account(assetId, address)
					)
				);

			response = (await queryAllAssets()).map((asset, i) => {
				return {
					assetId: assets[i],
					balance: asset.balance,
					isFrozen: asset.isFrozen,
					isSufficient: asset.isSufficient,
				};
			});
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

		const { amount, deposit } = assetApproval.unwrap();

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

	extractAssetIds(keys: StorageKey<[AssetId, AccountId]>[]): AssetId[] {
		return keys.map(({ args: [assetId] }) => assetId).sort((a, b) => a.cmp(b));
	}
}
