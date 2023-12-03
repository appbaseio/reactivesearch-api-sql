export type ConfigType = {
    client?: any;
    databaseName: string;
	openAIApiKey: string;
}


export type QueryType = `search` | `term` | `range` | `suggestion`;

export type QueryFormat = `or` | `and`;


export type DefaultQuery = {
	query?: string;
}

export type DataFieldWithWeight = {
	field?: string;
}

export type executeFn = (client: any, sqlQuery: string) => any;


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

	dataField?: string | Array<string | DataFieldWithWeight>;

	queryFormat?: QueryFormat;

	from?: number;

	execute?: boolean;

	imageValue?: string;

	sortField?: string;

	sortBy?: string;

	defaultQuery?: DefaultQuery;

	where?: string;

	vectorDataField?: string;

	queryVector?: Array<number>;

	aggregationSize?: number;
};


export type ResponseObject = {
	response?: any;
	error?: {
		status: string;
		code: number;
		message: string;
	};
	id: string;
	took: number;
	query: RSQuery<any>;
	customData?: Object;
};

export type SQLQueryObject = {
	statement: string;
	customData?: Object;
}

export type AggregationResponse = {
	key: any;
	doc_count: number;
}


export type MinMaxQueryDetails = {
	minField?: string | null;
	maxField?: string | null;
	query?: string | null;
}