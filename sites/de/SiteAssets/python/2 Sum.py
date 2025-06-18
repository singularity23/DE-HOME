class Solution():

    def twoSum(self, nums, target):

        hashmap = {}
        for i in range(len(nums)):
            hashmap[nums[i]] = i
        print(hashmap)
        for i in range(len(nums)):
            complement = target - nums[i]
            print(complement)
            if complement in hashmap and hashmap[complement] != i:
                return [i, hashmap[complement]]


"""         self.nums = nums
		self.target = target
		print("Input: nums = {}, target = {}".format(self.nums, self.target))

		nums_copy = nums.copy()

		nums_copy.append(self.target)
		nums_copy.sort()
		index = nums_copy.index(self.target)
		nums_copy.remove(self.target)
		print("List Ordered: {}".format(nums_copy))

		length = len(self.nums)
		mid = len(nums_copy)//2

		print("length, mid, index: {}, {}, {}".format(length, mid, index))

		if index - mid > 2:
			#self.nums = self.nums[0:index:1]
			#print("New List: {}".format(self.nums))
			for i in range(0, index):
				for j in range(i+1, index):
					#print(i, j)
					#print(nums_copy[i] + nums_copy[j])
					# print(self.target)
					if nums_copy[i]+nums_copy[j] == self.target:
						result = [nums_copy[i], nums_copy[j]]
						result.sort()
						a = self.nums.index(result[0])
						b = self.nums.index(result[1])
						if a == b:
							b = b+1

						final = [a, b]
						final.sort()
						print("Output:{}".format(final))
						return a, b

			print("No Answers")
			return None
		elif index - mid < -2:
			#self.nums = self.nums[index:length-1:1]
			#print("New List: {}".format(self.nums))
			for i in range(index+1, length):
				for j in range(i+1, length):
					#print(i, j)
					#print(nums_copy[i] + nums_copy[j])
					if nums_copy[i]+nums_copy[j] == self.target:
						result = [nums_copy[i], nums_copy[j]]
						result.sort()
						a = self.nums.index(result[0])
						b = self.nums.index(result[1])
						if a == b:
							b = b+1

						final = [a, b]
						final.sort()
						print("Output:{}".format(final))
						return a, b

			print("No Answers")
			return None
		else:
			for i in range(0, length):
				for j in range(i+1, length):
					#print(i, j)
					#print(nums_copy[i] + nums_copy[j])
					# print(self.target)
					if nums_copy[i]+nums_copy[j] == self.target:
						result = [nums_copy[i], nums_copy[j]]
						result.sort()
						a = self.nums.index(result[0])
						b = self.nums.index(result[1])
						if a == b:
							b = b+1

						final = [a, b]
						final.sort()
						print("Output:{}".format(final))
						return a, b

			print("No Answers")
			return None """


class main:

    nums = [-3, -4, 2, 5, 11, 7, 15]
    target = 13
    s = Solution()
    a, b = s.twoSum(nums, target)
    print(a, b)

    nums1 = [3, 2, 4, -1, -2]
    target1 = -3
    s1 = Solution()
    a1, b1 = s1.twoSum(nums1, target1)
    print(a1, b1)

    nums2 = [3, 3]
    target2 = 6
    s2 = Solution()
    s2.twoSum(nums2, target2)
    a2, b2 = s2.twoSum(nums2, target2)
    print(a2, b2)
