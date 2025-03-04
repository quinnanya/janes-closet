import MemeWall from "./memewall.js";

let memewall;
const wallContainer = document.getElementById("meme-wall");
const items = wallContainer.querySelectorAll("picture");
const shuffleButton = document.querySelector("button.shuffle");
const showFiltersButton = document.querySelector("button.show-filters");
const searchButton = document.querySelector("button.search");
const searchInput = document.querySelector("div.search input");

const filters = ["gender", "id", "type", "daterange"];
const filterSelects = Object.fromEntries(
   filters.map((filter) => [filter, document.querySelector(`select.${filter}`)]),
 );

const enableLazyLoading = (images, root) => {
  const imageObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const image = entry.target;
          image.src = image.dataset.src;
          image.removeAttribute("data-src");
          imageObserver.unobserve(image);
        }
      });
    },
    { root, rootMargin: "0px 0px 100% 0px" },
  );
  images.forEach((image) => imageObserver.observe(image));
};

const toggleItem = (img, condition = true) => {
  if (condition) {
    img.style.removeProperty("width");
    img.style.removeProperty("height");
    img.classList.remove("hidden");
  } else {
    img.classList.add("hidden");
  }
};

const updateCount = () => {
  const count = document.querySelector("span.count");
  count.textContent =
    wallContainer.querySelectorAll("img:not(.hidden").length +
    " / " +
    wallContainer.querySelectorAll("img").length;
};

const updateWall = () => {
  updateCount();
  wallContainer.classList.add("loading");
  memewall.reset();
  if (wallContainer.querySelectorAll("img:not(.hidden)").length === 0) {
    wallContainer.classList.add("empty");
  }
  if (wallContainer.querySelectorAll("img:not(.hidden)").length === 1) {
    memewall.toggleItem({
      target: wallContainer.querySelector("img:not(.hidden)"),
      stopPropagation: () => {},
    });
    wallContainer.classList.add("single");
  }
  wallContainer.classList.remove("loading");
};

const resetUi = (except = []) => {
  except = [].concat(except);

  wallContainer.classList.remove("empty");
  wallContainer.classList.remove("single");

  if (!except.includes("search")) {
    document.querySelector("div.controls").classList.remove("searching");
    searchInput.value = "";
  }

  Object.entries(filterSelects).forEach(([filter, filterSelect]) => {
    if (!except.includes(filter)) filterSelect.value = "";
  });
};

const shuffle = () => {
  wallContainer.classList.add("loading");
  wallContainer.classList.remove("single");
  resetUi();
  setTimeout(() => {
    memewall.reset();
    memewall.destroy();
    wallContainer.querySelectorAll("img").forEach((img) => toggleItem(img));
    updateCount();
    // Modified Fisher–Yates shuffle
    for (let i = wallContainer.children.length; i >= 0; i--) {
      wallContainer.appendChild(
        wallContainer.children[(Math.random() * i) | 0],
      );
    }
    memewall = new MemeWall(wallContainer);
    wallContainer.classList.remove("loading");
  }, 200);
};

const filterMemes = (facet, value) => {
  const delay = searchInput.value ? 200 : 0;
  resetUi(facet);
  setTimeout(() => {
    items.forEach((item) => {
      toggleItem(
        item.querySelector("img"),
        item.dataset[facet].split("|").includes(value),
      );
    });
    updateWall();
  }, delay);
};

const searchMemes = (searchTerm) => {
  resetUi("search");
  items.forEach((item) =>
    toggleItem(
      item.querySelector("img"),
      [...item.querySelectorAll("dd")].some((dd) =>
        dd.textContent
          .toLocaleLowerCase()
          .includes(searchTerm.toLocaleLowerCase()),
      ),
    ),
  );
  updateWall();
};

const wallItemToggleCb = (img) => {
  if (img.classList.contains("active")) {
    img.sizes = "100vw";
    img.previousElementSibling.sizes = "100vw";
  } else {
    img.sizes = "15vmax";
    img.previousElementSibling.sizes = "15vmax";
  }
};

// Hook up event listeners
shuffleButton.addEventListener("click", shuffle);

Object.entries(filterSelects).forEach(([filter, filterSelect]) =>
  filterSelect.addEventListener("change", ({ target: { value } }) =>
    filterMemes(filter, value),
  ),
);

showFiltersButton.addEventListener("click", () => {
  document.querySelector("div.more-filters").classList.toggle("show");
  showFiltersButton.classList.toggle("on");
});

searchButton.addEventListener("click", () => {
  document.querySelector("div.controls").classList.toggle("searching");
  searchInput.focus();
});

searchInput.addEventListener("change", ({ target: { value } }) =>
  searchMemes(value),
);

wallContainer.addEventListener("click", ({ target }) => {
  if (target === wallContainer && target.classList.contains("empty")) {
    wallContainer.classList.remove("empty");
    shuffle();
  }
});

document.querySelectorAll("dl").forEach((dl) => {
  dl.addEventListener("click", (e) => dl.classList.toggle("show-more"));
});

// Hook up lazy loading
enableLazyLoading(wallContainer.querySelectorAll("[data-src]"), wallContainer);

// Initialize MemeWall
memewall = new MemeWall(wallContainer, wallItemToggleCb);
wallContainer.classList.remove("loading");
