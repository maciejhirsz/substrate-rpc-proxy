import { RequestHandler } from 'express';
import { ParamsDictionary, Query } from 'express-serve-static-core';
import { SignedPayload } from  './signer';

/**
 * Body for RequestHandlerTx. In other words, the body of a POST route that sends an encoded transaction.
 */
export interface ITx {
	tx: string;
}

/**
 * Post Request - assuming no url params
 */
// eslint-disable-next-line @typescript-eslint/ban-types, @typescript-eslint/no-explicit-any
export type IPostRequestHandler<T> = RequestHandler<{}, any, T, Query>;

export interface INumberParam extends ParamsDictionary {
	number: string;
}

export interface IAddressParam extends ParamsDictionary {
	address: string;
}

export interface IAddressNumberParams extends IAddressParam {
	number: string;
}

export interface ISendOffline {
	account: string,
	blocks?: number;
	nonce?: number;
	target: string,
	params: string[],
	signature?: SignedPayload,
}

