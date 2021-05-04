import { BlockHash } from '@polkadot/types/interfaces';
import { InternalServerError } from 'http-errors';

import {
	BlocksTrace,
	BlocksTraceOperations,
} from '../../types/responses/BlocksTrace';
import { AbstractService } from '../AbstractService';
import { BlockTraceResponse, isBlockTrace, isTraceError, Trace } from './trace';

const DEFAULT_TARGETS = 'pallet,frame,state';
/**
 * These are the keys we pass as an arg to the RPC to filter events. We will get
 * storage events where they have a key whose prefix matches one of these.
 *
 * Equivalent of the storage keys for :extrinsic_index & frame_system::Account.
 * These are the storage keys we use to filter events to reduce payload size and
 * computational complexity for processing the data. For creating operations we
 * only need events for storage Get/Put to these two storage items.
 *
 * Note: frame_system::Account is the storage prefix for items in a map. In the
 * storage events we will get the actual entries of the map and use the key suffix
 * to extract the address.
 * ref: https://github.com/paritytech/substrate/blob/a604906c340c90e22fb20a8d77bcb3fee86c73c1/frame/system/src/lib.rs#L530-L538
 * learn about transparen keys: https://www.shawntabrizi.com/substrate/transparent-keys-in-substrate/
 *
 * Note: :extrinisc_index is the key for a single `u32` value that gets updated
 * during block execution to reflect the index of the current extrinsic being excuted.
 * ref: https://github.com/paritytech/substrate/blob/c93ef27486e5f14696e5b6d36edafea7936edbc8/primitives/storage/src/lib.rs#L169
 */
const DEFAULT_KEYS =
	'3a65787472696e7369635f696e646578,26aa394eea5630e07c48ae0c9558cef7b99d880ec681799c0cf30e8886371da9';

/**
 * Error response when the response from the rpc is not the shape of
 */
const UNEXPECTED_RPC_RESPONSE = 'Unexpected response to state_traceBlock RPC';

export class BlocksTraceService extends AbstractService {
	/**
	 * Get the state traces for a block.
	 *
	 * @param hash `BlockHash` to get traces at.
	 */
	async traces(hash: BlockHash): Promise<BlocksTrace> {
		const [{ number }, traceResponse] = await Promise.all([
			this.api.rpc.chain.getHeader(hash),
			// eslint-disable-next-line @typescript-eslint/ban-ts-comment
			// @ts-ignore
			// eslint-disable-next-line @typescript-eslint/no-unsafe-call
			this.api.rpc.state.traceBlock(
				hash,
				DEFAULT_TARGETS,
				DEFAULT_KEYS
			) as Promise<BlockTraceResponse>,
		]);

		if (isTraceError(traceResponse)) {
			throw new InternalServerError(
				`Error: ${JSON.stringify(traceResponse.traceError)}`
			);
		} else if (isBlockTrace(traceResponse)) {
			return {
				at: {
					hash,
					height: number.unwrap().toString(10),
				},
				storageKeys: traceResponse.blockTrace.storageKeys,
				tracingTargets: traceResponse.blockTrace.tracingTargets,
				events: traceResponse.blockTrace.events,
				spans: traceResponse.blockTrace.spans.sort((a, b) => a.id - b.id),
			};
		} else {
			throw new InternalServerError(UNEXPECTED_RPC_RESPONSE);
		}
	}

	/**
	 * Get the balance changing operations induced by a block.
	 *
	 * @param hash `BlockHash` to get balance transfer operations at.
	 * @param includeActions whether or not to include `actions` field in the response.
	 */
	async operations(
		hash: BlockHash,
		includeActions: boolean
	): Promise<BlocksTraceOperations> {
		const [{ block }, traceResponse] = await Promise.all([
			// Note: this should be getHeader, but the type registry on chain_getBlock is the only
			// one that actually has the historical types. This is a polkadot-js bug
			this.api.rpc.chain.getBlock(hash),
			// eslint-disable-next-line @typescript-eslint/ban-ts-comment
			// @ts-ignore
			// eslint-disable-next-line @typescript-eslint/no-unsafe-call
			this.api.rpc.state.traceBlock(
				hash,
				DEFAULT_TARGETS,
				DEFAULT_KEYS
			) as Promise<BlockTraceResponse>,
		]);

		if (isTraceError(traceResponse)) {
			throw new InternalServerError(
				`Error: ${JSON.stringify(traceResponse.traceError)}`
			);
		} else if (isBlockTrace(traceResponse)) {
			const trace = new Trace(
				this.api,
				traceResponse.blockTrace,
				block.registry
			);

			const { operations, actions } = trace.actionsAndOps();

			return {
				at: {
					hash,
					height: block.header.number.unwrap().toString(10),
				},
				operations,
				actions: includeActions ? actions : undefined,
			};
		} else {
			throw new InternalServerError(UNEXPECTED_RPC_RESPONSE);
		}
	}
}
