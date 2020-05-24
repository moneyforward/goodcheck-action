import { expect } from 'chai';
import stream from 'stream';
import { reporter } from '@moneyforward/code-review-action';
import Analyzer from '../src'
import { AssertionError } from 'assert';

type ReporterConstructor = reporter.ReporterConstructor;

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
      get Reporter(): ReporterConstructor {
        throw new Error("Method not implemented.");
      }
      public constructor() {
        super();
      }
      public createTransformStreams(): stream.Transform[] {
        return super.createTransformStreams();
      }
    })();
    const transform = analyzer.createTransformStreams()
      .reduce((previous, current) => previous.pipe(current), stream.Readable.from(text));
    for await (const problem of transform) return expect(problem).to.deep.equal(expected);
    throw new AssertionError({ message: 'There was no problem to expect.', expected });
  });
});
