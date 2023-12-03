import { buildHistogramQuery, buildRangeMinMaxQuery } from "./range"

describe("buildRangeMinMaxQuery", () => {
    it("should build query without where clause added", () => {
        const queryBuilt = buildRangeMinMaxQuery("original_publication_year", "good-books", null, true, true)
        const expectedQuery = `SELECT MIN(original_publication_year) AS rs__overall_min_year, MAX(original_publication_year) AS rs__overall_max_year FROM "good-books"`

        expect(queryBuilt).toEqual(expectedQuery)
    });
    it("should build query with where clause added", () => {
        const queryBuilt = buildRangeMinMaxQuery("original_publication_year", "good-books", "original_publication_year between 1980 and 2018", true, true)
        const expectedQuery = `SELECT MIN(original_publication_year) AS rs__overall_min_year, MAX(original_publication_year) AS rs__overall_max_year FROM "good-books" WHERE original_publication_year between 1980 and 2018`

        expect(queryBuilt).toEqual(expectedQuery)
    })
})

describe("buildHistogramQuery", () => {
    it("should build histogram without min max query", () => {
        const queryBuilt = buildHistogramQuery("original_publication_year", "good-books", 1, "original_publication_year between 1980 and 2018");

        expect(queryBuilt).toBeNull()
    })
})