class Solution:
    def multiply(self, num1: str, num2: str) -> str:
        if num1 == "0" or num2 == "0":
            return "0"
        # Long multiplication: digit i of num1 times digit j of num2 lands at place i + j + 1
        # of the product (counting from the left, with room for one extra digit).
        out = [0] * (len(num1) + len(num2))
        for i in range(len(num1) - 1, -1, -1):
            for j in range(len(num2) - 1, -1, -1):
                total = out[i + j + 1] + int(num1[i]) * int(num2[j])
                out[i + j + 1] = total % 10
                out[i + j] += total // 10  # the carry, settled when that place is reached
        return "".join(map(str, out)).lstrip("0")
