/**
 * @typedef {Object} Repository
 * @property {string} repo The name of the repository
 * @property {string} description The description taken from the repository
 * @property {string} owner The username of the owner of the repository
 * @property {string} language The primary language in which the repository is
 * written in
 * @property {number} stars The number or stars of the repository
 * @property {number} forks The number of forks taken from the repository
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

(async function main () {
  // Remove the 'no-js' class from the document
  document.documentElement.classList.remove('no-js')

  await loadGists('jens1101', 1, 6)
})()

async function loadGists (githubUsername, page, perPage) {
  // Get the HTML template that will be used to display all the Gists
  const gistCardTemplate = document.getElementById('gist-card-template')

  // Create a fragment to which all Gists will be added
  const gistsFragment = document.createDocumentFragment()

  const gistElements = []

  // Generate the HTML for each Gist and append it to the fragment
  for (let i = 0; i < perPage; i++) {
    const gistFragment = document.importNode(gistCardTemplate.content, true)
    const gistCardElement = gistFragment.querySelector('.card--async')
    // This creates a nice cascading effect while the gists are loading
    gistCardElement.style.animationDelay = `-${2 - ((i * 0.2) % 2)}s`

    gistsFragment.appendChild(gistFragment)
    gistElements.push(gistCardElement)
  }

  // Add the Gists to the document by appending the fragment
  document.getElementById('my-gists').appendChild(gistsFragment)

  // Get all the Gists
  const gists = await getGists(githubUsername, page, perPage)

  for (const gist of gists) {
    // Remove and get the Gist element that's at the beginning of the array
    const gistCardElement = gistElements.shift()

    // Code formatting
    const codeElement = gistCardElement.querySelector('.card-img-top code')
    while (codeElement.firstChild) {
      codeElement.firstChild.remove()
    }

    fetchUrlAsText(gist.mainFile.url)
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
  }

  // Remove any unused Gist elements.
  for (const gistElement of gistElements) {
    gistElement.remove()
  }
}

/**
 * Gets all the pinned repos from GitHub for the specified user.
 * @param {string} username
 * @returns {Promise<Repository[]>}
 */
async function getPinnedRepos (username) {
  const url = new URL('https://gh-pinned-repos.now.sh/')
  url.searchParams.append('username', username)

  const result = await fetch(url.toString())

  if (!result.ok) {
    throw new Error('Could not retrieve pinned repos')
  }

  return await result.json()
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
    // `Gist` object
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

async function fetchUrlAsText (url) {
  const blob = await fetch(url.toString())

  if (!blob.ok) {
    throw new Error('Could not retrieve URL contents')
  }

  return await blob.text()
}
