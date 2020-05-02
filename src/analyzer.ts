import stream from 'stream';
import util from 'util';
import { StaticCodeAnalyzer, Transformers, tool } from '@moneyforward/sca-action-core';

const debug = util.debuglog('goodcheck-action');

export default class Analyzer extends StaticCodeAnalyzer {
  private static readonly command = 'goodcheck';

  constructor(options: string[] = []) {
    super(Analyzer.command, options.concat(['check', '--format=json']), undefined, 3, undefined, 'Goodcheck', exitStatus => exitStatus === 0 || exitStatus === 2);
  }

  protected async prepare(): Promise<unknown> {
    return tool.installGem(true, Analyzer.command);
  }

  protected createTransformStreams(): Transformers {
    const buffers: Buffer[] = [];
    const transformers = [
      new stream.Transform({
        readableObjectMode: true,
        transform: function (buffer, _encoding, done): void {
          buffers.push(buffer);
          done();
        },
        flush: function (done): void {
          interface Issue {
            rule_id: string;
            path: string;
            location?: {
              start_line: number;
              start_column: number;
              end_line: number;
              end_column: number;
            };
            message: string;
            justifications?: string[];
          }
          const issues: Issue[] = JSON.parse(Buffer.concat(buffers).toString());
          debug(`Detected %d problem(s).`, issues.length);
          for (const issue of issues) this.push({
            file: issue.path,
            line: issue.location && issue.location.start_line,
            column: issue.location && issue.location.start_column,
            severity: 'warning',
            message: issue.message,
            code: issue.rule_id
          });
          this.push(null);
          done();
        }
      })
    ];
    transformers.reduce((prev, next) => prev.pipe(next));
    return [transformers[0], transformers[transformers.length - 1]];
  }
}
