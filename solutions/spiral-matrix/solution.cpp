class Solution {
public:
    vector<int> spiralOrder(vector<vector<int>>& matrix) {
        vector<int> out;
        int top = 0, bottom = matrix.size() - 1, left = 0, right = matrix[0].size() - 1; // the ring still unread
        while (top <= bottom && left <= right) {
            for (int c = left; c <= right; c++) out.push_back(matrix[top][c]); // along the top
            for (int r = top + 1; r <= bottom; r++) out.push_back(matrix[r][right]); // down the right side
            if (top < bottom && left < right) { // a ring more than one row or column thick
                for (int c = right - 1; c >= left; c--) out.push_back(matrix[bottom][c]); // back along the bottom
                for (int r = bottom - 1; r > top; r--) out.push_back(matrix[r][left]); // up the left side
            }
            top++, bottom--, left++, right--;
        }
        return out;
    }
};
