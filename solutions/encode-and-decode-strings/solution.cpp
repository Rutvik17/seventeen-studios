class Codec {
public:
    // Each string becomes "<length>#<string>", so any character can appear inside it.
    string encode(vector<string>& strs) {
        string out;
        for (const string& s : strs) out += to_string(s.size()) + "#" + s;
        return out;
    }

    vector<string> decode(string s) {
        vector<string> out;
        size_t i = 0;
        while (i < s.size()) {
            size_t j = s.find('#', i); // the length ends at the first '#'
            int n = stoi(s.substr(i, j - i));
            out.push_back(s.substr(j + 1, n));
            i = j + 1 + n;
        }
        return out;
    }
};
