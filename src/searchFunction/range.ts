const buildFieldName = (fieldName: string): string => {
    return `rs__${fieldName}`
}

export const RS_MIN_FIELD_NAME = buildFieldName("overall_min_year");
export const RS_MAX_FIELD_NAME = buildFieldName("overall_max_year");

export const buildRangeMinMaxQuery = (field: string, table: string, whereClause: string | null = null, isMin: boolean = false, isMax: boolean = false): string => {
    /**
     * @param field - DataField from where the min and max will be fetched
     * @param table - Table from where the data will be fetched
     * @param whereClause - Conditional where clause. Should not contain the `where` part of the string
     * @param isMin - Whether or not min value is required
     * @param isMax - Whether or not max value is required
     */

    // At-least one of `isMin` and `isMax` should be `true` else we cannot continue.
    if (!isMax && !isMax) throw new Error('one of min/max is required!')
    
    const selectQueryAsArr: string[] = [];

    if (isMin) selectQueryAsArr.push(`MIN(${field}) AS ${RS_MIN_FIELD_NAME}`);
    if (isMax) selectQueryAsArr.push(`MAX(${field}) AS ${RS_MAX_FIELD_NAME}`);
    
    return `SELECT ${selectQueryAsArr.join(", ")} FROM "${table}"${whereClause != null ? " WHERE " + whereClause : ''}`
}