def addition(x):
    y = []
    for i in x:
        y.append(i * i)
    return y


lst = [1, 2, 3, 4, 5, 6, 7, 8]

data = addition(lst)

dct = dict(zip(lst, data))

dd = map(addition, lst)

ee = list(dd)

print(ee)

print(dct)
