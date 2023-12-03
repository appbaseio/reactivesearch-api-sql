import { buildHistogramQuery, buildRangeMinMaxQuery } from "./range"

describe("buildRangeMinMaxQuery", () => {
    it("should build query without where clause added", () => {
        const queryBuilt = buildRangeMinMaxQuery("original_publication_year", "good-books", null, true, true)
        const expectedQuery = `SELECT MIN(original_publication_year) AS rs__overall_min_year, MAX(original_publication_year) AS rs__overall_max_year FROM "good-books"`

        expect(queryBuilt.query).toEqual(expectedQuery)
    });
    it("should build query with where clause added", () => {
        const queryBuilt = buildRangeMinMaxQuery("original_publication_year", "good-books", "original_publication_year between 1980 and 2018", true, true)
        const expectedQuery = `SELECT MIN(original_publication_year) AS rs__overall_min_year, MAX(original_publication_year) AS rs__overall_max_year FROM "good-books" WHERE original_publication_year between 1980 and 2018`

        expect(queryBuilt.query).toEqual(expectedQuery)
    })
})

describe("buildHistogramQuery", () => {
    it("should build histogram without min max query", () => {
        const queryBuilt = buildHistogramQuery("original_publication_year", "good-books", 1, "original_publication_year between 1980 and 2018");
        const expectedQuery = `SELECT FLOOR(original_publication_year / 1) * 1 AS rs__key, COUNT(*) AS rs__doc_count FROM \"good-books\" WHERE original_publication_year between 1980 and 2018 GROUP BY FLOOR(original_publication_year / 1) ORDER BY rs__key`

        expect(queryBuilt).toEqual(expectedQuery)
    });
    it("should build histogram with min/max query", () => {
        const minMaxDetails = buildRangeMinMaxQuery("original_publication_year", "good-books", "original_publication_year between 1980 and 2018", true, true);
        const queryBuilt = buildHistogramQuery("original_publication_year", "good-books", 1, "original_publication_year between 1980 and 2018", minMaxDetails);
        const expectedQuery = `WITH OverallStats AS (SELECT MIN(original_publication_year) AS rs__overall_min_year, MAX(original_publication_year) AS rs__overall_max_year FROM "good-books" WHERE original_publication_year between 1980 and 2018) SELECT FLOOR(original_publication_year / 1) * 1 AS rs__key, COUNT(*) AS rs__doc_count, o.rs__overall_min_year, o.rs__overall_max_year FROM "good-books", OverallStats o WHERE original_publication_year between 1980 and 2018 GROUP BY FLOOR(original_publication_year / 1), o.rs__overall_min_year, o.rs__overall_max_year ORDER BY rs__key`

        expect(queryBuilt).toEqual(expectedQuery)
    })
})