import { ApiPromise } from '@polkadot/api';
import { AccountInfo } from '@polkadot/types/interfaces';
import { Registry } from '@polkadot/types/types';
import { stringCamelCase } from '@polkadot/util';
import BN from 'bn.js';
import { InternalServerError } from 'http-errors';

import { IOption, isSome } from '../../../types/util';
import {
	ActionGroup,
	BlockTrace,
	KeyInfo,
	Operation,
	PAccountEvent,
	PActionEvent,
	PalletKeyInfo,
	PEvent,
	Phase,
	PhaseOther,
	SpanWithChildren,
	SpecialKeyInfo,
	TraceSpan,
} from './types';

const EMPTY_KEY_INFO = {
	error: 'key not found',
};

/**
 * Known spans
 */
const SPANS = {
	executeBlock: {
		name: 'execute_block',
		target: 'frame_executive',
	},
	applyExtrinsic: {
		name: 'apply_extrinsic',
		target: 'frame_executive',
	},
	onInitialize: {
		name: 'on_initialize',
		// Targets vary by pallet
	},
	onFinalize: {
		name: 'on_finalize',
		// Targets vary by pallet
	},
};

// In the future this will need a more chain specific solution that creates
// keys directly from expanded metadata.
/**
 * Get all the storage key names based on the ones built into `api`.
 *
 * @param api ApiPromise
 */
function getKeyNames(api: ApiPromise): Record<string, KeyInfo> {
	const moduleKeys = Object.keys(api.query).reduce((acc, mod) => {
		Object.keys(api.query[mod]).forEach((item) => {
			const queryObj = api.query[mod][item];
			let key;
			try {
				// Slice off '0x' prefix
				key = queryObj.key().slice(2);
			} catch {
				key = queryObj.keyPrefix().slice(2);
			}

			acc[key] = {
				module: mod,
				item,
			};
		});

		return acc;
	}, {} as Record<string, KeyInfo>);

	const wellKnownKeys = {
		'3a636f6465': {
			special: ':code',
		},
		'3a686561707061676573': {
			special: ':heappages',
		},
		'3a65787472696e7369635f696e646578': {
			special: ':extrinsic_index',
		},
		'3a6368616e6765735f74726965': {
			special: ':changes_trie',
		},
		'3a6368696c645f73746f726167653a': {
			special: ':child_storage:',
		},
	};

	return { ...moduleKeys, ...wellKnownKeys };
}

/**
 * Parses spans by
 * 1) creating a Map of span's `id` to the the span with its children
 * 2) creating an array with the same spans
 *
 * @param spans spans to parse
 */
function parseSpans(
	spans: TraceSpan[]
): {
	spansById: Map<number, SpanWithChildren>;
	parsedSpans: SpanWithChildren[];
	executeBlockSpanId: number;
} {
	// IMPORTANT for downstream logic: Make sure spans are sorted.
	// If this gets taken out, then **all** `Operation`s will need to be sorted on
	// `eventIndex` to ensure integrity in there ordering. (Ordering integrity
	// is not strictly neccesary for MVP balance reconciliation, but operating
	// under the assumption it may be neccesary for closer audits.)
	spans.sort((a, b) => a.id - b.id);

	const spansById = new Map<number, SpanWithChildren>();
	const parsedSpans = [];
	let executeBlockSpanId;
	for (const span of spans) {
		const spanWithChildren = { ...span, children: [] };

		if (
			span.name === SPANS.executeBlock.name &&
			span.target === SPANS.executeBlock.target
		) {
			if (executeBlockSpanId !== undefined) {
				throw new InternalServerError(
					'More than 1 execute block span found when only 1 was expected'
				);
			}
			executeBlockSpanId = span.id;
		}

		parsedSpans.push(spanWithChildren);
		spansById.set(span.id, spanWithChildren);
	}

	if (executeBlockSpanId === undefined) {
		throw new InternalServerError('execute_block span could not be found');
	}

	// Go through each span, and add its Id to the `children` array of its
	// parent span, creating a tree of spans starting with `execute_block` span as
	// the root.
	for (const span of spans) {
		if (!span.parentId) {
			continue;
		}

		if (!spansById.has(span.parentId)) {
			throw new InternalServerError(
				'Expected spans parent to exist in spansById'
			);
		}

		spansById.get(span.parentId)?.children.push(span.id);
	}

	return { spansById, parsedSpans, executeBlockSpanId };
}

