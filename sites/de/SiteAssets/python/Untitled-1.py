class Solution:

  def LargestSum(nums):
      #    """
      #    Find the indices of the two largest elements in a list.
      #
      #    This function identifies the two largest unique numbers in the provided list and
      #    returns their indices. If the largest number appears multiple times, the index of
      #    its first occurrence is returned along with the index of the second largest number.
      #
      #    Args:
      #        nums (list): A list of numbers.
      #
      #    Returns:
      #        list: A list containing the indices of the two largest elements in the input list.
      #    """
      maxNum = float("-inf")
      nextMax = float("-inf")
      maxIndex = -1
      nextMaxIndex = -1
      # Single pass to find both largest and second largest elements
      for i, num in enumerate(nums):
          if num > maxNum:
              nextMax, nextMaxIndex = maxNum, maxIndex
              maxNum, maxIndex = num, i
              print(maxNum)
          elif num > nextMax and i != maxIndex:
              nextMax, nextMaxIndex = num, i
              print(nextMax)
      print(f"largest: {[nextMax, maxNum]}")
      return [nextMaxIndex, maxIndex]

class main:
  nums = [3, 7, 18, 4, 15, 4, 7, 18]
  print(Solution.LargestSum(nums))
