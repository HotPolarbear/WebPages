// ── PYTHON SYNTAX HIGHLIGHTER ─────────────────────────────────────────────────
// Tokenise → protect regions → escape plain text → restore tokens.
// Extended to cover library names, attributes, dunder methods, operators.

// --- Core language keywords
const PY_KEYWORDS = /\b(False|None|True|and|as|assert|async|await|break|class|continue|def|del|elif|else|except|finally|for|from|global|if|import|in|is|lambda|nonlocal|not|or|pass|raise|return|try|while|with|yield)\b/g;

// --- Built-in functions & types
const PY_BUILTINS = /\b(abs|all|any|bin|bool|breakpoint|bytes|callable|chr|compile|complex|copyright|delattr|dict|dir|divmod|enumerate|eval|exec|exit|filter|float|format|frozenset|getattr|globals|hasattr|hash|help|hex|id|input|int|isinstance|issubclass|iter|len|list|locals|map|max|memoryview|min|next|object|oct|open|ord|pow|print|property|quit|range|repr|reversed|round|set|setattr|slice|sorted|staticmethod|str|sum|super|tuple|type|vars|zip)\b/g;

// --- Popular library/module names (highlighted when imported or used as prefix)
const PY_LIBNAMES = /\b(np|pd|plt|sns|tf|keras|torch|nn|F|optim|transforms|cv2|PIL|Image|scipy|sklearn|joblib|os|sys|re|json|math|random|time|datetime|pathlib|io|abc|copy|collections|itertools|functools|operator|string|textwrap|struct|array|heapq|bisect|queue|threading|multiprocessing|subprocess|shutil|glob|pickle|csv|xml|html|http|urllib|requests|aiohttp|asyncio|concurrent|logging|warnings|contextlib|dataclasses|enum|typing|types|inspect|pprint|unittest|pytest|argparse|click|flask|django|fastapi|sqlalchemy|pydantic|numpy|pandas|matplotlib|seaborn|plotly|scipy|sklearn|xgboost|lightgbm|catboost|tensorflow|keras|torch|torchvision|torchaudio|transformers|datasets|tokenizers|huggingface_hub|PIL|cv2|imageio|skimage|nltk|spacy|gensim|gym|stable_baselines3|onnx|onnxruntime|mlflow|wandb|ray|dask|pyspark|boto3|google|azure|openai|anthropic|langchain)\b/g;

