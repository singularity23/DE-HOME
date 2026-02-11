def addition(x):
    y = []
    for i in x:
        y.append(i * i)
    return y


lst = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

data = addition(lst)

dct = dict(zip(lst, data))

nn = list(map(addition, lst))

n_lst = [n for n in nn]
