import { RSQuery, RSSettings } from "src/types/types";


const getEmbeddingForText = (text: string, dimensions: number): Array<number> => {
    
}

export const functionGetEmbeddingForValue = (query: RSQuery<any>, settings: RSSettings): Array<number> => {
    /**
     * Use the passed query and generate the embeddings for the query
     * if `vectorDataField` is passed, `value` is passed but
     * `queryVector` is not passed.
     */
    if (!query.vectorDataField) return [];

    if (query.queryVector) return query.queryVector;

    if (!query.value) return [];

    // We can use the value to build the query.

    // We need the dimensions here from the user so we will parse
    // it from the settings.
    //
    // If it is not present, then throw an error.
    if (!settings.openai_dimensions) throw new Error('`settings.openai_dimensions` is required since we cannot determine dimension on our own!');

}