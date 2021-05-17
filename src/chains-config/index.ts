import { ApiPromise } from '@polkadot/api';
import AbstractController from 'src/controllers/AbstractController';
import { AbstractService } from 'src/services/AbstractService';

import { controllers } from '../controllers';
import { ControllerConfig } from '../types/chains-config';
import { defaultControllers } from './defaultControllers';
import { dockMainnetControllers } from './dockMainnetControllers';
import { dockTestnetControllers } from './dockTestnetControllers';
import { kiltControllers } from './kiltControllers';
import { kulupuControllers } from './kulupuControllers';
import { kusamaControllers } from './kusamaControllers';
import { mandalaControllers } from './mandalaControllers';
import { polkadotControllers } from './polkadotControllers';
import { westendControllers } from './westendControllers';

const specToControllerMap = {
	westend: westendControllers,
	polkadot: polkadotControllers,
	kusama: kusamaControllers,
	kulupu: kulupuControllers,
	kilt: kiltControllers,
	mandala: mandalaControllers,
	'dock-testnet': dockTestnetControllers,
	'dock-main-runtime': dockMainnetControllers,
};

/**
 * Return an array of instantiated controller instances based off of a `specName`.
 *
 * @param api ApiPromise to inject into controllers
 * @param implName
 */
export function getControllersForSpec(
	api: ApiPromise,
	specName: string
): AbstractController<AbstractService>[] {
	if (specToControllerMap[specName]) {
		return getControllersFromConfig(api, specToControllerMap[specName]);
	}

	// If we don't have the specName in the specToControllerMap we use the default
	// contoller config
	return getControllersFromConfig(api, defaultControllers);
}

/**
 * Return an array of instantiated controller instances based off of a
 * `ControllerConfig`.
 *
 * @param api ApiPromise to inject into controllers
 * @param config controller mount configuration object
 */
function getControllersFromConfig(api: ApiPromise, config: ControllerConfig) {
	const controllersToInclude = config.controllers;

	return controllersToInclude.reduce((acc, controller) => {
		acc.push(new controllers[controller](api, config.options));

		return acc;
	}, [] as AbstractController<AbstractService>[]);
}
