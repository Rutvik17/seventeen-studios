using System.Text;

public class Solution {
    private static readonly string[] Keys = { "", "", "abc", "def", "ghi", "jkl", "mno", "pqrs", "tuv", "wxyz" };
    private readonly List<string> out_ = new();
    private readonly StringBuilder cur = new();

    public IList<string> LetterCombinations(string digits) {
        if (digits.Length > 0) Spell(digits, 0);
        return out_;
    }

    // Letters for digits[0..i) are chosen.
    private void Spell(string digits, int i) {
        if (i == digits.Length) {
            out_.Add(cur.ToString());
            return;
        }
        foreach (char letter in Keys[digits[i] - '0']) {
            cur.Append(letter);
            Spell(digits, i + 1);
            cur.Length--;
        }
    }
}
