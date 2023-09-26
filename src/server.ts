import { ReactiveSearch } from './searchFunction';
import cors from 'cors';
import express, { Request } from 'express';
import postgres from 'postgres'

require('dotenv').config();

async function main() {
	const app = express();
	const PORT = process.env.PORT || 8080;
	const databaseURL: string = process.env.DB_URL || 'postgresql://localhost:5432'
	const client = postgres(databaseURL);
	console.log(`✅ [db]: Connected successfully`);

	app.use(cors());
	app.use(express.json());

	const validateRequest = (
		req: Request,
	): {
		query: any;
	} => {
		try {
			if (!req.body.query) {
				throw new Error(`query is required`);
			}

			return {
				query: req.body.query,
			};
		} catch (err) {
			throw err;
		}
	};

	app.post(`/_reactivesearch`, async (req, res) => {
		try {
			const { query } = validateRequest(req);
			const ref = new ReactiveSearch({
				databaseName: "",
                databaseURL: ""
			});

			try {
				const data = await ref.query(query);
				res.status(200).send(data);
			} catch (err) {
				res.status(500).send({
					error: {
						status: `Internal server error`,
						code: 500,
						message: err.message,
					},
				});
			}
		} catch (error) {
			res.status(400).send({
				error: {
					message: error.message,
					code: 400,
					status: `Bad Request`,
				},
			});
		}
	});

	app.post(`/_reactivesearch/validate`, (req, res) => {
		try {
			const { query } = validateRequest(req);
			const ref = new ReactiveSearch({
				databaseName: "",
                databaseURL: ""
			});

            const data = ref.translate(query);
			res.status(200).send(data);
		} catch (error) {
			res.status(400).send({
				error: {
					message: error.message,
					code: 400,
					status: `Bad Request`,
				},
			});
		}
	});

	app.listen(PORT, () => {
		console.log(`⚡️[server]: Server is running at https://localhost:${PORT}`);
	});
}

main();
