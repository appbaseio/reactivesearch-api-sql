import { buildHistogramQuery, buildRangeMinMaxQuery, buildRangeQuery, buildRangeWhereClause } from "./range"

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
    });
    it("should build query with min only", () => {
        const minMaxDetails = buildRangeMinMaxQuery("original_publication_year", "good-books", "original_publication_year between 1980 and 2018", true, false);
        const expectedQuery = `SELECT MIN(original_publication_year) AS rs__overall_min_year FROM "good-books" WHERE original_publication_year between 1980 and 2018`
        expect(minMaxDetails.query).toEqual(expectedQuery);
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
    });
    it("should build histogram with min query", () => {
        const minMaxDetails = buildRangeMinMaxQuery("original_publication_year", "good-books", "original_publication_year between 1980 and 2018", true, false);
        const queryBuilt = buildHistogramQuery("original_publication_year", "good-books", 1, "original_publication_year between 1980 and 2018", minMaxDetails);
        const expectedQuery = `WITH OverallStats AS (SELECT MIN(original_publication_year) AS rs__overall_min_year FROM "good-books" WHERE original_publication_year between 1980 and 2018) SELECT FLOOR(original_publication_year / 1) * 1 AS rs__key, COUNT(*) AS rs__doc_count, o.rs__overall_min_year FROM "good-books", OverallStats o WHERE original_publication_year between 1980 and 2018 GROUP BY FLOOR(original_publication_year / 1), o.rs__overall_min_year ORDER BY rs__key`

        expect(queryBuilt).toEqual(expectedQuery)
    })
});

describe("buildRangeWhereClause", () => {
    it("should build properly when both start and end are passed", () => {
        const whereClauseBuilt = buildRangeWhereClause("test", {start: 1980, end: 2018});

        expect(whereClauseBuilt).toEqual("test between 1980 and 2018")
    });
    it("should build properly when only start is passed", () => {
        const whereClauseBuilt = buildRangeWhereClause("test", {start: 1980});
        expect(whereClauseBuilt).toEqual("test > 1980");
    });
    it("should build properly when only end is passed", () => {
        const whereClauseBuilt = buildRangeWhereClause("test", {end: 1980});
        expect(whereClauseBuilt).toEqual("test < 1980");
    });
    it("should return null when value is null or neither start or end is passed", () => {
        const withNullValue = buildRangeWhereClause("test", null);
        const withEmptyValue = buildRangeWhereClause("test", {});

        expect(withNullValue).toBeNull();
        expect(withEmptyValue).toBeNull();
    });
    it("should throw error if value is not null but is not an object", () => {
        expect(() => {buildRangeWhereClause("test", "test value")}).toThrow(Error);
    })
});