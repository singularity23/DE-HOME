class solution:

    def smallestSumOfTwoIndexMutiplication(self, array1: list, array2: list):
        if len(array1) == 0 or len(array2) == 0:
            return []

        n = min(len(array1), len(array2))

        array1.sort()
        array2.sort(reverse=True)
        print(array1)
        print(array2)

        sol = 0

        for i in range(n):
            sol += array1[i] * array2[i]
            print(sol)
        return sol


class main:

    first = [1, 4, 3, 2]
    second = [5, 12, 1, 5]
    second.pop()
    print(second)

    a = solution()
    results = a.smallestSumOfTwoIndexMutiplication(first, second)
    print(results)
