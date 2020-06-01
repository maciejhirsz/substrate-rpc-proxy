import AbstractInt from '@polkadot/types/codec/AbstractInt';
import { GenericCall } from '@polkadot/types/generic';

export function parseNumber(n: string): number {
	const num = Number(n);

	if (!Number.isInteger(num)) {
		throw { error: 'Invalid block number' };
	}

	return num;
}

// Note: this could be a good place to put any additional call parsing logic or
// even argument parsing logic.
// Takes in a call or an array that contains a call and recursively parses all calls.
export function parseCalls(data: any): any {
	if (data instanceof GenericCall){
		const { args, sectionName, methodName } = data;
		const argsWithParsedCalls = parseCalls(args);

		return {
			method: `${sectionName}.${methodName}`,
			args: argsWithParsedCalls,
		};
	} else if (Array.isArray(data)){

		return data.map(parseCalls);
	}

	return data;
}

// A sanitizer for arbitrary data that's going to be
// stringified to JSON. We find all instances of `AbstractInt`,
// which is using bn.js as backend, and forcibly serialize it
// to a decimal string.
export function sanitizeNumbers(data: any): any {
    if (typeof data === "number" || data instanceof AbstractInt) {
        return data.toString(10);
    }

    if (data instanceof Object) {
        if (data._raw != null && data._raw instanceof AbstractInt) {
            return data._raw.toString(10);
        }

        if (data.raw != null && data.raw instanceof AbstractInt) {
            return data.raw.toString(10);
        }

        if (typeof data.toJSON === "function") {
            const json = data.toJSON();

            if (Array.isArray(json)) {
                return data.map(sanitizeNumbers);
            }

            if (json instanceof Object) {
                const obj = {};

                for (const key of Object.keys(json)) {
                    if (key in data) {
                        // Prefer un-JSON-ified fields
                        obj[key] = sanitizeNumbers(data[key]);
                    } else {
                        obj[key] = sanitizeNumbers(json[key]);
                    }
                }

                return obj;
            }

            return json;
        }

        if (Array.isArray(data)) {
            return data.map(sanitizeNumbers);
        }

        const obj = {};
        for (const key of Object.keys(data)) {
            obj[key] = sanitizeNumbers(data[key]);
        }
        return obj;
    }

    return data;
}
