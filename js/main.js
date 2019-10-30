/**
 * @typedef {Object} Repository
 * @property {string} name The name of the repository
 * @property {string} description The description taken from the repository
 * @property {URL} url The HTML URL to view the repo
 */

/**
 * @typedef {Object} Gist
 * @property {string} description
 * @property {URL} url
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
// TODO: make gists use graphql
// TODO: remove `page` parameters, because I won't be using them
// TODO: rename `perPage` to `limit`
// TODO: make gists use the same convenience functions as repos do
// TODO: update documentation

(async function main () {
  const githubToken = 'cdbf893cfdb6b48b97b0c498195b5f9ca9593329'
  const githubUsername = 'jens1101'
  const limit = 5

  // Remove the 'no-js' class from the document
  document.documentElement.classList.remove('no-js')

  await Promise.all([
    loadGists(githubUsername, githubToken, limit),
    loadPinnedRepos(githubUsername, githubToken, limit)
  ])
})()

async function loadPinnedRepos (githubUsername, githubToken, limit) {
  /**
   * The HTML template that will be used to display all the Repos
   * @type {HTMLTemplateElement}
   */
  const repoCardTemplate = document.querySelector('#repo-card-template')

  // Create a fragment to which all repos will be added to
  const reposFragment = cloneTemplate(repoCardTemplate, limit)

  const repoCardElements = staggerCardAnimation(reposFragment.children,
    '.card--async', 2, 0.2)

  // Add the Gists to the document by appending the fragment
  document.getElementById('my-pinned-repos').appendChild(reposFragment)

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

function staggerCardAnimation (elements, selector, animationDuration, offset) {
  return Array.from(elements).map((element, index) => {
    /** @type {HTMLElement} */
    const card = element.querySelector(selector)

    // Add animation delay. This creates a nice cascading effect while
    // the gists are loading
    card.style.animationDelay =
      `-${animationDuration - ((index * offset) % animationDuration)}s`

    return card
  })
}

async function loadGists (githubUsername, githubToken, limit) {
  /**
   * The HTML template that will be used to display all the Gists
   * @type {HTMLTemplateElement}
   */
  const gistCardTemplate = document.querySelector('#gist-card-template')

  // Create a fragment to which all Gists will be added
  const gistsFragment = cloneTemplate(gistCardTemplate, limit)

  const gistCardElements = staggerCardAnimation(gistsFragment.children,
    '.card--async', 2, 0.2)

  // Add the Gists to the document by appending the fragment
  document.getElementById('my-gists').appendChild(gistsFragment)

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
 * Clones the given HTML template a certain number of times into a new document
 * fragment.
 * @param {HTMLTemplateElement} template The template to clone
 * @param {number} numberOfClones The number of times the template should be
 * cloned
 * @returns {DocumentFragment} The document fragment that contains all of the
 * cloned templates
 */
function cloneTemplate (template, numberOfClones) {
  const documentFragment = document.createDocumentFragment()

  for (let i = 0; i < numberOfClones; i++) {
    documentFragment.appendChild(document.importNode(template.content, true))
  }

  return documentFragment
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
  return result.data.user.pinnedItems.edges.map(edge => ({
    name: edge.node.name,
    description: edge.node.description,
    url: new URL(edge.node.url)
  }))
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
