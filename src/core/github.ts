interface GitHubKey {
  id: number
  key: string
}

export async function fetchGitHubKeys(username: string): Promise<string[]> {
  const response = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}/keys`)
  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`)
  }
  const keys: GitHubKey[] = await response.json()
  return keys.map((k) => k.key)
}
