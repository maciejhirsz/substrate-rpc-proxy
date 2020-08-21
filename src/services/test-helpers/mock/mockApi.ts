import { ApiPromise } from '@polkadot/api';
import { Option } from '@polkadot/types/codec';
import {
	AccountId,
	ActiveEraInfo,
	Block,
	EraIndex,
	Extrinsic,
	Hash,
	RuntimeDispatchInfo,
	SessionIndex,
	StakingLedger,
} from '@polkadot/types/interfaces';

import { decoratedPolkadotMetadata } from '../../../test-helpers/metadata/decorated';
import { polkadotRegistry } from '../../../test-helpers/registries';
import {
	balancesTransferValid,
	blockHash789629,
	mockBlock789629,
	testAddressController,
} from '.';
import { events789629 } from './data/events789629Hex';
import { localListenAddressesHex } from './data/localListenAddresses';
import { validators789629Hex } from './data/validators789629Hex';

const eventsAt = (_hash: Hash) =>
	Promise.resolve().then(() =>
		polkadotRegistry.createType('Vec<EventRecord>', events789629)
	);

const chain = () =>
	Promise.resolve().then(() => {
		return polkadotRegistry.createType('Text', 'Polkadot');
	});

export const getBlock = (_hash: Hash): Promise<{ block: Block }> =>
	Promise.resolve().then(() => {
		return { block: mockBlock789629 };
	});

const getHeader = (_hash: Hash) =>
	Promise.resolve().then(() => mockBlock789629.header);

const getRuntimeVersion = () =>
	Promise.resolve().then(() => {
		return {
			specName: polkadotRegistry.createType('Text', 'polkadot'),
			specVersion: polkadotRegistry.createType('u32', 16),
			transactionVersion: polkadotRegistry.createType('u32', 2),
			implVersion: polkadotRegistry.createType('u32', 0),
			implName: polkadotRegistry.createType('Text', 'parity-polkadot'),
		};
	});

const getMetadata = () =>
	Promise.resolve().then(() => decoratedPolkadotMetadata.metadata);

const deriveGetHeader = () =>
	Promise.resolve().then(() => {
		return {
			author: polkadotRegistry.createType(
				'AccountId',
				'1zugcajGg5yDD9TEqKKzGx7iKuGWZMkRbYcyaFnaUaEkwMK'
			),
		};
	});

const nextFeeMultiplierAt = (_hash: Hash) =>
	Promise.resolve().then(() =>
		polkadotRegistry.createType('Fixed128', 1000000000)
	);

const validatorCountAt = (_hash: Hash) =>
	Promise.resolve().then(() => polkadotRegistry.createType('u32', 197));

const forceEraAt = (_hash: Hash) =>
	Promise.resolve().then(() =>
		polkadotRegistry.createType('Forcing', 'NotForcing')
	);

const eraElectionStatusAt = (_hash: Hash) =>
	Promise.resolve().then(() =>
		polkadotRegistry.createType('ElectionStatus', { Close: null })
	);

const validatorsAt = (_hash: Hash) =>
	Promise.resolve().then(() =>
		polkadotRegistry.createType('Vec<ValidatorId>', validators789629Hex)
	);

const currentSlotAt = (_hash: Hash) =>
	Promise.resolve().then(() => polkadotRegistry.createType('u64', 265876724));

const epochIndexAt = (_hash: Hash) =>
	Promise.resolve().then(() => polkadotRegistry.createType('u64', 330));

const genesisSlotAt = (_hash: Hash) =>
	Promise.resolve().then(() => polkadotRegistry.createType('u64', 265084563));

const currentIndexAt = (_hash: Hash) =>
	Promise.resolve().then(() =>
		polkadotRegistry.createType('SessionIndex', 330)
	);

export const activeEraAt = (_hash: Hash): Promise<Option<ActiveEraInfo>> =>
	Promise.resolve().then(() =>
		polkadotRegistry.createType('Option<ActiveEraInfo>', {
			index: 49,
			start: 1595259378000,
		})
	);

export const erasStartSessionIndexAt = (
	_hash: Hash,
	_activeEra: EraIndex
): Promise<Option<SessionIndex>> =>
	Promise.resolve().then(() =>
		polkadotRegistry.createType('Option<SessionIndex>', 330)
	);

const unappliedSlashesAt = (_hash: Hash, _activeEra: EraIndex) =>
	Promise.resolve().then(() =>
		polkadotRegistry.createType('Vec<UnappliedSlash>', [])
	);

const locksAt = (_hash: Hash, _address: string) =>
	Promise.resolve().then(() =>
		polkadotRegistry.createType(
			'Vec<BalanceLock>',
			'0x047374616b696e672000e8764817000000000000000000000002'
		)
	);

const accountAt = (_hash: Hash, _address: string) =>
	Promise.resolve().then(() =>
		polkadotRegistry.createType(
			'AccountInfo',
			'0x0600000003dbb656ab7400000000000000000000000000000000000000000000000000000000e8764817000000000000000000000000e87648170000000000000000000000'
		)
	);

export const bondedAt = (
	_hash: Hash,
	_address: string
): Promise<Option<AccountId>> =>
	Promise.resolve().then(() =>
		polkadotRegistry.createType('Option<AccountId>', testAddressController)
	);

const vestingAt = (_hash: Hash, _address: string) =>
	Promise.resolve().then(() =>
		polkadotRegistry.createType('Option<VestingInfo>', null)
	);

