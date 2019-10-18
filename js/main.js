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
 * @property {string} content
 */

// TODO: wrap everything in an IIFE

const githubUsername = 'jens1101'

window.onload = async function main () {
  // Remove the 'no-js' class from the document
  document.documentElement.classList.remove('no-js')
  // TODO: add loading spinner

  // Get all the Gists
  const gists = await getGists(githubUsername, 1, 6)

  // Get the HTML template that will be used to display all the Gists
  const gistCardTemplate = document.getElementById('gist-card-template')

  // Create a fragment to which all Gists will be added
  const gistsFragment = document.createDocumentFragment()

  // Generate the HTML for each Gist and append it to the fragment
  for (const gist of gists) {
    const gistCardElement = document.importNode(gistCardTemplate.content, true)

    // Code formatting
    const codeElement = gistCardElement.querySelector('.card-img-top code')
    while (codeElement.firstChild) {
      codeElement.firstChild.remove()
    }
    codeElement.appendChild(document.createTextNode(gist.mainFile.content))
    codeElement.classList.add(gist.mainFile.languageClass)
    Prism.highlightElement(codeElement)

    // Name of the main file that acts as the Gist title
    gistCardElement.querySelector('.card-title')
      .textContent = gist.mainFile.filename

    // Gist description
    gistCardElement.querySelector('.card-text')
      .textContent = gist.description

    // Gist link
    gistCardElement.querySelector('.gist-link').href = gist.url

    gistsFragment.appendChild(gistCardElement)
  }

  // Add the Gists to the document by appending the fragment
  document.getElementById('my-gists').appendChild(gistsFragment)
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

  /**
   * Contains an array of promises that each will resolve into a gist in the
   * form that we want it in.
   * @type Promise<Gist>[]
   */
  const gistsPromises = rawGists.map(gist => {
    // Get the details of the first file in the gist
    const mainFile = gist.files[Object.keys(gist.files).shift()]

    // Fetch the contents of the main file and then resolve this gist as a valid
    // `Gist` object
    return fetch(mainFile.raw_url)
      .then(blob => blob.text())
      .then(content => ({
        description: gist.description,
        mainFile: {
          filename: mainFile.filename,
          language: mainFile.language,
          languageClass: `language-${mainFile.language.toLowerCase()}`,
          content
        },
        url: new URL(gist.html_url)
      }))
  })

  return await Promise.all(gistsPromises)
}
