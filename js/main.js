/* global Prism fetch */

/**
 * @typedef {Object} Repository
 * @property {string} name The name of the repository
 * @property {string} description The description taken from the repository
 * @property {string} url The HTML URL to view the repo
 */

/**
 * @typedef {Object} Gist
 * @property {string} description
 * @property {string} url
 * @property {GistFile[]} files
 */

/**
 * @typedef {Object} GistFile
 * @property {string} filename "bootstrap-select-app.js"
 * @property {string} language "JavaScript"
 * @property {string} raw_url
 *   "https://gist.githubusercontent.com/jens1101/fcdd3d2434fdcb27be554ecc71bf7f33/raw/6090adc9f3efc7638668e02cbe3c40379ef691e1/bootstrap-select-app.js"
 * @property {number} size 1877
 * @property {string} type "application/javascript"
 */

(async function main() {
  /**
   * My GitHub user name. This is used to get information about my repos and
   * Gists.
   * @type {string}
   */
  const username = "jens1101";

  /**
   * The number of gists to load on the home page.
   * @type {number}
   */
  const gistLimit = 6;

  const repoNames = ["SteamCMD-JS-Interface", "mini-pomodoro"];

  // Load all the gists and pinned repos
  await Promise.all([
    loadRepos(username, repoNames),
    loadGists(username, gistLimit),
  ]);
})();

/**
 * Loads a list of public repos for the given GitHub user into the home page
 * @param {string} username The Github username to query
 * @param {string[]} repoNames Array of repo names to fetch
 * @returns {Promise<void>}
 */
async function loadRepos(username, repoNames) {
  /**
   * The HTML template that will be used for each repo
   * @type {HTMLTemplateElement}
   */
  const templateElement = document.querySelector("#repo-card-template");

  /**
   * The element into which all the repos will loaded
   * @type {HTMLElement}
   */
  const targetElement = document.querySelector("#my-pinned-repos");

  /**
   * All the card elements that will be populated
   * @type {HTMLElement[]}
   */
  const repoCardElements = initCards(
    templateElement,
    targetElement,
    repoNames.length
  );

  try {
    /**
     * All of the pinned repositories that need to be loaded into the card
     * elements
     * @type {Repository[]}
     */
    const repos = (await getUserPublicRepos(username)).filter((repo) =>
      repoNames.includes(repo.name)
    );

    fillElements(repoCardElements, repos, (repoCardElement, repo) => {
      // Add the repository name and link
      /** @type {HTMLAnchorElement} */
      const titleLink = repoCardElement.querySelector(".card-title__link");
      titleLink.textContent = repo.name;
      titleLink.href = repo.url.toString();

      // Add the repository description
      repoCardElement.querySelector(".card-text__description").textContent =
        repo.description;

      // Add the repository's language shield
      const languageShield = repoCardElement.querySelector(
        ".card-text__language"
      );
      languageShield.addEventListener(
        "load",
        () => {
          // Remove the "loading" class only once the image has been loaded
          repoCardElement.classList.remove("card--loading");
        },
        { once: true, passive: true }
      );
      languageShield.src = `https://img.shields.io/github/languages/top/${username}/${repo.name}`;
    });
  } catch (error) {
    // Hide the target element in which the gists would have been placed
    targetElement.setAttribute("hidden", "hidden");

    // Populate the error alert and show it
    const alertElement = document.querySelector("#pinned-repos-errors");
    alertElement.textContent = error.message;
    alertElement.removeAttribute("hidden");
  }
}

/**
 * Loads all the public gists for the given GitHub user into the home page
 * @param {string} username The username to query
 * @param {number} limit The number of gists to get
 * @returns {Promise<void>}
 */
async function loadGists(username, limit) {
  /**
   * The HTML template that will be used for each gist
   * @type {HTMLTemplateElement}
   */
  const templateElement = document.querySelector("#gist-card-template");

  /**
   * The element into which all the gists will loaded
   * @type {HTMLElement}
   */
  const targetElement = document.querySelector("#my-gists");

  /**
   * All the card elements that will be populated
   * @type {HTMLElement[]}
   */
  const gistCardElements = initCards(templateElement, targetElement, limit);

  try {
    /**
     * All of the gists that need to be loaded into the card elements
     * @type {Gist[]}
     */
    const gists = await getUserPublicGists(username, { perPage: limit });

    fillElements(gistCardElements, gists, (gistCardElement, gist) => {
      // Remove all children of the code element. This is to prevent unexpected
      // whitespace in the code preview.
      const preElement = gistCardElement.querySelector(".card-img-top__code");
      while (preElement.firstChild) {
        preElement.firstChild.remove();
      }

      // Add the code text and highlight it.
      preElement.setAttribute("data-src", gist.files[0].raw_url);
      preElement.classList.add(
        `language-${gist.files[0].language.toLowerCase()}`
      );

      // Remove the "loading" class
      gistCardElement.classList.remove("card--loading");

      // Name of the main file that acts as the Gist title
      gistCardElement.querySelector(".card-title").textContent =
        gist.files[0].name;

      // Gist description
      gistCardElement.querySelector(".card-text").textContent =
        gist.description;

      // Gist link
      gistCardElement.querySelector(".card-link").href = gist.url;
    });

    Prism.highlightAll();
  } catch (error) {
    // Hide the target element in which the gists would have been placed
    targetElement.setAttribute("hidden", "hidden");

    // Populate the error alert and show it
    const alertElement = document.querySelector("#gists-errors");
    alertElement.textContent = error.message;
    alertElement.removeAttribute("hidden");
  }
}

