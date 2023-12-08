import { DataFieldWithWeight } from 'src/types/types';
import { parseDataFields } from './value'; // Update with the correct path

describe('parseDataFields', () => {
  it('should return an array with a single string input', () => {
    const result = parseDataFields('sampleString');
    expect(result).toEqual(['sampleString']);
  });

  it('should parse an array of strings and DataFieldWithWeight objects', () => {
    const inputData: Array<string | DataFieldWithWeight> = [
      'string1',
      { field: 'field1' },
      'string2',
      { field: 'field2' },
    ];

    const result = parseDataFields(inputData);

    // The result should be an array of strings extracted from the input array
    expect(result).toEqual(['string1', 'field1', 'string2', 'field2']);
  });
});
