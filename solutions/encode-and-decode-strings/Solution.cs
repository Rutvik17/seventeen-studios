using System.Text;

public class Codec {
    // Each string becomes "<length>#<string>", so any character can appear inside it.
    public string Encode(IList<string> strs) {
        var sb = new StringBuilder();
        foreach (string s in strs) sb.Append(s.Length).Append('#').Append(s);
        return sb.ToString();
    }

    public IList<string> Decode(string s) {
        var output = new List<string>();
        int i = 0;
        while (i < s.Length) {
            int j = s.IndexOf('#', i); // the length ends at the first '#'
            int n = int.Parse(s.Substring(i, j - i));
            output.Add(s.Substring(j + 1, n));
            i = j + 1 + n;
        }
        return output;
    }
}