/**
 * Find the Ids of all the descendant spans of `root`.
 *
 * @param root span which we want all the descendants of
 * @param spansById map of span id => span with children
 */
function findDescendants(
	root: number,
	spansById: Map<number, SpanWithChildren>
): number[] {
	// Note: traversal order doesn't matter here
	const stack = spansById.get(root)?.children;
	if (!stack) {
		return [];
	}

	const descendants = [];
	while (stack.length) {
		const curId = stack.pop();
		if (!curId) {
			break;
		}

		descendants.push(curId);

		const curSpanChildren = spansById.get(curId)?.children;
		curSpanChildren && stack.push(...curSpanChildren);
	}

	return descendants;
}

/**
 * Extract extrinsic indexes from all `:extrinsic_index` storage item read events.
 *
 * @param spanIds List of spanIds for an apply extrinsic action group
 * @param extrinsicIndexBySpanId Map of spanId => extrinsicIndex
 */
function extractExtrinsicIndex(
	spanIds: number[],
	extrinsicIndexBySpanId: Map<number, BN>
): BN {
	// There are typically multiple reads of extrinsic index when applying an extrinsic,
	// So we get all of those reads, which should all be the same number.
	const extrinsicIndex = spanIds.reduce((acc, id) => {
		if (!extrinsicIndexBySpanId.has(id)) {
			return acc;
		}

		acc.push(extrinsicIndexBySpanId.get(id) as BN);
		return acc;
	}, [] as BN[]);

	if (extrinsicIndex.length === 0) {
		// Since we assume the `spanIds` are for a span from an apply extrinsic action group,
		// we assume there is always an `:extrinsic_index` event
		throw new InternalServerError('Expected at least one extrinsic index');
	}

	if (extrinsicIndex.length > 1) {
		// If there are multiple reads we check that they are all the same. If they
		// are this program has some incorrect assumptions and this error should
		// be reported to the maintainers.
		for (const [i, extIdx] of extrinsicIndex.entries()) {
			if (i > 0 && !extrinsicIndex[i]?.eq(extIdx)) {
				throw new InternalServerError(
					'Expect extrinsic to only be applied at a single index.'
				);
			}
		}
	}

	return extrinsicIndex[0];
}

/**
 * Class for processing traces from the `state_traceBlock` RPC endpoint.
 *
 * Assumptions:
 * - Spans do not start in sorted order.
 * - Events start in sorted order.
 *
 * For a conceptual overview on traces from block excution and `Operation` construction
 * consult [this diagram.](https://docs.google.com/drawings/d/1vZoJo9jaXlz0LmrdTOgHck9_1LsfuQPRmTr-5g1tOis/edit?usp=sharing)
 */
export class Trace {
	/**
	 * Known storage keys.
	 */
	private keyNames;
	constructor(
		api: ApiPromise,
		/**
		 * `state_traceBlock` RPC response `result`.
		 */
		private traceBlock: BlockTrace,
		/**
		 * Type registry corresponding to the exact runtime the traces are from.
		 */
		private registry: Registry
	) {
		if (!traceBlock.spans.length) {
			throw new InternalServerError(
				'No spans found. This runtime is likely not supported with tracing.'
			);
		}

		this.keyNames = getKeyNames(api);
	}

