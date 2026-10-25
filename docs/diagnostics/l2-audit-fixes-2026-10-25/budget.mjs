// Diagnostic size evidence only. No production bytes, gates or assertions change.
// Run from the repository root with the normal build present.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {toolchain} from 'romdev-toolchain-cc65';
import {parseViceLabels} from '../../../scripts/runtime-cycles.mjs';
const directory = path.dirname(new URL(import.meta.url).pathname);
const output = path.resolve('build/l2-audit-budget');
fs.mkdirSync(output, {recursive: true});
const labels = file => parseViceLabels(fs.readFileSync(`build/${file}.lbl`, 'utf8'));
const main = labels('void-strike-65'), summary = labels('level-summary'), reader = labels('sector-reader');
const constants = new Map([
  ['L2_VALID', 0x86b5], // Proposed existing pinned padding; NOT allocated by this sketch.
  ['L2_DISARM', 0x8656],
  ...['update_hud_status', 'backup_gameplay_screen', 'resume_gameplay'].map(n => [n, main.get(n)]),
  ['summary_load_l2', summary.get('summary_load_l2')],
  ['sector_reader_failure_screen', reader.get('sector_reader_failure_screen')],
]);
for (const [name, address] of constants) if (!Number.isInteger(address)) throw Error(`Missing ${name}`);
const source = Buffer.from([...constants].map(([n,a]) => `${n} = $${a.toString(16)}`).join('\n') + '\n' +
  fs.readFileSync(path.join(directory, 'death-reload-budget.s'), 'utf8'));
async function run(name, inputs, args, names) {
  const factory = (await import(pathToFileURL(toolchain[name].gluePath).href)).default;
  const log = [];
  const module = await factory({noInitialRun: true, print: v => log.push(v), printErr: v => log.push(v)});
  for (const [name, bytes] of Object.entries(inputs)) module.FS.writeFile(name, bytes);
  if (module.callMain(args)) throw Error(`${name}: ${log.join('\n')}`);
  return Object.fromEntries(names.map(n => [n, Buffer.from(module.FS.readFile(n))]));
}
const assembled = await run('ca65', {'budget.s':source}, ['-o','budget.o','-l','budget.lst','budget.s'], ['budget.o','budget.lst']);
const linked = await run('ld65', {'budget.o':assembled['budget.o'], 'budget.cfg':Buffer.from(
  'MEMORY { ROM: start=$8656, size=$1000, type=ro, file=%O; }\nSEGMENTS { CODE: load=ROM, type=ro; }\n')},
  ['-C','budget.cfg','-o','budget.bin','-Ln','budget.lbl','budget.o'], ['budget.bin','budget.lbl']);
for (const [n,b] of Object.entries({...assembled,...linked})) fs.writeFileSync(path.join(output,n),b);
const l = parseViceLabels(linked['budget.lbl'].toString());
const names = ['valid_clear','valid_byte','checked_init','start_guard','frontend_exit','quit_exit','load_head','cold_end','death_reload','death_end'];
const fragments = names.slice(0,7).map((n,i) => ({name:n,bytes:l.get(names[i+1])-l.get(n)}));
fragments.push({name:'death_reload',bytes:l.get('death_end')-l.get('death_reload')});
const result = {status:'DIAGNOSTIC SIZE SKETCH; NOT INTEGRATED; NOT A MINIMUM PROOF',fragments,
  totalBytes:linked['budget.bin'].length,codeBytes:linked['budget.bin'].length-1,stateBytes:1,
  capBytes:32,excessBytes:linked['budget.bin'].length-32,
  limitations:['Main/summary placement and page crossings are not validated.',
    'L2-02 and other findings are excluded; their costs must not be hidden in this price.',
    'Death reload changes visible latency and restores a paused screen; not smoke tested.',
    'Additional integration bytes may be needed. No assertion or computed gate was changed.']};
fs.writeFileSync(path.join(output,'result.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
