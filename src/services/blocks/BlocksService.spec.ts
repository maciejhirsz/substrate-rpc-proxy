/* eslint-disable @typescript-eslint/no-unsafe-call */
import { ApiPromise } from '@polkadot/api';
import { RpcPromiseResult } from '@polkadot/api/types/rpc';
import { GenericExtrinsic } from '@polkadot/types';
import { GenericCall } from '@polkadot/types/generic';
import { BlockHash, Hash, SignedBlock } from '@polkadot/types/interfaces';

import { sanitizeNumbers } from '../../sanitize/sanitizeNumbers';
import { createCall } from '../../test-helpers/createCall';
import {
	kusamaRegistry,
	polkadotRegistry,
} from '../../test-helpers/registries';
import {
	blockHash789629,
	getBlock,
	mockApi,
	mockBlock789629,
	mockForkedBlock789629
} from '../test-helpers/mock';
import * as block789629 from '../test-helpers/mock/data/block789629.json';
import * as blocks789629Response from '../test-helpers/responses/blocks/blocks789629.json';
import { BlocksService } from './BlocksService';

/**
 * For type casting mock getBlock functions so tsc does not complain
 */
type GetBlock = RpcPromiseResult<
	(hash?: string | BlockHash | Uint8Array | undefined) => Promise<SignedBlock>
>;

/**
 * BlockService mock
 */
const blocksService = new BlocksService(mockApi);