export const ledgerAt = (
	_hash: Hash,
	_address: string
): Promise<Option<StakingLedger>> =>
	Promise.resolve().then(() =>
		polkadotRegistry.createType(
			'Option<StakingLedger>',
			'0x2c2a55b5e0d28cc772b47bb9b25981cbb69eca73f7c3388fb6464e7d24be470e0700e87648170700e8764817008c000000000100000002000000030000000400000005000000060000000700000008000000090000001700000018000000190000001a0000001b0000001c0000001d0000001e0000001f000000200000002100000022000000230000002400000025000000260000002700000028000000290000002a0000002b0000002c0000002d0000002e0000002f000000'
		)
	);

const payeeAt = (_hash: Hash, _address: string) =>
	Promise.resolve().then(() =>
		polkadotRegistry.createType('RewardDestination', 'Controller')
	);

const slashingSpansAt = (_hash: Hash, _address: string) =>
	Promise.resolve().then(() => polkadotRegistry.createType('SlashingSpans'));

// For getting the blockhash of the genesis block
const getBlockHashGenesis = (_zero: number) =>
	Promise.resolve().then(() =>
		polkadotRegistry.createType(
			'BlockHash',
			'0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3'
		)
	);

export const queryInfoBalancesTransfer = (
	_extrinsic: string,
	_hash: Hash
): Promise<RuntimeDispatchInfo> =>
	Promise.resolve().then(() =>
		polkadotRegistry.createType('RuntimeDispatchInfo', {
			weight: 195000000,
			class: 'Normal',
			partialFee: 149000000,
		})
	);

export const submitExtrinsic = (_extrinsic: string): Promise<Hash> =>
	Promise.resolve().then(() => polkadotRegistry.createType('Hash'));

const getFinalizedHead = () => Promise.resolve().then(() => blockHash789629);

const health = () =>
	Promise.resolve().then(() =>
		polkadotRegistry.createType('Health', '0x7a000000000000000001')
	);

const localListenAddresses = () =>
	Promise.resolve().then(() =>
		polkadotRegistry.createType('Vec<Text>', localListenAddressesHex)
	);

const nodeRoles = () =>
	Promise.resolve().then(() =>
		polkadotRegistry.createType('Vec<NodeRole>', '0x0400')
	);

const localPeerId = () =>
	Promise.resolve().then(() =>
		polkadotRegistry.createType(
			'Text',
			'0x313244334b6f6f57415a66686a79717a4674796435357665424a78545969516b5872614d584c704d4d6a355a6f3471756431485a'
		)
	);

const pendingExtrinsics = () =>
	Promise.resolve().then(() => polkadotRegistry.createType('Vec<Extrinsic>'));

export const tx = (): Extrinsic =>
	polkadotRegistry.createType('Extrinsic', balancesTransferValid);

/**
 * Mock polkadot-js ApiPromise. Values are largely meant to be accurate for block
 * #789629, which is what most Service unit tests are based on.
 */
export const mockApi = ({
	createType: polkadotRegistry.createType.bind(polkadotRegistry),
	registry: polkadotRegistry,
	tx,
	query: {
		babe: {
			currentSlot: { at: currentSlotAt },
			epochIndex: { at: epochIndexAt },
			genesisSlot: { at: genesisSlotAt },
		},
		balances: {
			locks: { at: locksAt },
		},
		session: {
			currentIndex: { at: currentIndexAt },
			validators: { at: validatorsAt },
		},
		staking: {
			validatorCount: { at: validatorCountAt },
			forceEra: { at: forceEraAt },
			eraElectionStatus: { at: eraElectionStatusAt },
			activeEra: { at: activeEraAt },
			erasStartSessionIndex: { at: erasStartSessionIndexAt },
			unappliedSlashes: { at: unappliedSlashesAt },
			bonded: { at: bondedAt },
			ledger: { at: ledgerAt },
			payee: { at: payeeAt },
			slashingSpans: { at: slashingSpansAt },
		},
		system: {
			events: { at: eventsAt },
			account: { at: accountAt },
		},
		transactionPayment: {
			nextFeeMultiplier: { at: nextFeeMultiplierAt },
		},
		vesting: {
			vesting: { at: vestingAt },
		},
	},
	consts: {
		babe: {
			epochDuration: polkadotRegistry.createType('u64', 2400),
		},
		transactionPayment: {
			transactionByteFee: polkadotRegistry.createType('Balance', 1000000),
			weightToFee: [
				{
					coeffFrac: 80000000,
					coeffInteger: 0,
					degree: 1,
					negative: false,
				},
			],
		},
		staking: {
			electionLookAhead: polkadotRegistry.createType('BlockNumber'),
			sessionsPerEra: polkadotRegistry.createType('SessionIndex', 6),
		},
		system: {
			extrinsicBaseWeight: polkadotRegistry.createType('u64', 125000000),
		},
	},
	rpc: {
		chain: {
			getHeader,
			getBlock,
			getBlockHash: getBlockHashGenesis,
			getFinalizedHead,
		},
		state: {
			getRuntimeVersion,
			getMetadata,
		},
		system: {
			chain,
			health,
			localListenAddresses,
			nodeRoles,
			localPeerId,
		},
		payment: {
			queryInfo: queryInfoBalancesTransfer,
		},
		author: {
			submitExtrinsic,
			pendingExtrinsics,
		},
	},
	derive: {
		chain: {
			getHeader: deriveGetHeader,
		},
	},
} as unknown) as ApiPromise;
