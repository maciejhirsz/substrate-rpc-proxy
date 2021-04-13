
import { SignatureOptions } from '../signer';

export enum SendOfflinePhase {
	SignatureRequired = 'SignatureRequired',
	TransactionReady = 'TransactionReady',
}

export interface UnsignedPayload {
	unsigned: string;
	options: SignatureOptions;
}

export interface ISendOfflineResult {
	phase: SendOfflinePhase;
	payload?: UnsignedPayload;
	tx?: string;
}
