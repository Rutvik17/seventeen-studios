using System.Text;

public class Solution {
    public IList<string> GenerateParenthesis(int n) {
        var output = new List<string>();
        var path = new StringBuilder();
        void Build(int opened, int closed) {
            if (path.Length == 2 * n) { output.Add(path.ToString()); return; }
            if (opened < n) { // an opener is allowed while any remain
                path.Append('(');
                Build(opened + 1, closed);
                path.Length--;
            }
            if (closed < opened) { // a closer is allowed only if it has an opener to match
                path.Append(')');
                Build(opened, closed + 1);
                path.Length--;
            }
        }
        Build(0, 0);
        return output;
    }
}
