class Codec {
  /** Each string becomes "<length>#<string>", so any character can appear inside it. */
  encode(strs) {
    return strs.map((s) => `${s.length}#${s}`).join('');
  }

  decode(s) {
    const out = [];
    let i = 0;
    while (i < s.length) {
      const j = s.indexOf('#', i); // the length ends at the first '#'
      const n = Number(s.slice(i, j));
      out.push(s.slice(j + 1, j + 1 + n));
      i = j + 1 + n;
    }
    return out;
  }
}
