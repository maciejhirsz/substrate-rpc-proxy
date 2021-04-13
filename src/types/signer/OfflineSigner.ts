import type { Signer, SignerResult } from '@polkadot/api/types';
import type { SignerPayloadRaw } from '@polkadot/types/types';
import { blake2AsHex } from '@polkadot/util-crypto';

import { Signature, encode } from './Signature';

export class OfflineSigner implements Signer {
	private result: SignerResult;
	private signature?: Signature;

	constructor(signature?: Signature) {
		this.signRaw = this.signRaw.bind(this);
		this.signature = signature;
		this.result = {
			signature: '',
			id: 0,
		}
	}

	public unsignedPayload(): string {
		return this.result.signature;
	}

	public unsignedResult(): SignerResult {
		return this.result;
	}

	public signRaw({ data }: SignerPayloadRaw): Promise<SignerResult> {
		return new Promise((resolve): void => {
			if (this.signature) {
				resolve({
					signature: encode(this.signature), // wtf? assume sr25519
					id: 0
				});
			} else {
				const hashed = (data.length > (256 + 1) * 2)
					? blake2AsHex(data)
					: data;

				this.result = {
					signature: hashed,
					id: 0
				}
				resolve({
					signature: '0x0100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
					id: -1
				});
			}
		});
	}
}

export default OfflineSigner;