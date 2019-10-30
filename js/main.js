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
 * @property {string} name
 * @property {Language} language
 * @property {string} text
 */

/**
 * @typedef {Object} Language
 * @property {string} name
 */

// TODO: if an AJAX error occurs then remove the loading elements
// TODO: update documentation

(async function main () {
  /**
   * A simple public read-only token to use with GitHub's GraphQL API
   * @type {string}
   */
  const githubToken = 'cdbf893cfdb6b48b97b0c498195b5f9ca9593329'
  /**
   * My GitHub user name. This is used to only get my own pinned repos and
   * gists.
   * @type {string}
   */
  const githubUsername = 'jens1101'
  /**
   * The number of gists and pinned repos to load in the home page.
   * @type {number}
   */
  const limit = 6

  // Remove the 'no-js' class from the document
  document.documentElement.classList.remove('no-js')

  // Load all the gists and pinned repos
  await Promise.all([
    loadPinnedRepos(githubUsername, githubToken, limit),
    loadGists(githubUsername, githubToken, limit)
  ])
})()

async function loadPinnedRepos (githubUsername, githubToken, limit) {
  const repoCardElements = initCards('#repo-card-template',
    '#my-pinned-repos', limit)

  // Get all the Gists
  const repos = await getPinnedRepos(githubUsername, githubToken, limit)

  fillElements(repoCardElements, repos, (repoCardElement, repo) => {
    /**
     * @type {HTMLAnchorElement}
     */
    const titleLink = repoCardElement.querySelector('.card-title__link')
    titleLink.textContent = repo.name
    titleLink.href = repo.url.toString()

    repoCardElement.querySelector('.card-text__description')
      .textContent = repo.description

    repoCardElement
      .querySelector('.card-text__language')
      .src = `https://img.shields.io/github/languages/top/${githubUsername}/${repo.name}`

    // Remove the "loading" class
    repoCardElement.classList.remove('card--loading')
  })
}

/**
 * Initialises the cards that are used to display the repos and gists.
 *
 * This selects the given template, clones it the specified number of times,
 * adds an animation delay for the loading animation, and finally adds all the
 * cloned card elements to the document.
 * @param {string} templateSelector A CSS selector string to select the
 * `template` element that needs to be cloned.
 * @param {string} targetSelector A CSS selector specifying where the cloned
 * cards need to be added to.
 * @param {number} numberOfClones The number times the specified card template
 * needs to be cloned
 * @returns {HTMLElement[]} An array of card elements that have been added to
 * the document.
 */
function initCards (templateSelector, targetSelector, numberOfClones) {
  /**
   * The HTML template that will be used to display all the Repos
   * @type {HTMLTemplateElement}
   */
  const templateElement = document.querySelector(templateSelector)
  /**
   * The fragment to which all the cloned elements will be added to
   * @type {DocumentFragment}
   */
  const fragment = document.createDocumentFragment()
  /**
   * All of the elements with the class `card--async` that have been added to
   * the document fragment.
   * @type {HTMLElement[]}
   */
  const cardElements = []

  // Clone the template the specified number of times and add it to the
  // fragment
  for (let i = 0; i < numberOfClones; i++) {
    const cardElement = document.importNode(templateElement.content, true)
    fragment.appendChild(cardElement)
  }

  // For each element that has been added to the fragment: select the card
  // element, add an animation delay, and add it to the `cardElements` array.
  for (const [index, element] of Array.from(fragment.children).entries()) {
    /** @type {HTMLElement} */
    const card = element.querySelector('.card--async')

    // Add animation delay. This creates a nice cascading effect while the
    // cards are loading
    card.style.animationDelay = `-${2 -
    ((index * 0.2) % 2)}s`

    cardElements.push(card)
  }

  // Add the Gists to the document by appending the fragment
  document.querySelector(targetSelector).appendChild(fragment)

  return cardElements
}

async function loadGists (githubUsername, githubToken, limit) {
  const gistCardElements = initCards('#gist-card-template', '#my-gists', limit)

  // Get all the Gists
  const gists = await getGists(githubUsername, githubToken, limit)

  fillElements(gistCardElements, gists, (gistCardElement, gist) => {
    // Remove all children of the code element. This is to prevent unexpected
    // whitespace in the code preview.
    const codeElement = gistCardElement.querySelector('.card-img-top code')
    while (codeElement.firstChild) {
      codeElement.firstChild.remove()
    }

    codeElement.appendChild(document.createTextNode(gist.files[0].text))
    codeElement.classList.add(
      `language-${gist.files[0].language.name.toLowerCase()}`)
    Prism.highlightElement(codeElement)

    // Remove the "loading" class
    gistCardElement.classList.remove('card--loading')

    // Name of the main file that acts as the Gist title
    gistCardElement.querySelector('.card-title')
      .textContent = gist.files[0].name

    // Gist description
    gistCardElement.querySelector('.card-text')
      .textContent = gist.description

    // Gist link
    gistCardElement.querySelector('.card-link').href = gist.url
  })
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
 *   The current element and data is passed as arguments.
 */
function fillElements (elements, dataArray, callback) {
  for (const data of dataArray) {
    // Remove and get the element that's at the beginning of the array
    const element = elements.shift()

    // Stop the loop if no more elements are left
    if (!element) break

    callback(element, data)
  }

  // Remove any unused Gist elements.
  for (const element of elements) {
    element.remove()
  }
}

/**
 * Gets all the pinned repos from GitHub for the specified user.
 * @param {string} githubUsername
 * @param {string} githubToken
 * @param {number} limit
 * @returns {Promise<Repository[]>}
 */
async function getPinnedRepos (githubUsername, githubToken, limit) {
  const query = `query {
    user(login: "jens1101") {
      pinnedItems(first: 5, types: [REPOSITORY]) {
        edges {
          node {
            ... on Repository {
              name
              description
              url
            }
          }
        }
      }
    }
  }`
  const result = await callGithubApi(githubToken, query,
    'Could not retrieve pinned repos')

  // noinspection JSUnresolvedVariable
  return result.data.user.pinnedItems.edges.map(edge => edge.node)
}

async function callGithubApi (token, query, errorMessage) {
  const result = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `bearer ${token}`
    },
    body: JSON.stringify({ query })
  })

  if (!result.ok) {
    throw new Error(errorMessage || 'Error while fetching data from server')
  }

  return await result.json()
}

/**
 * Fetches all the public GitHub Gists of the specified user
 * @param {string} githubUsername
 * @param {string} githubToken
 * @param {number} limit
 * @returns {Promise<Gist[]>} Resolves in an array of `Gist` objects
 */
async function getGists (githubUsername, githubToken, limit) {
  const query = `query {
    user(login: "${githubUsername}") {
      gists(first: ${limit}, orderBy: {field: CREATED_AT, direction: DESC}) {
        edges {
          node {
            ... on Gist {
              description
              url
              files(limit: 1) {
                name
                language {
                  name
                }
                text(truncate: 600)
              }
            }
          }
        }
      }
    }
  }`

  const result = await callGithubApi(githubToken, query,
    'Could not retrieve pinned repos')

  // noinspection JSUnresolvedVariable
  return result.data.user.gists.edges.map(edge => edge.node)
}
