import type { AnyNumber, Codec, IExtrinsicEra, Signer } from '@polkadot/types/types';
import type { SignerOptions } from '@polkadot/api/submittable/types';

export interface Signature {
    type: "ed25519" | "sr25519" | "ecdsa";
    value: string;
}

export interface SignatureOptions {
    blockHash?: Uint8Array | string;
    era?: IExtrinsicEra | number;
    nonce?: AnyNumber | Codec;
    tip?: AnyNumber;
}

export interface SignedPayload extends Signature {
    options: SignatureOptions;
}

export function deserialize(signerOptions: SignatureOptions): Partial<SignerOptions> {
    return {
        blockHash: signerOptions.blockHash,
        nonce: signerOptions.nonce,
        era: signerOptions.era,
        tip: 0
    }
}

export function serialize(signerOptions: Partial<SignerOptions>): SignatureOptions {
    return {
        blockHash: signerOptions.blockHash,
        nonce: signerOptions.nonce,
        era: signerOptions.era,
        tip: 0
    }
}

export function encode(signature: Signature): string {
    const type: string = signature.type.toLowerCase(); // default to sr25519
    const payload: string = signature.value.startsWith("0x") ?
        signature.value.substring(2) :
        signature.value;

    if (type == "ed25519") {
        return "0x00" + payload;
    } else if (type == "sr25519") {
        return "0x01" + payload;
    } else if (type == "ecdsa") {
        return "0x01" + payload;
    }
    return "0x01" + payload; // wtf .. assume sr25519
}