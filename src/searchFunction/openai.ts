import { RSQuery } from "src/types/types";


const getEmbeddingForText = async (text: string, apiKey: string): Promise<Array<number>> => {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: "POST",
        headers: {
            'Content-Type': "application/json",
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(
            {
                input: text,
                model: 'text-embedding-ada-002'
            }
        )
    });

    const responseJSON = await response.json()
    return responseJSON.data[0].embedding;
}

export const getEmbeddingForValue = async (query: RSQuery<any>, openAIApiKey: string): Promise<Array<number>> => {
    /**
     * Use the passed query and generate the embeddings for the query
     * if `vectorDataField` is passed, `value` is passed but
     * `queryVector` is not passed.
     */
    if (!query.vectorDataField) return [];

    if (query.queryVector) return query.queryVector;

    if (!query.type) query.type = 'search';

    if (!query.value || query.value == "" || (query.type != 'search' && query.type != "suggestion")) return [];

    // We can use the value to build the query.
    return await getEmbeddingForText(query.value, openAIApiKey)
}