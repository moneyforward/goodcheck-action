import { expect } from 'chai';
import stream from 'stream';
import { Transformers } from '@moneyforward/sca-action-core';
import Analyzer from '../src/analyzer'
import { AssertionError } from 'assert';

describe('Transform', () => {
  it('should return the problem object', async () => {
    const expected = {
      file: 'foo/bar.rb',
      line: 1,
      column: 2,
      severity: 'warning',
      message: `hello, world!`,
      code: 'rule1'
    };
    const text = JSON.stringify([
      {
        'rule_id': 'rule1',
        'path': 'foo/bar.rb',
        'location': {
          'start_line': 1,
          'start_column': 2,
          'end_line': 3,
          'end_column': 4
        },
        'message': 'hello, world!'
      }
    ]);
    const analyzer = new (class extends Analyzer {
      public constructor() {
        super();
      }
      public createTransformStreams(): Transformers {
        return super.createTransformStreams();
      }
    })();
    const [prev, next = prev] = analyzer.createTransformStreams();
    stream.Readable.from(text).pipe(prev);
    for await (const problem of next) {
      expect(problem).to.deep.equal(expected);
      return;
    }
    throw new AssertionError({ message: 'There was no problem to expect.', expected });
  });
});
