console.log("snippets.js loaded");

const snippets = [
  // ================= JavaScript (10) =================
  {
    language: "JavaScript",
    title: "Debounce Function",
    code: `function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}`,
    explanation: "Prevents a function from running too often (e.g., search inputs)."
  },
  {
    language: "JavaScript",
    title: "Throttle Function",
    code: `function throttle(fn, limit) {
  let inThrottle;
  return function (...args) {
    if (!inThrottle) {
      fn.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}`,
    explanation: "Ensures a function runs at most once in a given time."
  },
  {
    language: "JavaScript",
    title: "Check Empty Array",
    code: `if (arr.length === 0) {
  console.log("Empty array");
}`,
    explanation: "Fast way to check if an array is empty."
  },
  {
    language: "JavaScript",
    title: "Remove Duplicates",
    code: `const unique = [...new Set(arr)];`,
    explanation: "Removes duplicate values from an array."
  },
  {
    language: "JavaScript",
    title: "Deep Copy Object",
    code: `const copy = JSON.parse(JSON.stringify(obj));`,
    explanation: "Creates a deep copy of an object (simple cases)."
  },
  {
    language: "JavaScript",
    title: "Optional Chaining",
    code: `const city = user?.address?.city;`,
    explanation: "Safely access nested properties."
  },
  {
    language: "JavaScript",
    title: "Array Flatten",
    code: `const flat = arr.flat(Infinity);`,
    explanation: "Flattens nested arrays."
  },
  {
    language: "JavaScript",
    title: "Check Variable Type",
    code: `typeof value === "string";`,
    explanation: "Checks the type of a variable."
  },
  {
    language: "JavaScript",
    title: "Delay with Promise",
    code: `const delay = ms => new Promise(r => setTimeout(r, ms));`,
    explanation: "Creates a delay using promises."
  },
  {
    language: "JavaScript",
    title: "Fetch API",
    code: `fetch(url)
  .then(res => res.json())
  .then(data => console.log(data));`,
    explanation: "Basic API call using fetch."
  },

  // ================= CSS (10) =================
  {
    language: "CSS",
    title: "Center Div",
    code: `.container {
  display: flex;
  justify-content: center;
  align-items: center;
}`,
    explanation: "Centers content horizontally and vertically."
  },
  {
    language: "CSS",
    title: "Text Ellipsis",
    code: `.text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}`,
    explanation: "Adds ellipsis to overflowing text."
  },
  {
    language: "CSS",
    title: "Box Shadow",
    code: `box-shadow: 0 10px 25px rgba(0,0,0,0.15);`,
    explanation: "Adds soft shadow to elements."
  },
  {
    language: "CSS",
    title: "Responsive Image",
    code: `img {
  max-width: 100%;
  height: auto;
}`,
    explanation: "Ensures images scale correctly."
  },
  {
    language: "CSS",
    title: "Hide Scrollbar",
    code: `::-webkit-scrollbar {
  display: none;
}`,
    explanation: "Hides scrollbar in WebKit browsers."
  },
  {
    language: "CSS",
    title: "Sticky Header",
    code: `position: sticky;
top: 0;`,
    explanation: "Creates a sticky element."
  },
  {
    language: "CSS",
    title: "Grid Layout",
    code: `display: grid;
grid-template-columns: repeat(3, 1fr);`,
    explanation: "Creates a simple grid layout."
  },
  {
    language: "CSS",
    title: "Smooth Scroll",
    code: `html {
  scroll-behavior: smooth;
}`,
    explanation: "Adds smooth scrolling."
  },
  {
    language: "CSS",
    title: "Hover Transition",
    code: `transition: all 0.3s ease;`,
    explanation: "Smooth hover animations."
  },
  {
    language: "CSS",
    title: "Full Screen Section",
    code: `min-height: 100vh;`,
    explanation: "Creates a full-screen section."
  },

  // ================= Python (10) =================
  {
    language: "Python",
    title: "Check Empty List",
    code: `if not my_list:
    print("Empty list")`,
    explanation: "Pythonic way to check empty list."
  },
  {
    language: "Python",
    title: "Read File",
    code: `with open("file.txt") as f:
    content = f.read()`,
    explanation: "Reads a file safely."
  },
  {
    language: "Python",
    title: "List Comprehension",
    code: `squares = [x*x for x in range(10)]`,
    explanation: "Compact way to build lists."
  },
  {
    language: "Python",
    title: "Swap Variables",
    code: `a, b = b, a`,
    explanation: "Swaps two variables."
  },
  {
    language: "Python",
    title: "Count Frequency",
    code: `from collections import Counter
Counter(arr)`,
    explanation: "Counts element frequency."
  },
  {
    language: "Python",
    title: "Check File Exists",
    code: `import os
os.path.exists("file.txt")`,
    explanation: "Checks if file exists."
  },
  {
    language: "Python",
    title: "Reverse String",
    code: `s[::-1]`,
    explanation: "Reverses a string."
  },
  {
    language: "Python",
    title: "Enumerate List",
    code: `for i, val in enumerate(arr):
    print(i, val)`,
    explanation: "Loops with index and value."
  },
  {
    language: "Python",
    title: "Try Except",
    code: `try:
    x = int(input())
except ValueError:
    print("Invalid")`,
    explanation: "Handles exceptions safely."
  },
  {
    language: "Python",
    title: "Lambda Function",
    code: `add = lambda a, b: a + b`,
    explanation: "Creates anonymous functions."
  },

  // ================= HTML (10) =================
  {
    language: "HTML",
    title: "Basic HTML Boilerplate",
    code: `<!DOCTYPE html>
<html>
<head>
  <title>Document</title>
</head>
<body>
</body>
</html>`,
    explanation: "Basic HTML structure."
  },
  {
    language: "HTML",
    title: "Responsive Meta Tag",
    code: `<meta name="viewport" content="width=device-width, initial-scale=1.0">`,
    explanation: "Makes site responsive."
  },
  {
    language: "HTML",
    title: "Image Tag",
    code: `<img src="image.jpg" alt="description">`,
    explanation: "Displays an image with alt text."
  },
  {
    language: "HTML",
    title: "Anchor Link",
    code: `<a href="https://example.com">Visit</a>`,
    explanation: "Creates a hyperlink."
  },
  {
    language: "HTML",
    title: "Input Field",
    code: `<input type="text" placeholder="Enter name">`,
    explanation: "Basic input field."
  },
  {
    language: "HTML",
    title: "Button",
    code: `<button>Click Me</button>`,
    explanation: "Creates a button."
  },
  {
    language: "HTML",
    title: "Form",
    code: `<form>
  <input type="email">
  <button>Submit</button>
</form>`,
    explanation: "Basic form structure."
  },
  {
    language: "HTML",
    title: "Semantic Section",
    code: `<section>
  <h1>Title</h1>
</section>`,
    explanation: "Uses semantic HTML."
  },
  {
    language: "HTML",
    title: "Unordered List",
    code: `<ul>
  <li>Item</li>
</ul>`,
    explanation: "Creates a bullet list."
  },
  {
    language: "HTML",
    title: "Script Tag",
    code: `<script src="app.js"></script>`,
    explanation: "Links JavaScript file."
  },

  // ================= C++ (10) =================
  {
    language: "C++",
    title: "Fast I/O",
    code: `ios::sync_with_stdio(false);
cin.tie(NULL);`,
    explanation: "Speeds up input/output."
  },
  {
    language: "C++",
    title: "Vector Input",
    code: `vector<int> v(n);
for(int &x : v) cin >> x;`,
    explanation: "Reads vector input."
  },
  {
    language: "C++",
    title: "Sort Vector",
    code: `sort(v.begin(), v.end());`,
    explanation: "Sorts a vector."
  },
  {
    language: "C++",
    title: "Binary Search",
    code: `binary_search(v.begin(), v.end(), x);`,
    explanation: "Checks if element exists."
  },
  {
    language: "C++",
    title: "Max Element",
    code: `*max_element(v.begin(), v.end());`,
    explanation: "Finds max element."
  },
  {
    language: "C++",
    title: "Min Element",
    code: `*min_element(v.begin(), v.end());`,
    explanation: "Finds min element."
  },
  {
    language: "C++",
    title: "Reverse Vector",
    code: `reverse(v.begin(), v.end());`,
    explanation: "Reverses vector."
  },
  {
    language: "C++",
    title: "Set for Unique",
    code: `set<int> s(v.begin(), v.end());`,
    explanation: "Removes duplicates."
  },
  {
    language: "C++",
    title: "Check Prime",
    code: `bool isPrime(int n) {
  for(int i=2;i*i<=n;i++)
    if(n%i==0) return false;
  return n>1;
}`,
    explanation: "Checks if number is prime."
  },
  {
    language: "C++",
    title: "Swap Values",
    code: `swap(a, b);`,
    explanation: "Swaps two values."
  }
];
