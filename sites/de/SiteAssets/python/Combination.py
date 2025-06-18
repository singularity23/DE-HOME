from operator import xor


class solution:
    def combination(self, narray, karray):
        n = len(narray)
        k = len(karray)

        sol = []
        comb = []
        for i in range(n):
            comb.append(narray[i])
            res = []

            def backtracking(start):
                if len(comb) == 2:
                    res.append(comb[:])
                    return

                for j in range(start, k):
                    comb.append(karray[j])
                    backtracking(j + 1)
                    comb.pop()

            backtracking(0)

        sol += res

        return sol


class main:
    print("what")
    narray = [1]
    karray = [1, 2]

    sol = solution().combination(narray, karray)
    print(sol)

    