// --- Dunder / special methods
const PY_SPECIAL = /__(?:init|new|del|repr|str|bytes|format|lt|le|eq|ne|gt|ge|hash|bool|len|getitem|setitem|delitem|missing|iter|next|contains|add|sub|mul|truediv|floordiv|mod|pow|matmul|and|or|xor|lshift|rshift|iadd|isub|imul|call|get|set|enter|exit|slots|class|name|doc|module|all|file|dict|bases|metaclass|abstractmethods|version|author__)(?=\s*\(|\b)/g;

// --- Decorators
const PY_DECORATOR = /(^|\n)(@[\w.]+)/g;

// --- Strings (triple-quoted first, then single-quoted)
const PY_STRING = /("""[\s\S]*?"""|'''[\s\S]*?'''|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g;

// --- Comments
const PY_COMMENT = /(#[^\n]*)/g;

// --- Numbers (float, int, hex, bin, oct, complex)
const PY_NUMBER = /\b(\d+\.?\d*(?:[eE][+-]?\d+)?[jJ]?|0x[\da-fA-F]+|0b[01]+|0o[0-7]+)\b/g;

// --- Function definitions
const PY_FUNCNAME = /\bdef\s+([A-Za-z_]\w*)/g;

// --- Class definitions
const PY_CLASSNAME = /\bclass\s+([A-Za-z_]\w*)/g;

// --- self / cls
const PY_SELF = /\b(self|cls)\b/g;

// --- Attribute access (obj.attr) — only the attribute part
const PY_ATTR = /(?<=\.)\b([a-z_]\w*)\b(?=\s*[^(=])/g;

// --- Common operators
const PY_OP = /(\*\*|->|:=|==|!=|<=|>=|<<|>>|\|\||&&|[+\-*/%@&|^~<>])/g;

// --- Variables (catch-all for remaining identifiers)
const PY_VAR = /\b([A-Za-z_]\w*)\b/g;

function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function highlightPython(raw) {
  const tokens = [];
  let s = raw;

  // Placeholders use ONLY Private Use Area Unicode chars so no regex
  // (\b, \d, \w, etc.) can ever match inside them.
  // Format: \uE000 + encoded-index + \uE001
  // Each digit 0-9 is mapped to \uE010-\uE019.
  function makeSlot(idx) {
    const enc = [...String(idx)]
      .map(d => String.fromCharCode(0xE010 + (+d)))
      .join("");
    return "\uE000" + enc + "\uE001";
  }

  // Regex to split on placeholders during final restore step
  const rePH = /\uE000([\uE010-\uE019]+)\uE001/g;

  function decodeSlot(enc) {
    return parseInt([...enc].map(c => String(c.charCodeAt(0) - 0xE010)).join(""));
  }

  function protect(regex, className) {
    s = s.replace(regex, (...args) => {
      // decorator → keep prefix newline + highlight @name
      if (className === "py-decorator") {
        const prefix = args[1] === "\n" ? "\n" : args[1];
        const match = args[2];
        const idx = tokens.length;
        tokens.push(
          (prefix === "\n" ? "\n" : prefix) +
          `<span class="${className}">${escapeHtml(match)}</span>`
        );
        return makeSlot(idx);
      }
      // def / class — keep keyword highlighted, then highlight name
      if (className === "py-funcdef" || className === "py-classdef") {
        const kwMatch = args[0].match(/^(def|class)\s+/)[0];
        const name = args[1];
        const idx = tokens.length;
        tokens.push(
          `<span class="py-kw">${escapeHtml(kwMatch.trimEnd())}</span> ` +
          `<span class="${className}">${escapeHtml(name)}</span>`
        );
        return makeSlot(idx);
      }
      const idx = tokens.length;
      tokens.push(`<span class="${className}">${escapeHtml(args[0])}</span>`);
      return makeSlot(idx);
    });
  }

  // Order matters — protect broad/opaque regions first
  protect(PY_STRING, "py-str");
  protect(PY_COMMENT, "py-cmt");
  protect(PY_DECORATOR, "py-decorator");
  protect(PY_SPECIAL, "py-special");
  protect(PY_FUNCNAME, "py-funcdef");
  protect(PY_CLASSNAME, "py-classdef");
  protect(PY_SELF, "py-self");
  protect(PY_KEYWORDS, "py-kw");
  protect(PY_LIBNAMES, "py-lib");
  protect(PY_BUILTINS, "py-builtin");
  protect(PY_NUMBER, "py-num");
  protect(PY_OP, "py-op");
  protect(PY_ATTR, "py-attr");
  protect(PY_VAR, "py-var");

  // Split on placeholders: even indices = plain text, odd = encoded token index.
  // Escape HTML in plain text segments, then restore token spans by index.
  const parts = s.split(rePH);
  s = "";
  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 0) {
      s += escapeHtml(parts[i]);
    } else {
      s += tokens[decodeSlot(parts[i])];
    }
  }
  return s;
}

// ── CURRICULUM ────────────────────────────────────────────────────────────────
// Structure: chapter > topic > cards
const curriculum = [

  // ══════════════════════════════════════════════════════════════════════════
  // CHAPTER 0 · PYTHON FOUNDATIONS
  // ══════════════════════════════════════════════════════════════════════════
  {
    chapter: "Python Foundations",
    topics: [
      {
        topic: "Python Basics",
        cards: [
          {
            title: "Variables & Types",
            filename: "basics.py",
            code: `# Core Python types
name = "Alice"    # str
age = 25          # int
score = 98.6      # float
active = True     # bool
nothing = None    # NoneType

print(type(name)) # <class 'str'>`,
            back: `Python is <strong>dynamically typed</strong> — you never declare a type.<br><br>
<code>None</code> is Python's null value. Use <code>type()</code> to inspect,
<code>isinstance()</code> to check type safely.`
          },
          {
            title: "Lists & Comprehensions",
            filename: "basics.py",
            code: `numbers = [1, 2, 3, 4, 5]

# List comprehension
squares = [x**2 for x in numbers]
evens = [x for x in numbers if x % 2 == 0]

# Slicing
first_three = numbers[:3]   # [1, 2, 3]
reversed_l = numbers[::-1]  # [5, 4, 3, 2, 1]`,
            back: `List comprehensions are faster and more Pythonic than <code>for</code>+<code>append</code>.<br><br>
Slicing syntax: <code>[start:stop:step]</code>. Negative indices count from the end.`
          },
          {
            title: "Functions & Lambdas",
            filename: "basics.py",
            code: `def greet(name, greeting="Hello"):
    return f"{greeting}, {name}!"

# Lambda (anonymous function)
square = lambda x: x ** 2

# *args and **kwargs
def summarise(*args, **kwargs):
    print(args, kwargs)`,
            back: `Default arguments make parameters optional.<br><br>
<code>*args</code> collects positional extras into a tuple; <code>**kwargs</code> collects
keyword extras into a dict. Lambdas are one-liners — use <code>def</code> for anything complex.`
          },
          {
            title: "Classes & OOP",
            filename: "basics.py",
            code: `class Animal:
    def __init__(self, name):
        self.name = name

    def speak(self):
        raise NotImplementedError

class Dog(Animal):
    def speak(self):
        return f"{self.name} says Woof!"

dog = Dog("Rex")
print(dog.speak())`,
            back: `<code>__init__</code> is the constructor. <code>self</code> refers to the instance.<br><br>
<strong>Inheritance</strong>: <code>Dog</code> inherits from <code>Animal</code> and overrides <code>speak()</code>.
Raising <code>NotImplementedError</code> enforces subclass implementation — a simple interface pattern.`
          },
        ]
      },
      {
        topic: "NumPy",
        cards: [
          {
            title: "Array Creation",
            filename: "numpy_basics.py",
            code: `import numpy as np

a = np.array([1, 2, 3])           # 1-D
b = np.zeros((3, 4))              # 3×4 zeros
c = np.ones((2, 2), dtype=float)  # 2×2 ones
d = np.arange(0, 10, 2)           # [0 2 4 6 8]
e = np.linspace(0, 1, 5)          # 5 evenly spaced`,
            back: `NumPy arrays are stored in contiguous memory — orders of magnitude
faster than Python lists for numerical computation.<br><br>
<code>dtype</code> controls element type: <code>float32</code>, <code>int64</code>, etc.
Always specify dtype when memory matters.`
          },
          {
            title: "Broadcasting",
            filename: "numpy_basics.py",
            code: `a = np.array([[1, 2, 3],
              [4, 5, 6]])   # shape (2, 3)
b = np.array([10, 20, 30])  # shape (3,)

# NumPy stretches b to match a
result = a + b
# [[11 22 33]
#  [14 25 36]]`,
            back: `<strong>Broadcasting</strong> lets NumPy operate on arrays of different shapes
without copying data.<br><br>
Rule: dimensions are compatible if they are equal or one of them is 1.
Shapes are aligned from the <em>right</em>.`
          },
        ]
      },
      {
        topic: "Pandas",
        cards: [
          {
            title: "DataFrame Basics",
            filename: "pandas_basics.py",
            code: `import pandas as pd

df = pd.read_csv("data.csv")

print(df.shape)           # (rows, cols)
print(df.head())          # first 5 rows
print(df.describe())      # statistics
print(df.isnull().sum())  # missing values`,
            back: `A <strong>DataFrame</strong> is a 2-D labelled table. Think spreadsheet in Python.<br><br>
<code>describe()</code> gives count, mean, std, min, quartiles, max for numeric columns.
Always check <code>isnull()</code> before training — missing values break most models.`
          },
          {
            title: "Selecting & Filtering",
            filename: "pandas_basics.py",
            code: `# Column selection
ages = df["age"]             # Series
subset = df[["age", "name"]] # DataFrame

# Row filtering
adults  = df[df["age"] >= 18]
seniors = df.query("age > 60")

# loc (label) vs iloc (integer)
row = df.loc[0, "name"]
val = df.iloc[0, 1]`,
            back: `<code>.loc</code> uses <strong>labels</strong>; <code>.iloc</code> uses <strong>integer positions</strong>.<br><br>
Boolean indexing (<code>df[condition]</code>) returns rows where the condition is True —
the most common filtering pattern.`
          },
        ]
      },
    ]
  },

  // ══════════════════════════════════════════════════════════════════════════
  // CHAPTER 1 · MATHS FOR AI
  // ══════════════════════════════════════════════════════════════════════════
  {
    chapter: "Maths for AI",
    topics: [
      {
        topic: "Linear Algebra",
        cards: [
          {
            title: "Vectors & Dot Product",
            filename: "linalg.py",
            code: `import numpy as np

a = np.array([1, 2, 3])
b = np.array([4, 5, 6])

dot = np.dot(a, b)       # 32
cosine = dot / (np.linalg.norm(a) *
                np.linalg.norm(b))`,
            back: `The <strong>dot product</strong> $a \cdot b = \sum a_i b_i$ measures alignment.<br><br>
<strong>Cosine similarity</strong> normalises by magnitudes — used everywhere in NLP
to compare sentence/word embeddings regardless of length.`
          },
          {
            title: "Matrix Multiplication",
            filename: "linalg.py",
            code: `W = np.random.randn(4, 3)  # weight matrix
x = np.random.randn(3, 1)  # input vector

out = W @ x  # (4, 1) output
# Equivalent:
out = np.matmul(W, x)`,
            back: `Every neural network layer is <strong>y = Wx + b</strong>.<br><br>
<code>@</code> is Python's matrix-multiply operator (PEP 465).
Shape rule: <code>(m×k) @ (k×n) → (m×n)</code>. The inner dimensions must match.`
          },
        ]
      },
      {
        topic: "Calculus & Gradients",
        cards: [
          {
            title: "Numerical Gradient",
            filename: "calculus.py",
            code: `def f(x):
    return x ** 2 + 3 * x

def numerical_grad(f, x, h=1e-5):
    return (f(x + h) - f(x - h)) / (2 * h)

grad = numerical_grad(f, 2.0)
# ≈ 7.0  (analytic: 2x+3 at x=2)`,
            back: `The <strong>gradient</strong> is the slope — it tells us which direction
increases the function fastest.<br><br>
Numerical gradients use finite differences; useful for verification.
In practice, deep learning frameworks use <strong>automatic differentiation</strong>
(autograd) for exact, efficient gradients.`
          },
          {
            title: "Chain Rule (Backprop Idea)",
            filename: "calculus.py",
            code: `# f(g(x)) → df/dx = df/dg * dg/dx
# Example: loss = (pred - y)^2
# pred = w*x

x, y, w = 2.0, 5.0, 1.0
pred = w * x           # forward pass
loss = (pred - y) ** 2

# Backprop
dloss_dpred = 2 * (pred - y)         # -6
dpred_dw = x                         # 2
dloss_dw = dloss_dpred * dpred_dw    # -12`,
            back: `The <strong>chain rule</strong> is the mathematical core of backpropagation.<br><br>
Each layer multiplies the gradient flowing back by its local derivative.
This is exactly what <code>loss.backward()</code> does in PyTorch — automatically,
through every operation in the computation graph.`
          },
        ]
      },
      {
        topic: "Statistics & Probability",
        cards: [
          {
            title: "Distributions",
            filename: "stats.py",
            code: `import numpy as np

# Normal distribution
mu, sigma = 0, 1
samples = np.random.normal(mu, sigma, 1000)

mean = np.mean(samples)   # ≈ 0
std  = np.std(samples)    # ≈ 1

# Gaussian PDF
def gaussian(x, mu=0, sigma=1):
    return (1 / (sigma * (2 * np.pi) ** 0.5) *
            np.exp(-0.5 * ((x - mu) / sigma) ** 2))`,
            back: `The <strong>normal distribution</strong> is central to AI:<br>
• Weight initialisation (Xavier, He)<br>
• Noise modelling<br>
• Variational autoencoders (VAE)<br><br>
Key: ~68% of data falls within 1σ, ~95% within 2σ.`
          },
        ]
      },
    ]
  },

  // ══════════════════════════════════════════════════════════════════════════
  // CHAPTER 2 · CLASSICAL MACHINE LEARNING
  // ══════════════════════════════════════════════════════════════════════════
  {
    chapter: "Classical ML",
    topics: [
      {
        topic: "Supervised Learning",
        cards: [
          {
            title: "Linear Regression",
            filename: "linear_reg.py",
            code: `from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_squared_error
import numpy as np

X = np.array([[1], [2], [3], [4], [5]])
y = np.array([2, 4, 5, 4, 5])

model = LinearRegression()
model.fit(X, y)

preds = model.predict(X)
mse   = mean_squared_error(y, preds)`,
            back: `Linear regression finds the line <strong>y = wx + b</strong> that minimises
mean squared error (MSE).<br><br>
<code>model.coef_</code> → weight w &nbsp; <code>model.intercept_</code> → bias b<br>
Use when you expect a linear relationship between features and target.`
          },
          {
            title: "Logistic Regression",
            filename: "logistic_reg.py",
            code: `from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.datasets import load_iris

X, y = load_iris(return_X_y=True)
X_tr, X_te, y_tr, y_te = train_test_split(
    X, y, test_size=0.2, random_state=42)

clf = LogisticRegression(max_iter=200)
clf.fit(X_tr, y_tr)
acc = clf.score(X_te, y_te)`,
            back: `Despite the name, logistic regression is a <strong>classifier</strong>.<br><br>
It applies a sigmoid to a linear function: <code>σ(wx+b)</code> → probability.<br>
Decision boundary at 0.5. Fast, interpretable, always try it first.`
          },
          {
            title: "Decision Tree",
            filename: "decision_tree.py",
            code: `from sklearn.tree import DecisionTreeClassifier

clf = DecisionTreeClassifier(
    max_depth=5,
    min_samples_split=10,
    random_state=42
)
clf.fit(X_train, y_train)

# Feature importance
importances = clf.feature_importances_`,
            back: `A decision tree splits data by the feature and threshold that maximises
<strong>information gain</strong> (or minimises Gini impurity).<br><br>
<code>max_depth</code> prevents overfitting. <code>feature_importances_</code> gives
which features drive decisions — great for interpretability.`
          },
          {
            title: "Random Forest",
            filename: "random_forest.py",
            code: `from sklearn.ensemble import RandomForestClassifier

rf = RandomForestClassifier(
    n_estimators=100,
    max_depth=None,
    n_jobs=-1,
    random_state=42
)
rf.fit(X_train, y_train)
print(rf.score(X_test, y_test))`,
            back: `Random Forest builds <strong>many decorrelated trees</strong> and averages their
predictions — this is <em>bagging</em>.<br><br>
Each tree sees a random subset of data (row sampling) and features (column sampling).
More robust than a single tree; a great out-of-the-box baseline.`
          },
        ]
      },
      {
        topic: "Unsupervised Learning",
        cards: [
          {
            title: "K-Means Clustering",
            filename: "kmeans.py",
            code: `from sklearn.cluster import KMeans

kmeans = KMeans(n_clusters=3, random_state=42)
kmeans.fit(X)

labels  = kmeans.labels_
centers = kmeans.cluster_centers_
inertia = kmeans.inertia_   # WCSS`,
            back: `K-Means minimises <strong>within-cluster sum of squares (WCSS)</strong>.<br><br>
Use the <em>elbow method</em>: plot inertia vs k, pick the k where the curve bends.
Limitation: assumes spherical clusters of equal size.`
          },
          {
            title: "PCA (Dimensionality Reduction)",
            filename: "pca.py",
            code: `from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler

scaler = StandardScaler()
X_sc = scaler.fit_transform(X)

pca  = PCA(n_components=2)
X_2d = pca.fit_transform(X_sc)

explained = pca.explained_variance_ratio_`,
            back: `PCA projects data onto the directions of maximum variance (eigenvectors
of the covariance matrix).<br><br>
<strong>Always scale first</strong> — features on different scales dominate the components.
<code>explained_variance_ratio_</code> shows how much information each PC retains.`
          },
        ]
      },
      {
        topic: "Model Evaluation",
        cards: [
          {
            title: "Train / Val / Test Split",
            filename: "evaluation.py",
            code: `from sklearn.model_selection import train_test_split

X_tv, X_test, y_tv, y_test = train_test_split(
    X, y, test_size=0.15, random_state=42)

X_train, X_val, y_train, y_val = train_test_split(
    X_tv, y_tv, test_size=0.18, random_state=42)
# ≈ 70 / 15 / 15 split`,
            back: `<strong>Train</strong>: model learns from this.<br>
<strong>Validation</strong>: tune hyperparameters; pick the best model.<br>
<strong>Test</strong>: final unbiased evaluation — <em>never touch until the very end</em>.<br><br>
Use <code>random_state</code> for reproducibility.`
          },
          {
            title: "Classification Metrics",
            filename: "evaluation.py",
            code: `from sklearn.metrics import (
    accuracy_score, precision_score,
    recall_score, f1_score,
    classification_report
)

print(classification_report(y_true, y_pred))
# precision, recall, f1 per class`,
            back: `<strong>Accuracy</strong>: correct / total — misleading on imbalanced data.<br>
<strong>Precision</strong>: TP/(TP+FP) — of predicted positives, how many are real?<br>
<strong>Recall</strong>: TP/(TP+FN) — of real positives, how many did we catch?<br>
<strong>F1</strong>: harmonic mean of precision & recall.`
          },
          {
            title: "Cross Validation",
            filename: "evaluation.py",
            code: `from sklearn.model_selection import cross_val_score

scores = cross_val_score(
    estimator=model,
    X=X,
    y=y,
    cv=5,
    scoring="f1_macro"
)
print(f"{scores.mean():.3f} ± {scores.std():.3f}")`,
            back: `<strong>k-fold CV</strong> splits data into k folds, trains on k-1, validates on 1,
and rotates — using every sample for validation exactly once.<br><br>
Reports mean ± std of the metric. More reliable than a single train/val split,
especially on small datasets.`
          },
        ]
      },
    ]
  },

  // ══════════════════════════════════════════════════════════════════════════
  // CHAPTER 3 · DEEP LEARNING FUNDAMENTALS
  // ══════════════════════════════════════════════════════════════════════════
  {
    chapter: "Deep Learning Fundamentals",
    topics: [
      {
        topic: "Neural Networks",
        cards: [
          {
            title: "Perceptron (Single Neuron)",
            filename: "perceptron.py",
            code: `import torch
import torch.nn as nn

# Single linear layer = one layer of neurons
layer = nn.Linear(in_features=3, out_features=1)

x = torch.randn(1, 3)  # batch of 1
out = layer(x)          # (1, 1)
proba = torch.sigmoid(out)`,
            back: `A neuron computes <strong>y = σ(Wx + b)</strong>.<br><br>
<code>nn.Linear</code> handles W and b automatically.
The sigmoid squashes output to (0,1), turning it into a probability.
Stack layers to build a deep network.`
          },
          {
            title: "Multi-Layer Perceptron",
            filename: "mlp.py",
            code: `class MLP(nn.Module):
    def __init__(self, in_dim, hidden, out_dim):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(in_dim, hidden),
            nn.ReLU(),
            nn.Linear(hidden, hidden),
            nn.ReLU(),
            nn.Linear(hidden, out_dim)
        )

    def forward(self, x):
        return self.net(x)`,
            back: `<code>nn.Sequential</code> chains layers in order.<br><br>
<strong>ReLU</strong>: f(x) = max(0, x) — the most common activation.
It's fast and avoids the vanishing gradient problem that plagued sigmoid/tanh.<br><br>
The final layer has no activation when used with <code>CrossEntropyLoss</code>.`
          },
          {
            title: "Activation Functions",
            filename: "activations.py",
            code: `import torch
import torch.nn.functional as F

x = torch.tensor([-2., -1., 0., 1., 2.])

relu = F.relu(x)           # [0, 0, 0, 1, 2]
sigmoid = torch.sigmoid(x)
tanh = torch.tanh(x)
gelu = F.gelu(x)           # used in Transformers
leaky = F.leaky_relu(x, 0.01)`,
            back: `<strong>ReLU</strong>: fast, sparse. Standard for hidden layers.<br>
<strong>Sigmoid</strong>: (0,1). Use for binary output only.<br>
<strong>Softmax</strong>: multi-class probabilities (sum to 1).<br>
<strong>GELU</strong>: smooth ReLU variant — default in BERT, GPT.<br>
<strong>Leaky ReLU</strong>: fixes "dying ReLU" with small negative slope.`
          },
        ]
      },
      {
        topic: "Training Deep Networks",
        cards: [
          {
            title: "Loss Functions",
            filename: "losses.py",
            code: `import torch.nn as nn

# Regression
mse = nn.MSELoss()
mae = nn.L1Loss()

# Classification (logits → loss)
bce = nn.BCEWithLogitsLoss()  # binary
ce  = nn.CrossEntropyLoss()   # multi-class

# Sequence (e.g., language models)
nll = nn.NLLLoss()`,
            back: `<strong>MSE</strong>: penalises large errors heavily — use for regression.<br>
<strong>CrossEntropy</strong>: combines <code>LogSoftmax + NLLLoss</code>; pass raw logits.<br>
<strong>BCEWithLogits</strong>: numerically stable binary classification — preferred over
<code>sigmoid → BCELoss</code>.`
          },
          {
            title: "Optimisers",
            filename: "optimizers.py",
            code: `import torch.optim as optim

# SGD with momentum
sgd = optim.SGD(
    model.parameters(), lr=0.01, momentum=0.9)

# Adam — adaptive lr per parameter
adam = optim.Adam(
    model.parameters(), lr=3e-4, weight_decay=1e-4)

# AdamW — Adam + proper weight decay
adamw = optim.AdamW(
    model.parameters(), lr=3e-4, weight_decay=0.01)`,
            back: `<strong>SGD + momentum</strong>: great final performance but needs careful lr tuning.<br>
<strong>Adam</strong>: adaptive learning rate — default for most DL tasks.<br>
<strong>AdamW</strong>: decouples weight decay from the gradient update — preferred for
Transformers (BERT, GPT). Use <code>weight_decay</code> to regularise.`
          },
          {
            title: "Learning Rate Scheduling",
            filename: "lr_schedule.py",
            code: `from torch.optim.lr_scheduler import (
    StepLR, CosineAnnealingLR, OneCycleLR
)

# Halve lr every 10 epochs
sched = StepLR(optimizer, step_size=10, gamma=0.5)

# Cosine decay to min_lr
cos = CosineAnnealingLR(optimizer, T_max=100)

# One cycle — best for fast training
oc = OneCycleLR(
    optimizer, max_lr=1e-3,
    steps_per_epoch=len(loader), epochs=20)`,
            back: `A good LR schedule can be the difference between convergence and divergence.<br><br>
<strong>Cosine annealing</strong>: smoothly decays lr — standard for CNNs.<br>
<strong>OneCycleLR</strong>: warm-up then cosine anneal — fast convergence,
used in fastai's 1-cycle policy.`
          },
          {
            title: "Regularisation Techniques",
            filename: "regularisation.py",
            code: `import torch
import torch.nn as nn

class RegNet(nn.Module):
    def __init__(self):
        super().__init__()
        self.fc1 = nn.Linear(128, 256)
        self.bn1 = nn.BatchNorm1d(256)
        self.dropout = nn.Dropout(p=0.3)
        self.fc2 = nn.Linear(256, 10)

    def forward(self, x):
        x = self.dropout(
            torch.relu(self.bn1(self.fc1(x))))
        return self.fc2(x)`,
            back: `<strong>Dropout</strong>: randomly zeros p% of activations during training,
forcing redundant representations — reduces overfitting.<br><br>
<strong>BatchNorm</strong>: normalises activations within a mini-batch,
stabilises training and acts as mild regularisation.<br><br>
<strong>Weight decay</strong> (L2): penalises large weights in the optimiser.`
          },
        ]
      },
      {
        topic: "Dataset Setup",
        cards: [
          {
            title: "Dataset Initialization",
            filename: "dataset.py",
            code: `train_dataset = FlickrDataset(
    root_dir=DATA_DIR + "/Flicker8k_Dataset",
    captions_file=DATA_DIR + "/Flickr8k.token.txt",
    transform=transforms
)`,
            back: `<strong>FlickrDataset</strong> wraps the Flickr8k images and captions.<br><br>
It reads the token file to build (image, caption) pairs and applies
<em>transforms</em> to normalise pixel values before passing to the model.`
          },
          {
            title: "Validation Dataset",
            filename: "dataset.py",
            code: `val_dataset = FlickrDataset(
    root_dir=DATA_DIR + "/Flicker8k_Dataset",
    captions_file=DATA_DIR + "/Flickr8k.token.txt",
    train=False,
    transform=transforms
)`,
            back: `Passing <strong>train=False</strong> switches to the validation split.<br><br>
This ensures the model never sees validation images during training,
giving an unbiased performance estimate.`
          },
        ]
      },
      {
        topic: "Data Loaders",
        cards: [
          {
            title: "Training DataLoader",
            filename: "dataloader.py",
            code: `from torch.utils.data import DataLoader

train_loader = DataLoader(
    train_dataset,
    batch_size=32,
    shuffle=True,
    num_workers=4,
    pin_memory=True
)`,
            back: `<strong>DataLoader</strong> batches the dataset and handles parallelism.<br><br>
<code>pin_memory=True</code> speeds up CPU → GPU transfers.<br>
<code>shuffle=True</code> randomises order each epoch to prevent the
model from learning data-order artifacts.`
          },
          {
            title: "Vocabulary Builder",
            filename: "dataloader.py",
            code: `vocab = Vocabulary(freq_threshold=5)
vocab.build_vocab(train_dataset.captions_list)
print(f"Vocab size: {len(vocab)}")`,
            back: `Words appearing <strong>fewer than 5 times</strong> are mapped to <code>&lt;UNK&gt;</code>.<br><br>
Special tokens: <code>&lt;PAD&gt;</code>, <code>&lt;SOS&gt;</code>,
<code>&lt;EOS&gt;</code>, <code>&lt;UNK&gt;</code>.<br>
Each kept word receives a unique integer index.`
          },
        ]
      },
      {
        topic: "Training Loop",
        cards: [
          {
            title: "Loss & Optimiser",
            filename: "train.py",
            code: `criterion = nn.CrossEntropyLoss(
    ignore_index=vocab.stoi["<PAD>"]
)
optimizer = torch.optim.Adam(
    model.parameters(), lr=3e-4
)`,
            back: `<strong>CrossEntropyLoss</strong> ignores padding tokens so they don't
contribute to the gradient.<br><br>
Adam with <code>lr=3e-4</code> (the "Karpathy constant") is a reliable
starting point for most sequence-to-sequence models.`
          },
          {
            title: "Single Training Step",
            filename: "train.py",
            code: `optimizer.zero_grad()
outputs = model(imgs, captions[:-1])
loss = criterion(
    outputs.reshape(-1, len(vocab)),
    captions[1:].reshape(-1)
)
loss.backward()
torch.nn.utils.clip_grad_norm_(
    model.parameters(), max_norm=1
)
optimizer.step()`,
            back: `<strong>Teacher forcing:</strong> ground-truth token is fed at each step
(<code>captions[:-1]</code>), predicted against the next token
(<code>captions[1:]</code>).<br><br>
Gradient clipping (<code>max_norm=1</code>) prevents exploding
gradients common in RNNs / LSTMs.`
          },
        ]
      },
    ]
  },

  // ══════════════════════════════════════════════════════════════════════════
  // CHAPTER 4 · COMPUTER VISION (CNNs)
  // ══════════════════════════════════════════════════════════════════════════
  {
    chapter: "Computer Vision",
    topics: [
      {
        topic: "Convolutional Networks",
        cards: [
          {
            title: "Conv2d Layer",
            filename: "cnn.py",
            code: `import torch.nn as nn

conv = nn.Conv2d(
    in_channels=3,   # RGB
    out_channels=32, # 32 filters
    kernel_size=3,
    stride=1,
    padding=1        # same padding
)
# Input (B, 3, H, W) → Output (B, 32, H, W)`,
            back: `A <strong>convolutional filter</strong> slides across the spatial dimensions,
computing dot products to detect local patterns (edges, textures, shapes).<br><br>
<code>padding=1</code> with <code>kernel_size=3</code> preserves spatial size (same convolution).
Each filter learns a different feature detector.`
          },
          {
            title: "Pooling & Striding",
            filename: "cnn.py",
            code: `pool = nn.MaxPool2d(kernel_size=2, stride=2)
# (B, C, H, W) → (B, C, H/2, W/2)

avg_pool = nn.AdaptiveAvgPool2d((1, 1))
# Reduces any spatial size to 1×1

# Strided conv instead of pooling
conv_s2 = nn.Conv2d(32, 64, 3, stride=2, padding=1)`,
            back: `<strong>MaxPooling</strong>: keeps the strongest activation in each window
— adds translation invariance and reduces computation.<br><br>
<strong>AdaptiveAvgPool</strong>: used before the classifier in modern CNNs to handle
variable input sizes.<br>
<strong>Strided convolution</strong>: learnable downsampling (preferred in modern architectures).`
          },
          {
            title: "ResNet Skip Connection",
            filename: "resnet.py",
            code: `import torch
import torch.nn as nn

class ResBlock(nn.Module):
    def __init__(self, channels):
        super().__init__()
        self.conv1 = nn.Conv2d(channels, channels, 3, padding=1)
        self.bn1 = nn.BatchNorm2d(channels)
        self.conv2 = nn.Conv2d(channels, channels, 3, padding=1)
        self.bn2 = nn.BatchNorm2d(channels)

    def forward(self, x):
        residual = x
        x = torch.relu(self.bn1(self.conv1(x)))
        x = self.bn2(self.conv2(x))
        return torch.relu(x + residual)`,
            back: `The <strong>skip connection</strong> adds the input directly to the output:
<code>F(x) + x</code>.<br><br>
This lets gradients flow directly to earlier layers, enabling
training of very deep networks (100+ layers).
ResNet revolutionised image classification in 2015 and the
residual idea is now used everywhere.`
          },
          {
            title: "Transfer Learning",
            filename: "transfer.py",
            code: `import torchvision.models as models
import torch.nn as nn

# Load pretrained weights
backbone = models.resnet50(weights="IMAGENET1K_V2")

# Freeze feature extractor
for param in backbone.parameters():
    param.requires_grad = False

# Replace head for new task
backbone.fc = nn.Linear(
    backbone.fc.in_features, num_classes
)`,
            back: `A network pretrained on ImageNet (1.2M images, 1 000 classes)
has learned universal visual features: edges → textures → parts → objects.<br><br>
<strong>Freeze</strong> the backbone, train only the new head for small datasets.
<strong>Fine-tune</strong> all layers with a small lr for larger datasets.`
          },
        ]
      },
      {
        topic: "Image Transforms",
        cards: [
          {
            title: "Data Augmentation",
            filename: "augment.py",
            code: `from torchvision import transforms

train_tf = transforms.Compose([
    transforms.RandomResizedCrop(224),
    transforms.RandomHorizontalFlip(),
    transforms.ColorJitter(0.4, 0.4, 0.4, 0.1),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225])
])`,
            back: `Augmentation creates <strong>synthetic diversity</strong> — the model sees each
image in many variations, reducing overfitting.<br><br>
The mean and std values are the ImageNet statistics. Always normalise
if using a pretrained model that was trained with those values.`
          },
        ]
      },
    ]
  },

  // ══════════════════════════════════════════════════════════════════════════
  // CHAPTER 5 · NLP & TRANSFORMERS
  // ══════════════════════════════════════════════════════════════════════════
  {
    chapter: "NLP & Transformers",
    topics: [
      {
        topic: "Text Processing",
        cards: [
          {
            title: "Tokenisation",
            filename: "tokenise.py",
            code: `from transformers import AutoTokenizer

tokenizer = AutoTokenizer.from_pretrained(
    "bert-base-uncased")

text   = "Hello, how are you?"
tokens = tokenizer(
    text,
    return_tensors="pt",
    padding=True,
    truncation=True,
    max_length=128
)

print(tokens["input_ids"])
print(tokens["attention_mask"])`,
            back: `<strong>WordPiece tokenisation</strong> (BERT) splits unknown words into sub-word units:
"playing" → ["play", "##ing"].<br><br>
<code>attention_mask</code>: 1 for real tokens, 0 for padding.
The model uses this to ignore padding positions.`
          },
          {
            title: "Word Embeddings",
            filename: "embeddings.py",
            code: `import torch
import torch.nn as nn

vocab_size = 10000
embed_dim  = 256

embed = nn.Embedding(vocab_size, embed_dim)

# Token ids → dense vectors
token_ids = torch.tensor([1, 45, 300, 2])
vectors   = embed(token_ids)  # (4, 256)`,
            back: `An <strong>embedding layer</strong> is essentially a lookup table:
each integer token maps to a trainable dense vector.<br><br>
These vectors encode semantic meaning — similar words end up nearby
in the embedding space. The foundation of all modern NLP.`
          },
        ]
      },
      {
        topic: "Attention Mechanism",
        cards: [
          {
            title: "Scaled Dot-Product Attention",
            filename: "attention.py",
            code: `import torch
import torch.nn.functional as F
import math

def attention(Q, K, V, mask=None):
    d_k    = Q.size(-1)
    scores = torch.matmul(Q, K.transpose(-2, -1))
    scores = scores / math.sqrt(d_k)
    if mask is not None:
        scores = scores.masked_fill(mask == 0, -1e9)
    weights = F.softmax(scores, dim=-1)
    return torch.matmul(weights, V), weights`,
            back: `<strong>Q</strong>uery, <strong>K</strong>ey, <strong>V</strong>alue — all derived from the
same input via learned projections.<br><br>
The scaling by √d_k prevents dot products from growing large and pushing
softmax into saturated regions with tiny gradients.
Masking sets future positions to −∞ before softmax (causal / autoregressive models).`
          },
          {
            title: "Multi-Head Attention",
            filename: "attention.py",
            code: `import torch
import torch.nn as nn

class MultiHeadAttention(nn.Module):
    def __init__(self, d_model, num_heads):
        super().__init__()
        self.heads = nn.ModuleList([
            nn.Linear(d_model, d_model // num_heads)
            for _ in range(num_heads)
        ])
        self.out = nn.Linear(d_model, d_model)

    def forward(self, Q, K, V):
        head_outs = [h(Q) for h in self.heads]
        concat = torch.cat(head_outs, dim=-1)
        return self.out(concat)`,
            back: `Multiple attention heads allow the model to attend to
<strong>different aspects simultaneously</strong> — one head might focus on
syntax, another on coreference.<br><br>
Outputs are concatenated and projected back to d_model.
In practice, use <code>nn.MultiheadAttention</code> for an optimised implementation.`
          },
        ]
      },
      {
        topic: "Transformer Architecture",
        cards: [
          {
            title: "Positional Encoding",
            filename: "transformer.py",
            code: `import torch
import math

def positional_encoding(seq_len, d_model):
    pe  = torch.zeros(seq_len, d_model)
    pos = torch.arange(seq_len).unsqueeze(1)
    div = torch.exp(
        torch.arange(0, d_model, 2) *
        -(math.log(10000) / d_model))
    pe[:, 0::2] = torch.sin(pos * div)
    pe[:, 1::2] = torch.cos(pos * div)
    return pe`,
            back: `Transformers have no recurrence — they process all tokens in parallel.
<strong>Positional encodings</strong> inject sequence order information.<br><br>
Sine/cosine at different frequencies encode absolute positions.
The model can also <em>learn</em> position embeddings (used in BERT, GPT).`
          },
          {
            title: "Encoder Block",
            filename: "transformer.py",
            code: `import torch.nn as nn

class EncoderBlock(nn.Module):
    def __init__(self, d_model, heads, ff_dim, dropout=0.1):
        super().__init__()
        self.attn = nn.MultiheadAttention(
            d_model, heads, batch_first=True)
        self.ff = nn.Sequential(
            nn.Linear(d_model, ff_dim),
            nn.GELU(),
            nn.Linear(ff_dim, d_model)
        )
        self.norm1 = nn.LayerNorm(d_model)
        self.norm2 = nn.LayerNorm(d_model)
        self.drop = nn.Dropout(dropout)

    def forward(self, x, mask=None):
        attn_out, _ = self.attn(
            x, x, x, key_padding_mask=mask)
        x = self.norm1(x + self.drop(attn_out))
        x = self.norm2(x + self.drop(self.ff(x)))
        return x`,
            back: `The Transformer encoder block:<br>
1. <strong>Self-attention</strong> — every token attends to every other<br>
2. <strong>Add & Norm</strong> — residual connection + LayerNorm<br>
3. <strong>Feed-forward</strong> — 2-layer MLP per position<br>
4. <strong>Add & Norm</strong> again<br><br>
This "Pre-LN" variant (norm before sublayer) is more stable.`
          },
        ]
      },
      {
        topic: "Pre-trained Models",
        cards: [
          {
            title: "BERT Fine-tuning",
            filename: "bert_finetune.py",
            code: `from transformers import (
    AutoModelForSequenceClassification,
    Trainer,
    TrainingArguments
)

model = AutoModelForSequenceClassification.from_pretrained(
    "bert-base-uncased", num_labels=2)

args = TrainingArguments(
    output_dir="./results",
    num_train_epochs=3,
    per_device_train_batch_size=16,
    learning_rate=2e-5
)
trainer = Trainer(
    model=model, args=args, train_dataset=train_ds)
trainer.train()`,
            back: `BERT is pretrained with <strong>masked language modelling</strong> (predict
randomly masked tokens) on 3.3B words.<br><br>
Fine-tuning only requires ~3 epochs at lr≈2e-5 — the model already
knows language; you just teach it the task.
<code>AutoModel</code> classes pick the right architecture from a string name.`
          },
          {
            title: "GPT Text Generation",
            filename: "gpt_generate.py",
            code: `from transformers import pipeline

generator = pipeline("text-generation", model="gpt2")

output = generator(
    "Once upon a time in AI,",
    max_new_tokens=80,
    temperature=0.8,
    top_p=0.9
)
print(output[0]["generated_text"])`,
            back: `GPT is <strong>autoregressive</strong>: trained to predict the next token,
left to right — never seeing future tokens (causal mask).<br><br>
<strong>Temperature</strong>: < 1 = more deterministic; > 1 = more random.<br>
<strong>Top-p (nucleus sampling)</strong>: sample from the smallest set of tokens
whose cumulative probability ≥ p. Avoids low-probability garbage.`
          },
        ]
      },
    ]
  },

  // ══════════════════════════════════════════════════════════════════════════
  // CHAPTER 6 · ADVANCED AI TOPICS
  // ══════════════════════════════════════════════════════════════════════════
  {
    chapter: "Advanced AI",
    topics: [
      {
        topic: "Generative Models",
        cards: [
          {
            title: "Variational Autoencoder",
            filename: "vae.py",
            code: `import torch
import torch.nn as nn

class VAE(nn.Module):
    def __init__(self, in_dim, latent_dim):
        super().__init__()
        self.enc_mu = nn.Linear(in_dim, latent_dim)
        self.enc_var = nn.Linear(in_dim, latent_dim)
        self.decoder = nn.Linear(latent_dim, in_dim)

    def reparameterise(self, mu, log_var):
        std = torch.exp(0.5 * log_var)
        eps = torch.randn_like(std)
        return mu + eps * std

    def forward(self, x):
        mu, lv = self.enc_mu(x), self.enc_var(x)
        z      = self.reparameterise(mu, lv)
        return self.decoder(z), mu, lv`,
            back: `A VAE learns a <strong>smooth latent space</strong> by encoding inputs as
distributions (μ, σ) rather than points.<br><br>
The <strong>reparameterisation trick</strong> allows gradients to flow through
the sampling step: <code>z = μ + ε·σ</code> where ε ~ N(0,1).<br>
Loss = reconstruction loss + KL divergence.`
          },
          {
            title: "Diffusion Model (DDPM)",
            filename: "diffusion.py",
            code: `import torch
import torch.nn.functional as F

# Forward process: add noise step by step
def q_sample(x0, t, noise=None):
    if noise is None:
        noise = torch.randn_like(x0)
    sqrt_alpha = extract(sqrt_alphas_cumprod, t)
    sqrt_1ma = extract(sqrt_1m_alphas_cumprod, t)
    return sqrt_alpha * x0 + sqrt_1ma * noise

# Reverse process: model predicts noise
loss = F.mse_loss(model(noisy_x, t), noise)`,
            back: `Diffusion models learn to <strong>reverse a Markovian noise process</strong>.<br><br>
Forward: gradually corrupt data with Gaussian noise over T steps.<br>
Reverse: a U-Net predicts the noise at each step, allowing denoising.<br><br>
Used in Stable Diffusion, DALL-E 3, Sora. Better mode coverage than GANs;
slower sampling (mitigated by schedulers like DDIM).`
          },
        ]
      },
      {
        topic: "Reinforcement Learning",
        cards: [
          {
            title: "Q-Learning",
            filename: "q_learning.py",
            code: `import numpy as np

# Q-table: states × actions
Q = np.zeros((n_states, n_actions))

for episode in range(episodes):
    state = env.reset()
    for step in range(max_steps):
        if np.random.random() < epsilon:
            action = env.action_space.sample()
        else:
            action = np.argmax(Q[state])
        next_s, reward, done, _ = env.step(action)
        td = (reward + gamma * np.max(Q[next_s])
              - Q[state, action])
        Q[state, action] += alpha * td`,
            back: `Q-learning finds the optimal <strong>action-value function</strong> Q(s,a)
— the expected future reward from state s taking action a.<br><br>
<strong>ε-greedy</strong>: explore randomly with prob ε, exploit best known action otherwise.<br>
<strong>TD error</strong>: difference between predicted and bootstrapped Q-value.
Tabular Q-learning → Deep Q-Network (DQN) when using a neural net for Q.`
          },
          {
            title: "Policy Gradient (REINFORCE)",
            filename: "reinforce.py",
            code: `def reinforce(policy, optimizer, episodes=1000):
    for ep in range(episodes):
        states, actions, rewards = rollout(policy)

        # Compute returns (discounted)
        returns = compute_returns(rewards, gamma=0.99)
        returns = (returns - returns.mean()) / returns.std()

        log_probs = policy.log_prob(states, actions)
        loss      = -(log_probs * returns).mean()

        optimizer.zero_grad()
        loss.backward()
        optimizer.step()`,
            back: `REINFORCE directly optimises the policy by maximising expected return.<br><br>
<strong>Key insight</strong>: increase probability of actions that led to high returns,
decrease probability of actions that led to low returns.<br><br>
Normalising returns reduces variance. Used as the basis for PPO and RLHF
(aligning LLMs with human feedback).`
          },
        ]
      },
      {
        topic: "Model Deployment",
        cards: [
          {
            title: "Export with TorchScript",
            filename: "export.py",
            code: `import torch

model.eval()

# Option 1: trace (fixed control flow)
example = torch.randn(1, 3, 224, 224)
traced = torch.jit.trace(model, example)
traced.save("model_traced.pt")

# Option 2: script (dynamic control flow)
scripted = torch.jit.script(model)
scripted.save("model_scripted.pt")

# Load anywhere — no Python class needed
loaded = torch.jit.load("model_traced.pt")`,
            back: `<strong>TorchScript</strong> serialises a model into an IR that runs without Python
— essential for deployment in C++, mobile, or edge devices.<br><br>
<code>trace</code>: records ops for a specific input — fast but misses dynamic branches.<br>
<code>script</code>: compiles Python-like code — handles <code>if</code>/<code>for</code> correctly.`
          },
          {
            title: "ONNX Export",
            filename: "onnx_export.py",
            code: `import torch

dummy = torch.randn(1, 3, 224, 224)

torch.onnx.export(
    model,
    dummy,
    "model.onnx",
    input_names=["input"],
    output_names=["output"],
    dynamic_axes={
        "input":  {0: "batch"},
        "output": {0: "batch"}
    },
    opset_version=17
)`,
            back: `<strong>ONNX</strong> (Open Neural Network Exchange) is a portable model format
supported by TensorRT, OpenVINO, CoreML, and more.<br><br>
<code>dynamic_axes</code> makes batch size flexible at inference time.
Use <code>onnxruntime</code> for fast CPU inference; TensorRT for GPU.`
          },
        ]
      },
    ]
  },
];

// ── FLATTEN CURRICULUM ────────────────────────────────────────────────────────
const allCards = [];
curriculum.forEach(ch => {
  ch.topics.forEach(tp => {
    tp.cards.forEach(card => {
      allCards.push({
        chapter: ch.chapter,
        topic: tp.topic,
        title: card.title,
        filename: card.filename,
        code: card.code,
        back: card.back,
      });
    });
  });
});

// ── STATE ─────────────────────────────────────────────────────────────────────
let filtered = [...allCards];
let current = 0;
let activeChapter = "all";
let activeTopic = "all";
const seenSet = new Set(
  JSON.parse(localStorage.getItem("ai_seen") || "[]")
);

// ── ELEMENTS ──────────────────────────────────────────────────────────────────
const titleEl = document.getElementById("card-title");
const codeEl = document.getElementById("code-content");
const backEl = document.getElementById("back-content");
const cardEl = document.getElementById("card");
const badgeEl = document.getElementById("topic-badge");
const chapterBadge = document.getElementById("chapter-badge");
const filenameEl = document.getElementById("filename");
const indexLabel = document.getElementById("index-label");
const indexDots = document.getElementById("index-dots");
const prevBtn = document.getElementById("prev-btn");
const nextBtn = document.getElementById("next-btn");
const progressBar = document.getElementById("progress-bar");
const progressLbl = document.getElementById("progress-label");
const markBtn = document.getElementById("mark-btn");

// ── PROGRESS ──────────────────────────────────────────────────────────────────
function cardKey(c) { return `${c.chapter}|${c.topic}|${c.title}`; }

function saveProgress() {
  localStorage.setItem("ai_seen", JSON.stringify([...seenSet]));
}

function updateProgress() {
  const total = allCards.length;
  const seen = allCards.filter(c => seenSet.has(cardKey(c))).length;
  const pct = total ? Math.round((seen / total) * 100) : 0;
  progressBar.style.width = pct + "%";
  progressLbl.textContent = `${seen} / ${total} cards seen`;
  const c = filtered[current];
  if (c) {
    const done = seenSet.has(cardKey(c));
    markBtn.textContent = done ? "✓ Seen" : "Mark seen";
    markBtn.classList.toggle("seen", done);
  }
}

markBtn.addEventListener("click", () => {
  const c = filtered[current];
  if (!c) return;
  const k = cardKey(c);
  seenSet.has(k) ? seenSet.delete(k) : seenSet.add(k);
  saveProgress();
  updateProgress();
});

// ── TIMELINE TREE ─────────────────────────────────────────────────────────────
// Even chapters (0,2,4,6) branch ABOVE trunk; odd (1,3,5) branch BELOW.
// Chapter labels sit on the OPPOSITE side from their topic branches.

const SVG_NS = "http://www.w3.org/2000/svg";
const TL_SVG = document.getElementById("timeline-svg");
const TL_INFO = document.getElementById("tl-info");

function setTlInfo(color, chapter, topic) {
  if (!TL_INFO) return;
  const chText = chapter === "all" ? "All Chapters" : chapter;
  TL_INFO.innerHTML =
    `<span class="tl-info-dot" style="background:${color}"></span>` +
    `<span style="color:${color};opacity:0.85">${chText}</span>` +
    (topic && topic !== "all"
      ? `<span class="tl-info-sep"> › </span>` +
        `<span style="color:rgba(229,231,235,0.7)">${topic}</span>`
      : "");
}

// One accent color per chapter — muted to match the dark theme
const TL_COLORS = [
  "#60a5fa",  // 0 Python Foundations  — blue
  "#a78bfa",  // 1 Maths for AI        — violet
  "#34d399",  // 2 Classical ML        — emerald
  "#fb923c",  // 3 Deep Learning       — soft orange
  "#38bdf8",  // 4 Computer Vision     — sky
  "#f472b6",  // 5 NLP & Transformers  — soft pink
  "#facc15",  // 6 Advanced AI         — amber
];

// Layout constants
const TL_TRUNK_Y = 115;   // trunk y in SVG coords
const TL_CH_R = 6;        // chapter dot radius
const TL_CH_RING = 13;    // chapter ring radius (hover/active halo)
const TL_TP_R = 3.5;      // topic dot radius
const TL_TP_RING = 8;     // topic ring radius
// step and x0 are computed dynamically inside buildTimeline() from container width
const TL_BRANCH_V = 68;   // branch vertical length
const TL_TP_SPREAD = 44;  // max horizontal gap between sibling topics (may shrink)

function wrapText(label, maxLen) {
  if (label.length <= maxLen) return [label];
  const words = label.split(" ");
  const lines = [];
  let line = "";
  for (const w of words) {
    if ((line + w).length > maxLen) { lines.push(line.trim()); line = ""; }
    line += w + " ";
  }
  if (line.trim()) lines.push(line.trim());
  return lines;
}

function svgEl(tag, attrs) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}


function buildTimeline() {
  TL_SVG.innerHTML = "";

  // Measure available width from the scroll container
  const scrollEl = TL_SVG.parentElement;
  const availW = scrollEl.clientWidth || 800;
  const N = curriculum.length;
  const margin = 60;
  // N chapters + 1 root node = N+1 nodes, N even gaps
  const step = (availW - 2 * margin) / N;
  const rootX = margin;      // "All" root node x
  const x0 = rootX + step;  // first chapter x

  const svgW = availW;
  const svgH = TL_TRUNK_Y + TL_BRANCH_V + 32;

  TL_SVG.setAttribute("width",   svgW);
  TL_SVG.setAttribute("height",  svgH);
  TL_SVG.setAttribute("viewBox", `0 0 ${svgW} ${svgH}`);

  const trunkX1 = rootX;
  const trunkX2 = x0 + (N - 1) * step;

  // ── Trunk ──────────────────────────────────────────────────────────────
  TL_SVG.appendChild(svgEl("line", {
    class: "tl-trunk",
    x1: trunkX1, y1: TL_TRUNK_Y,
    x2: trunkX2, y2: TL_TRUNK_Y,
  }));

  // ── Pass 1: branch bezier lines (drawn below everything) ─────────────
  curriculum.forEach((ch, ci) => {
    const color    = TL_COLORS[ci % TL_COLORS.length];
    const cx       = x0 + ci * step;
    const isUp     = ci % 2 === 0;
    const dir      = isUp ? -1 : 1;
    const topicY   = TL_TRUNK_Y + dir * TL_BRANCH_V;
    const tpSpread = Math.min(TL_TP_SPREAD, step * 0.8 / Math.max(1, ch.topics.length - 1));
    const spanW    = (ch.topics.length - 1) * tpSpread;

    ch.topics.forEach((tp, ti) => {
      const tx  = cx - spanW / 2 + ti * tpSpread;
      const sy  = TL_TRUNK_Y + dir * TL_CH_R;
      const ey  = topicY - dir * TL_TP_R;
      const c1y = TL_TRUNK_Y + dir * TL_BRANCH_V * 0.4;
      const c2y = topicY     - dir * TL_BRANCH_V * 0.4;
      const path = svgEl("path", {
        class: "tl-line",
        d: `M ${cx} ${sy} C ${cx} ${c1y}, ${tx} ${c2y}, ${tx} ${ey}`,
      });
      path.style.stroke = color;
      TL_SVG.appendChild(path);
    });
  });

  // ── Pass 2: topic dots (no inline text — labels live in #tl-info) ─────
  curriculum.forEach((ch, ci) => {
    const color    = TL_COLORS[ci % TL_COLORS.length];
    const cx       = x0 + ci * step;
    const isUp     = ci % 2 === 0;
    const dir      = isUp ? -1 : 1;
    const topicY   = TL_TRUNK_Y + dir * TL_BRANCH_V;
    const tpSpread = Math.min(TL_TP_SPREAD, step * 0.8 / Math.max(1, ch.topics.length - 1));
    const spanW    = (ch.topics.length - 1) * tpSpread;

    ch.topics.forEach((tp, ti) => {
      const tx       = cx - spanW / 2 + ti * tpSpread;
      const ty       = topicY;
      const isActive = activeChapter === ch.chapter && activeTopic === tp.topic;

      const grp = svgEl("g", {
        class:        "tl-tp-node" + (isActive ? " active" : ""),
        id:           `tp-${ci}-${ti}`,
        role:         "button",
        tabindex:     "0",
        "aria-label": tp.topic,
      });

      const ring = svgEl("circle", { class: "tl-tp-ring", cx: tx, cy: ty, r: TL_TP_RING });
      ring.style.stroke = color;
      grp.appendChild(ring);

      const dot = svgEl("circle", { class: "tl-tp-dot", cx: tx, cy: ty, r: TL_TP_R });
      dot.style.fill = color;
      grp.appendChild(dot);

      const activeColor = TL_COLORS[ci % TL_COLORS.length];
      grp.addEventListener("mouseenter", () => setTlInfo(activeColor, ch.chapter, tp.topic));
      grp.addEventListener("mouseleave", () => {
        // Revert to the current active selection
        const ac = TL_COLORS[curriculum.findIndex(c => c.chapter === activeChapter) % TL_COLORS.length] || "#6b7280";
        setTlInfo(activeChapter === "all" ? "#6b7280" : ac, activeChapter, activeTopic);
      });
      grp.addEventListener("click",   () => selectNode(ch.chapter, tp.topic));
      grp.addEventListener("keydown", e => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          selectNode(ch.chapter, tp.topic);
        }
      });
      TL_SVG.appendChild(grp);
    });
  });

  // ── Pass 3: chapter dots (drawn on top) ───────────────────────────────
  curriculum.forEach((ch, ci) => {
    const color    = TL_COLORS[ci % TL_COLORS.length];
    const cx       = x0 + ci * step;
    const isUp     = ci % 2 === 0;
    const isActive = activeChapter === ch.chapter && activeTopic === "all";
    const chLineH  = 12;

    const grp = svgEl("g", {
      class:        "tl-ch-node" + (isActive ? " active" : ""),
      id:           `ch-${ci}`,
      role:         "button",
      tabindex:     "0",
      "aria-label": ch.chapter,
    });

    const ring = svgEl("circle", { class: "tl-ch-ring", cx, cy: TL_TRUNK_Y, r: TL_CH_RING });
    ring.style.stroke = color;
    grp.appendChild(ring);

    const dot = svgEl("circle", { class: "tl-ch-dot", cx, cy: TL_TRUNK_Y, r: TL_CH_R });
    dot.style.fill = color;
    grp.appendChild(dot);

    // Chapter label on opposite side from topic branches
    const words = wrapText(ch.chapter, 12);
    if (isUp) {
      // Topics above → label below the dot
      words.forEach((line, i) => {
        const t = svgEl("text", {
          class: "tl-ch-label",
          x: cx,
          y: TL_TRUNK_Y + TL_CH_R + chLineH + i * chLineH,
        });
        t.textContent = line;
        grp.appendChild(t);
      });
    } else {
      // Topics below → label above the dot
      words.slice().reverse().forEach((line, i) => {
        const t = svgEl("text", {
          class: "tl-ch-label",
          x: cx,
          y: TL_TRUNK_Y - TL_CH_R - 5 - i * chLineH,
        });
        t.textContent = line;
        grp.appendChild(t);
      });
    }

    grp.addEventListener("mouseenter", () => setTlInfo(color, ch.chapter, "all"));
    grp.addEventListener("mouseleave", () => {
      const ac = TL_COLORS[curriculum.findIndex(c => c.chapter === activeChapter) % TL_COLORS.length] || "#6b7280";
      setTlInfo(activeChapter === "all" ? "#6b7280" : ac, activeChapter, activeTopic);
    });
    grp.addEventListener("click",   () => selectNode(ch.chapter, "all"));
    grp.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        selectNode(ch.chapter, "all");
      }
    });
    TL_SVG.appendChild(grp);
  });

  // ── "All" root dot ─────────────────────────────────────────────────────
  const rootGrp = svgEl("g", {
    class:        "tl-ch-node" + (activeChapter === "all" ? " active" : ""),
    id:           "ch-all",
    role:         "button",
    tabindex:     "0",
    "aria-label": "Show all",
  });
  const rootRing = svgEl("circle", { class: "tl-ch-ring", cx: rootX, cy: TL_TRUNK_Y, r: 10 });
  rootRing.style.stroke = "#6b7280";
  rootGrp.appendChild(rootRing);
  const rootDot = svgEl("circle", { class: "tl-ch-dot", cx: rootX, cy: TL_TRUNK_Y, r: 5 });
  rootDot.style.fill = "#6b7280";
  rootGrp.appendChild(rootDot);
  const rootLbl = svgEl("text", { class: "tl-ch-label", x: rootX, y: TL_TRUNK_Y + 5 + 13 });
  rootLbl.textContent = "All";
  rootGrp.appendChild(rootLbl);
  rootGrp.addEventListener("mouseenter", () => setTlInfo("#6b7280", "all", "all"));
  rootGrp.addEventListener("mouseleave", () => {
    const ac = TL_COLORS[curriculum.findIndex(c => c.chapter === activeChapter) % TL_COLORS.length] || "#6b7280";
    setTlInfo(activeChapter === "all" ? "#6b7280" : ac, activeChapter, activeTopic);
  });
  rootGrp.addEventListener("click",   () => selectNode("all", "all"));
  rootGrp.addEventListener("keydown", e => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      selectNode("all", "all");
    }
  });
  TL_SVG.appendChild(rootGrp);
}

