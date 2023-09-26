export type ConfigType = {
    client?: any;
    databaseName: string;
}


export type QueryType = `search` | `term` | `range` | `suggestion`;

export type QueryFormat = `or` | `and`;


export type RSQuery<T> = {
	index?: string;

	enablePopularSuggestions?: boolean;

	maxPopularSuggestions?: number;

	clearOnQueryChange?: boolean;

	results?: Array<Object>;

	beforeValueChange?: (value: string) => Promise<any>;

	// called when value changes
	onValueChange?: (next: string, prev: string) => void;

	// called when results change
	onResults?: (next: string, prev: string) => void;

	// called when composite aggregations change
	onAggregationData?: (next: Array<Object>, prev: Array<Object>) => void;

	// called when there is an error while fetching results
	onError?: (error: any) => void;

	// called when request status changes
	onRequestStatusChange?: (next: string, prev: string) => void;

	// called when query changes
	onQueryChange?: (next: string, prev: string) => void;

	// called when mic status changes
	onMicStatusChange?: (next: string, prev: string) => void;

	id?: string;

	includeFields?: string[];

	table?: string | Array<string>;

	size?: number;

	type?: QueryType;

	value?: T;

	dataField?: string | Array<string>;

	queryFormat?: QueryFormat;
};