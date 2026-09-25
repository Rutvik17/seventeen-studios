using System.Text;

public class Solution {
    public string Multiply(string num1, string num2) {
        if (num1 == "0" || num2 == "0") return "0";
        // Long multiplication: digit i of num1 times digit j of num2 lands at place i + j + 1
        // of the product (counting from the left, with room for one extra digit).
        var out_ = new int[num1.Length + num2.Length];
        for (int i = num1.Length - 1; i >= 0; i--)
            for (int j = num2.Length - 1; j >= 0; j--) {
                int total = out_[i + j + 1] + (num1[i] - '0') * (num2[j] - '0');
                out_[i + j + 1] = total % 10;
                out_[i + j] += total / 10; // the carry, settled when that place is reached
            }
        var sb = new StringBuilder();
        foreach (int d in out_) if (sb.Length > 0 || d != 0) sb.Append(d);
        return sb.ToString();
    }
}