function selectNode(chapter, topic) {
  activeChapter = chapter;
  activeTopic   = topic;
  applyFilters();
  buildTimeline();
  // Update the info strip to the new selection
  const ci    = curriculum.findIndex(c => c.chapter === chapter);
  const color = ci >= 0 ? TL_COLORS[ci % TL_COLORS.length] : "#6b7280";
  setTlInfo(chapter === "all" ? "#6b7280" : color, chapter, topic);
}

// ── FILTERS ───────────────────────────────────────────────────────────────────
function applyFilters() {
  filtered = allCards.filter(c => {
    const chOk = activeChapter === "all" || c.chapter === activeChapter;
    const tpOk = activeTopic   === "all" || c.topic   === activeTopic;
    return chOk && tpOk;
  });
  current = 0;
  loadCard(0);
}

// ── LOAD CARD ─────────────────────────────────────────────────────────────────
function loadCard(index) {
  const c = filtered[index];
  if (!c) return;
  titleEl.textContent      = c.title;
  codeEl.innerHTML         = highlightPython(c.code);
  backEl.innerHTML         = c.back;
  badgeEl.textContent      = c.topic;
  chapterBadge.textContent = c.chapter;
  filenameEl.textContent   = c.filename || "main.py";
  cardEl.classList.remove("flip");
  renderIndex();
  updateProgress();
}

