// Repair this task's external-emulator fixture, without changing game code or
// the native timing emulator. The SIO diagnostic uses its own trace header;
// that header does not define the optional L2 memory-read observer wrappers.
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(process.argv[2]??'.');
const source=path.join(root,'build/atari800-trace');
const diag=path.join(root,'build/atari800-sio-diag');
if(!fs.existsSync(diag))fs.cpSync(source,diag,{recursive:true});
let cpu=fs.readFileSync(path.join(source,'src/cpu.c'),'utf8');
const block=/\/\* L2 actual CPU reads \*\/\n(?:#(?:undef|define)[^\n]*\n)+/;
if(!block.test(cpu))throw Error('Expected optional L2 observer block is missing');
cpu=cpu.replace(block,'');
cpu=cpu.replace('#define GET_CODE_BYTE()     dfl2_get_direct((unsigned)(PC++ - MEMORY_mem))','#define GET_CODE_BYTE()     (*PC++)');
cpu=cpu.replace('#define PEEK_CODE_BYTE()    dfl2_get_direct((unsigned)(PC - MEMORY_mem))','#define PEEK_CODE_BYTE()    (*PC)');
cpu=cpu.replace('#define PEEK_CODE_WORD()    dfl2_get_word((unsigned)(PC - MEMORY_mem))','#define PEEK_CODE_WORD()    (*(const UWORD *) PC)');
cpu=cpu.replace('#define PEEK_CODE_WORD()    dfl2_get_word((unsigned)(PC - MEMORY_mem))','#define PEEK_CODE_WORD()    (*PC + (PC[1] << 8))');
if(cpu.includes('dfl2_'))throw Error('Unremoved optional L2 observer call');
fs.writeFileSync(path.join(diag,'src/cpu.c'),cpu);
fs.rmSync(path.join(diag,'.sio-diag-build.json'),{force:true});
console.log(`Prepared separate SIO diagnostic fixture: ${diag}`);
