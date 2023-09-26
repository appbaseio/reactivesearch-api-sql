import { ConfigType, RSQuery } from "../types/types";

import Schema from '../validate/schema.js';
import { RSQuerySchema } from "./schema";


const getSQLForQuery = (query: RSQuery<any>): string => {
	/**
	 * Get the SQL equivalent of the query and accordingly return the
	 * SQL string.
	 */
	let sqlQuery: string[] = []

	// Make sure that table is always passed
	if (!query.table) {
		throw Error("`table` is a required property!");
	}

	if (!query.includeFields) {
		query.includeFields = ["*"]
	}

	// Build the select * part of the sql string
	sqlQuery.push("select", query.includeFields.join(","))

	let tableToUse: string[] = []
	if (typeof query.table == "string") {
		tableToUse.push(query.table)
	} else {
		tableToUse = query.table
	}

	sqlQuery.push("from", tableToUse.join(","))

	return sqlQuery.join(" ") + ";"
}

export class ReactiveSearch {
    config: ConfigType;
    // @ts-ignore
	schema: Schema;
    
    constructor(config: ConfigType) {
        this.config = {
			client: config.client,
            databaseName: config.databaseName,
        }

        // @ts-ignore
		this.schema = new Schema(RSQuerySchema, { strip: false });
    }


    verify = (data: RSQuery<any>[]): any => {
		const errors: string[] = [];
		for (const x of data) {
			// // If x is `defaultQuery` and the value is {}, set it to null
			// if (x.defaultQuery && typeof(x.defaultQuery) == "object") {
			// 	x.defaultQuery = null
			// }

			const error = this.schema.validate(x);
			if (error.length > 0) {
				errors.push(error.toString());
			} else {
				errors.push("");
			}
		}
		if (errors.filter((x) => x != "").length === 0) {
			return null;
		} else {
			return errors;
		}
	};

	translate = (data: RSQuery<any>[]): Record<string, any> => {
		const error = this.verify(data);
		if (error) {
			return {
				error: {
					error,
					code: 400,
					status: `Bad Request`,
				},
			};
		}

		const idToQueryMap: {[key: string]: string} = {}
		data.forEach(rsQuery => {
			const queryForId = getSQLForQuery(rsQuery)
			idToQueryMap[rsQuery.id!] = queryForId
		})

		return idToQueryMap
	};
}