	/**
	 * Derive the action groups and operations from the block trace.
	 *
	 * @returns the action groups and opertions
	 */
	actionsAndOps(): { actions: ActionGroup[]; operations: Operation[] } {
		const { spansById, parsedSpans: spans, executeBlockSpanId } = parseSpans(
			this.traceBlock.spans
		);
		const { eventsByParentId, extrinsicIndexBySpanId } = this.parseEvents(
			spansById
		);

		const operations: Operation[] = [];
		const actions: ActionGroup[] = [];
		// Create a list of action groups (`actions`) and a list of all `Operations`.
		for (const primary of spans) {
			if (!(primary.parentId === executeBlockSpanId)) {
				// Only use primary spans (spans where parentId === execute_block). All other
				// spans are either the executeBlockSpan or descendant of a primary span.
				continue;
			}

			// Gather the secondary spans and their events. Events are useful for
			// creating Operations. Spans are useful for attributing events to a
			// hook or extrinsic.
			// Keep in mind events are storage Get/Put events. The spans are used to
			// attribute events to some action in the block execution pipeline.
			const secondarySpansIds = findDescendants(primary.id, spansById);
			const secondarySpansEvents: PEvent[] = [];
			const secondarySpans: SpanWithChildren[] = [];
			secondarySpansIds.forEach((id) => {
				const events = eventsByParentId.get(id);
				const span = spansById.get(id);

				events && secondarySpansEvents.push(...events);
				span && secondarySpans.push(span);
			});

			let phase: PhaseOther, extrinsicIndex: BN | undefined;
			if (primary.name === SPANS.applyExtrinsic.name) {
				// This is an action group for an extrinsic application
				extrinsicIndex = extractExtrinsicIndex(
					// Pass in all the relevant spanIds of this action group
					secondarySpansIds.concat(primary.id),
					extrinsicIndexBySpanId
				);

				phase = Phase.ApplyExtrinsic;
			} else {
				// This is likely an action group for a pallet hook or some initial/final
				// block execution checks (i.e one of `initBlock`, `initialChecks`,
				// `onFinalize`, or `finalChecks`).
				// Note: `onInitialize` spans belong to the `initBlock` action group, so
				// we give that action group the phase `onInitialize`.

				phase = secondarySpans[0]
					? // This case catches `onInitialize` spans since they are the secondary
					  // spans of `initBlock`
					  stringCamelCase(secondarySpans[0]?.name)
					: // This case catches `onFinalize` since `onFinalize` spans are
					  // identified by the priamry spans name.
					  stringCamelCase(primary.name);
			}

			const events =
				eventsByParentId
					.get(primary.id)
					?.concat(secondarySpansEvents)
					.sort((a, b) => a.eventIndex - b.eventIndex) || [];

			const eventsWithPhaseInfo = events.map((e) => {
				return {
					...e,
					phase: {
						variant: phase,
						extrinsicIndex: extrinsicIndex,
					},
					primarySpanId: {
						id: primary.id,
						name: primary.name,
						target: primary.target,
					},
				};
			});

			operations.push(
				...this.deriveOperations(
					this.accountEventsByAddress(eventsWithPhaseInfo)
				)
			);

			// Primary span, and all associated descendant spans and events
			// representing an action group.
			actions.push({
				extrinsicIndex,
				phase,
				primarySpan: primary,
				secondarySpans,
				events: eventsWithPhaseInfo,
			});
		}

		return { actions, operations };
	}

	/**
	 * Extract an extrinsic index from an `:extrinsic_index` event. If it is not an
	 * `:extrinsic_index` event returns `null`.
	 *
	 * @param event a parsed event
	 */
	private maybeExtractIndex(event: PEvent): IOption<BN> {
		if (
			!(
				(event.storagePath as SpecialKeyInfo)?.special === ':extrinsic_index' &&
				event.data.stringValues.method == 'Get'
			)
		) {
			// Note: there are many read and writes of `:extrinsic_index` per extrinsic
			// so take care when modifying this logic.
			// Note: we only consider `Get` ops; `Put` ops are prep for next extrinsic.
			return null;
		}

		const indexEncodedOption = event.data.stringValues.result;
		if (!(typeof indexEncodedOption == 'string')) {
			throw new InternalServerError(
				'Expected there to be an encoded extrinsic index for extrinsic index event'
			);
		}

		const scale = indexEncodedOption
			.slice(2) // Slice of leading `Option` bits beacuse they cause trouble
			.match(/.{1,2}/g) // Reverse the order of the bytes for correct endian-ness
			?.reverse()
			.join('');
		const hex = `0x${scale || ''}`;

		return this.registry.createType('u32', hex).toBn();
	}

