import { ApiPromise } from '@polkadot/api';
import { BadRequest } from 'http-errors';

import { TransactionSendOfflineService } from '../../services';
import { IPostRequestHandler, ISendOffline } from '../../types/requests';
import AbstractController from '../AbstractController';

/**
 * Offline transaction builder.
 *
 * Returns:
 * - `phase`: The current phase in the workflow.
 * - `tx`: The prepared transaction ready for submission, only present if `phase` is `TransactionReady`.
 * - `payload`: The payload that must be signed, only present if `phase` is `SignatureRequired`. 
 *
 * Note: This follows the workflow of the @polkadot/signer-cli at https://github.com/polkadot-js/tools/tree/master/packages/signer-cli.
 */
export default class TransactionSendOfflineController extends AbstractController<TransactionSendOfflineService> {
	constructor(api: ApiPromise) {
		super(api, '/transaction/send-offline', new TransactionSendOfflineService(api));
		this.initRoutes();
	}

	protected initRoutes(): void {
		this.router.post(
			this.path,
			TransactionSendOfflineController.catchWrap(this.signOffline)
		);
	}

	private signOffline: IPostRequestHandler<ISendOffline> = async (
		{ body: { account, target, params, signature } },
		res
	): Promise<void> => {
		if (!account) {
			throw new BadRequest('Missing field `account` on request body.');
		}
        if (!target) {
			throw new BadRequest('Missing field `target` on request body.');
        }
        if (!params) {
			throw new BadRequest('Missing field `params` on request body.');
        }

        if(signature) {
            TransactionSendOfflineController.sanitizedSend(
                res,
                await this.service.createTransaction(account, target, params, signature)
            );
        } else {
            TransactionSendOfflineController.sanitizedSend(
                res,
                await this.service.createUnsignedPayload(account, target, params)
            );
        }
	};
}
