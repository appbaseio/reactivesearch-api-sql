import { ConfigType, RSQuery } from "../types/types";

import Schema from '../validate/schema.js';
import { RSQuerySchema } from "./schema";
import { parseValue } from "./value";


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

	// Set the default type if it was not specified
	if (!query.type) {
		query.type = 'search'
	}

	// If `value` is specified then make sure dataField is
	// also passed.

	// Build the select * part of the sql string
	sqlQuery.push("select", query.includeFields.join(","))

	let tableToUse: string[] = []
	if (typeof query.table == "string") {
		tableToUse.push(query.table)
	} else {
		tableToUse = query.table
	}

	sqlQuery.push("from", tableToUse.join(","))

	// Parse the value
	const whereClause = parseValue(query)
	if (whereClause.length > 0) {
		sqlQuery.push("where", ...whereClause)
	}

	// Include the size
	if (!query.size) {
		query.size = 10;
	}

	sqlQuery.push("limit", String(query.size));

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