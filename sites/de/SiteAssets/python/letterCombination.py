class Solution:
  def letterCombination(self, digits: str) -> list[str]:

    if digits == "":
      return []

    ret, sol = [], []
    n = len(digits)

    letter_map = { '2':'abc', '3':'def', '4':'ghi', '5':'jkl', '6':'mno', '7':'pqrs', '8':'tuv', '9':'wxyz'}

    def backtrack(i=0):
      print(i)
      if len(sol) == n:
        ret.append(''.join(sol[:]))
        print("third")
        print(sol[:])
        return

      print(letter_map[digits[i]])
      print("start")
      for num in letter_map[digits[i]]:
        print(num)
        sol.append(num)
        print("first")
        print(sol)
        backtrack(i+1)
        sol.pop()
        print("second")
        print(sol)
      print(letter_map[digits[i]])
      print("end")

    backtrack(0)
    return ret

if __name__ == "__main__":

  List = Solution().letterCombination('7465')
  print(List)

  pair = [[0,4],[2,3],[5,7]]
  a = [1, 2 ,3, 4, 5 ,6,7, 8 ,9]
  b = [1, 2 ,3, 4, 5 ,6,7, 8 ,9]

  y = lambda i,j:abs(a[i]+b[j]-5),pair


  min_diff = [ [i,j] for i,j in pair if y(i,j) == min([y(i,j) for i,j in pair]) ]

  print(min_diff)















