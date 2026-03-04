class Solution:
    @staticmethod
    def letterCombinations(digits: str) -> list[str]:
        """Generate all letter combinations corresponding to phone digits.

        Args:
            digits: String of digits (2-9) from a phone keypad.

        Returns:
            List of all possible letter combinations.
        """
        if not digits:
            return []

        letter_map = {
            "2": "abc",
            "3": "def",
            "4": "ghi",
            "5": "jkl",
            "6": "mno",
            "7": "pqrs",
            "8": "tuv",
            "9": "wxyz",
        }

        results = []

        def backtrack(index: int, current: str) -> None:
            """Build combinations recursively by appending letters for each digit."""
            # Base case: all digits processed
            if index == len(digits):
                results.append(current)
                return

            # Get letters for current digit and recurse
            letters = letter_map[digits[index]]
            for letter in letters:
                backtrack(index + 1, current + letter)

        backtrack(0, "")
        return results

    def letterCombinations2(digits: str) -> list[str]:
        if not digits:
            return []

        ret, sol = [], []
        n = len(digits)

        letter_map = {
            "2": "abc",
            "3": "def",
            "4": "ghi",
            "5": "jkl",
            "6": "mno",
            "7": "pqrs",
            "8": "tuv",
            "9": "wxyz",
        }

        def backtrack(index: int) -> None:
            print(f"Sol length: {len(sol)}, n: {n}, index: {index}")
            if len(sol) == n:
                ret.append("".join(sol))
                print(f"Combination found: [{''.join(sol)}], index: {index}")
                return

            letters = letter_map[digits[index]]
            for letter in letters:
                print(f"Under: [{digits[index]}], for [{letter}] in [{letters}]")
                print(f"sol: [{''.join(sol)}] appends [{letter}]")
                sol.append(letter)
                print(f"backtrack({index} + 1)")
                backtrack(index + 1)
                print(f"Now Sol: [{''.join(sol)}], index: {index}")
                sol.pop()
                print(
                    f"Sol after pop: [{''.join(sol)}], End: [{letter}] for [{letters}], under [{digits[index]}]"
                )

        backtrack(0)
        return ret


if __name__ == "__main__":
    List1 = Solution.letterCombinations2("7465")

    List2 = Solution.letterCombinations2("7465")
    print(List1)
    print(List2)
