import { ApiPromise } from '@polkadot/api';
import { RequestHandler } from 'express';

import { NodeNetworkService } from '../../services';
import AbstractController from '../AbstractController';

/**
 * GET network information of the node.
 *
 * Returns
 * - `nodeRoles` Roles the node is running.
 * - `peers` Number of peers the node is connected to.
 * - `isSyncing` Whether or not the node is syncing. `False` indicates that the
 * 	node is in sync.
 * - `shouldHavePeers` Whether or not the node should be connected to peers. Might
 * 	be false for local chains or when running without discovery.
 * - `localPeerId` Local copy of the `PeerId`.
 * - `localListenAddresses` Multiaddresses that the local node is listening on.
 * 	The addresses include a trailing `/p2p/` with the local PeerId, and are thus
 *  suitable to be passed to `system_addReservedPeer` or as a bootnode address
 *  for example.
 * - `systemPeers` array of
 * 	- `peerId` Peer ID.
 *  - `roles` Roles.
 *  - `protocolVersion` Protocol version.
 *  - `bestHash` Peer best block hash.
 *  - `bestNumber` Peer best block number.
 */
export default class NodeNetworkController extends AbstractController<
	NodeNetworkService
> {
	constructor(api: ApiPromise) {
		super(api, '/node/network', new NodeNetworkService(api));
		this.initRoutes();
	}

	protected initRoutes(): void {
		this.safeMountAsyncGetHandlers([['', this.getNodeNetworking]]);
	}

	/**
	 * Get network information of the node.
	 *
	 * @param _req Express Request
	 * @param res Express Response
	 */
	private getNodeNetworking: RequestHandler = async (
		_req,
		res
	): Promise<void> => {
		const hash = await this.api.rpc.chain.getFinalizedHead();

		NodeNetworkController.sanitizedSend(
			res,
			await this.service.fetchNetwork(hash)
		);
	};
}
