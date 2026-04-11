// ── DATA ──────────────────────────────────────────────────────────────────────
// All card content is developer-defined static data; innerHTML usage below is safe.
const allCards = [

  // ─── Dataset Setup ───────────────────────────────────────────────────────
  {
    topic: "Dataset Setup",
    title: "Dataset Initialization",
    filename: "dataset.py",
    code: `train_dataset = FlickrDataset(
    root_dir      = DATA_DIR + "/Flicker8k_Dataset",
    captions_file = DATA_DIR + "/Flickr8k.token.txt",
    transform     = transforms
)`,
    back: `<strong>FlickrDataset</strong> wraps the Flickr8k images and captions.<br><br>
It reads the token file to build (image, caption) pairs and applies
<em>transforms</em> to normalise pixel values before passing to the model.`
  },
  {
    topic: "Dataset Setup",
    title: "Validation Dataset",
    filename: "dataset.py",
    code: `val_dataset = FlickrDataset(
    root_dir      = DATA_DIR + "/Flicker8k_Dataset",
    captions_file = DATA_DIR + "/Flickr8k.token.txt",
    train         = False,
    transform     = transforms
)`,
    back: `Passing <strong>train=False</strong> switches to the validation split.<br><br>
This ensures the model never sees validation images during training,
giving an unbiased performance estimate.`
  },

  // ─── Data Loaders ────────────────────────────────────────────────────────
  {
    topic: "Data Loaders",
    title: "Training DataLoader",
    filename: "dataloader.py",
    code: `train_loader = DataLoader(
    train_dataset,
    batch_size  = 32,
    shuffle     = True,
    num_workers = 4,
    pin_memory  = True
)`,
    back: `<strong>DataLoader</strong> batches the dataset and handles parallelism.<br><br>
<code>pin_memory=True</code> speeds up CPU → GPU transfers.<br>
<code>shuffle=True</code> randomises order each epoch to prevent the
model from learning data-order artifacts.`
  },
  {
    topic: "Data Loaders",
    title: "Vocabulary Builder",
    filename: "dataloader.py",
    code: `vocab = Vocabulary(freq_threshold=5)
vocab.build_vocab(
    train_dataset.captions_list
)
print(f"Vocab size: {len(vocab)}")`,
    back: `Words appearing <strong>fewer than 5 times</strong> are mapped to <code>&lt;UNK&gt;</code>.<br><br>
Special tokens: <code>&lt;PAD&gt;</code>, <code>&lt;SOS&gt;</code>,
<code>&lt;EOS&gt;</code>, <code>&lt;UNK&gt;</code>.<br>
Each kept word receives a unique integer index.`
  },

  // ─── Training Loop ────────────────────────────────────────────────────────
  {
    topic: "Training Loop",
    title: "Loss & Optimiser",
    filename: "train.py",
    code: `criterion = nn.CrossEntropyLoss(
    ignore_index = vocab.stoi["<PAD>"]
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
    topic: "Training Loop",
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
];

// ── STATE ─────────────────────────────────────────────────────────────────────
let filtered    = [...allCards];
let current     = 0;
let activeTopic = "all";

// ── ELEMENTS ──────────────────────────────────────────────────────────────────
const titleEl    = document.getElementById("card-title");
const codeEl     = document.getElementById("code-content");
const backEl     = document.getElementById("back-content");
const cardEl     = document.getElementById("card");
const badgeEl    = document.getElementById("topic-badge");
const filenameEl = document.getElementById("filename");
const indexLabel = document.getElementById("index-label");
const indexDots  = document.getElementById("index-dots");
const prevBtn    = document.getElementById("prev-btn");
const nextBtn    = document.getElementById("next-btn");
const topicBtn   = document.getElementById("topic-btn");
const topicLabel = document.getElementById("topic-label");
const topicMenu  = document.getElementById("topic-menu");
const chevron    = document.getElementById("chevron");

// ── TOPIC MENU ────────────────────────────────────────────────────────────────
function buildTopicMenu() {
  const topics = [...new Set(allCards.map(c => c.topic))];
  topicMenu.innerHTML = "";
  addMenuItem("all", "All Topics", true);
  topics.forEach(t => addMenuItem(t, t, false));
}

function addMenuItem(value, label, isActive) {
  const li = document.createElement("li");
  li.className = "topic-item" + (isActive ? " active" : "");
  li.dataset.topic = value;
  li.textContent = label;
  li.setAttribute("role", "option");
  li.setAttribute("aria-selected", String(isActive));
  topicMenu.appendChild(li);
}

function selectTopic(topic) {
  activeTopic = topic;
  filtered    = topic === "all" ? [...allCards] : allCards.filter(c => c.topic === topic);
  current     = 0;
  topicLabel.textContent = topic === "all" ? "All Topics" : topic;

  document.querySelectorAll(".topic-item").forEach(el => {
    const sel = el.dataset.topic === topic;
    el.classList.toggle("active", sel);
    el.setAttribute("aria-selected", String(sel));
  });

  loadCard(0);
}

// ── DROPDOWN ──────────────────────────────────────────────────────────────────
function openDropdown() {
  topicMenu.classList.add("open");
  chevron.classList.add("open");
  topicBtn.setAttribute("aria-expanded", "true");
}

function closeDropdown() {
  topicMenu.classList.remove("open");
  chevron.classList.remove("open");
  topicBtn.setAttribute("aria-expanded", "false");
}

topicBtn.addEventListener("click", e => {
  e.stopPropagation();
  topicMenu.classList.contains("open") ? closeDropdown() : openDropdown();
});

topicMenu.addEventListener("click", e => {
  e.stopPropagation();
  const item = e.target.closest(".topic-item");
  if (item) {
    selectTopic(item.dataset.topic);
    closeDropdown();
  }
});

document.addEventListener("click", closeDropdown);

// ── LOAD CARD ─────────────────────────────────────────────────────────────────
function loadCard(index) {
  const c = filtered[index];
  titleEl.textContent      = c.title;
  codeEl.textContent       = c.code;
  backEl.innerHTML         = c.back;          // static developer-defined content
  badgeEl.textContent      = c.topic;
  filenameEl.textContent   = c.filename || "main.py";
  cardEl.classList.remove("flip");
  renderIndex();
}

// ── INDEX DOTS ────────────────────────────────────────────────────────────────
function renderIndex() {
  const total = filtered.length;
  indexLabel.textContent = `${current + 1} / ${total}`;

  indexDots.innerHTML = "";
  if (total <= 16) {
    for (let i = 0; i < total; i++) {
      const dot = document.createElement("div");
      dot.className = "index-dot" + (i === current ? " active" : "");
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
  if (e.key === "Escape")     closeDropdown();
  if (e.key === "ArrowRight") goNext();
  if (e.key === "ArrowLeft")  goPrev();
});

// ── FLIP ──────────────────────────────────────────────────────────────────────
cardEl.addEventListener("click", () => cardEl.classList.toggle("flip"));

// ── INIT ──────────────────────────────────────────────────────────────────────
buildTopicMenu();
loadCard(0);