/**
 * Initialises the cards that are used to display the repos and gists.
 *
 * This selects the given template, clones it the specified number of times,
 * adds an animation delay for the loading animation, and finally adds all the
 * cloned card elements to the document.
 * @param {HTMLTemplateElement} templateElement A CSS selector string to select
 * the `template` element that needs to be cloned.
 * @param {HTMLElement} targetElement A CSS selector specifying where the
 * cloned cards need to be added to.
 * @param {number} numberOfClones The number times the specified card template
 * needs to be cloned
 * @returns {HTMLElement[]} An array of card elements that have been added to
 * the document.
 */
function initCards(templateElement, targetElement, numberOfClones) {
  /**
   * The fragment to which all the cloned elements will be added to
   * @type {DocumentFragment}
   */
  const fragment = document.createDocumentFragment();
  /**
   * All of the elements with the class `card--async` that have been added to
   * the document fragment.
   * @type {HTMLElement[]}
   */
  const cardElements = [];

  // Clone the template the specified number of times and add it to the
  // fragment
  for (let i = 0; i < numberOfClones; i++) {
    const cardElement = document.importNode(templateElement.content, true);
    fragment.appendChild(cardElement);
  }

  // For each element that has been added to the fragment: select the card
  // element, add an animation delay, and add it to the `cardElements` array.
  for (const [index, element] of Array.from(fragment.children).entries()) {
    /** @type {HTMLElement} */
    const card = element.querySelector(".card--async");

    // Add animation delay. This creates a nice cascading effect while the
    // cards are loading
    card.style.animationDelay = `-${2 - ((index * 0.2) % 2)}s`;

    cardElements.push(card);
  }

  // Add the Gists to the document by appending the fragment
  targetElement.appendChild(fragment);

  return cardElements;
}

/**
 * Iterates over the data and elements arrays simultaneously. A callback is
 * called on each iteration with the current element and data being sent as
 * parameters.
 *
 * The iteration will stop once all data or elements have been iterated
 * over.
 *
 * Once the iteration is completed then all leftover elements will be removed
 * from the DOM.
 * @template T
 * @param {HTMLElement[]} elements The array of elements to loop through.
 * @param {Array<T>} dataArray The array of data to loop through.
 * @param {function(HTMLElement, T)} callback Triggers during each iteration.
 * The current element and data is passed as arguments.
 */
function fillElements(elements, dataArray, callback) {
  for (const data of dataArray) {
    // Remove and get the element that's at the beginning of the array
    const element = elements.shift();

    // Stop the loop if no more elements are left
    if (!element) break;

    callback(element, data);
  }

  // Remove any unused Gist elements.
  for (const element of elements) {
    element.remove();
  }
}

/**
 * Gets the public repos of the specified Github user.
 * @see https://docs.github.com/en/rest/reference/repos#list-repositories-for-a-user
 * @param {string} username
 * @param {Object} [parameters]
 * @param {('all'|'owner'|'member')} [parameters.type]
 * @param {('created'|'updated'|'pushed'|'full_name')} [parameters.sort]
 * @param {('asc'|'desc')} [parameters.direction]
 * @param {number} [parameters.perPage] Results per page (max 100)
 * @param {number} [parameters.page] Page number of the results to fetch.
 * @returns {Promise<Repository[]>}
 */
async function getUserPublicRepos(
  username,
  { type, sort, direction, perPage, page } = {}
) {
  const searchParams = objectToSearchParams({
    type,
    sort,
    direction,
    per_page: perPage,
    page,
  });

  const result = await githubApiFetch(`users/${username}/repos`, {
    searchParams: searchParams,
    errorMessage: "Could not retrieve repositories",
  });

  return result.map((repo) => ({
    name: repo.name,
    description: repo.description,
    url: repo.url,
  }));
}

/**
 * Gets the public repos of the specified Github user.
 * @see https://docs.github.com/en/rest/reference/gists#list-gists-for-a-user
 * @param {string} username
 * @param {Object} [parameters]
 * @param {string} [parameters.since] Only show gists updated after the given
 *   time. This is a timestamp in ISO 8601 format.
 * @param {number} [parameters.perPage] Results per page (max 100)
 * @param {number} [parameters.page] Page number of the results to fetch.
 * @returns {Promise<Gist[]>}
 */
async function getUserPublicGists(username, { since, perPage, page } = {}) {
  const searchParams = objectToSearchParams({
    since,
    per_page: perPage,
    page,
  });

  const gists = await githubApiFetch(`users/${username}/gists`, {
    searchParams,
    errorMessage: "Could not retrieve gists",
  });

  return gists.map((gist) => ({
    description: gist.description,
    url: gist.url,
    files: Object.values(gist.files),
  }));
}

/**
 * Converts the specified object to search params. Any values that are either
 * null or undefined will be skipped.
 * @param {Object} object
 * @return {URLSearchParams}
 */
function objectToSearchParams(object) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(object)) {
    if (value == null) {
      continue;
    }

    searchParams.append(key, String(value));
  }

  return searchParams;
}

/**
 * Makes a call to the GitHub API
 * @param {string} path The endpoint that you want to call.
 * @param {Object} [options]
 * @param {URLSearchParams} [options.searchParams] Any search parameters that
 * you want to append to the request.
 * @param {string} [options.errorMessage] The error message to return if an
 * error occurs. If omitted then a generic error message will be returned
 * instead.
 * @returns {Promise<Object>} The JSON decoded response from the server
 * @throws {Error} when the API couldn't be queried
 */
async function githubApiFetch(path, { searchParams, errorMessage } = {}) {
  const url = new URL(path, "https://api.github.com/");

  if (searchParams instanceof URLSearchParams) {
    for ([name, value] of searchParams.entries()) {
      url.searchParams.append(name, value);
    }
  }

  const result = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Accept: "application/vnd.github.v3+json",
    },
  });

  if (!result.ok) {
    throw new Error(errorMessage || "Error while fetching data from server");
  }

  return result.json();
}
