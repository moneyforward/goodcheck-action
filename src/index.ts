import stream from 'stream';
import util from 'util';
import { analyzer } from '@moneyforward/code-review-action';
import StaticCodeAnalyzer, { installer } from '@moneyforward/sca-action-core';
import { transform } from '@moneyforward/stream-util';

type AnalyzerConstructorParameter = analyzer.AnalyzerConstructorParameter;

const debug = util.debuglog('@moneyforward/code-review-action-goodcheck-plugin');

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

export default abstract class Analyzer extends StaticCodeAnalyzer {
  private static readonly command = 'goodcheck';

  constructor(...args: AnalyzerConstructorParameter[]) {
    super(Analyzer.command, args.map(String).concat(['check', '--format=json']), undefined, exitStatus => exitStatus === 0 || exitStatus === 2, undefined, 'Goodcheck');
  }

  protected async prepare(): Promise<void> {
    console.log(`::group::Installing gems...`);
    try {
      await new installer.RubyGemsInstaller(true).execute([Analyzer.command]);
    } finally {
      console.log(`::endgroup::`)
    }
  }

  protected createTransformStreams(): stream.Transform[] {
    return [
      new transform.JSON(),
      new stream.Transform({
        objectMode: true,
        transform: function (issues: Issue[], encoding, done): void {
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
  }
}
