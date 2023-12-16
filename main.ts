import { readFileSync, writeFileSync } from "fs";
import minimist from 'minimist';
import { render } from "./lib";

const args = minimist(process.argv.slice(2));

if (args['h'] || args['help']) {
  console.log(
`Usage: chordpdf [options] [input_file] [output_file]
Valid options:
 -h/--help  displays this help message
 -k/--key   sets the key of the output file`
)
process.exit(0)
}

let input: string;
try {
  input = readFileSync(args._[0], 'utf-8');
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