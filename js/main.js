/**
 * Called in the `fillElements` function while iterating through the array of
 * data that is given to the function. This is called once every iteration.
 * @callback fillElementCallback
 * @param {HTMLElement} element The HTML element of the current iteration
 * @param {*} data The data of the current iteration
 */

/**
 * @typedef {Object} Repository
 * @property {string} name The name of the repository
 * @property {string} description The description taken from the repository
 * @property {URL} url The HTML URL to view the repo
 */

/**
 * @typedef {Object} Gist
 * @property {string} description
 * @property {GistFile} mainFile
 * @property {URL} url
 */

/**
 * @typedef {Object} GistFile
 * @property {string} filename
 * @property {string} language
 * @property {string} languageClass
 * @property {string} [content]
 * @property {URL} url
 */

// TODO: if an AJAX error occurs then remove the loading elements

(async function main () {
  // Remove the 'no-js' class from the document
  document.documentElement.classList.remove('no-js')

  loadGists('jens1101', 1, 6)

  loadPinnedRepos('jens1101')
})()

async function loadPinnedRepos (githubUsername) {
  /**
   * The HTML template that will be used to display all the Repos
   * @type {HTMLTemplateElement}
   */
  const repoCardTemplate = document.querySelector('#repo-card-template')

  // Create a fragment to which all repos will be added to
  const reposFragment = cloneTemplate(repoCardTemplate, 6)

  const repoCardElements = staggerCardAnimation(reposFragment.children,
    '.card--async', 2, 0.2)

  // Add the Gists to the document by appending the fragment
  document.getElementById('my-pinned-repos').appendChild(reposFragment)

  // Get all the Gists
  const repos = await getPinnedRepos(githubUsername)

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
      .src(
        `https://img.shields.io/github/languages/top/${githubUsername}/${repo.name}`)
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

async function loadGists (githubUsername, page, perPage) {
  /**
   * The HTML template that will be used to display all the Gists
   * @type {HTMLTemplateElement}
   */
  const gistCardTemplate = document.querySelector('#gist-card-template')

  // Create a fragment to which all Gists will be added
  const gistsFragment = cloneTemplate(gistCardTemplate, perPage)

  const gistCardElements =
    Array.from(gistsFragment.children)
         .map((element, index) => {
           /** @type {HTMLElement} */
           const card = element.querySelector('.card--async')

           // Add animation delay. This creates a nice cascading effect while
           // the gists are loading
           card.style.animationDelay =
             `-${2 - ((index * 0.2) % 2)}s`

           return card
         })

  // Add the Gists to the document by appending the fragment
  document.getElementById('my-gists').appendChild(gistsFragment)

  // Get all the Gists
  const gists = await getGists(githubUsername, page, perPage)

  fillElements(gistCardElements, gists, (gistCardElement, gist) => {
    // Remove all children of the code element. This is to prevent unexpected
    // whitespace in the code preview.
    const codeElement = gistCardElement.querySelector('.card-img-top code')
    while (codeElement.firstChild) {
      codeElement.firstChild.remove()
    }

    // Fetch the main file's contents for the code preview
    fetch(gist.mainFile.url.toString())
      .then(blob => blob.text())
      .then(content => {
        gist.mainFile.content = content

        codeElement.appendChild(document.createTextNode(gist.mainFile.content))
        codeElement.classList.add(gist.mainFile.languageClass)
        Prism.highlightElement(codeElement)

        // Remove the "loading" class
        gistCardElement.classList.remove('card--loading')
      })

    // Name of the main file that acts as the Gist title
    gistCardElement.querySelector('.card-title')
      .textContent = gist.mainFile.filename

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
 * @param {HTMLElement[]} elements The array of elements to loop through.
 * @param {Array} dataArray The array of data to loop through.
 * @param {fillElementCallback} callback Triggers during each iteration. The
 * current element and data is passed as arguments.
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
 * @param {string} username
 * @returns {Promise<Repository[]>}
 */
async function getPinnedRepos (username) {
  const url = new URL(`https://github.com/${username}`)

  const result = await fetch(url.toString())

  if (!result.ok) {
    throw new Error('Could not retrieve pinned repos')
  }

  const documentString = await result.text()
  const profilePage = (new DOMParser()).parseFromString(documentString,
    'text/html')

  const pinnedRepos = Array.from(profilePage
    .querySelectorAll('.pinned-item-list-item.public'))

  return pinnedRepos.map(pinnedRepo => {
    const name = pinnedRepo.querySelector('.repo').textContent.trim()
    const description = pinnedRepo.querySelector('.pinned-item-desc')
                                  .textContent
                                  .trim()
    const url = new URL(`https://github.com/${username}/${name}`)

    return { name, description, url }
  })
}

/**
 * Fetches all the public GitHub Gists of the specified user
 * @param {string} user The username of the user
 * @param {number} page The page offset
 * @param {number} perPage The number of Gists per page
 * @returns {Promise<Gist[]>} Resolves in an array of `Gist` objects
 */
async function getGists (user, page, perPage) {
  const url = new URL(`https://api.github.com/users/${user}/gists`)
  url.searchParams.append('page', `${page}`)
  url.searchParams.append('per_page', `${perPage}`)

  // Fetch the gists
  const result = await fetch(url.toString(), {
    method: 'GET',
    headers: new Headers({
      'Accept': 'application/vnd.github.v3+json'
    })
  })

  if (!result.ok) {
    throw new Error('Could not retrieve pinned repos')
  }

  // Get the raw results from the API call. This array of objects contains too
  // much data and needs to be manipulated further.
  const rawGists = await result.json()

  return rawGists.map(gist => {
    // Get the details of the first file in the gist
    const mainFile = gist.files[Object.keys(gist.files).shift()]

    // Fetch the contents of the main file and then resolve this gist as a valid
    // `Gist` object.

    // Inspections are suppressed here because I don't want to map out the
    // entirety of GitHub's API.
    // noinspection JSUnresolvedVariable
    return {
      description: gist.description,
      url: new URL(gist.html_url),
      mainFile: {
        filename: mainFile.filename,
        language: mainFile.language,
        languageClass: `language-${mainFile.language.toLowerCase()}`,
        url: new URL(mainFile.raw_url)
      }
    }
  })
}
