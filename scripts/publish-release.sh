#!/usr/bin/env bash
set -euo pipefail

# All inputs are validated by release_metadata.py and passed as environment variables.
if git show-ref --verify --quiet "refs/tags/$RELEASE_TAG"; then
  tag_commit=$(git rev-parse "$RELEASE_TAG^{commit}")
  if [ "$tag_commit" != "$RELEASE_SHA" ]; then
    echo "Release tag $RELEASE_TAG already belongs to another commit; it will not be moved." >&2
    exit 1
  fi
else
  gh api --method POST "repos/$GITHUB_REPOSITORY/git/refs" \
    -f "ref=refs/tags/$RELEASE_TAG" -f "sha=$RELEASE_SHA" >/dev/null
fi

if gh release view "$RELEASE_TAG" --repo "$GITHUB_REPOSITORY" >/dev/null 2>&1; then
  echo "Release $RELEASE_TAG already exists; leaving it unchanged."
  exit 0
fi

options=(--repo "$GITHUB_REPOSITORY" --verify-tag --generate-notes --title "$RELEASE_TAG")
if [ "$RELEASE_PRERELEASE" = "true" ]; then
  options+=(--prerelease --latest=false)
fi
gh release create "$RELEASE_TAG" "${options[@]}"
