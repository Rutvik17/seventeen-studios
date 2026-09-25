class Solution {
    public String multiply(String num1, String num2) {
        if (num1.equals("0") || num2.equals("0")) return "0";
        // Long multiplication: digit i of num1 times digit j of num2 lands at place i + j + 1
        // of the product (counting from the left, with room for one extra digit).
        int[] out = new int[num1.length() + num2.length()];
        for (int i = num1.length() - 1; i >= 0; i--)
            for (int j = num2.length() - 1; j >= 0; j--) {
                int total = out[i + j + 1] + (num1.charAt(i) - '0') * (num2.charAt(j) - '0');
                out[i + j + 1] = total % 10;
                out[i + j] += total / 10; // the carry, settled when that place is reached
            }
        StringBuilder sb = new StringBuilder();
        for (int d : out) if (sb.length() > 0 || d != 0) sb.append(d);
        return sb.toString();
    }
}
