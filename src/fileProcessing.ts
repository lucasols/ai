const htmlTagStartRegex = /<[a-z_-]+?(?:\s+[a-z_-]+=(?:"|').+?(?:"|'))?.*>/i;
const htmlTagEndRegex = /<\/[a-z_-]+?>/i;

export function getTextTypeFromContent(content: string): 'text' | 'html' {
  if (htmlTagStartRegex.test(content) && htmlTagEndRegex.test(content)) {
    return 'html';
  }

  return 'text';
}
