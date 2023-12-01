import { QueryType, RSQuery } from "src/types/types";

export const parseValue = (query: RSQuery<any>): string[] => {
    /**
     * Parse the value passed by the user along with the dataField
     * and queryFormat values and return a string that can be used
     * in the where clause.
     */
    if (!query.value) {
        return []
    }

    // If `value` is passed but no dataField then
    // throw an error
    if (!query.dataField) {
        throw new Error('`dataField` is required when `value` is passed!')
    }

    if (!query.queryFormat) {
        query.queryFormat = 'or'
    }

    const whereClauseBuilt: string[] = [];

    // Make sure that value is proper type based on the search
    // type
    verifyValueByType(query.value, query.type!)
    
    const dfAsArr = parseDataFields(query.dataField)

    switch (query.type) {
        case 'search':
        case 'suggestion':
            dfAsArr.forEach((df, index) => {
                whereClauseBuilt.push(...[df, "like", `'%${query.value}%'`])
                if (index != dfAsArr.length - 1) {
                    whereClauseBuilt.push(query.queryFormat!)
                }
            })
            break
        case 'term':
            // dfAsArr.forEach((df, index) => {
            //     whereClauseBuilt.push(...[df, "=", `'${query.value}'`])
            //     console.log(index, dfAsArr.length - 1)
            //     if (index != dfAsArr.length - 1) {
            //         whereClauseBuilt.push(query.queryFormat!)
            //     }
            // })
            break
        case "range":
            const dfToUse = dfAsArr[0];
            const start = query.value.start;
            const end = query.value.end;
            whereClauseBuilt.push(dfToUse, "between", start, "and", end)
            break
        default:
            throw new Error('invalid type passed: ' + query.type)
    }


    return whereClauseBuilt
}

export const buildTermQuery = (query: RSQuery<any>): string[] => {
    // It is fine if value is not passed at all as we don't
    // care for it unless another query is reacting to it.

    // If no dataField is passed then throw an error
    if (!query.dataField) {
        throw new Error('`dataField` is required when `value` is passed!')
    }

    // TODO: Parse the dataField into a single field regardless of which format
    // it is passed in.

    if (!query.queryFormat) {
        query.queryFormat = 'or'
    }
}


const verifyValueByType = (value: any, queryType: QueryType) => {
    /**
     * Verify the passed value by type and return an error
     * if there is any
     */
    if (queryType == 'range') {
        // We only support object here
        if (typeof value != 'object') throw new Error('value should be an object when type is `range`');

        return
    }

    if (typeof value == 'object') {
        throw new Error('value should be one of array or string when type is one of `search, suggestion, term`');
    }
}


const parseDataFields = (dfPassed: string | string[]): string[] => {
    let dfAsArr: string[] = []

    if (!dfPassed) return dfAsArr

    if (typeof dfPassed == 'string') {
        dfAsArr = [dfPassed]
    } else {
        dfAsArr = dfPassed
    }

    return dfAsArr
}


export const parseSortClause = (query: RSQuery<any>): string[] => {
    // Parse the dataFields first, if we don't have a dataField,
    // we cannot sort.    
    if (!query.sortField) {
        // Use the first entry from the dataField
        const dfAsArr = parseDataFields(query.dataField!)
        if (!dfAsArr.length) return []
        
        query.sortField = dfAsArr[0]
    }

    if (!query.sortBy) {
        query.sortBy = "asc"
    }

    return [query.sortField, query.sortBy];
}


export const buildVectorClause = (query: RSQuery<any>): string[] => {
    return ["order", "by", query.vectorDataField!, '<->', `'[${query.queryVector}]'`]
}