/**
 * Syntax colouring for the solutions, done once at build time: the page ships
 * coloured HTML, not a highlighter.
 *
 * A small scanner, not a parser — comments, strings, numbers, keywords, type
 * names and function calls, which is all a reader's eye needs. Every
 * character of the source is escaped and emitted exactly once, so the text in
 * the page is the tested file, character for character.
 */

export type Lang = 'py' | 'js' | 'java' | 'cpp' | 'cs' | 'rs';

const KW: Record<Lang, string> = {
  py: 'def class return if elif else for while in not and or is None True False import from as with try except finally raise lambda yield pass break continue global nonlocal del assert self',
  js: 'function const let var return if else for while of in new class this null undefined true false typeof instanceof break continue switch case default do throw try catch finally extends super static get set async await',
  java: 'public private protected class static final void int long double boolean char byte short float new return if else for while do break continue null true false this super extends implements interface throws throw try catch finally switch case default var instanceof',
  cpp: 'class public private protected struct int long double bool char void auto const return if else for while do break continue nullptr true false new delete this using namespace template typename unsigned static inline sizeof operator NULL',
  cs: 'public private protected internal class static readonly void int long double bool char string var new return if else for foreach in while do break continue null true false this out ref using namespace get set override virtual uint sealed record',
  rs: 'fn let mut pub impl struct enum use for in while loop if else match return self Self Some None Ok Err true false as ref move where break continue const static mod type trait dyn crate',
};
const TYPES = new Set('i32 i64 u32 u64 usize isize f64 f32 u8 bool char str String Vec HashMap HashSet BTreeMap BTreeSet VecDeque BinaryHeap Option Box Rc RefCell Reverse List Dict Set Optional Tuple int str float deque heapq Counter defaultdict vector string unordered_map unordered_set map set pair queue priority_queue stack deque Map Set Integer Long Double Boolean Character String Math Array Object Dictionary HashSet Queue Stack PriorityQueue LinkedList ArrayList ArrayDeque Deque Arrays Collections StringBuilder'.split(' '));

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const span = (cls: string, s: string) => `<span class="tk-${cls}">${esc(s)}</span>`;

export function highlight(src: string, lang: Lang): string {
  const kw = new Set(KW[lang].split(' '));
  const lineComment = lang === 'py' ? '#' : '//';
  let out = '';
  let i = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i];
    // Comments.
    if (src.startsWith(lineComment, i)) {
      const e = src.indexOf('\n', i);
      const end = e === -1 ? n : e;
      out += span('com', src.slice(i, end));
      i = end;
      continue;
    }
    if (lang !== 'py' && src.startsWith('/*', i)) {
      const e = src.indexOf('*/', i + 2);
      const end = e === -1 ? n : e + 2;
      out += span('com', src.slice(i, end));
      i = end;
      continue;
    }
    // Python docstrings.
    if (lang === 'py' && (src.startsWith('"""', i) || src.startsWith("'''", i))) {
      const q = src.slice(i, i + 3);
      const e = src.indexOf(q, i + 3);
      const end = e === -1 ? n : e + 3;
      out += span('str', src.slice(i, end));
      i = end;
      continue;
    }
    // Strings and characters. A Rust lifetime ('a) has no closing quote nearby.
    if (c === '"' || c === "'" || (c === '`' && lang === 'js')) {
      let j = i + 1;
      while (j < n && src[j] !== c && src[j] !== '\n') j += src[j] === '\\' ? 2 : 1;
      if (src[j] === c && !(lang === 'rs' && c === "'" && j - i > 4)) {
        out += span('str', src.slice(i, j + 1));
        i = j + 1;
        continue;
      }
    }
    // Numbers.
    if (/[0-9]/.test(c) && !/[A-Za-z0-9_]/.test(src[i - 1] ?? '')) {
      const m = /^(0x[0-9a-fA-F_]+|[0-9][0-9_]*(\.[0-9]+)?([eE][+-]?[0-9]+)?)(u32|i32|i64|u64|usize|f64|LL|L|u|f)?/.exec(src.slice(i));
      if (m) {
        out += span('num', m[0]);
        i += m[0].length;
        continue;
      }
    }
    // Words.
    if (/[A-Za-z_$]/.test(c)) {
      let j = i + 1;
      while (j < n && /[A-Za-z0-9_$]/.test(src[j])) j++;
      const w = src.slice(i, j);
      let k = j;
      while (k < n && src[k] === ' ') k++;
      const after = src[k];
      const macro = lang === 'rs' && src[j] === '!';
      if (kw.has(w)) out += span('kw', w);
      else if (TYPES.has(w) || (/^[A-Z]/.test(w) && w.length > 1 && !/^[A-Z0-9_]+$/.test(w))) out += span('ty', w);
      else if (after === '(' || macro) out += span('fn', w);
      else out += esc(w);
      i = j;
      continue;
    }
    out += esc(c);
    i++;
  }
  return out;
}
