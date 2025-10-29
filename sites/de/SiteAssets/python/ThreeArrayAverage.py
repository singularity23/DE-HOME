def balance_arrays(A, B, C):
    """
    Find numbers to move among arrays A, B, C to make their sums as close as possible.
    Returns a list of moves (number, from_array, to_array) and the final balanced sums.
    """
    # Combine all arrays and calculate target sum
    all_numbers = []
    for num in A:
        all_numbers.append((num, "A"))
    for num in B:
        all_numbers.append((num, "B"))
    for num in C:
        all_numbers.append((num, "C"))

    total_sum = sum(A) + sum(B) + sum(C)
    target_avg = total_sum / 3

    # Try all possible assignments of numbers to arrays
    n = len(all_numbers)
    best_balance = float("inf")
    best_assignment = None

    # Since we have at most 90 numbers total, but we need to assign each to one of 3 arrays,
    # we'll use a smarter approach by trying different combinations of moves

    def calculate_balance(arr1, arr2, arr3):
        sum1, sum2, sum3 = sum(arr1), sum(arr2), sum(arr3)
        avg = (sum1 + sum2 + sum3) / 3
        balance = max(abs(sum1 - avg), abs(sum2 - avg), abs(sum3 - avg))
        return balance, (sum1, sum2, sum3)

    # Current state
    current_A, current_B, current_C = A.copy(), B.copy(), C.copy()

    # Try moving single numbers
    best_moves = []
    current_balance, current_sums = calculate_balance(current_A, current_B, current_C)

    improved = True
    while improved:
        improved = False
        best_move = None
        best_new_balance = current_balance

        # Try all possible single moves
        for from_arr, to_arr, from_name, to_name in [
            (current_A, current_B, "A", "B"),
            (current_A, current_C, "A", "C"),
            (current_B, current_A, "B", "A"),
            (current_B, current_C, "B", "C"),
            (current_C, current_A, "C", "A"),
            (current_C, current_B, "C", "B"),
        ]:
            for i, num in enumerate(from_arr):
                # Try moving this number
                new_from = from_arr.copy()
                new_to = to_arr.copy()
                moved_num = new_from.pop(i)
                new_to.append(moved_num)

                # Calculate new balance based on which arrays we're modifying
                if (from_name, to_name) in [("A", "B"), ("B", "A")]:
                    new_balance, new_sums = calculate_balance(
                        new_from if from_name == "A" else new_to,
                        new_to if from_name == "A" else new_from,
                        current_C,
                    )
                elif (from_name, to_name) in [("A", "C"), ("C", "A")]:
                    new_balance, new_sums = calculate_balance(
                        new_from if from_name == "A" else new_to,
                        current_B,
                        new_to if from_name == "A" else new_from,
                    )
                else:  # ('B', 'C') or ('C', 'B')
                    new_balance, new_sums = calculate_balance(
                        current_A,
                        new_from if from_name == "B" else new_to,
                        new_to if from_name == "B" else new_from,
                    )

                if new_balance < best_new_balance:
                    best_new_balance = new_balance
                    best_move = (
                        moved_num,
                        from_name,
                        to_name,
                        new_from,
                        new_to,
                        new_sums,
                    )

        if best_move and best_new_balance < current_balance:
            moved_num, from_name, to_name, new_from, new_to, new_sums = best_move
            best_moves.append((moved_num, from_name, to_name))

            # Update current state
            if from_name == "A":
                current_A = new_from
                if to_name == "B":
                    current_B = new_to
                else:  # to_name == 'C'
                    current_C = new_to
            elif from_name == "B":
                current_B = new_from
                if to_name == "A":
                    current_A = new_to
                else:  # to_name == 'C'
                    current_C = new_to
            else:  # from_name == 'C'
                current_C = new_from
                if to_name == "A":
                    current_A = new_to
                else:  # to_name == 'B'
                    current_B = new_to

            current_balance = best_new_balance
            improved = True

    # Calculate final sums
    final_sum_A = sum(current_A)
    final_sum_B = sum(current_B)
    final_sum_C = sum(current_C)
    final_avg = (final_sum_A + final_sum_B + final_sum_C) / 3

    return {
        "moves": best_moves,
        "initial_sums": (sum(A), sum(B), sum(C)),
        "final_sums": (final_sum_A, final_sum_B, final_sum_C),
        "target_average": target_avg,
        "deviation_from_target": (
            abs(final_sum_A - final_avg),
            abs(final_sum_B - final_avg),
            abs(final_sum_C - final_avg),
        ),
    }


# Example usage and test cases
if __name__ == "__main__":
    # Test case 1
    A1 = [2.13, 17.92, 10.43, 7.39, 37.9]
    B1 = [5.17, 17.05, 11.95, 14.82]
    C1 = [10.85, 12.35, 16.62, 4.31, 2.41, 23.07, 28.72, 6.3, 28.8, 22.2]

    result1 = balance_arrays(A1, B1, C1)
    print("Test case 1:")
    print(
        f"Initial sums: A={result1['initial_sums'][0]}, B={result1['initial_sums'][1]}, C={result1['initial_sums'][2]}"
    )
    print(
        f"Final sums: A={result1['final_sums'][0]}, B={result1['final_sums'][1]}, C={result1['final_sums'][2]}"
    )
    print(f"Target average: {result1['target_average']:.2f}")
    print("Moves:")
    for move in result1["moves"]:
        print(f"  Move {move[0]} from {move[1]} to {move[2]}")
    print()

    # Test case 2 - Already balanced
    A2 = [25.87, 36.86, 15.92, 1.79, 28.61, 6.91, 6.84, 13.99, 35.7, 4.3]
    B2 = [25.51, 4.74, 18.63, 12, 27.33, 39.52, 11.6, 30.59, 1.18, 6.12]
    C2 = [18.35, 32.26, 19.14, 32.12, 21.42, 3.38, 20.9, 37.27, 18.39, 2.84]

    result2 = balance_arrays(A2, B2, C2)
    print("Test case 2 (already balanced):")
    print(
        f"Initial sums: A={result2['initial_sums'][0]}, B={result2['initial_sums'][1]}, C={result2['initial_sums'][2]}"
    )
    print(
        f"Final sums: A={result2['final_sums'][0]}, B={result2['final_sums'][1]}, C={result2['final_sums'][2]}"
    )
    print("Moves:", result2["moves"])
    print()

    # Test case 3 - Empty array
    A3 = [10, 20, 30]
    B3 = [15, 25]
    C3 = []  # Empty array

    result3 = balance_arrays(A3, B3, C3)
    print("Test case 3 (with empty array):")
    print(
        f"Initial sums: A={result3['initial_sums'][0]}, B={result3['initial_sums'][1]}, C={result3['initial_sums'][2]}"
    )
    print(
        f"Final sums: A={result3['final_sums'][0]}, B={result3['final_sums'][1]}, C={result3['final_sums'][2]}"
    )
    print("Moves:")
    for move in result3["moves"]:
        print(f"  Move {move[0]} from {move[1]} to {move[2]}")
