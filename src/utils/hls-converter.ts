/**
 * convert-audio-to-aac.ts
 * Convert bất kỳ file audio (mp3/wav/flac/...) sang AAC (.aac – ADTS)
 *
 * Yêu cầu:
 *  - FFmpeg đã được cài trên máy (ffmpeg trong PATH)
 *  - (Khuyến nghị) Đã cài "zx" và "slash" nếu dùng chung codebase:
 *      npm i zx slash -D
 *
 * Sử dụng (CLI):
 *   ts-node convert-audio-to-aac.ts <inputPath> [--bitrate 192k] [--ar 44100] [--ac 2] [--out out.aac] [--overwrite]
 *
 * Ví dụ:
 *   ts-node convert-audio-to-aac.ts ./assets/audio/song.mp3
 *   ts-node convert-audio-to-aac.ts ./song.wav --bitrate 256k --ar 48000 --ac 2
 *   ts-node convert-audio-to-aac.ts ./song.mp3 --out ./dist/song.aac --overwrite
 */

import * as fs from 'fs';
import * as path from 'path';

type ConvertOptions = {
  bitrate?: string; // vd '192k'
  sampleRate?: number; // vd 44100, 48000
  channels?: number; // 1 (mono), 2 (stereo)
  outPath?: string; // đường dẫn output .aac
  overwrite?: boolean; // cho phép ghi đè
};

export async function convertAudioToAac(
  inputPath: string,
  opts: ConvertOptions = {},
) {
  const {
    bitrate = '192k',
    sampleRate = 44100,
    channels = 2,
    outPath,
    overwrite = false,
  } = opts;

  // Kiểm tra input tồn tại
  if (!inputPath) {
    throw new Error('Missing inputPath');
  }
  const absInput = path.resolve(inputPath);
  if (!fs.existsSync(absInput)) {
    throw new Error(`Input not found: ${absInput}`);
  }

  // Tạo đường dẫn output .aac
  const outFile = outPath
    ? path.resolve(outPath)
    : path.join(path.dirname(absInput), `${path.parse(absInput).name}.aac`);

  // Nếu không overwrite và file đã tồn tại → báo lỗi
  if (!overwrite && fs.existsSync(outFile)) {
    throw new Error(
      `Output already exists: ${outFile} (use --overwrite to replace)`,
    );
  }

  // Kiểm tra ffmpeg có sẵn
  await assertFfmpeg();

  // Chuẩn hóa path cho cross-platform
  const slash = (await import('slash')).default;
  const safeIn = slash(absInput);
  const safeOut = slash(outFile);

  // Ghép args ffmpeg
  const args = [
    overwrite ? '-y' : '-n',
    '-i',
    safeIn,
    '-vn', // bỏ mọi track video nếu có
    '-c:a',
    'aac',
    '-b:a',
    `${bitrate}`,
    '-ar',
    `${sampleRate}`,
    '-ac',
    `${channels}`,
    safeOut,
  ];

  // Chạy ffmpeg bằng zx
  const { $ } = await import('zx');
  $.verbose = false;
  try {
    await $`ffmpeg ${args}`;
  } catch (err: any) {
    // Khi -n (no overwrite) trùng file, ffmpeg trả mã lỗi — báo rõ cho dev
    throw new Error(`FFmpeg failed: ${err?.stderr || err?.message || err}`);
  }

  if (!fs.existsSync(outFile)) {
    throw new Error('AAC output not found after ffmpeg finished.');
  }

  return outFile;
}

async function assertFfmpeg() {
  const { $ } = await import('zx');
  try {
    await $`ffmpeg -version`;
  } catch {
    throw new Error('ffmpeg not found in PATH. Please install FFmpeg.');
  }
}

/* ===================== CLI ===================== */

function parseCliArgs(argv: string[]) {
  const args = argv.slice(2);
  const opts: ConvertOptions = {};
  let inputPath = '';

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (!a.startsWith('--') && !inputPath) {
      inputPath = a;
      continue;
    }
    if (a === '--bitrate') {
      opts.bitrate = args[++i];
    } else if (a === '--ar') {
      opts.sampleRate = Number(args[++i]);
    } else if (a === '--ac') {
      opts.channels = Number(args[++i]);
    } else if (a === '--out') {
      opts.outPath = args[++i];
    } else if (a === '--overwrite') {
      opts.overwrite = true;
    } else if (a === '--help' || a === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  return { inputPath, opts };
}

function printHelp() {
  console.log(`
Usage:
  ts-node convert-audio-to-aac.ts <inputPath> [--bitrate 192k] [--ar 44100] [--ac 2] [--out out.aac] [--overwrite]

Options:
  --bitrate     Audio bitrate (default: 192k)
  --ar          Sample rate (default: 44100)
  --ac          Channels (default: 2)
  --out         Output .aac path (default: same folder/name as input)
  --overwrite   Overwrite output file if exists
  -h, --help    Show this help
`);
}

// async function main() {
//   const { inputPath, opts } = parseCliArgs(process.argv);
//   if (!inputPath) {
//     printHelp();
//     process.exit(1);
//   }
//
//   try {
//     const out = await convertAudioToAac(inputPath, opts);
//     console.log(`✅ Converted: ${out}`);
//   } catch (err: any) {
//     console.error('❌ Error:', err?.message || err);
//     process.exit(1);
//   }
// }
//
// // Chạy nếu gọi trực tiếp từ CLI
// if (require.main === module) {
//   // eslint-disable-next-line @typescript-eslint/no-floating-promises
//   main();
// }

export async function getAudioDuration(inputPath: string): Promise<number> {
  const { $ } = await import('zx');
  const slash = (await import('slash')).default;

  const safeIn = slash(inputPath);
  const { stdout } =
    await $`ffprobe -i ${safeIn} -show_entries format=duration -v quiet -of csv="p=0"`;
  console.log('stdout:', stdout);
  return parseFloat(stdout.trim()); // seconds
}