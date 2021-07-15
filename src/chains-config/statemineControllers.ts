import { ControllerConfig } from '../types/chains-config';

/**
 * Statemine configuration for Sidecar.
 */
export const statemineControllers: ControllerConfig = {
	controllers: [
		'AccountsAssets',
		'Blocks',
		'BlocksExtrinsics',
		'NodeNetwork',
		'NodeTransactionPool',
		'NodeVersion',
		'PalletsAssets',
		'RuntimeCode',
		'RuntimeMetadata',
		'RuntimeSpec',
		'TransactionDryRun',
		'TransactionFeeEstimate',
		'TransactionMaterial',
		'TransactionSubmit',
	],
	options: {
		finalizes: true,
		minCalcFeeRuntime: 1,
		blockWeightStore: {},
	},
};
