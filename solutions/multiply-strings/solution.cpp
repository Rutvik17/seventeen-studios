class Solution {
public:
    string multiply(string num1, string num2) {
        if (num1 == "0" || num2 == "0") return "0";
        // Long multiplication: digit i of num1 times digit j of num2 lands at place i + j + 1
        // of the product (counting from the left, with room for one extra digit).
        vector<int> out(num1.size() + num2.size(), 0);
        for (int i = num1.size() - 1; i >= 0; i--)
            for (int j = num2.size() - 1; j >= 0; j--) {
                int total = out[i + j + 1] + (num1[i] - '0') * (num2[j] - '0');
                out[i + j + 1] = total % 10;
                out[i + j] += total / 10; // the carry, settled when that place is reached
            }
        string s;
        for (int d : out) if (!s.empty() || d != 0) s += char('0' + d);
        return s;
    }
};
