import json
from app.database import mock_question_collection

json_data = {
"type": "coding",
"questions": [
{
"question_text": "Given an integer N, print whether it is EVEN or ODD using decision making statements.\n\nExample 1:\nInput: 4\nOutput: EVEN\n\nExample 2:\nInput: 7\nOutput: ODD",
"input_format": "A single integer N.",
"output_format": "Print EVEN if N is even, otherwise print ODD.",
"constraints": "1 <= N <= 10^6",
"test_cases": [
{ "input": "4", "expected_output": "EVEN" },
{ "input": "7", "expected_output": "ODD" },
{ "input": "10", "expected_output": "EVEN" }
]
},
{
"question_text": "Find the largest among three numbers using conditional statements.\n\nExample 1:\nInput: 1 2 3\nOutput: 3\n\nExample 2:\nInput: 9 4 6\nOutput: 9",
"input_format": "A single line containing three integers A, B, C.",
"output_format": "Print the largest number.",
"constraints": "-10^6 <= A, B, C <= 10^6",
"test_cases": [
{ "input": "1 2 3", "expected_output": "3" },
{ "input": "9 4 6", "expected_output": "9" },
{ "input": "-1 -5 -3", "expected_output": "-1" }
]
},
{
"question_text": "Print the sum of first N natural numbers using a loop.\n\nExample 1:\nInput: 5\nOutput: 15\n\nExample 2:\nInput: 3\nOutput: 6",
"input_format": "A single integer N.",
"output_format": "Print the sum of first N natural numbers.",
"constraints": "1 <= N <= 10^5",
"test_cases": [
{ "input": "5", "expected_output": "15" },
{ "input": "3", "expected_output": "6" },
{ "input": "1", "expected_output": "1" }
]
},
{
"question_text": "Check whether a given year is a leap year.\n\nExample 1:\nInput: 2020\nOutput: YES\n\nExample 2:\nInput: 1900\nOutput: NO",
"input_format": "A single integer Y.",
"output_format": "Print YES if leap year, otherwise NO.",
"constraints": "1 <= Y <= 3000",
"test_cases": [
{ "input": "2020", "expected_output": "YES" },
{ "input": "1900", "expected_output": "NO" },
{ "input": "2000", "expected_output": "YES" }
]
},
{
"question_text": "Count the number of digits in a given integer using loops.\n\nExample 1:\nInput: 1234\nOutput: 4\n\nExample 2:\nInput: 9\nOutput: 1",
"input_format": "A single integer N.",
"output_format": "Print the number of digits.",
"constraints": "0 <= N <= 10^18",
"test_cases": [
{ "input": "1234", "expected_output": "4" },
{ "input": "9", "expected_output": "1" },
{ "input": "100000", "expected_output": "6" }
]
},
{
"question_text": "Reverse a number using loops.\n\nExample 1:\nInput: 123\nOutput: 321\n\nExample 2:\nInput: 400\nOutput: 4",
"input_format": "A single integer N.",
"output_format": "Print the reversed number.",
"constraints": "0 <= N <= 10^9",
"test_cases": [
{ "input": "123", "expected_output": "321" },
{ "input": "400", "expected_output": "4" },
{ "input": "1", "expected_output": "1" }
]
},
{
"question_text": "Check if a number is a palindrome.\n\nExample 1:\nInput: 121\nOutput: YES\n\nExample 2:\nInput: 123\nOutput: NO",
"input_format": "A single integer N.",
"output_format": "Print YES if palindrome, otherwise NO.",
"constraints": "0 <= N <= 10^9",
"test_cases": [
{ "input": "121", "expected_output": "YES" },
{ "input": "123", "expected_output": "NO" },
{ "input": "7", "expected_output": "YES" }
]
},
{
"question_text": "Find factorial of a number using loops.\n\nExample 1:\nInput: 5\nOutput: 120\n\nExample 2:\nInput: 3\nOutput: 6",
"input_format": "A single integer N.",
"output_format": "Print factorial of N.",
"constraints": "0 <= N <= 12",
"test_cases": [
{ "input": "5", "expected_output": "120" },
{ "input": "3", "expected_output": "6" },
{ "input": "0", "expected_output": "1" }
]
},
{
"question_text": "Check if a character is a vowel or consonant.\n\nExample 1:\nInput: a\nOutput: VOWEL\n\nExample 2:\nInput: b\nOutput: CONSONANT",
"input_format": "A single character.",
"output_format": "Print VOWEL or CONSONANT.",
"constraints": "Input is a lowercase English letter.",
"test_cases": [
{ "input": "a", "expected_output": "VOWEL" },
{ "input": "b", "expected_output": "CONSONANT" },
{ "input": "u", "expected_output": "VOWEL" }
]
},
{
"question_text": "Given N numbers, count how many are positive, negative, and zero.\n\nExample 1:\nInput: 5\n1 -2 0 3 -1\nOutput: 2 2 1\n\nExample 2:\nInput: 3\n0 0 1\nOutput: 1 0 2",
"input_format": "First line contains integer N. Second line contains N space-separated integers.",
"output_format": "Print three integers: count of positive, negative, and zero values.",
"constraints": "1 <= N <= 10^5",
"test_cases": [
{ "input": "5\n1 -2 0 3 -1", "expected_output": "2 2 1" },
{ "input": "3\n0 0 1", "expected_output": "1 0 2" },
{ "input": "4\n-1 -2 -3 0", "expected_output": "0 3 1" }
]
}
]
}

docs = []
for q in json_data["questions"]:
    docs.append({
        "type": "coding",
        "question_text": q["question_text"],
        "input_format": q["input_format"],
        "output_format": q["output_format"],
        "constraints": q["constraints"],
        "test_cases": q["test_cases"],
        "unit": "Chapter 3",
        "subject_code": "COM-102",
        "subject_name": "Data Structures using C",
        "semester": 2,
        "difficulty": "medium",
        "marks": 10
    })

res = mock_question_collection.insert_many(docs)
print(f"Successfully inserted {len(res.inserted_ids)} questions for Chapter 3!")
