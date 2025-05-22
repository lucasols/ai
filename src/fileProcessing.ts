const htmlTagStartRegex = /<[a-z_-]+?(?:\s+[a-z_-]+=(?:"|').+?(?:"|'))?.*>/i;
const htmlTagEndRegex = /<\/[a-z_-]+?>/i;

export function getTextTypeFromContent(content: string): 'text' | 'html' {
  if (htmlTagStartRegex.test(content) && htmlTagEndRegex.test(content)) {
    return 'html';
  }

  return 'text';
}

// FIX: [2025-06-17] Mastra crashes due to serializing the file content, send issue to mastra repository
/** A class to avoid issues with mastra snapshots */
export class FileWrapper {
  constructor(public readonly content: Buffer) {}

  toJSON() {
    return {
      type: 'file',
      size: this.content.length,
    };
  }

  static from(buffer: ArrayBuffer) {
    return new FileWrapper(Buffer.from(buffer));
  }
}
