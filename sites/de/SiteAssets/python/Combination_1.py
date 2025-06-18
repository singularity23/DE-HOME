def Combination(n, k):

    sol, ans = [], []

    def backtrack(x):

        if k == len(sol):
            ans.append(sol[:])
            return

        left = x
        need = k - len(sol)

        if left > need:
            backtrack(x - 1)

        sol.append(x)
        backtrack(x - 1)
        sol.pop()

    backtrack(n)  # import numpy as np
    return ans


class main:
    x = {1: 2, 3: 4, 4: 3, 2: 1, 0: 0}
    print(x.items())
    print(dict(sorted(x.items(), key=lambda item: item[1], reverse=True)))

    import math

    print(math.ceil(0.0018))


    FILES_MAP = {
        1:{'ShortCircuit': [r"DISTRIBUTION ENGINEERING CHECK FORM.docx", r"SCL-2024-06.xlsm"]},
        2:{'Memo':[r""]},
        3:{'Settings':[r""]},
                 }
