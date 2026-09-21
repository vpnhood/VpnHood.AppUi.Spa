import MarkdownIt from 'markdown-it';
import type { Plugin } from 'vite';

/**
 * Turns the long-form markdown in src/content/<lang>/ into HTML fragments AT BUILD TIME, so the
 * app ships plain HTML and never parses markdown at runtime.
 *
 * The markdown is the authored and translated form (vhtranslator's `docs` mode keeps the sibling
 * language folders up to date); this plugin is the last step, deliberately placed AFTER
 * translation so a change here can never invalidate a translation.
 *
 * `import content from './content/en/privacy-consent-connect.md'` yields the rendered HTML string, with
 * the front matter's `title` as a named export.
 */
export function markdownContent(): Plugin {
  // html:true lets a document embed markup where markdown cannot express something. These files
  // are repository content compiled into the bundle — never user input — so there is nothing to
  // sanitize against. linkify/typographer stay off: both rewrite text the translator produced,
  // and this stage must not second-guess it.
  const markdown = MarkdownIt({ html: true, linkify: false, typographer: false });

  return {
    name: 'vh-markdown-content',
    // Before Vue's plugin, which would otherwise never see a .md it cannot handle anyway.
    enforce: 'pre',

    transform(code: string, id: string) {
      if (!id.endsWith('.md'))
        return null;

      const { title, body } = splitFrontMatter(code);
      return {
        code:
          `export const title = ${JSON.stringify(title)};\n` +
          `export default ${JSON.stringify(markdown.render(body))};\n`,
        map: null
      };
    }
  };
}

/**
 * Splits off the YAML front matter and reads `title` from it. Deliberately the same minimal
 * dialect vhtranslator writes — `key: value` lines, optionally double-quoted — rather than a YAML
 * parser: front matter that this cannot read is front matter the translator did not produce.
 * A file without front matter is valid and simply has no title.
 */
function splitFrontMatter(source: string): { title: string; body: string } {
  const text = source.replace(/\r\n/g, '\n');
  if (!text.startsWith('---\n'))
    return { title: '', body: text };

  const end = text.indexOf('\n---', 3);
  if (end < 0)
    throw new Error('Markdown front matter is not closed by a second "---" line.');

  const frontMatter = text.slice(4, end);
  const bodyStart = text.indexOf('\n', end + 1);
  const body = bodyStart < 0 ? '' : text.slice(bodyStart + 1);

  const titleLine = frontMatter.split('\n').find(line => /^title:/.test(line));
  const rawTitle = titleLine?.slice('title:'.length).trim() ?? '';
  const title = rawTitle.startsWith('"') && rawTitle.endsWith('"') && rawTitle.length >= 2
    ? rawTitle.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\')
    : rawTitle;

  return { title, body };
}
