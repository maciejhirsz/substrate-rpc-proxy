import { sanitizeNumbers } from '../../sanitize/sanitizeNumbers';
import { blockHash789629, mockApi } from '../test-helpers/mock';
import { AccountsAssetsService } from './AccountsAssetsService';

const accountsAssetsService = new AccountsAssetsService(mockApi);

describe('AccountsAssetsService', () => {
	const at = {
		hash: '0x7b713de604a99857f6c25eacc115a4f28d2611a23d9ddff99ab0e4f1c17a8578',
		height: '789629',
	};

	describe('AccountsAssetsService.fetchAssetBalances', () => {
		it('Should return the correct response with the assets param', async () => {
			const expectedResponse = {
				at,
				assets: [
					{
						assetId: '10',
						balance: '10000000',
						isFrozen: false,
						isSufficient: true,
					},
					{
						assetId: '20',
						balance: '20000000',
						isFrozen: true,
						isSufficient: true,
					},
				],
			};

			const response = await accountsAssetsService.fetchAssetBalances(
				blockHash789629,
				'0xffff', // AccountId arg here does not affect the test results
				[10, 20]
			);

			expect(sanitizeNumbers(response)).toStrictEqual(expectedResponse);
		});

		it('Should return the correct response without the assets param', async () => {
			const expectedResponse = {
				at,
				assets: [
					{
						assetId: '10',
						balance: '10000000',
						isFrozen: false,
						isSufficient: true,
					},
					{
						assetId: '20',
						balance: '20000000',
						isFrozen: true,
						isSufficient: true,
					},
					{
						assetId: '30',
						balance: '20000000',
						isFrozen: false,
						isSufficient: false,
					},
					{
						assetId: '30',
						balance: '20000000',
						isFrozen: false,
						isSufficient: false,
					},
					{
						assetId: '30',
						balance: '20000000',
						isFrozen: false,
						isSufficient: false,
					},
				],
			};

			const response = await accountsAssetsService.fetchAssetBalances(
				blockHash789629,
				'0xffff',
				[]
			);

			expect(sanitizeNumbers(response)).toStrictEqual(expectedResponse);
		});
	});

	describe('AccountsAssetsService.fetchAssetApproval', () => {
		it('Should return the correct response', async () => {
			const expectedResponse = {
				at,
				amount: '10000000',
				deposit: '2000000',
			};

			const response = await accountsAssetsService.fetchAssetApproval(
				blockHash789629,
				'',
				10,
				''
			);

			expect(sanitizeNumbers(response)).toStrictEqual(expectedResponse);
		});
	});
});
