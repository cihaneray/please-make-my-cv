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

assets=()
if [ -n "${RELEASE_ASSET_DIR:-}" ]; then
  assets=("$RELEASE_ASSET_DIR"/*.zip "$RELEASE_ASSET_DIR"/*.sha256)
fi

if gh release view "$RELEASE_TAG" --repo "$GITHUB_REPOSITORY" >/dev/null 2>&1; then
  if [ "$(gh release view "$RELEASE_TAG" --repo "$GITHUB_REPOSITORY" --json isDraft --jq .isDraft)" = true ]; then
    if [ "${#assets[@]}" -gt 0 ]; then
      gh release upload "$RELEASE_TAG" "${assets[@]}" --repo "$GITHUB_REPOSITORY" --clobber
    fi
    gh release edit "$RELEASE_TAG" --repo "$GITHUB_REPOSITORY" --draft=false
  fi
  echo "Release $RELEASE_TAG already exists; published content is preserved."
  exit 0
fi

options=(--repo "$GITHUB_REPOSITORY" --verify-tag --generate-notes --title "$RELEASE_TAG")
if [ "$RELEASE_PRERELEASE" = "true" ]; then
  options+=(--prerelease --latest=false)
fi
if [ -n "${RELEASE_ASSET_DIR:-}" ]; then
  options+=(--notes-file "$RELEASE_ASSET_DIR/release-notes.md")
fi
gh release create "$RELEASE_TAG" "${assets[@]}" "${options[@]}" --draft
gh release edit "$RELEASE_TAG" --repo "$GITHUB_REPOSITORY" --draft=false
