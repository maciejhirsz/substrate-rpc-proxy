import { ControllerConfig } from '../types/chains-config';

/**
 * Controllers that Sidecar will always default to. This likely will always be
 * the optimal controller selection for Polkadot and Kusama.
 */
export const defaultControllers: ControllerConfig = {
	Blocks: true,
	KulupuBlocks: false,
	AccountsStakingPayouts: true,
	AccountsBalanceInfo: true,
	AccountsStakingInfo: true,
	AccountsVestingInfo: true,
	NodeNetwork: true,
	NodeVersion: true,
	NodeTransactionPool: true,
	RuntimeCode: true,
	RuntimeSpec: true,
	RuntimeMetadata: true,
	TransactionDryRun: true,
	TransactionMaterial: true,
	TransactionFeeEstimate: true,
	TransactionSubmit: true,
	PalletsStakingProgress: true,
	PalletsStorageItem: true,
};
