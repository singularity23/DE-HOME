def addition(x):
    return x**x


lst = [1, 2, 3, 4]

data = list(map(addition, lst))

dct = dict(zip(lst, data))