describe('BlocksService', () => {
	describe('fetchBlock', () => {
		it('works when ApiPromise works (block 789629)', async () => {
			expect(
				sanitizeNumbers(
					await blocksService.fetchBlock(blockHash789629, true, true, false, false)
				)
			).toMatchObject(blocks789629Response);
		});

		it('throws when an extrinsic is undefined', async () => {
			// Create a block with undefined as the first extrinisic and the last extrinsic removed
			const mockBlock789629BadExt = polkadotRegistry.createType(
				'Block',
				block789629
			);
			mockBlock789629BadExt.extrinsics.pop();
			mockBlock789629BadExt.extrinsics.unshift(
				(undefined as unknown) as GenericExtrinsic
			);

			mockApi.derive.chain.getBlock = (() =>
				Promise.resolve().then(() => {
					return {
						block: mockBlock789629BadExt,
					};
				}) as unknown) as GetBlock;

			await expect(
				blocksService.fetchBlock(blockHash789629, false, false, false, false)
			).rejects.toThrow(
				new Error(
					`Cannot destructure property 'method' of 'extrinsic' as it is undefined.`
				)
			);

			mockApi.derive.chain.getBlock = (getBlock as unknown) as GetBlock;
		});
	});

	describe('createCalcFee & calc_fee', () => {
		it('calculates partialFee for proxy.proxy in polkadot block 789629', async () => {
			// tx hash: 0x6d6c0e955650e689b14fb472daf14d2bdced258c748ded1d6cb0da3bfcc5854f
			const { calcFee } = await blocksService['createCalcFee'](
				mockApi,
				('0xParentHash' as unknown) as Hash,
				mockBlock789629
			);

			expect(calcFee?.calc_fee(BigInt(399480000), 534)).toBe('544000000');
		});

		it('calculates partialFee for utility.batch in polkadot block 789629', async () => {
			// tx hash: 0xc96b4d442014fae60c932ea50cba30bf7dea3233f59d1fe98c6f6f85bfd51045
			const { calcFee } = await blocksService['createCalcFee'](
				mockApi,
				('0xParentHash' as unknown) as Hash,
				mockBlock789629
			);

			expect(calcFee?.calc_fee(BigInt(941325000000), 1247)).toBe(
				'1257000075'
			);
		});
	});

	describe('BlocksService.parseGenericCall', () => {
		const transfer = createCall('balances', 'transfer', {
			value: 12,
			dest: kusamaRegistry.createType(
				'AccountId',
				'14E5nqKAp3oAJcmzgZhUD2RcptBeUBScxKHgJKU4HPNcKVf3'
			), // Bob
		});

		const transferOutput = {
			method: {
				pallet: 'balances',
				method: 'transfer',
			},
			args: {
				dest: '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty',
				value: 12,
			},
		};

		it('does not handle an empty object', () =>
			expect(() =>
				blocksService['parseGenericCall'](
					({} as unknown) as GenericCall,
					mockBlock789629.registry
				)
			).toThrow());

		it('parses a simple balances.transfer', () => {
			expect(
				JSON.stringify(
					blocksService['parseGenericCall'](
						transfer,
						mockBlock789629.registry
					)
				)
			).toBe(JSON.stringify(transferOutput));
		});

		it('parses utility.batch nested 4 deep', () => {
			const batch1 = createCall('utility', 'batch', {
				calls: [transfer],
			});

			const batch2 = createCall('utility', 'batch', {
				calls: [batch1, transfer],
			});

			const batch3 = createCall('utility', 'batch', {
				calls: [batch2, transfer],
			});

			const batch4 = createCall('utility', 'batch', {
				calls: [batch3, transfer],
			});

			const baseBatch = {
				method: {
					pallet: 'utility',
					method: 'batch',
				},
				args: {
					calls: [],
				},
			};

			expect(
				JSON.stringify(
					blocksService['parseGenericCall'](
						batch4,
						mockBlock789629.registry
					)
				)
			).toBe(
				JSON.stringify({
					...baseBatch,
					args: {
						calls: [
							{
								...baseBatch,
								args: {
									calls: [
										{
											...baseBatch,
											args: {
												calls: [
													{
														...baseBatch,
														args: {
															calls: [
																transferOutput,
															],
														},
													},
													transferOutput,
												],
											},
										},
										transferOutput,
									],
								},
							},
							transferOutput,
						],
					},
				})
			);
		});

		it('handles a batch sudo proxy transfer', () => {
			const proxy = createCall('proxy', 'proxy', {
				forceProxyType: 'Any',
				call: transfer,
			});

			const sudo = createCall('sudo', 'sudo', {
				call: proxy,
			});

			const batch = createCall('utility', 'batch', {
				calls: [sudo, sudo, sudo],
			});

			const sudoOutput = {
				method: {
					pallet: 'sudo',
					method: 'sudo',
				},
				args: {
					call: {
						method: {
							pallet: 'proxy',
							method: 'proxy',
						},
						args: {
							real:
								'5C4hrfjw9DjXZTzV3MwzrrAr9P1MJhSrvWGWqi1eSuyUpnhM',
							force_proxy_type: 'Any',
							call: transferOutput,
						},
					},
				},
			};

			expect(
				JSON.stringify(
					blocksService['parseGenericCall'](
						batch,
						mockBlock789629.registry
					)
				)
			).toEqual(
				JSON.stringify({
					method: {
						pallet: 'utility',
						method: 'batch',
					},
					args: {
						calls: [sudoOutput, sudoOutput, sudoOutput],
					},
				})
			);
		});
	});

	describe('BlockService.isFinalizedBlock', () => {
		it('Returns false when queried blockId is on a fork', async () => {
			const getHeader = (_hash: Hash) =>
				Promise.resolve().then(() => mockForkedBlock789629.header); 

			const getBlockHash = (_zero: number) =>
				Promise.resolve().then(() =>
					polkadotRegistry.createType(
						'BlockHash',
						'0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3'
					)
				);

			const forkMockApi = ({
				rpc: {
					chain: {
						getHeader,
						getBlockHash,
					}
				}
			}) as ApiPromise;

			const queriedHash = polkadotRegistry.createType(
				'BlockHash',
				'0x7b713de604a99857f6c25eacc115a4f28d2611a23d9ddff99ab0e4f1c17a8578'
			);

			const blockNumber = polkadotRegistry.createType(
				'Compact<BlockNumber>',
				789629
			);

			const finalizedHead = polkadotRegistry.createType(
				'BlockHash',
				'0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3'
			);

			expect(
				await blocksService['isFinalizedBlock'](
					forkMockApi,
					blockNumber,
					queriedHash,
					finalizedHead,
					true
				)
			).toEqual(false);
		});

		it('Returns true when finalized tag is not on a fork', async () => {
			const queriedHash = polkadotRegistry.createType(
				'BlockHash',
				'0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3'
			);

			const blockNumber = polkadotRegistry.createType(
				'Compact<BlockNumber>',
				789629
			);

			const finalizedHead = polkadotRegistry.createType(
				'BlockHash',
				'0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3'
			);

			expect(
				await blocksService['isFinalizedBlock'](
					mockApi,
					blockNumber,
					queriedHash,
					finalizedHead,
					true
				)
			).toEqual(true);
		});
	});
});
