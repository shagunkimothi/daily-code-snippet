// The legacy app loaded only Prism's core bundle from a CDN, so anything
// beyond HTML/CSS/JS (Python, Java, C++, TypeScript, Go, Rust, and every
// language the AI generator can target) rendered as unhighlighted plain
// text. Bundling the language grammars here fixes that gap while still
// satisfying "preserve Prism.js syntax highlighting" — same library, now
// actually complete. Token colors come from styles/prism-theme.css, which
// maps Prism's classes to this app's per-theme --syntax-* variables.
import Prism from "prismjs";
import "prismjs/components/prism-clike";
import "prismjs/components/prism-markup-templating";
import "prismjs/components/prism-c";
import "prismjs/components/prism-cpp";
import "prismjs/components/prism-java";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-go";
import "prismjs/components/prism-rust";
import "prismjs/components/prism-sql";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-kotlin";
import "prismjs/components/prism-swift";
import "prismjs/components/prism-php";
import "prismjs/components/prism-ruby";
import "prismjs/components/prism-r";
import "prismjs/components/prism-dart";
import "prismjs/components/prism-python";

export default Prism;
