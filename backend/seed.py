
"""
seed.py — Run once to populate the database with sample snippets.
Usage:  python seed.py
"""
import sys, os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal, engine
from app import models

models.Base.metadata.create_all(bind=engine)
db = SessionLocal()

def get_or_create_tag(name):
    tag = db.query(models.Tag).filter(models.Tag.name == name).first()
    if not tag:
        tag = models.Tag(name=name)
        db.add(tag)
        db.flush()
    return tag

snippets_data = [
    {
        "title": "Binary Search",
        "language": "Python",
        "difficulty": "intermediate",
        "category": "algorithm",
        "is_public": True,
        "code": """def binary_search(arr, target):
    left, right = 0, len(arr) - 1
    while left <= right:
        mid = (left + right) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    return -1

# Example
arr = [1, 3, 5, 7, 9, 11]
print(binary_search(arr, 7))  # Output: 3""",
        "explanation": "Binary search finds a target in a sorted array in O(log n) by halving the search space each step.",
        "tags": ["search", "algorithm", "array"]
    },
    {
        "title": "Debounce Function",
        "language": "JavaScript",
        "difficulty": "intermediate",
        "category": "utility",
        "is_public": True,
        "code": """function debounce(fn, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

// Example: only fires 300ms after user stops typing
const onSearch = debounce((e) => {
  console.log("Searching:", e.target.value);
}, 300);

document.getElementById("search").addEventListener("input", onSearch);""",
        "explanation": "Debounce delays a function call until after a specified time has passed since the last call. Useful for search inputs.",
        "tags": ["debounce", "performance", "events"]
    },
    {
        "title": "Reverse a Linked List",
        "language": "Java",
        "difficulty": "intermediate",
        "category": "data-structure",
        "is_public": True,
        "code": """public ListNode reverseList(ListNode head) {
    ListNode prev = null;
    ListNode curr = head;
    while (curr != null) {
        ListNode next = curr.next;
        curr.next = prev;
        prev = curr;
        curr = next;
    }
    return prev;
}""",
        "explanation": "Reverses a singly linked list in-place using three pointers: prev, curr, and next. O(n) time, O(1) space.",
        "tags": ["linked-list", "pointers", "in-place"]
    },
    {
        "title": "Flatten Nested Array",
        "language": "JavaScript",
        "difficulty": "beginner",
        "category": "utility",
        "is_public": True,
        "code": """// One-liner using flat()
const flat = arr => arr.flat(Infinity);

// Recursive version
function flatten(arr) {
  return arr.reduce((acc, val) =>
    Array.isArray(val) ? acc.concat(flatten(val)) : acc.concat(val), []
  );
}

console.log(flatten([1, [2, [3, [4]]]]));
// Output: [1, 2, 3, 4]""",
        "explanation": "Flattens a deeply nested array into a single-level array. The one-liner uses ES2019's flat(Infinity).",
        "tags": ["array", "recursion", "utility"]
    },
    {
        "title": "FizzBuzz",
        "language": "Python",
        "difficulty": "beginner",
        "category": "algorithm",
        "is_public": True,
        "code": """for i in range(1, 101):
    if i % 15 == 0:
        print("FizzBuzz")
    elif i % 3 == 0:
        print("Fizz")
    elif i % 5 == 0:
        print("Buzz")
    else:
        print(i)""",
        "explanation": "Classic interview problem. Prints Fizz for multiples of 3, Buzz for 5, FizzBuzz for both.",
        "tags": ["beginner", "loops", "modulo"]
    },
    {
        "title": "Two Sum",
        "language": "Python",
        "difficulty": "beginner",
        "category": "algorithm",
        "is_public": True,
        "code": """def two_sum(nums, target):
    seen = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            return [seen[complement], i]
        seen[num] = i
    return []

# Example
print(two_sum([2, 7, 11, 15], 9))  # [0, 1]""",
        "explanation": "Finds two indices that add up to target using a hash map for O(n) lookup instead of O(n²) brute force.",
        "tags": ["hashmap", "array", "leetcode"]
    },
    {
        "title": "Merge Sort",
        "language": "JavaScript",
        "difficulty": "advanced",
        "category": "algorithm",
        "is_public": True,
        "code": """function mergeSort(arr) {
  if (arr.length <= 1) return arr;
  const mid   = Math.floor(arr.length / 2);
  const left  = mergeSort(arr.slice(0, mid));
  const right = mergeSort(arr.slice(mid));
  return merge(left, right);
}

function merge(left, right) {
  const result = [];
  let i = 0, j = 0;
  while (i < left.length && j < right.length) {
    if (left[i] <= right[j]) result.push(left[i++]);
    else result.push(right[j++]);
  }
  return result.concat(left.slice(i)).concat(right.slice(j));
}

console.log(mergeSort([38, 27, 43, 3, 9, 82, 10]));""",
        "explanation": "Divide-and-conquer sorting algorithm with O(n log n) time complexity. Splits array, sorts halves, then merges.",
        "tags": ["sorting", "divide-and-conquer", "recursion"]
    },
    {
        "title": "CSS Flexbox Center",
        "language": "CSS",
        "difficulty": "beginner",
        "category": "utility",
        "is_public": True,
        "code": """.center {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
}

/* Also works for any container */
.card {
  display: flex;
  justify-content: center;
  align-items: center;
}""",
        "explanation": "The classic flexbox centering trick. justify-content centers horizontally, align-items centers vertically.",
        "tags": ["css", "flexbox", "layout"]
    },
    {
        "title": "Stack using Array",
        "language": "Python",
        "difficulty": "beginner",
        "category": "data-structure",
        "is_public": True,
        "code": """class Stack:
    def __init__(self):
        self.items = []

    def push(self, item):
        self.items.append(item)

    def pop(self):
        return self.items.pop() if self.items else None

    def peek(self):
        return self.items[-1] if self.items else None

    def is_empty(self):
        return len(self.items) == 0

s = Stack()
s.push(1); s.push(2); s.push(3)
print(s.pop())   # 3
print(s.peek())  # 2""",
        "explanation": "Stack implementation using Python list. LIFO (Last In First Out) data structure with O(1) push/pop.",
        "tags": ["stack", "data-structure", "class"]
    },
    {
        "title": "Fetch with Async/Await",
        "language": "JavaScript",
        "difficulty": "beginner",
        "category": "utility",
        "is_public": True,
        "code": """async function getData(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Fetch failed:", error);
    return null;
  }
}

// Usage
const user = await getData("https://api.example.com/users/1");
console.log(user);""",
        "explanation": "Clean async/await fetch pattern with error handling. Always check response.ok before parsing JSON.",
        "tags": ["fetch", "async", "api"]
    },
]

count = 0
for s in snippets_data:
    # Skip if already exists
    exists = db.query(models.Snippet).filter(models.Snippet.title == s["title"]).first()
    if exists:
        print(f"  Skipping (exists): {s['title']}")
        continue

    snippet = models.Snippet(
        title=s["title"],
        language=s["language"],
        difficulty=s["difficulty"],
        category=s["category"],
        code=s["code"],
        explanation=s["explanation"],
        is_public=s["is_public"],
        owner_id=None,
    )

    for tag_name in s.get("tags", []):
        snippet.tags.append(get_or_create_tag(tag_name))

    db.add(snippet)
    count += 1
    print(f"  Added: {s['title']} ({s['language']})")

db.commit()
db.close()
print(f"\n✅ Seeded {count} snippets successfully!")