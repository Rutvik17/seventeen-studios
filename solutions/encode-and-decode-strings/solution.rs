struct Codec;

impl Codec {
    fn new() -> Self {
        Codec
    }

    /// Each string becomes "<length>#<string>", so any character can appear inside it.
    fn encode(&self, strs: Vec<String>) -> String {
        strs.iter().map(|s| format!("{}#{}", s.len(), s)).collect()
    }

    fn decode(&self, s: String) -> Vec<String> {
        let mut out = vec![];
        let mut i = 0;
        while i < s.len() {
            let j = i + s[i..].find('#').unwrap(); // the length ends at the first '#'
            let n: usize = s[i..j].parse().unwrap();
            out.push(s[j + 1..j + 1 + n].to_string());
            i = j + 1 + n;
        }
        out
    }
}
