import { MinMaxQueryDetails, RSQuery, SQLQueryObject } from "src/types/types";
import { parseDataFields, verifyValueByType } from "./value";

const buildFieldName = (fieldName: string): string => {
    return `rs__${fieldName}`
}

export const RS_MIN_FIELD_NAME = buildFieldName("overall_min_year");
export const RS_MAX_FIELD_NAME = buildFieldName("overall_max_year");
export const RS_BUCKET_KEY_NAME = buildFieldName("key");
export const RS_DOC_COUNT_KEY_NAME = buildFieldName("doc_count");

export const buildRangeMinMaxQuery = (field: string, table: string, whereClause: string | null = null, isMin: boolean = false, isMax: boolean = false): MinMaxQueryDetails => {
    /**
     * @param field - DataField from where the min and max will be fetched
     * @param table - Table from where the data will be fetched
     * @param whereClause - Conditional where clause. Should not contain the `where` part of the string
     * @param isMin - Whether or not min value is required
     * @param isMax - Whether or not max value is required
     */

    // At-least one of `isMin` and `isMax` should be `true` else we cannot continue.
    if (!isMax && !isMin) throw new Error('one of min/max is required!')
    
    const selectQueryAsArr: string[] = [];

    if (isMin) selectQueryAsArr.push(`MIN(${field}) AS ${RS_MIN_FIELD_NAME}`);
    if (isMax) selectQueryAsArr.push(`MAX(${field}) AS ${RS_MAX_FIELD_NAME}`);
    
    const query = `SELECT ${selectQueryAsArr.join(", ")} FROM "${table}"${whereClause != null ? " WHERE " + whereClause : ''}`;

    return {
        minField: isMin ? RS_MIN_FIELD_NAME : null,
        maxField: isMax ? RS_MAX_FIELD_NAME : null,
        query: query
    }
}

const buildFloorQuery = (field: string, interval: Number, shouldMultiply: boolean = true): string => {
    const multiplyClause = ` * ${interval}`;
    return `FLOOR(${field} / ${interval})${shouldMultiply ? multiplyClause : ''}`
}

export const buildHistogramQuery = (field: string, table: string, interval: Number = 1, whereClause: string | null = null, minMaxDetails: MinMaxQueryDetails | null = null): string => {
    /**
     * Build the histogram's SQL query based on the inputs provided.
     * 
     * @param field - Field to run the aggregation upon
     * @param table - Table to run the aggregation upon
     * @param interval - Interval for the histogram
     * @param whereClause - Where clause to use, if present
     * @param minMaxDetails - Details about the min/max query built if the user wants min/max in aggregations.
     */

    const selectQueryAsArr: string[] = [];
    const fromClause: string[] = [`"${table}"`];
    const groupByClause: string[] = [buildFloorQuery(field, interval, false)];
    let withClause = '';

    // Build the normal select query for the histogram
    selectQueryAsArr.push(`${buildFloorQuery(field, interval)} AS ${RS_BUCKET_KEY_NAME}`, `COUNT(*) AS ${RS_DOC_COUNT_KEY_NAME}`);

    // If min/max details are provided and the fields are actually passed, we will
    // inject them to the final query.
    if (minMaxDetails) {
        if (minMaxDetails.minField) {
            const minFieldToExtract = `o.${minMaxDetails.minField}`;
            selectQueryAsArr.push(minFieldToExtract);
            groupByClause.push(minFieldToExtract);
        }
        if (minMaxDetails.maxField) {
            const maxFieldToExtract = `o.${minMaxDetails.maxField}`;
            selectQueryAsArr.push(maxFieldToExtract);
            groupByClause.push(maxFieldToExtract);
        }

        // Inject the from clause accordingly.
        fromClause.push("OverallStats o");

        withClause = `WITH OverallStats AS (${minMaxDetails.query})`
    }

    return `${withClause != "" ? withClause + " " : ""}SELECT ${selectQueryAsArr.join(", ")} FROM ${fromClause.join(", ")}${whereClause != null ? " WHERE " + whereClause + " " : ''}GROUP BY ${groupByClause.join(", ")} ORDER BY ${RS_BUCKET_KEY_NAME}`
}

export const buildRangeWhereClause = (field: string, value: any): string | null => {
    /**
     * Build the where clause depending on the passed value.
     * 
     * If the value is not of proper type for range, we will throw an error.
     */

    // No need to generate a where clause if the value is not
    // passed at all so we can just return null.
    if (!value) return null;

    // Make sure that the passed value is of proper type
    verifyValueByType(value, "range");

    const start = value.start;
    const end = value.end;

    // If both `start` and `end` are present, use a between query.
    if (start && end) {
        return `${field} between ${start} and ${end}`
    }

    if (start) {
        return `${field} > ${start}`
    }

    if (end) {
        return `${field} < {end}`
    }

    return null
}


export const buildRangeQuery = (query: RSQuery<any>, tableToUse: string[]): SQLQueryObject => {
    /**
     * Build the range query based on the passed query and by parsing the
     * fields of the query.
     */
    if (!query.aggregations || query.aggregations.length === 0) {
        // There's nothing to parse.
        return {
            statement: "",
            customData: {
                "emptyResponse": true
            }
        }
    }

    // If no dataField is passed then throw an error
    if (!query.dataField) {
        throw new Error('`dataField` is required!')
    }

    const dfAsArr = parseDataFields(query.dataField);

    // Throw an error if the dataField is not passed.
    if (dfAsArr.length === 0) {
        throw new Error('`dataField` should not be empty.')
    }

    const dfToUse = dfAsArr[0];

    // TODO: Create the where clause depending on whether or not the value is
    // passed.

    const isMin = query.aggregations.includes("min");
    const isMax = query.aggregations.includes("max");

    // Build the query if one of max or min is passed
    let minMaxDetails;

    if (isMax || isMin) {
        minMaxDetails = buildRangeMinMaxQuery(dfToUse, tableToUse.join(","), )
    }

    return {
        statement: "",
        customData: {}
    }
}