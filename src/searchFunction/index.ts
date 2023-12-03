import { ConfigType, RSQuery, ResponseObject, SQLQueryObject, executeFn } from "../types/types";

import Schema from '../validate/schema.js';
import { getEmbeddingForValue } from "./openai";
import { buildRangeQuery } from "./range";
import { RSQuerySchema } from "./schema";
import { buildTermQuery, buildVectorClause, parseSortClause, parseValue, transformTermQueryResponse } from "./value";


const TOTAL_COUNT_FIELD: string = 'total_count__rs';


const getSQLForQuery = (query: RSQuery<any>, isValidate: boolean = false): SQLQueryObject => {
	/**
	 * Get the SQL equivalent of the query and accordingly return the
	 * SQL string.
	 */
	let sqlQuery: string[] = []

	// If `defaultQuery` is present, we don't need to build a query
	if (query.defaultQuery && query.defaultQuery.query) {
		return {
			statement: query.defaultQuery.query
		}
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

	let tableToUse: string[] = []
	if (typeof query.table == "string") {
		tableToUse.push(query.table)
	} else {
		tableToUse = query.table
	}

	// If it's a term query, handle it separately altogether and
	// if it is not then continue execution.
	if (query.type === "term") {
		// Handle it.
		return buildTermQuery(query, tableToUse);
	} else if (query.type === "range") {
		// Return a range query built directly.
		return buildRangeQuery(query, tableToUse);
	}

	// If `value` is specified then make sure dataField is
	// also passed.

	// Build the select * part of the sql string
	sqlQuery.push("select", query.includeFields.join(","));

	// Append the column for total_count
	//
	// NOTE: Don't inject it if it is being generated for validate
	if (!isValidate) sqlQuery.push(",", `count(*) over() as ${TOTAL_COUNT_FIELD}`)

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
			sqlQuery.push("and", query.where)
		}
		else sqlQuery.push("where", query.where)
	}

	// Parse the `sortField` and `sortBy` fields.
	//
	// We can only support sorting if it is not a vector
	// search as both operations use the `order by` logic.
	//
	// So we will make it an either or.
	if (!query.vectorDataField || !query.queryVector) {
		// Do the sorting since we are not doing vector search
		const sortClause = parseSortClause(query)
		if (sortClause.length > 0) {
			sqlQuery.push("order", "by", ...sortClause)
		}
	} else {
		// We are doing vector search here.
		sqlQuery.push(...buildVectorClause(query))
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

	return {
		statement: sqlQuery.join(" ") + ";"
	}
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
			openAIApiKey: config.openAIApiKey
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

		const idToQueryMap: {[key: string]: SQLQueryObject} = {}
		data.forEach(async rsQuery => {
			if (rsQuery.execute !== undefined && !rsQuery.execute) return

			const queryForId = getSQLForQuery(rsQuery, true)
			idToQueryMap[rsQuery.id!] = queryForId
		})

		return idToQueryMap
	};

	query = async (data: RSQuery<any>[], executeCallback?: executeFn): Promise<any> => {
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

		const idToQueryMap: {[key: string]: SQLQueryObject} = {}
		const idToOriginalQueryMap: {[key: string]: RSQuery<any>} = {}

		for(const rsQuery of data) {
			if (rsQuery.execute !== undefined && !rsQuery.execute) continue

			// Check if automatic embedding fetch is required
			const embeddingsFetched = await getEmbeddingForValue(rsQuery, this.config.openAIApiKey)
			if (embeddingsFetched && embeddingsFetched.length > 0) {
				rsQuery.queryVector = embeddingsFetched;
				console.log("Embeddings fetched for query: ", rsQuery.id);
				console.log("Embedding length: ", embeddingsFetched.length);
			}

			const queryForId = getSQLForQuery(rsQuery)
			idToQueryMap[rsQuery.id!] = queryForId
			idToOriginalQueryMap[rsQuery.id!] = rsQuery
		}

		// Run each SQL query simultaneously and capture the results together
		try {
			const totalStart = performance.now();
			const res = await Promise.all(
				Object.keys(idToQueryMap).map(async (item: any) => {
					const start = performance.now();
					const query = idToQueryMap[item].statement;

					try {
						// If executorFn is called, use that
						let response
						if (executeCallback !== undefined) {
							response = await executeCallback(this.config.client, query);
						} else {
							response = await executeQuery(this.config.client, query);
						}
					
						const end = performance.now();
						const took = Math.abs(end - start) || 1;

						return {
							id: item,
							response, took,
							query: idToOriginalQueryMap[item],
							customData: idToQueryMap[item].customData
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
							query: idToOriginalQueryMap[item],
							customData: idToQueryMap[item].customData
						};
					}
				})
			)

			const totalEnd = performance.now();
			const totalTimeTaken = Math.abs(totalEnd - totalStart) || 1;

			const transformedRes = this.transformResponse(
				totalTimeTaken,
				<ResponseObject[]>res,
			);

			return transformedRes;
		} catch(err) {
			throw err
		}
	}

	transformResponse = (totalTimeTaken: number, data: ResponseObject[]): any => {
		const transformedRes: any = {};
		data.forEach((item: any) => {
			const { id, response, error, took, query, customData } = item;
			const tookCalculated = Math.round(took * 100) / 100;
			if (error) {
				return transformedRes[id] = error;
			}

			if (query.type == 'term') {
				const dfUsed = customData['dataField']
				const aggrBucket = transformTermQueryResponse(response, dfUsed, query);
				return transformedRes[id] = {
					took: tookCalculated,
					hits: {
						total: {
							value: 0
						},
						hits: []
					},
					aggregations: {
						[dfUsed]: {
							buckets: aggrBucket
						}
					},
				}
			}

			// Calculate the total count by reading it from
			// the first element if it is non 0.
			let totalHits = 0;
			if (response.length > 0) {
				totalHits = parseInt(response[0][TOTAL_COUNT_FIELD]);
			}

			const responseBody = {
				took: tookCalculated,
				hits: {
					total: {
						value: totalHits
					},
					hits: response.map((r: Object) => {
						// Remove the total count from the hits
						delete r[TOTAL_COUNT_FIELD as keyof typeof r]

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