	/**
	 * Parse events by
	 * 1) Adding parent span info, event index and the storage item name to each event.
	 * Also adds the extrinsic index as an integer if there is an `:extrinsic_index` event.
	 * 2) Create a map of span id => array of children events
	 * 3) Create a map of span id => to extrinisic index
	 *
	 * @param spansById map of span id => to span with its children for all spans
	 * from tracing the block.
	 */
	private parseEvents(
		spansById: Map<number, SpanWithChildren>
	): {
		eventsByParentId: Map<number, PEvent[]>;
		extrinsicIndexBySpanId: Map<number, BN>;
	} {
		const extrinsicIndexBySpanId = new Map<number, BN>();
		const eventsByParentId = new Map<number, PEvent[]>();

		for (const [idx, event] of this.traceBlock.events.entries()) {
			const { key } = event.data.stringValues;
			const keyPrefix = key?.slice(0, 64);
			const storagePath = this.getStoragePathFromKey(keyPrefix);

			const p = spansById.get(event.parentId);
			const parentSpanId = p && {
				name: p.name,
				target: p.target,
				id: p.id,
			};

			const parsed = { ...event, storagePath, parentSpanId, eventIndex: idx };

			if (!eventsByParentId.has(parsed.parentId)) {
				eventsByParentId.set(parsed.parentId, [parsed]);
			} else {
				eventsByParentId.get(parsed.parentId)?.push(parsed);
			}

			const extrinsicIndexOpt = this.maybeExtractIndex(parsed);
			if (isSome(extrinsicIndexOpt)) {
				// Its ok to overwrite here, we just want thee last `:extrinsic_index` `Get`
				// in this span.
				extrinsicIndexBySpanId.set(parsed.parentId, extrinsicIndexOpt);
			}
		}

		return { eventsByParentId, extrinsicIndexBySpanId };
	}

	/**
	 * Create a mapping address => Account events for that address based on an
	 * array of all the events.
	 *
	 * This mapping is useful because we create operations based on consecutive
	 * gets/puts to a single accounts balance data. So later on we can just take all
	 * the account events from a single address and create `Operation`s from those.
	 *
	 * Note: Assumes passed in events are already sorted.
	 *
	 * @param events events with phase info
	 * @returns
	 */
	accountEventsByAddress(events: PActionEvent[]): Map<string, PAccountEvent[]> {
		return events.reduce((acc, cur) => {
			if (
				!(
					(cur.storagePath as PalletKeyInfo).module == 'system' &&
					(cur.storagePath as PalletKeyInfo).item == 'account'
				)
			) {
				// filter out non system::account events
				return acc;
			}

			const asAccount = this.toAccountEvent(cur);
			const address = asAccount.address.toString();

			if (!acc.has(address)) {
				acc.set(address, [asAccount]);
			} else {
				acc.get(address)?.push(asAccount);
			}

			return acc;
		}, new Map<string, PAccountEvent[]>());
	}

