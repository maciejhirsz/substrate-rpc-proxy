import { Request, Response } from 'express';
import { BadRequest } from 'http-errors';

import { validateAddressMiddleware } from './validateAddressMiddleware';

/**
 * Assert that `validateAddressMiddleware` does not error with a the given `req`.
 *
 * @param name thing it does not error on
 * @param req Express Request containing thing it errors on
 */
function doesNotErrorWith(name: string, req: Request): void {
	it(`does not error with ${name}`, () => {
		const next = jest.fn();
		validateAddressMiddleware(req, null as unknown as Response, next);
		expect(next).toBeCalledTimes(1);
		expect(next).toBeCalledWith();
	});
}

/**
 * Assert that `validateAddressMiddleware` passes `err` to next with the given
 * `req`.
 *
 * @param name thing it errors on
 * @param req Express Request containing thing it errors on
 * @param err expected error that it passes to next
 */
function errorsWith(name: string, req: Request, err: unknown): void {
	it(`errors with ${name}`, () => {
		const next = jest.fn();

		validateAddressMiddleware(req, null as unknown as Response, next);
		expect(next).toBeCalledTimes(1);
		expect(next).toBeCalledWith(err);
	});
}

describe('validateAddressMiddleware', () => {
	doesNotErrorWith('no address in params', {
		params: {
			number: '1',
		},
	} as unknown as Request);

	doesNotErrorWith('a valid substrate address', {
		params: {
			number: '1',
			address: '5EnxxUmEbw8DkENKiYuZ1DwQuMoB2UWEQJZZXrTsxoz7SpgG',
		},
	} as unknown as Request);

	doesNotErrorWith('a valid kusama address', {
		params: {
			number: '1',
			address: 'DXgXPAT5zWtPHo6FhVvrDdiaDPgCNGxhJAeVBYLtiwW9hAc',
		},
	} as unknown as Request);

	doesNotErrorWith('a valid kulupu address', {
		params: {
			number: '1',
			address: '2cYv9Gk6U4m4a7Taw9pG8qMfd1Pnxw6FLTvV6kYZNhGL6M9y',
		},
	} as unknown as Request);

	doesNotErrorWith('a valid edgeware address', {
		params: {
			number: '1',
			address: '5D24s4paTdVxddyeUzgsxGGiRd7SPhTnEvKu6XGPQvj1QSYN',
		},
	} as unknown as Request);

	doesNotErrorWith('a valid polkadot address', {
		params: {
			number: '1',
			address: '1xN1Q5eKQmS5AzASdjt6R6sHF76611vKR4PFpFjy1kXau4m',
		},
	} as unknown as Request);

	doesNotErrorWith('a valid H160 address', {
		params: {
			number: '1',
			address: '0xf24FF3a9CF04c71Dbc94D0b566f7A27B94566cac',
		},
	} as unknown as Request);

	errorsWith(
		'an address containing an invalid base58 char',
		{
			params: {
				number: '1',
				address: '5EnxIUmEbw8DkENKiYuZ1DwQuMoB2UWEQJZZXrTsxoz7SpgG',
			},
		} as unknown as Request,
		new BadRequest('Invalid base58 character "I" (0x49) at index 4')
	);

	errorsWith(
		'an address missing some bytes',
		{
			params: {
				number: '1',
				address: 'y9EMHt34JJo4rWLSaxoLGdYXvjgSXEd4zHUnQgfNzwES8b',
			},
		} as unknown as Request,
		new BadRequest('Invalid address format')
	);

	errorsWith(
		'an address with invalid decoded address checksum',
		{
			params: {
				number: '1',
				address: '5GoKvZWG5ZPYL1WUovuHW3zJBWBP5eT8CbqjdRY4Q6iMaDwU',
			},
		} as unknown as Request,
		new BadRequest('Invalid decoded address checksum')
	);

	errorsWith(
		'a nonsense address',
		{
			params: {
				number: '1',
				address: 'hello',
			},
		} as unknown as Request,
		new BadRequest('Invalid base58 character "l" (0x6c) at index 2')
	);
});
