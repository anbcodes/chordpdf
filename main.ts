import { readFileSync, writeFileSync } from "fs";
import minimist from 'minimist';
import { render } from "./lib";

const args = minimist(process.argv.slice(2));

console.log(args.k);

if (args['h'] || args['help']) {
  console.log(
`Usage: chordpdf [options] [input_file1] [input_file2...] [output_file]
Valid options:
 -h/--help  displays this help message
 -k/--key   sets the key of the output file (use multiple for multiple input files)`
)
process.exit(0)
}

let input: string = '';
try {
  args._.slice(0, -1).forEach(file => {
    input += readFileSync(args._[0], 'utf-8') + '===';
  })
} catch (e) {
  console.error("Input file not found:", args._[0]);
  process.exit(1);
}

if (!args._[1]) {
  console.error("Output file required (use -h for help)");
  process.exit(1)
}

let key = args['k'] ?? args['key'];

const pdf = render(input, key)

writeFileSync(args._[1], pdf.output());