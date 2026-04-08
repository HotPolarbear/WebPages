const cards = [
  {
    title: "Dataset Initialization",
    code: `train_dataset = FlickrDataset(
    root_dir = data_location+"/Flicker8k_Dataset",
    captions_file = data_location+"/Flickr8k_text/Flickr8k.token.txt",
    transform=transforms
)`,
    back: "This initializes the training dataset using Flickr8k images and captions."
  },
  {
    title: "Validation Dataset",
    code: `val_dataset = FlickrDataset(
    root_dir = data_location+"/Flicker8k_Dataset",
    captions_file = data_location+"/Flickr8k_text/Flickr8k.token.txt",
    train=False,
    transform=transforms
)`,
    back: "This creates a validation dataset separate from training."
  }
];

// STATE
let current = 0;

const titleEl = document.getElementById("card-title");
const codeEl = document.getElementById("code-content");
const backEl = document.getElementById("back-content");
const cardEl = document.getElementById("card");

// LOAD CARD
function loadCard(index) {
  const c = cards[index];
  titleEl.textContent = c.title;
  codeEl.textContent = c.code;
  backEl.textContent = c.back;
  cardEl.classList.remove("flip");
}

// INITIAL LOAD
loadCard(current);

// CLICK TO FLIP
cardEl.addEventListener("click", () => {
  cardEl.classList.toggle("flip");
});

// ARROW NAVIGATION
document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowRight") {
    current = (current + 1) % cards.length;
    loadCard(current);
  }
  if (e.key === "ArrowLeft") {
    current = (current - 1 + cards.length) % cards.length;
    loadCard(current);
  }
});