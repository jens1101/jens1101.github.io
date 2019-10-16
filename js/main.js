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