// ── INDEX DOTS ────────────────────────────────────────────────────────────────
function renderIndex() {
  const total = filtered.length;
  indexLabel.textContent = `${current + 1} / ${total}`;
  indexDots.innerHTML = "";
  if (total <= 20) {
    for (let i = 0; i < total; i++) {
      const dot = document.createElement("div");
      const c = filtered[i];
      dot.className = "index-dot"
        + (i === current ? " active" : "")
        + (c && seenSet.has(cardKey(c)) ? " seen" : "");
      const idx = i;
      dot.addEventListener("click", () => { current = idx; loadCard(idx); });
      indexDots.appendChild(dot);
    }
  }
}

// ── NAVIGATION ────────────────────────────────────────────────────────────────
function goNext() {
  current = (current + 1) % filtered.length;
  loadCard(current);
}

function goPrev() {
  current = (current - 1 + filtered.length) % filtered.length;
  loadCard(current);
}

nextBtn.addEventListener("click", goNext);
prevBtn.addEventListener("click", goPrev);

document.addEventListener("keydown", e => {
  if (e.key === "ArrowRight") goNext();
  if (e.key === "ArrowLeft")  goPrev();
  if (e.key === " ")          { e.preventDefault(); cardEl.classList.toggle("flip"); }
  if (e.key === "m" || e.key === "M") markBtn.click();
});

// ── FLIP ──────────────────────────────────────────────────────────────────────
cardEl.addEventListener("click", () => cardEl.classList.toggle("flip"));

// ── INIT ──────────────────────────────────────────────────────────────────────
buildTimeline();
setTlInfo("#6b7280", "all", "all");
loadCard(0);

// Rebuild the timeline whenever the container resizes (handles window resize)
new ResizeObserver(() => buildTimeline()).observe(
  document.getElementById("timeline-scroll")
);

