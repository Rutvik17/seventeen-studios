class Codec {
    /** Each string becomes "<length>#<string>", so any character can appear inside it. */
    public String encode(List<String> strs) {
        StringBuilder sb = new StringBuilder();
        for (String s : strs) sb.append(s.length()).append('#').append(s);
        return sb.toString();
    }

    public List<String> decode(String s) {
        List<String> out = new ArrayList<>();
        int i = 0;
        while (i < s.length()) {
            int j = s.indexOf('#', i); // the length ends at the first '#'
            int n = Integer.parseInt(s.substring(i, j));
            out.add(s.substring(j + 1, j + 1 + n));
            i = j + 1 + n;
        }
        return out;
    }
}
