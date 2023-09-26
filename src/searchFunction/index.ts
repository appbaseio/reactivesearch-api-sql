import { ConfigType, RSQuery } from "../types/types";

export class ReactiveSearch {
    config: ConfigType;
    // @ts-ignore
	schema: Schema;
    
    constructor(config: ConfigType) {
        this.config = {
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
}