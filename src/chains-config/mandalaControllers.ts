import { ControllerConfig } from '../types/chains-config';

/**
 * Controllers for mandala, acala's test network.
 */
export const mandalaControllers: ControllerConfig = {
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
	PalletsStorage: true,
};
