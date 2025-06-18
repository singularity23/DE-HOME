import math, time, os
from datetime import datetime
from tkinter import S
def closetSum(nums, target_sum):
    unsorted = nums
    nums.sort()
    print(nums)
    max_num = max(nums)
    print(max_num)

    print(target_sum in [0, 2*max_num])

    if target_sum == 0:
        print("No balancing is required!")
        return []
    elif target_sum >= max_num * 2:
        return LargestSum(nums)

    while True:
        sol = hashMapping(nums, target_sum)
        if sol:
            return sol
        if target_sum > max_num:
            target_sum -= 1
        else:
            target_sum += 1

def LargestSum(nums):

    maxNum = max(nums)
    nextMax = nums[0]
 # Create hashmap directly
    for num in nums[1:]:
        if nextMax < num and num != maxNum:
            nextMax = num
    return [nums.index(nextMax), nums.index(maxNum)]


def HashTargetSum(nums, target_sum):
# Find pairs of elements in a list that sum up to a target value.(exact match)
# Args:
#     nums (List[int]): A list of integers.
#     target_sum (int): The target sum to find pairs for.
# Returns:
#     List[List[int]]: A list of pairs of indices where the elements sum up to the target value.

    sol = []
    hashmap = {}   # Create hashmap directly
    for i, num in enumerate(nums):
        hashmap[num] = i
        complement = target_sum - num
        if complement in hashmap and hashmap[complement] != i:
            sol.append([i, hashmap[complement]])
    return sol

def upper(x):

    return 1 if x == 0 else (math.ceil(math.log(x)/math.log(2)))

def squares(a, b):
    res = 0
    res = math.floor(b**0.5)+1 - math.ceil(a**0.5)
    print(math.floor(b**0.5))
    print(math.ceil(a**0.5))
    return res

def make_slices(n, k):
	s = math.ceil(n / k)
	for i in range(0, n, s):
		yield slice(i, i + s)

def main():

    FILING_DIR = r"J:\Engineering\Distribution\0 EGBC Filing\1 General DRE\LMN\Vancouver\DESRT"
    DESRT_ID = "2728810"
    FOLDER = "810 Evans Ave"
    CAL_YEAR = datetime.now().year - 1999
    FIS_YEAR = f'F{str(CAL_YEAR)}'
    FOLDER = '_'.join([FOLDER.replace(' ', '_'), 'Vancouver_Fault_Study'])

    folder_path = os.path.join(FILING_DIR, FIS_YEAR, DESRT_ID, FOLDER,)
    print(folder_path)

if __name__ == "__main__":
    start_time = time.time()
    main()
    print("--- {:.20f} seconds ---".format(time.time() - start_time))
