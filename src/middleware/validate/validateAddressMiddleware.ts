import { isHex } from '@polkadot/util';
import {
	base58Decode,
	checkAddressChecksum,
	isEthereumAddress,
} from '@polkadot/util-crypto';
import { defaults } from '@polkadot/util-crypto/address/defaults';
import { RequestHandler } from 'express';
import { BadRequest } from 'http-errors';

/**
 * Express Middleware to validate that an `:address` param is properly formatted.
 */
export const validateAddressMiddleware: RequestHandler = (req, _res, next) => {
	if (!('address' in req.params)) {
		return next();
	}

	const [isValid, error] = checkAddress(req.params.address);

	if (!isValid && error) {
		return next(new BadRequest(error));
	}

	return next();
};

/**
 * Verify that an address is a valid substrate address.
 *
 * Note: this is very similar '@polkadot/util-crypto/address/checkAddress,
 * except it does not check the ss58 prefix and supports H256/H160 raw address.
 *
 * @param address potential ss58 or raw address
 */
function checkAddress(address: string): [boolean, string | undefined] {
	let u8Address;

	if (isHex(address)) {
		u8Address = Uint8Array.from(Buffer.from(address.slice(2), 'hex'));
	} else {
		try {
			u8Address = base58Decode(address);
		} catch (error) {
			return [false, (error as Error).message];
		}
	}

	if (defaults.allowedEncodedLengths.includes(u8Address.length)) {
		const [isValid] = checkAddressChecksum(u8Address);

		return [isValid, isValid ? undefined : 'Invalid decoded address checksum'];
	}

	if (isEthereumAddress(address)) {
		return [true, undefined];
	}

	return [false, 'Invalid address format'];
}
