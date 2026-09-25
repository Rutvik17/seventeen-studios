class Solution {
public:
    int evalRPN(vector<string>& tokens) {
        vector<long long> stack;
        for (const string& tok : tokens) {
            if (tok == "+" || tok == "-" || tok == "*" || tok == "/") {
                long long b = stack.back(); stack.pop_back(); // the right operand is on top
                long long a = stack.back(); stack.pop_back();
                if (tok == "+") stack.push_back(a + b);
                else if (tok == "-") stack.push_back(a - b);
                else if (tok == "*") stack.push_back(a * b);
                else stack.push_back(a / b); // truncates toward zero
            } else stack.push_back(stoll(tok));
        }
        return stack.back();
    }
};
