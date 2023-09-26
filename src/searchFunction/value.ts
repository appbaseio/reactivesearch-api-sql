import { RSQuery } from "src/types/types";

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

    // TODO: Make sure that value is proper type based on the search
    // type

    // TODO: Support range type
    switch (query.type) {
        case 'search':
        // @ts-ignore
        case 'suggestion':
            if (typeof query.dataField == "string") {
                whereClauseBuilt.push(...[query.dataField, "like", `%${query.value}%`])
            } else {
                query.dataField.forEach(df => {
                    whereClauseBuilt.push(...[df, "like", `%${query.value}%`, query.queryFormat!])
                })
            }
            break
        default:
            throw new Error('invalid type passed: ' + query.type)
    }


    return whereClauseBuilt
}