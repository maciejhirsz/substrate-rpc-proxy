import type { SignerOptions, } from '@polkadot/api/submittable/types';

import {
    ISendOfflineResult,
    SendOfflinePhase
} from '../../types/responses';
import {
    OfflineSigner,
    serialize,
    SignedPayload
} from '../../types/signer';
import { AbstractService } from '../AbstractService';
import { extractCauseAndStack } from './extractCauseAndStack';

export class TransactionSendOfflineService extends AbstractService {
    async createTransaction(
        account: string,
        target: string,
        params: string[],
        signature: SignedPayload,
    ): Promise<ISendOfflineResult> {
        const { api } = this;

        try {
            const [section, method] = target.split('.');
            const signer: OfflineSigner = new OfflineSigner(signature);
            // const signerOptions: deserialize(signature.options) // we need to deserialize these
            const signedBlock = await api.rpc.chain.getBlock();            
            const signerOptions: Partial<SignerOptions> = { 
                signer: signer,
                blockHash: signedBlock.block.header.hash,
                nonce: (await api.derive.balances.account(account)).accountNonce,
                era: api.createType('ExtrinsicEra', {
                    current: signedBlock.block.header.number,
                    period: 50
                }),
             }

            const transaction: any = api.tx[section][method](...params);

            await transaction.signAsync(account, signerOptions);

            return {
                phase: SendOfflinePhase.TransactionReady,
                tx: transaction.toHex(),
            }
        } catch (err) {
            const { cause, stack } = extractCauseAndStack(err);

            throw {
                error: 'Unable to create transaction',
                cause,
                stack,
            };
        }
    }

    async createUnsignedPayload(
        account: string,
        target: string,
        params: string[],
    ): Promise<ISendOfflineResult> {
        const { api } = this;

        try {
            const [section, method] = target.split('.');
            const signer: OfflineSigner = new OfflineSigner();
            const signedBlock = await api.rpc.chain.getBlock();
            const signerOptions: Partial<SignerOptions> = { 
                signer: signer,
                blockHash: signedBlock.block.header.hash,
                nonce: (await api.derive.balances.account(account)).accountNonce,
                era: api.createType('ExtrinsicEra', {
                    current: signedBlock.block.header.number,
                    period: 50
                }),
             }

            const transaction: any = api.tx[section][method](...params);

            await transaction.signAsync(account, signerOptions);

            return {
                phase: SendOfflinePhase.SignatureRequired,
                payload: {
                    unsigned: signer.unsignedPayload(),
                    options: serialize(signerOptions) // we want to dezerialize later..
                }
            }
        } catch (err) {
            const { cause, stack } = extractCauseAndStack(err);

            throw {
                error: 'Unable to sign request',
                cause,
                stack,
            };
        }
    }
}