	/**
	 * Convert an `PActionEvent` to a `PAccountEvent` by adding the decoded `accountInfo`
	 * and `address`.
	 *
	 * Notes: will throw if event does not have system::account storagePath.
	 *
	 * @param event PActionEvent
	 */
	private toAccountEvent(event: PActionEvent): PAccountEvent {
		const { storagePath } = event;
		if (
			!(
				(storagePath as PalletKeyInfo).module == 'system' &&
				(storagePath as PalletKeyInfo).item == 'account'
			)
		) {
			throw new InternalServerError(
				'Event did not have system::account path as expected'
			);
		}

		// storage key = h(system) + h(account) + h(address) + address
		//								^^^^^^^^^^^^^^^^^^^^storage item prefix
		// Since this is a transparent key with the address at the end we can pull out
		// the address from the key. Here we slice off the storage key + account hash
		// (which is equal to 96 bytes).
		const addressRaw = event.data.stringValues.key?.slice(96);
		if (!(typeof addressRaw === 'string')) {
			throw new InternalServerError(
				'Expect encoded address in system::account event storage key'
			);
		}
		const address = this.registry.createType('Address', `0x${addressRaw}`);

		const accountInfoEncoded = event?.data?.stringValues?.result;
		if (!(typeof accountInfoEncoded === 'string')) {
			throw new InternalServerError(
				'Expect accountInfoEncoded to always be a string in system::Account event'
			);
		}
		const accountInfo = (this.registry.createType(
			'AccountInfo',
			`0x${accountInfoEncoded.slice(2)}` // Slice off the leading Option byte
		) as unknown) as AccountInfo;

		return { ...event, accountInfo, address };
	}

	/**
	 * Derive `Operation`s based on consecutive Get/Put events to an addresses `accountInfo`
	 * storage item.
	 *
	 * `Operation`s are created by checking for deltas in each field of `accountInfo` based
	 * on the previous event vs the current event.
	 *
	 * @param accountEventsByAddress map of address => events of that addresses `accountInfo`
	 * events.
	 */
	private deriveOperations(
		accountEventsByAddress: Map<string, PAccountEvent[]>
	): Operation[] {
		const ops = [];
		for (const events of accountEventsByAddress.values()) {
			for (const [i, e] of events.entries()) {
				if (i === 0) {
					// Skip the first event; we always compare previous event <=> current event.
					continue;
				}

				// Previous accountInfo.data
				const prev = events[i - 1].accountInfo.data;
				// Current accountInfo.data
				const cur = e.accountInfo.data;

				const free = cur.free.sub(prev.free);
				const reserved = cur.reserved.sub(prev.reserved);
				const miscFrozen = cur.miscFrozen.sub(prev.miscFrozen);
				const feeFrozen = cur.feeFrozen.sub(prev.feeFrozen);

				// Information that will go into any operation we create.
				const baseInfo = {
					phase: e.phase,
					parentSpanId: e.parentSpanId,
					primarySpanId: e.primarySpanId,
					eventIndex: e.eventIndex,
					address: e.address,
				};
				const currency = {
					// For now we assume everything is always in the same token
					symbol: this.registry.chainTokens[0],
				};
				// Base information for all `storage` values
				const systemAccountData = {
					pallet: 'system',
					item: 'Account',
					field1: 'data',
				};

				if (!free.eqn(0)) {
					ops.push({
						...baseInfo,
						storage: {
							...systemAccountData,
							field2: 'free',
						},
						amount: {
							value: free,
							currency,
						},
					});
				}
				if (!reserved.eqn(0)) {
					ops.push({
						...baseInfo,
						storage: {
							...systemAccountData,
							field2: 'reserved',
						},
						amount: {
							value: reserved,
							currency,
						},
					});
				}
				if (!miscFrozen.eqn(0)) {
					ops.push({
						...baseInfo,
						storage: {
							...systemAccountData,
							field2: 'miscFrozen',
						},
						amount: {
							value: miscFrozen,
							currency,
						},
					});
				}
				if (!feeFrozen.eqn(0)) {
					ops.push({
						...baseInfo,
						storage: {
							...systemAccountData,
							field2: 'feeFrozen',
						},
						amount: {
							value: feeFrozen,
							currency,
						},
					});
				}
			}
		}

		return ops;
	}

	/**
	 * Extract the storage item name based on the key prefix.
	 *
	 * @param key hex encoded storage key
	 * @returns KeyInfo
	 */
	private getStoragePathFromKey(key?: string): KeyInfo {
		return (
			((key && this.keyNames[key?.slice(0, 64)]) as KeyInfo) || EMPTY_KEY_INFO
		);
	}
}
