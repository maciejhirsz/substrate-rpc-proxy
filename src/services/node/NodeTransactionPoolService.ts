// import { Vec } from '@polkadot/types';
// import Extrinsic from '@polkadot/types/extrinsic/Extrinsic';
import { BlockHash } from '@polkadot/types/interfaces';

import { AbstractService } from '../AbstractService';

export class NodeTransactionPoolService extends AbstractService {
	async fetchTransactionPool(hash: BlockHash): Promise<{ pool: any }> {
		const api = await this.ensureMeta(hash);

		const pool = await api.rpc.author.pendingExtrinsics();

		return {
			pool,
		};
	}
}
