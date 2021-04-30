import { ControllerConfig } from '../types/chains-config';

export const kulupuControllers: ControllerConfig = {
	controllers: {
		Blocks: true,
		BlocksExtrinsics: true,
		AccountsStakingPayouts: false,
		AccountsBalanceInfo: true,
		AccountsStakingInfo: false,
		AccountsVestingInfo: false,
		Assets: false,
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
		PalletsStakingProgress: false,
		PalletsStorage: true,
		Paras: false,
	},
	options: {
		finalizes: false,
		minCalcFeeRuntime: null,
		blockWeightStore: {},
	},
};
