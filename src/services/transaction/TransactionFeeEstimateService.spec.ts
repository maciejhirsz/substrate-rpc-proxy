/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { sanitizeNumbers } from '../../sanitize/sanitizeNumbers';
import {
	balancesTransferInvalid,
	balancesTransferValid,
	blockHash789629,
	mockApi,
	queryInfoBalancesTransfer,
} from '../mock';
import * as invalidResponse from './feeEstimateInvalid.json';
import * as validResponse from './feeEstimateValid.json';
import { TransactionFeeEstimateService } from './TransactionFeeEstimateService';

const transactionFeeEstimateService = new TransactionFeeEstimateService(
	mockApi
);

describe('TransactionFeeEstimateService', () => {
	describe('fetchTransactionFeeEstimate', () => {
		it('works with a valid a transaction', async () => {
			expect(
				sanitizeNumbers(
					await transactionFeeEstimateService.fetchTransactionFeeEstimate(
						blockHash789629,
						balancesTransferValid
					)
				)
			).toStrictEqual(validResponse);
		});

		it('catches ApiPromise throws and then throws the correct error format', async () => {
			const err = new Error(
				'2: Unable to query dispatch info.: Invalid transaction version'
			);
			err.stack =
				'Error: 2: Unable to query dispatch info.: Invalid transaction version\n  ... this is a unit test mock';

			(mockApi.rpc.payment as any).queryInfo = () =>
				Promise.resolve().then(() => {
					throw err;
				});

			await expect(
				transactionFeeEstimateService.fetchTransactionFeeEstimate(
					blockHash789629,
					balancesTransferInvalid
				)
			).rejects.toStrictEqual(invalidResponse);

			(mockApi.rpc.payment as any).queryInfo = queryInfoBalancesTransfer;
		});
	});
});
