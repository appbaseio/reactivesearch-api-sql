import { ConfigType, RSQuery, ResponseObject } from "../types/types";

import Schema from '../validate/schema.js';
import { RSQuerySchema } from "./schema";
import { parseSortClause, parseValue } from "./value";


const getSQLForQuery = (query: RSQuery<any>): string => {
	/**
	 * Get the SQL equivalent of the query and accordingly return the
	 * SQL string.
	 */
	let sqlQuery: string[] = []

	// If `defaultQuery` is present, we don't need to build a query
	if (query.defaultQuery && query.defaultQuery.query) {
		return query.defaultQuery.query
	}

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

	let isWhereInjected = false

	// Parse the value
	const whereClause = parseValue(query)
	if (whereClause.length > 0) {
		sqlQuery.push("where", ...whereClause)
		isWhereInjected = true
	}
	
	// If custom where clause is present, append it
	if (query.where && query.where != "") {
		if (isWhereInjected) {
			// Figure out the queryFormat to use
			if (!query.queryFormat) {
				query.queryFormat = "or"
			}
			sqlQuery.push(query.queryFormat, query.where)
		}
		else sqlQuery.push("where", query.where)
	}

	// Parse the `sortField` and `sortBy` fields.
	const sortClause = parseSortClause(query)
	if (sortClause.length > 0) {
		sqlQuery.push("order", "by", ...sortClause)
	}

	// Include the size
	if (!query.size) {
		query.size = 10;
	}

	sqlQuery.push("limit", String(query.size));

	// Add support for offset if it is present
	if (query.from) {
		sqlQuery.push("offset", String(query.from))
	}

	return sqlQuery.join(" ") + ";"
}

const executeQuery = async (client: any, sqlQuery: string) => {
	/**
	 * Execute the passed query and accordingly parse
	 * the response into RS equivalent.
	 */
	const results = await client.unsafe(sqlQuery);
	return results
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
			if (rsQuery.execute !== undefined && !rsQuery.execute) return

			const queryForId = getSQLForQuery(rsQuery)
			idToQueryMap[rsQuery.id!] = queryForId
		})

		return idToQueryMap
	};

	query = (data: RSQuery<any>[]): any => {
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
			if (rsQuery.execute !== undefined && !rsQuery.execute) return

			const queryForId = getSQLForQuery(rsQuery)
			idToQueryMap[rsQuery.id!] = queryForId
		})

		// Run each SQL query simultaneously and capture the results together
		try {
			const totalStart = performance.now();
			return Promise.all(
				Object.keys(idToQueryMap).map(async (item: any) => {
					const start = performance.now();
					const query = idToQueryMap[item];

					try {
						const response = await executeQuery(this.config.client, query);
						const end = performance.now();
						const took = Math.abs(end - start) || 1;

						return {
							id: item,
							response, took
						}
					} catch (err) {
						const end = performance.now();
						const took = Math.abs(end - start) || 1;
						console.log(err.stack);
						return {
							id: item,
							error: {
								id: item,
								hits: null,
								error: err.toString(),
								status: 500,
							},
							took,
						};
					}
				})
			).then((res) => {
				const totalEnd = performance.now();
				const totalTimeTaken = Math.abs(totalEnd - totalStart) || 1;

				const transformedRes = this.transformResponse(
					totalTimeTaken,
					<ResponseObject[]>res,
				);

				return transformedRes;
			});
		} catch(err) {
			throw err
		}
	}

	transformResponse = (totalTimeTaken: number, data: ResponseObject[]): any => {
		const transformedRes: any = {};
		data.forEach((item: any) => {
			const { id, response, error, took } = item;
			if (error) {
				return transformedRes[id] = error;
			}

			const responseBody = {
				took: Math.round(took * 100) / 100,
				hits: {
					total: {
						value: response.length
					},
					hits: response.map((r: Object) => {
						return {
							_score: 1,
							_source: r
						}
					})
				}
			}

			return transformedRes[id] = responseBody
		});

		transformedRes["settings"] = {
			took: Math.round(totalTimeTaken * 100) / 100,
		}

		return transformedRes;
	};
}