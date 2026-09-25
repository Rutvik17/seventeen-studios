class Solution {
public:
    void setZeroes(vector<vector<int>>& matrix) {
        int rows = matrix.size(), cols = matrix[0].size();
        // Use the first row and column as the notes of which columns and rows to clear.
        // Their own cells are needed for that, so remember separately whether they had a 0.
        bool firstRow = false, firstCol = false;
        for (int c = 0; c < cols; c++) if (matrix[0][c] == 0) firstRow = true;
        for (int r = 0; r < rows; r++) if (matrix[r][0] == 0) firstCol = true;
        for (int r = 1; r < rows; r++)
            for (int c = 1; c < cols; c++)
                if (matrix[r][c] == 0) matrix[r][0] = matrix[0][c] = 0;
        for (int r = 1; r < rows; r++)
            for (int c = 1; c < cols; c++)
                if (matrix[r][0] == 0 || matrix[0][c] == 0) matrix[r][c] = 0;
        if (firstRow) fill(matrix[0].begin(), matrix[0].end(), 0);
        if (firstCol) for (auto& row : matrix) row[0] = 0;
    }
};
