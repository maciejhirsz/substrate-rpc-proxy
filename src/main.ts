// Copyright 2017-2020 Parity Technologies (UK) Ltd.
// This file is part of Substrate API Sidecar.
//
// Substrate API Sidecar is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

import { ApiPromise } from '@polkadot/api';
import { WsProvider } from '@polkadot/rpc-provider';
import * as bodyParser from 'body-parser';
import { RequestHandler } from 'express';

import App from './App';
import Config, { ISidecarConfig } from './Config';
import * as controllers from './controllers';
import * as middleware from './middleware';

async function main() {
	const configOrNull = Config.GetConfig();

	if (!configOrNull) {
		console.log('Your config is NOT valid, exiting');
		process.exit(1);
	}

	const config: ISidecarConfig = configOrNull;

	// Instantiate a web socket connection to the node for basic polkadot-js use
	const api = await ApiPromise.create({
		provider: new WsProvider(config.WS_URL),
		types: {
			...config.CUSTOM_TYPES,
		},
	});

	const [chainName, { implName }] = await Promise.all([
		api.rpc.system.chain(),
		api.rpc.state.getRuntimeVersion(),
	]);

	console.log(
		`Connected to chain ${chainName.toString()} on the ${implName.toString()} client at ${
			config.WS_URL
		}`
	);

	// Create array of middleware that is to be mounted before the routes
	const preMiddleware: RequestHandler[] = [bodyParser.json()];
	if (config.LOG_MODE === 'errors') {
		preMiddleware.push(middleware.errorLogger);
	} else if (config.LOG_MODE === 'all') {
		preMiddleware.push(middleware.allLogger);
	}

	// Instantiate v0 controllers (note these will be removed upon the release of v1.0.0)
	const claimsController = new controllers.v0.v0Claims(api);
	const txArtifactsController = new controllers.v0.v0TransactionMaterial(api);
	const txFeeEstimateController = new controllers.v0.v0TransactionFeeEstimate(
		api
	);
	const txSubmitController = new controllers.v0.v0TransactionSubmit(api);
	const vestingController = new controllers.v0.v0AccountsVestingInfo(api);
	const balancesController = new controllers.v0.v0AccountsBalanceInfo(api);
	const stakingInfoController = new controllers.v0.v0AccountsStakingInfo(api);
	const v0blocksController = new controllers.v0.v0Blocks(api);
	const stakingController = new controllers.v0.v0PalletsStakingProgress(api);
	const metadataController = new controllers.v0.v0Metadata(api);

	const v0Controllers = [
		claimsController,
		txArtifactsController,
		txFeeEstimateController,
		txSubmitController,
		stakingInfoController,
		vestingController,
		balancesController,
		v0blocksController,
		stakingController,
		metadataController,
	];

	// Create our App
	const app = new App({
		preMiddleware,
		controllers: [
			new controllers.Blocks(api),
			new controllers.AccountsStakingPayouts(api),
			new controllers.AccountsBalanceInfo(api),
			new controllers.AccountsStakingInfo(api),
			new controllers.AccountsVestingInfo(api),
			new controllers.NodeNetwork(api),
			new controllers.NodeVersion(api),
			new controllers.NodeTransactionPool(api),
			new controllers.RuntimeCode(api),
			new controllers.RuntimeSpec(api),
			new controllers.RuntimeMetadata(api),
			new controllers.TransactionDryRun(api),
			new controllers.TransactionMaterial(api),
			new controllers.TransactionFeeEstimate(api),
			new controllers.TransactionSubmit(api),
			new controllers.palletsStakingProgress(api),
			...v0Controllers,
		],
		postMiddleware: [
			middleware.txError,
			middleware.httpError,
			middleware.error,
			middleware.legacyError,
			middleware.internalError,
		],
		port: config.PORT,
		host: config.HOST,
	});

	// Start the server
	app.listen();
}

process.on('SIGINT', function () {
	console.log('Caught interrupt signal, exiting...');
	process.exit(0);
});
main().catch(console.log);
